// POST /crawl-buyers
// Called nightly by GitHub Actions to pre-populate KV cache.
// Body: { product, country }   Header: Authorization: Bearer <CRAWL_SECRET>
// Env: OPENAI_API_KEY, BRAVE_API_KEY (optional), HUNTER_API_KEY (optional), KV_BUYERS_CACHE

const sig = (ms) => { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal }

function productSlug(p) {
  return p.toLowerCase().replace(/\s+/g, '-')
    .replace(/chillies$/, 'chilli').replace(/ies$/, 'i')
}

function countrySlug(c) {
  return c.toLowerCase()
    .replace(/united arab emirates/i, 'uae')
    .replace(/united kingdom/i, 'uk')
    .replace(/united states/i, 'usa')
    .replace(/saudi arabia/i, 'saudi-arabia')
    .replace(/south korea/i, 'south-korea')
    .replace(/south africa/i, 'south-africa')
    .replace(/sri lanka/i, 'sri-lanka')
    .replace(/\s+/g, '-')
}

export function kvKey(product, country) {
  return `v2:${productSlug(product)}:${countrySlug(country)}`
}

async function jinaFetch(url, timeout = 12000) {
  try {
    const r = await fetch(`https://r.jina.ai/${url}`, {
      signal: sig(timeout),
      headers: { Accept: 'text/plain', 'X-No-Cache': 'true', 'X-Return-Format': 'text' },
    })
    if (!r.ok) return ''
    return (await r.text()).slice(0, 8000)
  } catch { return '' }
}

// ── Stage 1: Discovery ────────────────────────────────────────────────────

async function scrapeVolza(product, country) {
  const ps = productSlug(product)
  const cs = countrySlug(country)
  const text = await jinaFetch(`https://www.volza.com/p/${ps}/import/import-in-${cs}/`, 14000)
  return { text, source: 'Volza', country }
}

async function scrapeImportYeti(product) {
  const text = await jinaFetch(
    `https://www.importyeti.com/search?query=${encodeURIComponent(product)}`,
    12000,
  )
  return { text, source: 'ImportYeti', country: 'United States' }
}

async function scrapeIndiaMart(product, country) {
  const text = await jinaFetch(
    `https://www.indiamart.com/buy/${productSlug(product)}.html`,
    10000,
  )
  return { text, source: 'IndiaMart', country }
}

async function extractCompanies(text, source, product, country, apiKey) {
  if (!text || text.length < 40) return []
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: sig(20000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini', temperature: 0, max_tokens: 2500,
        messages: [
          {
            role: 'system',
            content: `Extract importer/buyer company names from trade data. Return ONLY a JSON array.
Never invent companies. Use null for unknown fields.
hs_code_match: true if text explicitly links this company to this product or HS 09 spice category.
imports_from_india: true if text mentions India as shipment origin for this company.
recent_shipment: true if a shipment date within the last 18 months appears near this company.`,
          },
          {
            role: 'user',
            content: `Source: ${source} | Product: ${product} | Country context: ${country}

${text.slice(0, 5500)}

Extract companies that import, buy, or distribute "${product}".
[{"company_name":"...","city":"...","country":"${country}","business_type":"Importer|Distributor|Wholesaler|Retailer|Trader","last_shipment":"YYYY-MM or null","import_frequency":"e.g. 8×/yr or null","est_containers":"e.g. ~40 TEU/yr or null","hs_code_match":false,"imports_from_india":false,"recent_shipment":false}]`,
          },
        ],
      }),
    })
    if (!r.ok) return []
    const content = ((await r.json()).choices?.[0]?.message?.content || '')
      .replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
    const arr = JSON.parse(content.match(/\[[\s\S]*\]/)?.[0] || '[]')
    return Array.isArray(arr) ? arr.filter(x => x?.company_name?.trim()) : []
  } catch { return [] }
}

// ── Stage 2: Enrichment ───────────────────────────────────────────────────

async function resolveWebsite(companyName, country, braveKey) {
  if (!braveKey) return null
  const SKIP = ['linkedin.com','facebook.com','twitter.com','wikipedia.org',
    'indiamart.com','alibaba.com','volza.com','cybex.in','importyeti.com','crunchbase.com']
  try {
    const r = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(`"${companyName}" ${country} official site`)}&count=3`,
      { signal: sig(5000), headers: { Accept: 'application/json', 'X-Subscription-Token': braveKey } },
    )
    if (!r.ok) return null
    const results = (await r.json()).web?.results || []
    for (const res of results) {
      const url = res.url || ''
      if (!SKIP.some(d => url.includes(d))) {
        try { return new URL(url).origin } catch {}
      }
    }
  } catch {}
  return null
}

async function findEmail(website, hunterKey) {
  if (!hunterKey || !website) return null
  try {
    const domain = website.replace(/^https?:\/\//, '').split('/')[0]
    const r = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${hunterKey}&limit=1`,
      { signal: sig(5000) },
    )
    if (!r.ok) return null
    return (await r.json()).data?.emails?.[0]?.value || null
  } catch { return null }
}

