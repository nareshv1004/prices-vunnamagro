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

// ── Stage 1: Collect candidate URLs ───────────────────────────────────────
// Tries Brave Search → Serper → known trade directories (in that order).
// All three are additive: known dirs are always appended as a baseline.

async function braveSearch(query, key) {
  const r = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=6`,
    { signal: sig(8000), headers: { Accept: 'application/json', 'X-Subscription-Token': key } },
  )
  if (!r.ok) return []
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
  if (!r.ok) return []
  const d = await r.json()
  return (d.organic || []).map((x) => x.link).filter(Boolean)
}

function directoryUrls(product, country) {
  const ps = product.toLowerCase().replace(/\s+/g, '-')
  const cs = country.toLowerCase()
    .replace(/\bunited arab emirates\b/, 'uae')
    .replace(/\bunited kingdom\b/, 'uk')
    .replace(/\bunited states\b/, 'usa')
    .replace(/\s+/g, '-')
  return [
    `https://www.exportimportdata.in/blogs/${ps}-importers-in-${cs}.aspx`,
    `https://www.kompass.com/t/${cs}/import/${ps}/`,
    `https://www.tradekey.com/products-buyer-lead/productname-${ps}/`,
  ]
}

async function collectUrls(product, country, env) {
  const queries = [
    `"${product}" importer ${country} company contact`,
    `${product} import buyer ${country} trade directory`,
  ]
  const urls = []

  if (env.BRAVE_API_KEY) {
    await Promise.all(
      queries.map((q) => braveSearch(q, env.BRAVE_API_KEY).then((r) => urls.push(...r)).catch(() => {})),
    )
  } else if (env.SERPER_API_KEY) {
    await Promise.all(
      queries.map((q) => serperSearch(q, env.SERPER_API_KEY).then((r) => urls.push(...r)).catch(() => {})),
    )
  }

  urls.push(...directoryUrls(product, country))

  const seen = new Set()
  return urls.filter((u) => { if (seen.has(u)) return false; seen.add(u); return true }).slice(0, 7)
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
          content:
            'Extract buyer/importer company records from web page text. Return ONLY a JSON array. Never invent data not present in the text. Unknown fields = null.',
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

// ── Stage 4: JS consolidation (dedup + merge + confidence) ────────────────

function normKey(name) {
  return name
    .toLowerCase()
    .replace(
      /\b(ltd|limited|sdn\.?bhd|pvt|llc|gmbh|corp|inc|co\.|company|trading|enterprise|group|holdings?|international|global|imports?|exports?|industries|services)\b/gi,
      '',
    )
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
// Tries gpt-4o first; silently falls back to the JS-consolidated list if
// the model is unavailable (free tier) or returns unusable output.

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
        messages: [
          {
            role: 'user',
            content: `These are extracted ${product} importers in ${country}. Remove duplicates, fix formatting, keep all verified fields. Return as JSON array with same schema.\n\n${JSON.stringify(buyers)}\n\nReturn ONLY the JSON array.`,
          },
        ],
      }),
    })
    if (!r.ok) return buyers
    const d = await r.json()
    const raw = (d.choices?.[0]?.message?.content || '').replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    const cleaned = JSON.parse(raw)
    return Array.isArray(cleaned) && cleaned.length > 0 ? cleaned : buyers
  } catch (_) {
    return buyers // fall back silently
  }
}

// ── Main Cloudflare Pages Function ─────────────────────────────────────────

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

      // ── 1. Search ─────────────────────────────────────────────────────────
      await send({ type: 'status', message: `Finding ${product} importer pages for ${country}…` })
      const urls = await collectUrls(product, country, env)
      await send({ type: 'status', message: `Crawling ${urls.length} pages and extracting data…` })

      // ── 2+3. Crawl + Extract (all pages concurrently for speed) ───────────
      const rawBuyers = []
      await Promise.all(
        urls.map(async (pageUrl) => {
          const text = await crawlPage(pageUrl)
          if (!text) return
          const buyers = await extractFromPage(text, pageUrl, product, country, apiKey)
          for (const b of buyers) rawBuyers.push({ buyer: b, source: pageUrl })
        }),
      )

      await send({ type: 'status', message: `Consolidating ${rawBuyers.length} raw records…` })

      // ── 4. Consolidate ────────────────────────────────────────────────────
      let buyers = consolidate(rawBuyers, country)

      // ── 4b. GPT-4o clean pass (best-effort, free-tier safe) ───────────────
      buyers = await gpt4oClean(buyers, product, country, apiKey)

      const searchMode = (env.BRAVE_API_KEY || env.SERPER_API_KEY) ? 'web_search' : 'directory_crawl'
      await send({ type: 'meta', searchMode })

      if (buyers.length === 0) {
        await send({
          type: 'no_results',
          message: `No ${product} importers extracted. Add BRAVE_API_KEY (brave.com/search/api/) for broader web coverage.`,
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
