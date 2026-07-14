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

function countrySlug(country) {
  return country.toLowerCase()
    .replace(/\bunited arab emirates\b/, 'uae')
    .replace(/\bunited kingdom\b/, 'uk')
    .replace(/\bunited states\b/, 'usa')
    .replace(/\s+/g, '-')
}

function productSlugs(product) {
  const words = product.toLowerCase().split(/\s+/)
  return [...new Set([
    words.join('-'),
    words.slice(1).join('-'),
    words[words.length - 1],
    words.join('-').replace(/chillies/g, 'chilli'),
    words.join('-').replace(/\bchilli\b/g, 'chillies'),
  ])].filter(s => s.length > 2).slice(0, 3)
}

// ── Source A: Brave Search — snippets + URLs ───────────────────────────────
// Brave returns rich descriptions for each result. Those snippets often contain
// company names directly — no page crawl needed. We also collect URLs to crawl.

async function braveSearchFull(query, key) {
  const r = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10&result_filter=web`,
    { signal: sig(8000), headers: { Accept: 'application/json', 'X-Subscription-Token': key } },
  )
  if (!r.ok) throw new Error(`Brave ${r.status}: ${(await r.text().catch(() => '')).slice(0, 80)}`)
  const d = await r.json()
  const results = d.web?.results || []
  return {
    urls: results.map(x => x.url).filter(Boolean),
    snippetText: results.map(x =>
      `Source: ${x.url}\nTitle: ${x.title || ''}\n${x.description || ''}\n${(x.extra_snippets || []).join(' ')}`
    ).join('\n---\n'),
  }
}

// ── Source B: Jina Search — search + full page content ────────────────────
// s.jina.ai does the search AND returns cleaned markdown of each result page.

async function jinaSearch(query) {
  const r = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
    signal: sig(20000),
    headers: { Accept: 'text/plain', 'X-No-Cache': 'true' },
  })
  if (!r.ok) return ''
  return (await r.text()).slice(0, 12000)
}

// ── Source C: Known public directories (crawled via Jina Reader) ───────────
// Only include sites that actually have public company listings (not paywalled).
// Volza/Cybex show a small preview before login — worth trying.

function publicDirectoryUrls(product, country) {
  const slugs = productSlugs(product)
  const cs = countrySlug(country)
  const s0 = slugs[0]
  return [...new Set([
    // exportimportdata.in — static HTML blog posts, reliably crawlable
    ...slugs.map(s => `https://www.exportimportdata.in/blogs/${s}-importers-in-${cs}.aspx`),
    ...(cs === 'uae' ? slugs.map(s => `https://www.exportimportdata.in/blogs/${s}-importers-in-dubai.aspx`) : []),
    // Volza — shows preview company names before paywall
    `https://www.volza.com/p/${s0}/import/import-in-${cs}/`,
    // Cybex — shows preview before login
    `https://www.cybex.in/import-export/${s0}-importers-in-${cs}.aspx`,
    // TradeKey — some buyer leads are public
    `https://www.tradekey.com/products-buyer-lead/productname-${s0}/`,
  ])]
}

async function crawlViaJina(url) {
  try {
    const r = await fetch(`https://r.jina.ai/${url}`, {
      signal: sig(14000),
      headers: { Accept: 'text/plain', 'X-No-Cache': 'true', 'X-Return-Format': 'text' },
    })
    if (!r.ok) return null
    return (await r.text()).trim().slice(0, 6000) || null
  } catch (_) { return null }
}

// ── Extraction: GPT-4o-mini ────────────────────────────────────────────────

async function extract(text, sourceLabel, product, country, apiKey) {
  if (!text || text.length < 20) return []
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', signal: sig(15000),
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: `Extract buyer/importer company records from text. Return ONLY a JSON array.
Rules: Only include companies mentioned in the text. Never invent data. Unknown fields = null.
If the text is a paywall/login page with no company data, return [].`,
        },
        {
          role: 'user',
          content: `Source: ${sourceLabel}\nProduct: ${product}  Country: ${country}\n\n${text}\n\nExtract all companies that import or buy ${product} in ${country}.\nJSON array:\n[{"company_name":"...","city":"...","website":"...","email":"...","phone":"...","business_type":"Importer|Distributor|Trader"}]\nReturn ONLY the JSON array.`,
        },
      ],
    }),
  })
  if (!r.ok) return []
  const raw = ((await r.json()).choices?.[0]?.message?.content || '')
    .trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '')
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter(x => x?.company_name) : []
  } catch (_) {
    const m = raw.match(/\[[\s\S]*]/)
    try { return JSON.parse(m?.[0] || '[]').filter(x => x?.company_name) } catch (_2) { return [] }
  }
}

// ── Consolidation ─────────────────────────────────────────────────────────

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

