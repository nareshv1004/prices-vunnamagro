const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Access-Control-Allow-Origin': '*',
}

function sig(ms) {
  const c = new AbortController()
  setTimeout(() => c.abort(), ms)
  return c.signal
}

// ── Stage 1a: Search — collect candidate URLs ──────────────────────────────

async function braveSearch(query, key) {
  const r = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=6&result_filter=web`,
    { signal: sig(8000), headers: { Accept: 'application/json', 'X-Subscription-Token': key } },
  )
  if (!r.ok) throw new Error(`Brave ${r.status}: ${(await r.text().catch(() => '')).slice(0, 120)}`)
  const d = await r.json()
  return (d.web?.results || []).map(x => x.url).filter(Boolean)
}

async function serperSearch(query, key) {
  const r = await fetch('https://google.serper.dev/search', {
    method: 'POST', signal: sig(8000),
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num: 6 }),
  })
  if (!r.ok) throw new Error(`Serper ${r.status}`)
  return ((await r.json()).organic || []).map(x => x.link).filter(Boolean)
}

// ── Stage 1b: Jina Search (free, no API key) — search + content in one call

async function jinaSearchUrls(query) {
  const r = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
    signal: sig(15000),
    headers: { Accept: 'text/plain', 'X-No-Cache': 'true' },
  })
  if (!r.ok) return []
  const text = await r.text()
  const urls = []
  for (const m of text.matchAll(/URL Source:\s*(https?:\/\/[^\s\n]+)/gi)) urls.push(m[1])
  return [...new Set(urls)].slice(0, 5)
}

// Known trade directories — multiple slug variants per product
function directoryUrls(product, country) {
  const words = product.toLowerCase().split(/\s+/)
  const slugs = [...new Set([
    words.join('-'),
    words.slice(1).join('-'),
    words[words.length - 1],
    words.join('-').replace(/chillies/, 'chilli'),
    words.join('-').replace(/chilli\b/, 'chillies'),
    words.join('-').replace(/chilli\b/, 'chili'),
  ])].filter(s => s.length > 2).slice(0, 3)

  const cs = country.toLowerCase()
    .replace(/\bunited arab emirates\b/, 'uae')
    .replace(/\bunited kingdom\b/, 'uk')
    .replace(/\bunited states\b/, 'usa')
    .replace(/\s+/g, '-')

  const s0 = slugs[0] // primary slug

  const urls = [
    // ── exportimportdata.in ──────────────────────────────────────────────
    ...slugs.map(s => `https://www.exportimportdata.in/blogs/${s}-importers-in-${cs}.aspx`),
    ...(cs === 'uae' ? [`https://www.exportimportdata.in/blogs/${s0}-importers-in-dubai.aspx`] : []),

    // ── Volza (shipment-level buyer data) ────────────────────────────────
    `https://www.volza.com/p/${s0}/import/import-in-${cs}/`,
    `https://www.volza.com/p/${s0}/import/`,

    // ── ExportBusinessMart ───────────────────────────────────────────────
    `https://www.exportbusinessmart.com/buyer.aspx?keyword=${encodeURIComponent(product)}`,

    // ── TradeFord ────────────────────────────────────────────────────────
    `https://www.tradeford.com/${s0}-importers/`,
    `https://www.tradeford.com/buyers/${s0}/`,

    // ── Cybex Exim (Indian customs data) ─────────────────────────────────
    `https://www.cybex.in/import-export/${s0}-importers-in-${cs}.aspx`,
    `https://www.cybex.in/import-export/${s0}-importers.aspx`,

    // ── Kompass + TradeKey ────────────────────────────────────────────────
    `https://www.kompass.com/t/${cs}/import/${s0}/`,
    `https://www.tradekey.com/products-buyer-lead/productname-${s0}/`,
  ]
  return [...new Set(urls)]
}

