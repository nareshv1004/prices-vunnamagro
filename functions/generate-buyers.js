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
    .replace(/\bunited arab emirates\b/i, 'uae')
    .replace(/\bunited kingdom\b/i, 'uk')
    .replace(/\bunited states\b/i, 'usa')
    .replace(/\s+/g, '-')
}

function isUAE(country) {
  const c = country.toLowerCase()
  return c.includes('uae') || c.includes('emirates') || c.includes('dubai')
    || c.includes('sharjah') || c.includes('abu dhabi')
}

// Generate all reasonable URL slug variants — NO length cap.
function productSlugs(product) {
  const words = product.toLowerCase().trim().split(/\s+/)
  const base = words.join('-')
  return [...new Set([
    base,
    words.slice(1).join('-'),             // drop first word
    words[words.length - 1],             // last word only
    base.replace(/chillies/g, 'chilli'), // singular — Volza uses this
    base.replace(/peppers?/g, 'chilli'),
    base.replace(/\bchilli\b/g, 'chillies'),
    base.replace(/ies$/, 'i'),            // generic plural→singular
    base.replace(/s$/, ''),               // generic trailing-s strip
  ])].filter(s => s && s.length > 2)
}

// ── Source A: Brave Search — snippets ─────────────────────────────────────
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

// ── Source B: Jina Search ─────────────────────────────────────────────────
async function jinaSearch(query) {
  try {
    const r = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
      signal: sig(22000),
      headers: { Accept: 'text/plain', 'X-No-Cache': 'true' },
    })
    if (!r.ok) return ''
    return (await r.text()).slice(0, 14000)
  } catch (_) { return '' }
}

// ── Source C: Directory crawl via Jina Reader ─────────────────────────────
function buildDirectoryUrls(product, country) {
  const slugs = productSlugs(product)
  const cs = countrySlug(country)
  // Prefer singular slug for Volza/Cybex — those sites index by singular form
  const singularSlug = slugs.find(s => !s.endsWith('ies') && !s.endsWith('es')) || slugs[0]
  const urls = []

  // ── Tier 1: Sites that show company names (even behind partial paywall) ──
  urls.push(`https://www.volza.com/p/${singularSlug}/import/import-in-${cs}/`)
  urls.push(`https://www.cybex.in/import-export/${singularSlug}-importers-in-${cs}.aspx`)
  if (isUAE(country)) {
    urls.push('https://yellowpages.ae/en/search/food-stuff-importers-exporters-dubai')
    urls.push('https://yellowpages.ae/en/search/spices-herbs-importers-dubai')
  }
  urls.push(`https://www.tradekey.com/products-buyer-lead/productname-${singularSlug}/`)

  // ── Tier 2: exportimportdata.in — limit to 3 slug variants only ──────────
  for (const s of slugs.slice(0, 3)) {
    urls.push(`https://www.exportimportdata.in/blogs/${s}-importers-in-${cs}.aspx`)
    if (isUAE(country)) {
      urls.push(`https://www.exportimportdata.in/blogs/${s}-importers-in-dubai.aspx`)
    }
  }

  return [...new Set(urls)]  // No slice — all are high-value
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
// Prompt is deliberately permissive: extract any company MENTIONED near the
// topic, even without full contact details. Consolidation handles quality.

async function extract(text, sourceLabel, product, country, apiKey) {
  if (!text || text.length < 30) return []
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', signal: sig(18000),
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 2500,
      messages: [
        {
          role: 'system',
          content: `Extract importer/buyer/trader company names from text.
RULES:
- Extract every company or business name mentioned, even if contact details are missing.
- Include companies that import, buy, distribute, or trade the product — even if their country is only implied.
- Do NOT filter by country strictly; a company mentioned in a UAE context is fine.
- Return [] only if the text is a login/paywall page with zero company data.
- Never invent companies not present in the text.
Return ONLY a JSON array.`,
        },
        {
          role: 'user',
          content: `Text source: ${sourceLabel}
Product: ${product}
Country context: ${country}

${text}

Extract all companies related to importing or buying "${product}".
JSON array:
[{"company_name":"...","city":"...","country":"...","website":"...","email":"...","phone":"...","business_type":"Importer|Distributor|Trader"}]
Return ONLY the JSON array. Use null for unknown fields.`,
        },
      ],
    }),
  })
  if (!r.ok) return []
  const raw = ((await r.json()).choices?.[0]?.message?.content || '')
    .trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '')
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter(x => x?.company_name?.trim()) : []
  } catch (_) {
    const m = raw.match(/\[[\s\S]*]/)
    try { return JSON.parse(m?.[0] || '[]').filter(x => x?.company_name?.trim()) } catch (_2) { return [] }
  }
}