async function findLinkedIn(companyName, braveKey) {
  if (!braveKey) return null
  try {
    const r = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(`site:linkedin.com/company "${companyName}"`)}&count=1`,
      { signal: sig(5000), headers: { Accept: 'application/json', 'X-Subscription-Token': braveKey } },
    )
    if (!r.ok) return null
    const results = (await r.json()).web?.results || []
    return results.find(x => x.url?.includes('linkedin.com/company'))?.url || null
  } catch { return null }
}

// ── Stage 3: Official website crawl ──────────────────────────────────────

async function crawlOfficialSite(website) {
  if (!website) return ''
  for (const path of ['', '/products', '/contact', '/about']) {
    const text = await jinaFetch(website + path, 8000)
    if (text && text.length > 200) return text.slice(0, 4000)
  }
  return ''
}

// ── Stage 4: Score + product fit ─────────────────────────────────────────

function calcBuyerScore(c) {
  let s = 0
  if (c._hs)     s += 35
  if (c._india)  s += 25
  if (c._recent) s += 20
  if (c.website) s += 5
  if (c.email)   s += 5
  if (c.linkedin) s += 5
  if (c._multi)  s += 5
  return Math.min(s, 100)
}

async function aiProductFit(company, siteText, product, apiKey) {
  const ctx = [
    company.business_type ? `Business type: ${company.business_type}` : '',
    siteText ? `Website excerpt: ${siteText.slice(0, 800)}` : '',
  ].filter(Boolean).join('\n')
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: sig(12000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini', temperature: 0, max_tokens: 100,
        messages: [{ role: 'user', content: `Does "${company.company_name}" (${company.country}) likely import or use "${product}"?\n${ctx}\nRespond ONLY: {"fit":"High|Medium|Low","reason":"one short sentence"}` }],
      }),
    })
    if (!r.ok) return { product_fit: 'Medium', product_fit_reason: '' }
    const content = ((await r.json()).choices?.[0]?.message?.content || '').trim()
    const parsed = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}')
    if (['High', 'Medium', 'Low'].includes(parsed.fit))
      return { product_fit: parsed.fit, product_fit_reason: parsed.reason || '' }
  } catch {}
  return { product_fit: 'Medium', product_fit_reason: '' }
}

// ── Dedup ─────────────────────────────────────────────────────────────────

function normKey(name) {
  return name.toLowerCase()
    .replace(/\b(ltd|limited|sdn\.?bhd|pvt|llc|gmbh|corp|inc|co\.|company|trading|group|holdings?|international|global)\b/gi, '')
    .replace(/[^a-z0-9]/g, '').slice(0, 20)
}

// ── Main handler ──────────────────────────────────────────────────────────

export async function onRequestPost({ request, env }) {
  const auth = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim()
  if (env.CRAWL_SECRET && auth !== env.CRAWL_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  let body = {}
  try { body = await request.json() } catch {}
  const product = (body.product || '').trim()
  const country = (body.country || '').trim()
  if (!product || !country) {
    return new Response(JSON.stringify({ error: 'product and country required' }), {
      status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  const apiKey = env.OPENAI_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not set' }), {
      status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  const braveKey = env.BRAVE_API_KEY || null
  const hunterKey = env.HUNTER_API_KEY || null
  const isUSA = /united states|usa/i.test(country)

  // Stage 1 — parallel discovery
  const scraped = await Promise.all([
    scrapeVolza(product, country),
    scrapeIndiaMart(product, country),
    ...(isUSA ? [scrapeImportYeti(product)] : []),
  ])

  const allExtracted = await Promise.all(
    scraped.map(s => extractCompanies(s.text, s.source, product, s.country, apiKey))
  )

  // Merge + dedup
  const map = new Map()
  for (let i = 0; i < allExtracted.length; i++) {
    const src = scraped[i].source
    for (const c of allExtracted[i]) {
      const key = normKey(c.company_name)
      if (!key || key.length < 2) continue
      if (map.has(key)) {
        const e = map.get(key)
        e._srcs.add(src)
        for (const f of ['city','website','email','business_type','last_shipment','import_frequency','est_containers'])
          if (!e[f] && c[f]) e[f] = c[f]
        if (c.hs_code_match) e._hs = true
        if (c.imports_from_india) e._india = true
        if (c.recent_shipment) e._recent = true
      } else {
        map.set(key, {
          ...c, country: c.country || country, _srcs: new Set([src]),
          _hs: !!c.hs_code_match, _india: !!c.imports_from_india, _recent: !!c.recent_shipment,
        })
      }
    }
  }

  let companies = [...map.values()].map(({ _srcs, hs_code_match, imports_from_india, recent_shipment, ...c }) => ({
    ...c, sources: [..._srcs], _multi: _srcs.size > 1,
  }))

  companies = companies.slice(0, 12)

  // Stage 2 — enrich (parallel)
  await Promise.all(companies.map(async (c) => {
    if (!c.website) c.website = await resolveWebsite(c.company_name, country, braveKey)
    const [email, linkedin] = await Promise.all([
      findEmail(c.website, hunterKey),
      findLinkedIn(c.company_name, braveKey),
    ])
    if (email && !c.email) c.email = email
    if (linkedin) c.linkedin = linkedin
  }))

  // Stage 3 — crawl official sites (parallel)
  const siteTexts = await Promise.all(companies.map(c => crawlOfficialSite(c.website)))

  // Stage 4 — score + fit (parallel)
  await Promise.all(companies.map(async (c, i) => {
    c.buyer_score = calcBuyerScore(c)
    const fit = await aiProductFit(c, siteTexts[i], product, apiKey)
    Object.assign(c, fit)
    delete c._hs; delete c._india; delete c._recent; delete c._multi
  }))

  companies.sort((a, b) => (b.buyer_score || 0) - (a.buyer_score || 0))

  // Stage 5 — write to KV
  const key = kvKey(product, country)
  const record = { product, country, buyers: companies, cached_at: new Date().toISOString(), source_version: 'v2' }
  if (env.KV_BUYERS_CACHE) {
    await env.KV_BUYERS_CACHE.put(key, JSON.stringify(record), { expirationTtl: 90000 })
  }

  return new Response(JSON.stringify({ ok: true, count: companies.length, key, cached_at: record.cached_at }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  })
}
