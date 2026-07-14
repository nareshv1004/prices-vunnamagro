const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Access-Control-Allow-Origin': '*',
}

// ── Utilities ──────────────────────────────────────────────────────────────

function sig(ms) {
  const c = new AbortController()
  setTimeout(() => c.abort(), ms)
  return c.signal
}

function shortUrl(url) {
  try { return new URL(url).hostname + new URL(url).pathname.slice(0, 40) } catch (_) { return url.slice(0, 50) }
}

// ── Stage 1: Collect candidate URLs ───────────────────────────────────────

async function braveSearch(query, key) {
  const r = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=6&result_filter=web`,
    { signal: sig(8000), headers: { Accept: 'application/json', 'X-Subscription-Token': key } },
  )
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    throw new Error(`Brave ${r.status}: ${body.slice(0, 120)}`)
  }
  const d = await r.json()
  return (d.web?.results || []).map((x) => x.url).filter(Boolean)
}

async function serperSearch(query, key) {
  const r = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    signal: sig(8000),
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num: 6 }),
  })
  if (!r.ok) throw new Error(`Serper ${r.status}`)
  const d = await r.json()
  return (d.organic || []).map((x) => x.link).filter(Boolean)
}

// Known trade directory URL patterns — tries multiple product slug variants
function directoryUrls(product, country) {
  const base = product.toLowerCase()
  // Build slug variants: full → drop first word → last word → chilli/chillies normalisation
  const words = base.split(/\s+/)
  const variants = [
    words.join('-'),
    words.slice(1).join('-'),
    words[words.length - 1],
    words.join('-').replace(/chillies/, 'chilli').replace(/chilli$/, 'chilli'),
    words.join('-').replace(/chilli$/, 'chillies'),
  ].filter((v, i, a) => v.length > 2 && a.indexOf(v) === i).slice(0, 3)

  const cs = country.toLowerCase()
    .replace(/\bunited arab emirates\b/, 'uae')
    .replace(/\bunited kingdom\b/, 'uk')
    .replace(/\bunited states\b/, 'usa')
    .replace(/\s+/g, '-')

  const urls = []
  for (const v of variants) {
    urls.push(`https://www.exportimportdata.in/blogs/${v}-importers-in-${cs}.aspx`)
  }
  urls.push(`https://www.kompass.com/t/${cs}/import/${variants[0]}/`)
  urls.push(`https://www.tradekey.com/products-buyer-lead/productname-${variants[0]}/`)
  return urls
}

async function collectUrls(product, country, env, send) {
  const queries = [
    `"${product}" importers list ${country}`,
    `${product} import buyer companies ${country} contact email`,
    `${country} "${product}" importer directory trade`,
  ]
  const urls = []
  let braveError = null

  if (env.BRAVE_API_KEY) {
    await send({ type: 'status', message: 'Running Brave web search…' })
    for (const q of queries.slice(0, 2)) {
      try {
        const r = await braveSearch(q, env.BRAVE_API_KEY)
        urls.push(...r)
      } catch (e) {
        braveError = e.message
      }
    }
    if (braveError && urls.length === 0) {
      await send({ type: 'debug', message: `Brave Search error: ${braveError}` })
    } else {
      await send({ type: 'debug', message: `Brave Search returned ${urls.length} URLs` })
    }
  } else if (env.SERPER_API_KEY) {
    await send({ type: 'status', message: 'Running Google web search (Serper)…' })
    for (const q of queries.slice(0, 2)) {
      try { urls.push(...(await serperSearch(q, env.SERPER_API_KEY))) } catch (_) {}
    }
  }

  const dirUrls = directoryUrls(product, country)
  urls.push(...dirUrls)

  const seen = new Set()
  const deduped = urls.filter((u) => { if (seen.has(u)) return false; seen.add(u); return true }).slice(0, 8)
  await send({ type: 'debug', message: `Queuing ${deduped.length} pages: ${deduped.map(shortUrl).join(' | ')}` })
  return deduped
}

// ── Stage 2: Crawl pages ───────────────────────────────────────────────────

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