async function collectUrls(product, country, env, send) {
  const queries = [
    `"${product}" importers list ${country}`,
    `${product} import buyer companies ${country} contact email`,
    // Site-targeted queries for trade databases
    `site:volza.com "${product}" ${country}`,
    `site:cybex.in "${product}" importers`,
    `site:exportimportdata.in "${product}" importers ${country}`,
  ]
  const urls = []
  let searchNote = 'No search API'

  if (env.BRAVE_API_KEY) {
    let braveCount = 0
    // Run all queries in parallel for speed
    const results = await Promise.all(
      queries.map(q => braveSearch(q, env.BRAVE_API_KEY).catch(async (e) => {
        await send({ type: 'debug', message: `Brave error on "${q.slice(0, 40)}": ${e.message}` })
        return []
      }))
    )
    for (const r of results) { urls.push(...r); braveCount += r.length }
    searchNote = `Brave Search: ${braveCount} URLs across ${queries.length} queries`
  } else if (env.SERPER_API_KEY) {
    let cnt = 0
    const results = await Promise.all(queries.slice(0, 3).map(q => serperSearch(q, env.SERPER_API_KEY).catch(() => [])))
    for (const r of results) { urls.push(...r); cnt += r.length }
    searchNote = `Serper: ${cnt} URLs`
  } else {
    // Free fallback: Jina Search
    for (const q of queries.slice(0, 1)) {
      try { urls.push(...(await jinaSearchUrls(q))) } catch (_) {}
    }
    searchNote = `Jina Search: ${urls.length} URLs`
  }

  const dirUrls = directoryUrls(product, country)
  urls.push(...dirUrls)

  const seen = new Set()
  const deduped = urls.filter(u => { if (seen.has(u)) return false; seen.add(u); return true }).slice(0, 12)

  await send({ type: 'debug', message: `${searchNote} · ${dirUrls.length} directory URLs · ${deduped.length} total queued` })
  return deduped
}

// ── Stage 2: Crawl via Jina AI Reader ─────────────────────────────────────
// r.jina.ai renders JS pages, bypasses bot blocks, returns clean markdown.
// Free, no API key needed.

async function crawlPage(url) {
  const proxyUrl = `https://r.jina.ai/${url}`
  try {
    const r = await fetch(proxyUrl, {
      signal: sig(14000),
      headers: {
        Accept: 'text/plain',
        'X-No-Cache': 'true',
        'X-Return-Format': 'text',
      },
    })
    if (!r.ok) return null
    const text = await r.text()
    return text.trim().slice(0, 6000) || null
  } catch (_) {
    return null
  }
}

// ── Stage 3: Extract with GPT-4o-mini ─────────────────────────────────────

async function extractFromPage(text, pageUrl, product, country, apiKey) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', signal: sig(12000),
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 1500,
      messages: [
        {
          role: 'system',
          content: 'Extract importer/buyer company records from page text. Return ONLY a JSON array. Never invent data. Unknown fields = null.',
        },
        {
          role: 'user',
          content: `Source: ${pageUrl}\nProduct: ${product}  Country: ${country}\n\n${text}\n\nExtract all companies that import or buy ${product} in ${country}.\nJSON array (empty [] if none found):\n[{"company_name":"...","city":"...","website":"...","email":"...","phone":"...","business_type":"Importer|Distributor|Trader"}]\nReturn ONLY the JSON array.`,
        },
      ],
    }),
  })
  if (!r.ok) return []
  const d = await r.json()
  const raw = (d.choices?.[0]?.message?.content || '').trim()
    .replace(/^```json?\n?/, '').replace(/\n?```$/, '')
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter(x => x?.company_name) : []
  } catch (_) {
    const m = raw.match(/\[[\s\S]*]/)
    try { return JSON.parse(m?.[0] || '[]').filter(x => x?.company_name) } catch (_2) { return [] }
  }
}

// ── Stage 4: JS consolidation ─────────────────────────────────────────────

function normKey(name) {
  return name.toLowerCase()
    .replace(/\b(ltd|limited|sdn\.?bhd|pvt|llc|gmbh|corp|inc|co\.|company|trading|enterprise|group|holdings?|international|global|imports?|exports?|industries|services)\b/gi, '')
    .replace(/[^a-z0-9]/g, '').slice(0, 22)
}

