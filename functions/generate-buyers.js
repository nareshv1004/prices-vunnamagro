const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const country = url.searchParams.get('country') || ''
  const product = url.searchParams.get('product') || ''

  if (!country || !product) {
    return new Response(
      JSON.stringify({ error: 'country and product are required' }),
      { status: 400, headers: CORS }
    )
  }

  const apiKey = env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ demo: true, buyers: DEMO_BUYERS, note: 'Set ANTHROPIC_API_KEY in Cloudflare Pages environment variables to generate live leads.' }),
      { status: 200, headers: CORS }
    )
  }

  const prompt = `Generate a list of exactly 12 potential buyer companies that import ${product} from India and are based in ${country}.

Return ONLY a JSON array with no other text, markdown, or explanation. Each object must have exactly these fields:
- "company_name": string (realistic company name using local ${country} naming conventions)
- "city": string (a real city in ${country})
- "business_type": string (e.g. "Food Distributor", "Spice Importer", "Wholesale Trader", "Supermarket Chain", "Restaurant Supplier", "Commodity Broker")
- "website": string (a realistic domain without https://)
- "email": string (a realistic procurement or trade email)
- "phone": string (realistic number with ${country}'s international calling code)
- "whatsapp": string or null (WhatsApp number if WhatsApp is commonly used for business in ${country}, else null)
- "description": string (one sentence about the company's primary business)

Use real city names and realistic business details appropriate for ${country}.`

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await resp.json()
    if (!resp.ok) throw new Error(data.error?.message || `API error ${resp.status}`)

    const text = data.content?.[0]?.text || ''
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('Could not parse buyer list from response')

    const buyers = JSON.parse(match[0])
    return new Response(JSON.stringify({ buyers }), { status: 200, headers: CORS })
  } catch (err) {
    return new Response(
      JSON.stringify({ demo: true, buyers: DEMO_BUYERS, note: `Showing sample data (API error: ${err.message})` }),
      { status: 200, headers: CORS }
    )
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

const DEMO_BUYERS = [
  {
    company_name: 'Gulf Agro Trading LLC',
    city: 'Dubai',
    business_type: 'Food Distributor',
    website: 'gulfagrotrading.ae',
    email: 'procurement@gulfagrotrading.ae',
    phone: '+971-4-355-7890',
    whatsapp: '+971-50-355-7890',
    description: 'Leading distributor of Indian pulses, spices, and grains serving the UAE wholesale and retail market.',
  },
  {
    company_name: 'Spice Route International FZE',
    city: 'Sharjah',
    business_type: 'Spice Importer',
    website: 'spiceroute-intl.ae',
    email: 'imports@spiceroute-intl.ae',
    phone: '+971-6-528-4411',
    whatsapp: '+971-55-528-4411',
    description: 'Specialised importer of Indian spices and dried goods supplying GCC horeca and retail sectors.',
  },
  {
    company_name: 'Emirates Grain & Pulse Co.',
    city: 'Abu Dhabi',
    business_type: 'Commodity Broker',
    website: 'emiratesgrains.com',
    email: 'trade@emiratesgrains.com',
    phone: '+971-2-622-9050',
    whatsapp: '+971-52-622-9050',
    description: 'Commodity brokerage specialising in South Asian pulses, lentils, and cereals for re-export across the GCC.',
  },
  {
    company_name: 'Al Barakah Foods Trading',
    city: 'Dubai',
    business_type: 'Wholesale Trader',
    website: 'albarakahfoods.ae',
    email: 'orders@albarakahfoods.ae',
    phone: '+971-4-887-3320',
    whatsapp: '+971-56-887-3320',
    description: 'Wholesale distributor of Indian and Pakistani grocery staples to ethnic supermarkets and restaurants.',
  },
  {
    company_name: 'Orient Foods Distribution',
    city: 'Ajman',
    business_type: 'Food Distributor',
    website: 'orientfoods.ae',
    email: 'buying@orientfoods.ae',
    phone: '+971-6-742-8800',
    whatsapp: '+971-58-742-8800',
    description: 'Full-service food distribution company covering all seven UAE emirates with cold-chain and ambient logistics.',
  },
  {
    company_name: 'Global Harvest Commodities',
    city: 'London',
    business_type: 'Commodity Broker',
    website: 'globalharvestcommodities.co.uk',
    email: 'procurement@globalharvestcommodities.co.uk',
    phone: '+44-20-7946-0812',
    whatsapp: null,
    description: 'London-based commodity trading house sourcing Indian pulses and spices for UK wholesale buyers.',
  },
  {
    company_name: 'Sunrise Agri Imports Sdn Bhd',
    city: 'Kuala Lumpur',
    business_type: 'Spice Importer',
    website: 'sunriseagri.com.my',
    email: 'import@sunriseagri.com.my',
    phone: '+60-3-2785-4400',
    whatsapp: '+60-12-2785-4400',
    description: 'Malaysian importer specialising in Indian spices, chillies, and pulses for local processing and re-export.',
  },
  {
    company_name: 'Continental Foods GmbH',
    city: 'Hamburg',
    business_type: 'Wholesale Trader',
    website: 'continentalfoods.de',
    email: 'einkauf@continentalfoods.de',
    phone: '+49-40-4139-7720',
    whatsapp: null,
    description: 'German wholesale trader of Asian and South Asian food commodities supplying supermarkets across Central Europe.',
  },
  {
    company_name: 'Dhaka Agro Import Ltd',
    city: 'Dhaka',
    business_type: 'Wholesale Trader',
    website: 'dhakaagroimport.com.bd',
    email: 'info@dhakaagroimport.com.bd',
    phone: '+880-2-9887-5531',
    whatsapp: '+880-17-9887-5531',
    description: 'One of Bangladesh\'s largest importers of Indian pulses and spices with distribution across all divisions.',
  },
  {
    company_name: 'Pacific Rim Trading Co.',
    city: 'Singapore',
    business_type: 'Food Distributor',
    website: 'pacificrimtrading.sg',
    email: 'procurement@pacificrimtrading.sg',
    phone: '+65-6337-8820',
    whatsapp: '+65-8337-8820',
    description: 'Singapore-based trading house supplying Indian agricultural products to Southeast Asian food manufacturers.',
  },
  {
    company_name: 'Indo-Gulf Foods L.L.C.',
    city: 'Muscat',
    business_type: 'Wholesale Trader',
    website: 'indogulffoods.om',
    email: 'trade@indogulffoods.om',
    phone: '+968-2456-7890',
    whatsapp: '+968-9456-7890',
    description: 'Oman-based importer distributing Indian pulses, chillies, and spices to hypermarkets and wholesalers across Oman.',
  },
  {
    company_name: 'Nile Valley Food Imports',
    city: 'Nairobi',
    business_type: 'Food Distributor',
    website: 'nilevalleyfoods.co.ke',
    email: 'imports@nilevalleyfoods.co.ke',
    phone: '+254-20-444-3388',
    whatsapp: '+254-722-444-338',
    description: 'East Africa\'s leading importer of South Asian grocery staples serving Kenya, Tanzania, and Uganda markets.',
  },
]
