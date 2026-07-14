const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Access-Control-Allow-Origin': '*',
}

// Build the prompt sent to OpenAI — instructs the model to use its web search
// tool and return only verified company data in strict JSONL format.
function buildPrompt(product, country) {
  return `Search the web right now for real companies in ${country} that actively import ${product} from India.

STRICT RULES — follow exactly:
1. Only include companies you actually find through your live web search
2. Do NOT fabricate company names, websites, emails, phone numbers, or any other data
3. Set any field you cannot verify to null — never invent a value
4. Output ONLY valid JSONL (one JSON object per line), absolutely no other text

For each real verified company output exactly this format (one line per company):
{"company_name":"Full Company Name","country":"${country}","city":"city or null","website":"https://actual-url.com or null","email":"real@email.com or null","phone":"+countrycode-number or null","business_type":"Importer|Distributor|Trader|etc","confidence":85,"sources":["https://source-url.com"]}

Confidence guide (be honest):
- 90-100: Found on official company website AND import database record
- 70-89: Found on business directory with web presence confirmed
- 50-69: Single directory listing only, web presence uncertain
- Below 50: Very uncertain — omit these

If you find NO real companies through live web search, output exactly this one line:
{"no_results":true,"reason":"No verified ${product} importers found in ${country}"}

Output ONLY JSONL. No preamble, no explanation, no markdown.`
}

// Extract text content from an OpenAI Responses API response object.
function extractTextFromResponsesAPI(data) {
  return (data.output || [])
    .filter((o) => o.type === 'message')
    .flatMap((m) => m.content || [])
    .filter((c) => c.type === 'output_text')
    .map((c) => c.text)
    .join('')
}

// Parse JSONL text into buyer objects, returns { buyers, noResults, noResultsReason }.
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

async function callOpenAI(apiKey, prompt) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 28000) // 28 s — just inside CF's 30 s wall limit

  try {
    // Primary: Responses API with web_search_preview tool
    const r1 = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        tools: [{ type: 'web_search_preview' }],
        input: prompt,
        max_output_tokens: 3000,
      }),
    })

    if (r1.ok) {
      const data = await r1.json()
      clearTimeout(timer)
      return extractTextFromResponsesAPI(data)
    }

    // Fallback: Chat Completions with search-enabled model
    const r2 = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-search-preview',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 3000,
      }),
    })

    clearTimeout(timer)
    if (!r2.ok) throw new Error(`OpenAI API error ${r2.status}`)
    const data2 = await r2.json()
    return data2.choices?.[0]?.message?.content || ''
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
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
    try {
      if (!apiKey) {
        await send({ type: 'error', code: 'no_api_key', message: 'OpenAI API key not configured. Add OPENAI_API_KEY in Cloudflare Pages → Settings → Environment Variables.' })
        await send({ type: 'done', count: 0 })
        return
      }

      await send({ type: 'status', message: `Searching the web for ${product} importers in ${country}…` })

      const text = await callOpenAI(apiKey, buildPrompt(product, country))
      const { buyers, noResults, noResultsReason } = parseJSONL(text)

      if (noResults || buyers.length === 0) {
        const reason = noResultsReason || `No verified ${product} importers found in ${country}.`
        await send({ type: 'no_results', message: reason })
      } else {
        for (const buyer of buyers) {
          await send({ type: 'buyer', ...buyer })
        }
      }

      await send({ type: 'done', count: buyers.length })
    } catch (err) {
      const msg = err?.name === 'AbortError'
        ? 'Search timed out. OpenAI web search took too long. Please try again.'
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