async function gpt4oClean(buyers, product, country, apiKey) {
  if (buyers.length === 0) return buyers
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: sig(20000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o', temperature: 0, max_tokens: 3000,
        messages: [{ role: 'user', content: `Clean and deduplicate these ${product} importers in ${country}. Fix formatting, remove obvious duplicates. Return JSON array with same schema.\n\n${JSON.stringify(buyers)}\n\nReturn ONLY the JSON array.` }],
      }),
    })
    if (!r.ok) return buyers
    const raw = ((await r.json()).choices?.[0]?.message?.content || '').replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    const out = JSON.parse(raw)
    return Array.isArray(out) && out.length > 0 ? out : buyers
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
  const send = obj => writer.write(enc.encode(`data: ${JSON.stringify(obj)}\n\n`))

  ;(async () => {
    try {
      if (!apiKey) {
        await send({ type: 'error', code: 'no_api_key', message: 'Add OPENAI_API_KEY in Cloudflare Pages → Settings → Environment Variables.' })
        return
      }

      await send({ type: 'status', message: `Gathering buyer intelligence for ${product} in ${country}…` })

      const rawBuyers = []
      const dirUrls = publicDirectoryUrls(product, country)

      // ── A: Brave Search snippets + URLs ─────────────────────────────────
      const braveQueries = [
        `"${product}" importers buyers ${country} company`,
        `${product} import buyers list ${country} contact`,
        `site:volza.com ${product} ${country}`,
        `site:exportimportdata.in ${product} importers ${country}`,
        `site:cybex.in ${product} importers ${country}`,
      ]

      let braveUrls = []

      if (env.BRAVE_API_KEY) {
        await send({ type: 'status', message: 'Running Brave Search queries…' })
        const braveResults = await Promise.all(
          braveQueries.map(q => braveSearchFull(q, env.BRAVE_API_KEY).catch(e => {
            return { urls: [], snippetText: '' }
          }))
        )

        // Collect all snippet text into one extraction call
        const allSnippets = braveResults.map(r => r.snippetText).filter(Boolean).join('\n===\n')
        braveUrls = [...new Set(braveResults.flatMap(r => r.urls))]

        await send({ type: 'debug', message: `Brave: ${braveUrls.length} URLs · extracting from ${braveResults.filter(r => r.snippetText).length} result sets` })

        if (allSnippets.length > 50) {
          await send({ type: 'page_status', url: 'brave-search-snippets', phase: 'extracting' })
          const buyers = await extract(allSnippets.slice(0, 10000), 'Brave Search snippets', product, country, apiKey)
          await send({ type: 'page_status', url: 'brave-search-snippets', phase: 'done', found: buyers.length })
          for (const b of buyers) rawBuyers.push({ buyer: b, source: 'Brave Search' })
          await send({ type: 'debug', message: `Snippets extraction: ${buyers.length} companies found` })
        }
      }

      // ── B: Jina Search — full content of top results ─────────────────────
      await send({ type: 'status', message: 'Running Jina Search for full-page content…' })
      await send({ type: 'page_status', url: 'jina-search', phase: 'crawling' })
      const jinaText = await jinaSearch(`${product} importers buyers list ${country} company contact`)
      if (jinaText && jinaText.length > 100) {
        await send({ type: 'page_status', url: 'jina-search', phase: 'extracting' })
        const buyers = await extract(jinaText, 'Jina Search', product, country, apiKey)
        await send({ type: 'page_status', url: 'jina-search', phase: 'done', found: buyers.length })
        for (const b of buyers) rawBuyers.push({ buyer: b, source: 'Jina Search' })
        await send({ type: 'debug', message: `Jina Search extraction: ${buyers.length} companies found` })
      } else {
        await send({ type: 'page_status', url: 'jina-search', phase: 'failed', found: 0 })
      }

      // ── C: Crawl public directories + top Brave URLs ──────────────────────
      // Merge known directories with top Brave URLs (deduplicated, max 8)
      const crawlTargets = [...new Set([...dirUrls, ...braveUrls])].slice(0, 8)
      await send({ type: 'status', message: `Crawling ${crawlTargets.length} pages via Jina Reader…` })

      await Promise.all(crawlTargets.map(async pageUrl => {
        await send({ type: 'page_status', url: pageUrl, phase: 'crawling' })
        const text = await crawlViaJina(pageUrl)
        if (!text) {
          await send({ type: 'page_status', url: pageUrl, phase: 'failed', found: 0 })
          return
        }
        await send({ type: 'page_status', url: pageUrl, phase: 'extracting' })
        const buyers = await extract(text, pageUrl, product, country, apiKey)
        await send({ type: 'page_status', url: pageUrl, phase: 'done', found: buyers.length })
        for (const b of buyers) rawBuyers.push({ buyer: b, source: pageUrl })
      }))

      // ── Consolidate ───────────────────────────────────────────────────────
      await send({ type: 'status', message: `Consolidating ${rawBuyers.length} raw records…` })
      let buyers = consolidate(rawBuyers, country)
      buyers = await gpt4oClean(buyers, product, country, apiKey)

      await send({ type: 'meta', searchMode: env.BRAVE_API_KEY ? 'web_search' : 'directory_crawl' })
      await send({ type: 'debug', message: `Final result: ${buyers.length} unique verified companies` })

      if (buyers.length === 0) {
        await send({ type: 'no_results', message: `No ${product} importers found in ${country}. Check the debug lines above to see which sources returned data.` })
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
