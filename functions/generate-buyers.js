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
        ? `These are verified ${product} importers in ${country} sourced from trade shipment records:
${realNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}

For each company above, research and generate their likely contact details. Output each as a JSON object on its own line (JSONL), one per company, no extra text:
{"company_name":"<exact name above>","city":"<likely city in ${country}>","business_type":"<e.g. Spice Importer>","website":"<likely domain>","email":"<likely procurement email>","phone":"<likely phone with country code>","whatsapp":"<WhatsApp number or null>","description":"<one sentence about the business>"}`
        : `Generate exactly 10 realistic buyer company profiles that import ${product} from India and are based in ${country}.
Output each as a complete JSON object on its own line (JSONL). No array, no markdown, no other text:
{"company_name":"...","city":"...","business_type":"...","website":"...","email":"...","phone":"...","whatsapp":"..." or null,"description":"one sentence"}`

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
  { company_name: 'Gulf Agro Trading LLC', city: 'Dubai', business_type: 'Food Distributor', website: 'gulfagrotrading.ae', email: 'procurement@gulfagrotrading.ae', phone: '+971-4-355-7890', whatsapp: '+971-50-355-7890', description: 'Leading distributor of Indian pulses, spices, and grains serving the UAE wholesale and retail market.' },
  { company_name: 'Spice Route International FZE', city: 'Sharjah', business_type: 'Spice Importer', website: 'spiceroute-intl.ae', email: 'imports@spiceroute-intl.ae', phone: '+971-6-528-4411', whatsapp: '+971-55-528-4411', description: 'Specialised importer of Indian spices and dried goods supplying GCC horeca and retail sectors.' },
  { company_name: 'Emirates Grain & Pulse Co.', city: 'Abu Dhabi', business_type: 'Commodity Broker', website: 'emiratesgrains.com', email: 'trade@emiratesgrains.com', phone: '+971-2-622-9050', whatsapp: '+971-52-622-9050', description: 'Commodity brokerage specialising in South Asian pulses and cereals for re-export across the GCC.' },
  { company_name: 'Al Barakah Foods Trading', city: 'Dubai', business_type: 'Wholesale Trader', website: 'albarakahfoods.ae', email: 'orders@albarakahfoods.ae', phone: '+971-4-887-3320', whatsapp: '+971-56-887-3320', description: 'Wholesale distributor of Indian grocery staples to ethnic supermarkets and restaurants across the UAE.' },
  { company_name: 'Orient Foods Distribution', city: 'Ajman', business_type: 'Food Distributor', website: 'orientfoods.ae', email: 'buying@orientfoods.ae', phone: '+971-6-742-8800', whatsapp: '+971-58-742-8800', description: 'Full-service food distribution covering all seven UAE emirates with ambient and cold-chain logistics.' },
  { company_name: 'Global Harvest Commodities', city: 'London', business_type: 'Commodity Broker', website: 'globalharvestcommodities.co.uk', email: 'procurement@globalharvestcommodities.co.uk', phone: '+44-20-7946-0812', whatsapp: null, description: 'London-based commodity trading house sourcing Indian pulses and spices for UK wholesale buyers.' },
  { company_name: 'Sunrise Agri Imports Sdn Bhd', city: 'Kuala Lumpur', business_type: 'Spice Importer', website: 'sunriseagri.com.my', email: 'import@sunriseagri.com.my', phone: '+60-3-2785-4400', whatsapp: '+60-12-2785-4400', description: 'Malaysian importer of Indian spices and pulses for local processing and re-export across Southeast Asia.' },
  { company_name: 'Continental Foods GmbH', city: 'Hamburg', business_type: 'Wholesale Trader', website: 'continentalfoods.de', email: 'einkauf@continentalfoods.de', phone: '+49-40-4139-7720', whatsapp: null, description: 'German wholesale trader of Asian food commodities supplying supermarkets across Central Europe.' },
  { company_name: 'Dhaka Agro Import Ltd', city: 'Dhaka', business_type: 'Wholesale Trader', website: 'dhakaagroimport.com.bd', email: 'info@dhakaagroimport.com.bd', phone: '+880-2-9887-5531', whatsapp: '+880-17-9887-5531', description: "One of Bangladesh's largest importers of Indian pulses and spices with distribution across all divisions." },
  { company_name: 'Pacific Rim Trading Co.', city: 'Singapore', business_type: 'Food Distributor', website: 'pacificrimtrading.sg', email: 'procurement@pacificrimtrading.sg', phone: '+65-6337-8820', whatsapp: '+65-8337-8820', description: 'Singapore-based trading house supplying Indian agricultural products to Southeast Asian food manufacturers.' },
]
