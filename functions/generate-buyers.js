const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Access-Control-Allow-Origin': '*',
}

// Prompt for models with live web search (paid plan)
function webSearchPrompt(product, country) {
  return `Search the web right now for real companies in ${country} that actively import ${product} from India.

STRICT RULES:
1. Only include companies you actually find through live web search
2. Do NOT fabricate company names, websites, emails, or phone numbers — set unknown fields to null
3. Output ONLY valid JSONL (one JSON object per line), no other text

Format per company:
{"company_name":"Full Name","country":"${country}","city":"city or null","website":"https://url or null","email":"email or null","phone":"+num or null","business_type":"Importer|Distributor|Trader","confidence":85,"sources":["https://source-url.com"]}

Confidence: 90-100 = official site + import record | 70-89 = directory + confirmed web presence | 50-69 = single directory | omit below 50

If NO real companies found: {"no_results":true,"reason":"No verified ${product} importers found in ${country}"}

Output ONLY JSONL.`
}

// Prompt for gpt-4o-mini (free tier) — uses training knowledge, not live search
function knowledgePrompt(product, country) {
  return `From your training knowledge, list real companies in ${country} that are known importers of ${product} from India.

STRICT RULES:
1. Only include companies you have genuinely seen in your training data
2. Do NOT invent company names, emails, phone numbers, or websites
3. Set any field you are not confident about to null
4. Output ONLY valid JSONL (one JSON object per line), no other text

Format per company:
{"company_name":"Full Name","country":"${country}","city":"city or null","website":"https://url or null","email":null,"phone":null,"business_type":"Importer|Distributor|Trader","confidence":55,"sources":["AI knowledge base"]}

If you don't know any real companies for this combination: {"no_results":true,"reason":"No known ${product} importers in ${country} in training data"}

Output ONLY JSONL.`
}

function extractResponsesAPIText(data) {
  return (data.output || [])
    .filter((o) => o.type === 'message')
    .flatMap((m) => m.content || [])
    .filter((c) => c.type === 'output_text')
    .map((c) => c.text)
    .join('')
}

function parseJSONL(text) {
  const buyers = []
  let noResults = false
  let noResultsReason = ''

  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t.startsWith('{')) continue
    try {
      const obj = JSON.parse(t)
      if (obj.no_results) {
        noResults = true
        noResultsReason = obj.reason || ''
      } else if (obj.company_name) {
        buyers.push(obj)
      }
    } catch (_) {}
  }

  return { buyers, noResults, noResultsReason }
}

// Returns { text, searchMode } where searchMode is 'web_search' | 'knowledge' | throws on hard failure
async function callOpenAI(apiKey, product, country, signal) {
  // ── Strategy 1: Responses API + web_search_preview (paid plan) ──────────
  try {
    const r1 = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        tools: [{ type: 'web_search_preview' }],
        input: webSearchPrompt(product, country),
        max_output_tokens: 3000,
      }),
    })
    if (r1.ok) {
      const data = await r1.json()
      const text = extractResponsesAPIText(data)
      if (text.trim()) return { text, searchMode: 'web_search' }
    }
  } catch (_) {}

  // ── Strategy 2: gpt-4o-search-preview via Chat Completions (paid plan) ──
  try {
    const r2 = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-search-preview',
        messages: [{ role: 'user', content: webSearchPrompt(product, country) }],
        max_tokens: 3000,
      }),
    })
    if (r2.ok) {
      const data = await r2.json()
      const text = data.choices?.[0]?.message?.content || ''
      // Only accept if the response actually contains JSON lines (not an error narrative)
      if (text.trim() && text.split('\n').some((l) => l.trim().startsWith('{'))) {
        return { text, searchMode: 'web_search' }
      }
    }
  } catch (_) {}

  // ── Strategy 3: gpt-4o-mini — knowledge-based, free tier ────────────────
  const r3 = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: knowledgePrompt(product, country) }],
      max_tokens: 2000,
      temperature: 0.2,
    }),
  })

  if (!r3.ok) {
    const errBody = await r3.json().catch(() => ({}))
    const msg = errBody?.error?.message || `HTTP ${r3.status}`
    throw new Error(`OpenAI API error: ${msg}`)
  }

  const data3 = await r3.json()
  const text3 = data3.choices?.[0]?.message?.content || ''
  return { text: text3, searchMode: 'knowledge' }
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const country = url.searchParams.get('country') || ''
  const product = url.searchParams.get('product') || ''

  if (!country || !product) {
    return new Response(JSON.stringify({ error: 'country and product are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  const apiKey = env.OPENAI_API_KEY
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()
  const send = (obj) => writer.write(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))

  ;(async () => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 28000)

    try {
      if (!apiKey) {
        await send({ type: 'error', code: 'no_api_key', message: 'OpenAI API key not configured. Add OPENAI_API_KEY in Cloudflare Pages → Settings → Environment Variables.' })
        return
      }

      await send({ type: 'status', message: `Searching for ${product} importers in ${country}…` })

      const { text, searchMode } = await callOpenAI(apiKey, product, country, controller.signal)
      clearTimeout(timer)

      // Send search mode so the UI can show the right badge
      await send({ type: 'meta', searchMode })

      // If the model returned a narrative instead of JSONL, treat as no results
      const hasJSON = text.trim() && text.split('\n').some((l) => l.trim().startsWith('{'))
      if (!hasJSON) {
        await send({ type: 'no_results', message: `No ${product} importers found in ${country}.` })
        return
      }

      const { buyers, noResults, noResultsReason } = parseJSONL(text)

      if (noResults || buyers.length === 0) {
        await send({ type: 'no_results', message: noResultsReason || `No verified ${product} importers found in ${country}.` })
      } else {
        for (const buyer of buyers) {
          await send({ type: 'buyer', ...buyer })
        }
      }

      await send({ type: 'done', count: buyers.length })
    } catch (err) {
      clearTimeout(timer)
      const msg = err?.name === 'AbortError'
        ? 'Search timed out. Please try again.'
        : err?.message || 'Search failed. Please try again.'
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