async function crawlPage(url) {
  try {
    const r = await fetch(url, {
      signal: sig(6000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
    if (!r.ok) return null
    const html = await r.text()
    return stripHtml(html).slice(0, 5000)
  } catch (_) {
    return null
  }
}

// ── Stage 3: Extract with GPT-4o-mini (one call per page) ─────────────────

async function extractFromPage(text, pageUrl, product, country, apiKey) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal: sig(12000),
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 1500,
      messages: [
        {
          role: 'system',
          content: 'Extract importer/buyer company records from web page text. Return ONLY a JSON array. Never invent data. Unknown fields = null.',
        },
        {
          role: 'user',
          content: `Source: ${pageUrl}\nProduct: ${product}  Country: ${country}\n\n${text}\n\nExtract companies that import ${product} in ${country}.\nJSON array:\n[{"company_name":"...","city":"...","website":"...","email":"...","phone":"...","business_type":"Importer|Distributor|Trader"}]\nReturn ONLY the JSON array.`,
        },
      ],
    }),
  })
  if (!r.ok) return []
  const d = await r.json()
  const raw = (d.choices?.[0]?.message?.content || '').trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '')
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((x) => x?.company_name) : []
  } catch (_) {
    const m = raw.match(/\[[\s\S]*]/)
    try { return JSON.parse(m?.[0] || '[]').filter((x) => x?.company_name) } catch (_2) { return [] }
  }
}

// ── Stage 4: JS consolidation ─────────────────────────────────────────────

function normKey(name) {
  return name
    .toLowerCase()
    .replace(/\b(ltd|limited|sdn\.?bhd|pvt|llc|gmbh|corp|inc|co\.|company|trading|enterprise|group|holdings?|international|global|imports?|exports?|industries|services)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 22)
}

function mergeFields(target, src) {
  for (const k of ['city', 'website', 'email', 'phone', 'business_type']) {
    if (!target[k] && src[k]) target[k] = src[k]
  }
}

function consolidate(rawBuyers, country) {
  const map = new Map()
  for (const { buyer, source } of rawBuyers) {
    const key = normKey(buyer.company_name)
    if (!key || key.length < 2) continue
    if (map.has(key)) {
      mergeFields(map.get(key), buyer)
      map.get(key)._srcs.add(source)
    } else {
      map.set(key, { ...buyer, country: buyer.country || country, _srcs: new Set([source]) })
    }
  }
  return [...map.values()]
    .map(({ _srcs, ...b }) => {
      const sources = [..._srcs]
      let conf = 40
      if (b.website) conf += 20
      if (b.email)   conf += 20
      if (b.phone)   conf += 10
      if (sources.length > 1) conf += 10
      return { ...b, confidence: Math.min(conf, 95), sources }
    })
    .sort((a, z) => z.confidence - a.confidence)
}

// ── Stage 4b: Optional GPT-4o final consolidation ─────────────────────────

async function gpt4oClean(buyers, product, country, apiKey) {
  if (buyers.length === 0) return buyers
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: sig(20000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0,
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: `These are extracted ${product} importers in ${country}. Remove duplicates, fix formatting, keep all verified fields. Return as JSON array with same schema.\n\n${JSON.stringify(buyers)}\n\nReturn ONLY the JSON array.`,
        }],
      }),
    })
    if (!r.ok) return buyers
    const d = await r.json()
    const raw = (d.choices?.[0]?.message?.content || '').replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    const cleaned = JSON.parse(raw)
    return Array.isArray(cleaned) && cleaned.length > 0 ? cleaned : buyers
  } catch (_) {
    return buyers
  }
}

// ── Main handler ───────────────────────────────────────────────────────────

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url)
  const country = u.searchParams.get('country') || ''
  const product  = u.searchParams.get('product')  || ''

  if (!country || !product) {
    return new Response(JSON.stringify({ error: 'country and product are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
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

      // Stage 1: Search
      await send({ type: 'status', message: `Searching for ${product} importer pages in ${country}…` })
      const urls = await collectUrls(product, country, env, send)

      // Stage 2+3: Crawl + Extract concurrently, emit page_status per URL
      await send({ type: 'status', message: `Crawling ${urls.length} pages…` })

      const rawBuyers = []
      await Promise.all(
        urls.map(async (pageUrl) => {
          // Notify start
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
        }),
      )

      // Stage 4: Consolidate
      await send({ type: 'status', message: `Consolidating ${rawBuyers.length} raw records…` })
      let buyers = consolidate(rawBuyers, country)
      buyers = await gpt4oClean(buyers, product, country, apiKey)

      const searchMode = (env.BRAVE_API_KEY || env.SERPER_API_KEY) ? 'web_search' : 'directory_crawl'
      await send({ type: 'meta', searchMode })

      if (buyers.length === 0) {
        await send({
          type: 'no_results',
          message: `No ${product} importers could be extracted from the pages found. The pages may be behind login walls or lack structured company data.`,
        })
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