// ── Knowledge fallback ─────────────────────────────────────────────────────
// Ask broadly for food/spice trading companies in the country — GPT-4o-mini
// knows major companies even if it doesn't know specific product importers.

async function knowledgeFallback(product, country, apiKey, send) {
  await send({ type: 'debug', message: 'No web data found — trying AI knowledge fallback…' })
  await send({ type: 'page_status', url: 'ai-knowledge-fallback', phase: 'crawling' })
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: sig(20000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini', temperature: 0, max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `List well-known food importing, spice trading, or agricultural commodity companies in ${country}.
These should be real companies that import food products or spices from countries like India.
They don't need to be specific to "${product}" — any food/spice importer or distributor in ${country} is useful.
Include major retail chains, food distributors, trading houses, or commodity importers.
Aim for 8-15 real companies. Only omit a company if you're genuinely uncertain it exists.
Return ONLY a JSON array:
[{"company_name":"...","city":"...","country":"${country}","business_type":"Importer|Distributor|Trader|Retailer","website":"..."}]
Use null for unknown website. Return [] only if you know nothing about food/spice companies in this country.`,
        }],
      }),
    })
    if (!r.ok) { await send({ type: 'page_status', url: 'ai-knowledge-fallback', phase: 'failed', found: 0 }); return [] }
    const raw = ((await r.json()).choices?.[0]?.message?.content || '').replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    const arr = JSON.parse(raw)
    const buyers = Array.isArray(arr) ? arr.filter(x => x?.company_name?.trim()) : []
    await send({ type: 'page_status', url: 'ai-knowledge-fallback', phase: 'done', found: buyers.length })
    await send({ type: 'debug', message: `AI knowledge → ${buyers.length} food/spice companies` })
    return buyers.map(b => ({ buyer: b, source: 'AI Knowledge' }))
  } catch (_) {
    await send({ type: 'page_status', url: 'ai-knowledge-fallback', phase: 'failed', found: 0 })
    return []
  }
}

// ── Consolidation ─────────────────────────────────────────────────────────

function normKey(name) {
  return name.toLowerCase()
    .replace(/\b(ltd|limited|sdn\.?bhd|pvt|llc|gmbh|corp|inc|co\.|company|trading|enterprise|group|holdings?|international|global|imports?|exports?|industries|services|fze|fzco|llc|dmcc)\b/gi, '')
    .replace(/[^a-z0-9]/g, '').slice(0, 22)
}

function consolidate(rawBuyers, country) {
  const map = new Map()
  for (const { buyer, source } of rawBuyers) {
    const key = normKey(buyer.company_name)
    if (!key || key.length < 2) continue
    if (map.has(key)) {
      const e = map.get(key)
      for (const k of ['city', 'country', 'website', 'email', 'phone', 'business_type'])
        if (!e[k] && buyer[k]) e[k] = buyer[k]
      e._srcs.add(source)
    } else {
      map.set(key, { ...buyer, country: buyer.country || country, _srcs: new Set([source]) })
    }
  }
  return [...map.values()].map(({ _srcs, ...b }) => {
    const sources = [..._srcs]
    const isAIOnly = sources.every(s => s === 'AI Knowledge')
    let conf = isAIOnly ? 25 : 40
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
        messages: [{ role: 'user', content: `Clean and deduplicate these ${product} importers in ${country}. Fix company name formatting. Remove obvious duplicates. Keep all fields. Return ONLY a JSON array.\n\n${JSON.stringify(buyers)}` }],
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
  const country = (u.searchParams.get('country') || '').trim()
  const product  = (u.searchParams.get('product')  || '').trim()

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

      await send({ type: 'status', message: `Searching for ${product} buyers in ${country}…` })

      const rawBuyers = []
      const dirUrls = buildDirectoryUrls(product, country)
      await send({ type: 'debug', message: `Directory targets: ${dirUrls.join(' | ')}` })

      // ── A: Brave Search snippets ─────────────────────────────────────────
      const braveQueries = [
        `"${product}" importers buyers ${country} company`,
        `${product} import buyers list ${country} contact phone`,
        `site:exportimportdata.in ${product} importers ${country}`,
        ...(isUAE(country) ? [
          // Target company websites, NOT database aggregators
          `"${product}" importer buyer Dubai UAE -site:volza.com -site:cybex.in -site:exportgenius.com`,
          `site:yellowpages.ae spices food importers`,
          `Dubai UAE food stuff spice trading company import India`,
        ] : [
          `site:volza.com "${product}" ${country}`,
          `site:cybex.in ${product} importers ${country}`,
        ]),
      ]

      let braveUrls = []

      if (env.BRAVE_API_KEY) {
        await send({ type: 'status', message: 'Running Brave Search…' })
        const braveResults = await Promise.all(
          braveQueries.map(q => braveSearchFull(q, env.BRAVE_API_KEY).catch(() => ({ urls: [], snippetText: '' })))
        )
        const allSnippets = braveResults.map(r => r.snippetText).filter(Boolean).join('\n===\n')
        braveUrls = [...new Set(braveResults.flatMap(r => r.urls))]
        await send({ type: 'debug', message: `Brave returned ${braveUrls.length} URLs` })

        if (allSnippets.length > 50) {
          await send({ type: 'page_status', url: 'brave-search-snippets', phase: 'extracting' })
          const buyers = await extract(allSnippets.slice(0, 12000), 'Brave Search snippets', product, country, apiKey)
          await send({ type: 'page_status', url: 'brave-search-snippets', phase: 'done', found: buyers.length })
          for (const b of buyers) rawBuyers.push({ buyer: b, source: 'Brave Search' })
          await send({ type: 'debug', message: `Snippet extraction → ${buyers.length} companies` })
        }
      } else {
        await send({ type: 'debug', message: 'BRAVE_API_KEY not set — skipping web search snippets' })
      }

      // ── B: Jina Search ───────────────────────────────────────────────────
      const jinaQueries = [
        `${product} importers buyers ${country} company name contact`,
        ...(isUAE(country) ? [`Dubai UAE food spice importer trading company ${product}`] : []),
      ]
      await send({ type: 'status', message: 'Running Jina Search (full-page results)…' })

      for (const jq of jinaQueries) {
        const jinaLabel = `jina: ${jq.slice(0, 60)}`
        await send({ type: 'page_status', url: jinaLabel, phase: 'crawling' })
        const jinaText = await jinaSearch(jq)
        await send({ type: 'debug', message: `Jina Search returned ${jinaText?.length || 0} chars` })
        if (jinaText && jinaText.length > 100) {
          await send({ type: 'page_status', url: jinaLabel, phase: 'extracting' })
          const buyers = await extract(jinaText, 'Jina Search', product, country, apiKey)
          await send({ type: 'page_status', url: jinaLabel, phase: 'done', found: buyers.length })
          for (const b of buyers) rawBuyers.push({ buyer: b, source: 'Jina Search' })
          await send({ type: 'debug', message: `Jina extraction → ${buyers.length} companies` })
        } else {
          await send({ type: 'page_status', url: jinaLabel, phase: 'failed', found: 0 })
          await send({ type: 'debug', message: `Jina Search failed or empty (${jinaText?.length || 0} chars)` })
        }
      }

      // ── C: Directory crawls ──────────────────────────────────────────────
      // Skip known subscription-gated databases from Brave results.
      // dirUrls are already priority-ordered (Volza first, exportimportdata last).
      // Take up to 12 more non-database Brave URLs to crawl actual company pages.
      const DB_DOMAINS = ['volza.com','cybex.in','exportgenius.com','panjiva.com',
        'importyeti.com','seair.co.in','zauba.com','tradeford.com',
        'linkedin.com','facebook.com','twitter.com','instagram.com',
        'alibaba.com','indiamart.com','tradeindia.com']
      const bravePageTargets = braveUrls
        .filter(u => !DB_DOMAINS.some(d => u.includes(d)))
        .slice(0, 12)
      const crawlTargets = [...new Set([...dirUrls, ...bravePageTargets])]
      await send({ type: 'debug', message: `Crawling ${crawlTargets.length} pages (${dirUrls.length} directories + ${bravePageTargets.length} from Brave)` })
      await send({ type: 'status', message: `Crawling ${crawlTargets.length} pages…` })

      await Promise.all(crawlTargets.map(async pageUrl => {
        await send({ type: 'page_status', url: pageUrl, phase: 'crawling' })
        const text = await crawlViaJina(pageUrl)
        if (!text || text.length < 50) {
          await send({ type: 'page_status', url: pageUrl, phase: 'failed', found: 0 })
          await send({ type: 'debug', message: `✗ ${pageUrl.replace(/^https?:\/\//, '').slice(0, 60)} → empty/failed` })
          return
        }
        await send({ type: 'page_status', url: pageUrl, phase: 'extracting' })
        const buyers = await extract(text, pageUrl, product, country, apiKey)
        await send({ type: 'page_status', url: pageUrl, phase: 'done', found: buyers.length })
        await send({ type: 'debug', message: `${buyers.length > 0 ? '✓' : '○'} ${pageUrl.replace(/^https?:\/\//, '').slice(0, 60)} → ${text.length} chars → ${buyers.length} companies` })
        for (const b of buyers) rawBuyers.push({ buyer: b, source: pageUrl })
      }))

      // ── Knowledge fallback if nothing found yet ──────────────────────────
      if (rawBuyers.length === 0) {
        const kbBuyers = await knowledgeFallback(product, country, apiKey, send)
        rawBuyers.push(...kbBuyers)
      }

      // ── Consolidate ───────────────────────────────────────────────────────
      await send({ type: 'status', message: `Consolidating ${rawBuyers.length} raw records…` })
      let buyers = consolidate(rawBuyers, country)
      buyers = await gpt4oClean(buyers, product, country, apiKey)

      const hasAIOnly = buyers.length > 0 && buyers.every(b => b.sources?.every(s => s === 'AI Knowledge'))
      await send({ type: 'meta', searchMode: env.BRAVE_API_KEY ? 'web_search' : (hasAIOnly ? 'knowledge' : 'directory_crawl') })
      await send({ type: 'debug', message: `Final: ${buyers.length} unique companies` })

      if (buyers.length === 0) {
        await send({ type: 'no_results', message: `No ${product} importers could be found for ${country}. The debug lines above show what each source returned.` })
      } else {
        for (const buyer of buyers) await send({ type: 'buyer', ...buyer })
      }
      await send({ type: 'done', count: buyers.length })

    } catch (err) {
      const msg = err?.name === 'AbortError' ? 'Request timed out.' : (err?.message || 'Search failed.')
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