function consolidate(rawBuyers, country) {
  const map = new Map()
  for (const { buyer, source } of rawBuyers) {
    const key = normKey(buyer.company_name)
    if (!key || key.length < 2) continue
    if (map.has(key)) {
      const e = map.get(key)
      for (const k of ['city', 'website', 'email', 'phone', 'business_type'])
        if (!e[k] && buyer[k]) e[k] = buyer[k]
      e._srcs.add(source)
    } else {
      map.set(key, { ...buyer, country: buyer.country || country, _srcs: new Set([source]) })
    }
  }
  return [...map.values()].map(({ _srcs, ...b }) => {
    const sources = [..._srcs]
    let conf = 40
    if (b.website) conf += 20
    if (b.email)   conf += 20
    if (b.phone)   conf += 10
    if (sources.length > 1) conf += 10
    return { ...b, confidence: Math.min(conf, 95), sources }
  }).sort((a, z) => z.confidence - a.confidence)
}

// ── Stage 4b: Optional GPT-4o final clean ─────────────────────────────────

async function gpt4oClean(buyers, product, country, apiKey) {
  if (buyers.length === 0) return buyers
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: sig(20000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o', temperature: 0, max_tokens: 3000,
        messages: [{
          role: 'user',
          content: `These are extracted ${product} importers in ${country}. Remove duplicates, fix formatting. Return JSON array with same schema.\n\n${JSON.stringify(buyers)}\n\nReturn ONLY the JSON array.`,
        }],
      }),
    })
    if (!r.ok) return buyers
    const raw = (((await r.json()).choices?.[0]?.message?.content) || '').replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    const cleaned = JSON.parse(raw)
    return Array.isArray(cleaned) && cleaned.length > 0 ? cleaned : buyers
  } catch (_) { return buyers }
}

// ── Main handler ───────────────────────────────────────────────────────────

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url)
  const country = u.searchParams.get('country') || ''
  const product  = u.searchParams.get('product')  || ''

  if (!country || !product) {
    return new Response(JSON.stringify({ error: 'country and product are required' }), {
      status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  const apiKey = env.OPENAI_API_KEY
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const enc = new TextEncoder()
  const send = (obj) => writer.write(enc.encode(`data: ${JSON.stringify(obj)}\n\n`))

  ;(async () => {
    try {
      if (!apiKey) {
        await send({ type: 'error', code: 'no_api_key', message: 'Add OPENAI_API_KEY in Cloudflare Pages → Settings → Environment Variables.' })
        return
      }

      await send({ type: 'status', message: `Searching for ${product} importer pages in ${country}…` })
      const urls = await collectUrls(product, country, env, send)

      await send({ type: 'status', message: `Crawling ${urls.length} pages via Jina Reader…` })

      const rawBuyers = []
      await Promise.all(urls.map(async (pageUrl) => {
        await send({ type: 'page_status', url: pageUrl, phase: 'crawling' })
        const text = await crawlPage(pageUrl)
        if (!text) {
          await send({ type: 'page_status', url: pageUrl, phase: 'failed', found: 0 })
          return
        }
        await send({ type: 'page_status', url: pageUrl, phase: 'extracting' })
        const buyers = await extractFromPage(text, pageUrl, product, country, apiKey)
        await send({ type: 'page_status', url: pageUrl, phase: 'done', found: buyers.length })
        for (const b of buyers) rawBuyers.push({ buyer: b, source: pageUrl })
      }))

      await send({ type: 'status', message: `Consolidating ${rawBuyers.length} raw records…` })
      let buyers = consolidate(rawBuyers, country)
      buyers = await gpt4oClean(buyers, product, country, apiKey)

      await send({ type: 'meta', searchMode: (env.BRAVE_API_KEY || env.SERPER_API_KEY) ? 'web_search' : 'directory_crawl' })

      if (buyers.length === 0) {
        await send({ type: 'no_results', message: `No ${product} importers could be extracted. Pages found may be paywalled or contain no company listings.` })
      } else {
        for (const buyer of buyers) await send({ type: 'buyer', ...buyer })
      }
      await send({ type: 'done', count: buyers.length })
    } catch (err) {
      const msg = err?.name === 'AbortError' ? 'Timed out — please try again.' : (err?.message || 'Search failed.')
      await send({ type: 'error', message: msg })
      await send({ type: 'done', count: 0 })
    } finally {
      writer.close()
    }
  })()

  return new Response(readable, { headers: SSE_HEADERS })
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
  })
}
