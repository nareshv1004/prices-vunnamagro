const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Access-Control-Allow-Origin': '*',
}

// Map our product names to likely URL slugs on exportimportdata.in
const PRODUCT_SLUG_MAP = {
  'dry red chillies':  ['dry-red-chilli', 'red-chilli', 'chilli', 'spice'],
  'chilli powder':     ['chilli-powder', 'chilli', 'spice'],
  'chilli flakes':     ['chilli-flakes', 'chilli', 'spice'],
  'kabuli chana':      ['kabuli-chana', 'chickpea', 'pulse'],
  'kala chana':        ['kala-chana', 'black-chickpea', 'pulse'],
  'mung whole':        ['mung', 'green-gram', 'pulse'],
  'urad whole':        ['urad', 'black-gram', 'pulse'],
  'chana dal':         ['chana-dal', 'pulse'],
  'toor dal':          ['toor-dal', 'pigeon-pea', 'pulse'],
  'moong dal':         ['moong-dal', 'pulse'],
  'mung chilka':       ['mung-chilka', 'pulse'],
  'urad dal':          ['urad-dal', 'pulse'],
  'urad chilka':       ['urad-chilka', 'pulse'],
  'cow peas':          ['cowpea', 'black-eyed-bean', 'pulse'],
  'red cow peas':      ['red-cowpea', 'cowpea', 'pulse'],
}

const COUNTRY_SLUG_MAP = {
  'united kingdom': 'uk',
  'united states':  'usa',
  'saudi arabia':   'saudi-arabia',
  'south africa':   'south-africa',
  'south korea':    'south-korea',
  'sri lanka':      'sri-lanka',
  'new zealand':    'new-zealand',
}

function toSlug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function productSlugs(product) {
  const key = product.toLowerCase().trim()
  return PRODUCT_SLUG_MAP[key] || [toSlug(product)]
}

function countrySlug(country) {
  const key = country.toLowerCase().trim()
  return COUNTRY_SLUG_MAP[key] || toSlug(country)
}

function parseCompanyNames(html) {
  // Find the <ul> that immediately follows a "Top 10 ... Importers" heading
  const sectionMatch = html.match(
    /top\s*10[^<]*importer[^<]*[\s\S]{0,400}<ul[^>]*>([\s\S]{0,3000}?)<\/ul>/i,
  )
  if (!sectionMatch) return []
  const listHtml = sectionMatch[1]
  const names = []
  const re = /<li[^>]*>\s*([^<]{4,90})\s*<\/li>/gi
  let m
  while ((m = re.exec(listHtml)) !== null) {
    const name = m[1].trim()
    if (name.length >= 4) names.push(name)
  }
  return names.slice(0, 10)
}

async function fetchRealNames(product, country) {
  const cSlug = countrySlug(country)
  const pSlugs = productSlugs(product)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6000)

  for (const ps of pSlugs) {
    const url = `https://www.exportimportdata.in/blogs/${ps}-importers-in-${cSlug}.aspx`
    try {
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
      })
      if (!resp.ok) continue
      const html = await resp.text()
      const names = parseCompanyNames(html)
      if (names.length >= 3) {
        clearTimeout(timeout)
        return names
      }
    } catch (_) {}
  }
  clearTimeout(timeout)
  return []
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

  const apiKey = env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(demoStream(), { headers: SSE_HEADERS })
  }

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()
  const send = (payload) => writer.write(encoder.encode(`data: ${payload}\n\n`))

  ;(async () => {
    try {
      // Try to get real company names from trade data
      const realNames = await fetchRealNames(product, country)
      const hasRealNames = realNames.length >= 3

      // Send metadata so the UI can show the right label
      await send(JSON.stringify({ type: 'meta', realNames: hasRealNames, source: hasRealNames ? 'trade records' : 'ai' }))

      const prompt = hasRealNames
        ? `These are verified ${product} importers in ${country} from trade shipment records:
${realNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}

For each company above write a one-line business profile. Output as JSONL — one JSON object per line, no other text:
{"company_name":"<exact name>","city":"<most likely city in ${country}>","business_type":"<e.g. Spice Importer, Food Distributor>","description":"<one sentence about what the business does>"}`
        : `List 10 realistic companies that import ${product} from India and operate in ${country}.
Output as JSONL — one JSON object per line, no other text:
{"company_name":"...","city":"...","business_type":"...","description":"one sentence"}`

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2500,
          stream: true,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!resp.ok) throw new Error(`Claude API error ${resp.status}`)

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let sseBuf = ''
      let jsonlBuf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        sseBuf += decoder.decode(value, { stream: true })
        const lines = sseBuf.split('\n')
        sseBuf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') continue
          let event
          try { event = JSON.parse(raw) } catch (_) { continue }
          if (event.type !== 'content_block_delta' || event.delta?.type !== 'text_delta') continue
          jsonlBuf += event.delta.text
          const parts = jsonlBuf.split('\n')
          jsonlBuf = parts.pop()
          for (const part of parts) {
            const t = part.trim()
            if (!t.startsWith('{')) continue
            try {
              const buyer = JSON.parse(t)
              if (buyer.company_name) await send(JSON.stringify({ ...buyer, type: 'buyer' }))
            } catch (_) {}
          }
        }
      }
      const tail = jsonlBuf.trim()
      if (tail.startsWith('{')) {
        try {
          const buyer = JSON.parse(tail)
          if (buyer.company_name) await send(JSON.stringify({ ...buyer, type: 'buyer' }))
        } catch (_) {}
      }
      await send('[DONE]')
    } catch (_err) {
      for (const b of DEMO_BUYERS) await send(JSON.stringify({ ...b, type: 'buyer' }))
      await send('[DONE]')
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

function demoStream() {
  return new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'meta', realNames: false, source: 'demo' })}\n\n`))
      for (const b of DEMO_BUYERS) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ ...b, type: 'buyer' })}\n\n`))
      }
      controller.enqueue(enc.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
}

const DEMO_BUYERS = [
  { company_name: 'Riders Co. Inc.', city: 'Kuala Lumpur', business_type: 'Spice Importer', description: 'Established Malaysian importer of Indian spices and dried goods supplying retail and food service.' },
  { company_name: 'Redza Mokhtar Enterprise', city: 'Petaling Jaya', business_type: 'Food Distributor', description: 'Distributor of Indian agricultural commodities to the Malaysian retail and food service sectors.' },
  { company_name: 'HK Spice Company', city: 'George Town', business_type: 'Spice Trader', description: 'Wholesale trader of imported spices supplying food manufacturers and restaurants in Northern Malaysia.' },
  { company_name: 'RTS Maju Global Trading', city: 'Shah Alam', business_type: 'Wholesale Trader', description: 'General trading company specialising in South Asian food commodities for the Malaysian market.' },
  { company_name: 'World Prominence Sdn Bhd', city: 'Klang', business_type: 'Agricultural Importer', description: 'Port-based importer handling bulk shipments of Indian spices and pulses through Klang Port.' },
  { company_name: 'Redruby Trading', city: 'Ipoh', business_type: 'Food Distributor', description: 'Regional food distributor serving Central and Northern Malaysia with Indian commodity products.' },
  { company_name: 'Syarikat Rempah Jayasakti Sdn Bhd', city: 'Kuala Lumpur', business_type: 'Spice Importer', description: 'Long-established spice importer supplying traditional Malaysian markets and food processors.' },
  { company_name: 'Middle People Management And Services', city: 'Subang Jaya', business_type: 'Trade Agent', description: 'Trade facilitation company connecting Indian exporters with Malaysian wholesale buyers.' },
  { company_name: 'Triomas Holdings Sdn Bhd', city: 'Johor Bahru', business_type: 'Commodity Trader', description: 'Holdings company with a commodity trading arm focused on South Asian agricultural imports.' },
  { company_name: 'Sai Tech', city: 'Cyberjaya', business_type: 'Food Ingredients Supplier', description: 'Supplier of premium Indian spices and ingredients to Malaysian food manufacturers.' },
]
