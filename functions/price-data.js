const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const VARIETY_INFO = {
  'Teja S17':      'Teja S17 grown in Andhra Pradesh/Telangana. High pungency 80,000-100,000 SHU. Guntur mandi price ~₹18,000/quintal (~$2.17/kg). FOB India ~$2.50-2.75/kg. Trend: rising due to 15-20% production decline in 2025/26 season.',
  'LCA-334':       'LCA-334 grown in Andhra Pradesh/Telangana. Medium-high pungency, good colour. Guntur mandi price ~₹21,000/quintal AC grade (~$2.53/kg). FOB India ~$2.90-3.10/kg. Higher than Teja due to colour premium.',
  'Byadagi':       'Byadagi grown in Karnataka, GI-tagged for bright red colour and low heat. Supply chain tiers: APMC Byadagi mandi (Haveri) ₹160-420/kg ($1.90-5.00/kg) wholesale auction; B2B export wholesale on IndiaMART/TradeIndia ₹280-550/kg ($3.35-6.60/kg) FOB; India consumer retail (BigBasket/Blinkit) ₹480-720/kg. International retail (Amazon USA/UK) $14-22/kg. Sources: agmarknet.gov.in, KSAMB, indiamart.com, bigbasket.com, amazon.com.',
  'Wonder Hot':    'Wonder Hot high-pungency variety from Andhra Pradesh, used for oleoresin and hot spice blends. Similar domestic pricing to Teja S17 but FOB premium ~$2.80-3.20/kg due to high SHU content.',
  'Mahi Teja S15': 'Mahi Teja S15 hybrid from Andhra Pradesh/Telangana. Medium-high pungency, gaining export share. Priced similar to Teja S17: domestic ~$2.10-2.25/kg, FOB ~$2.50-2.80/kg.',
}

const SCHEMA = {
  name: 'submit_price_data',
  description: 'Submit the dried red chilli global price report',
  input_schema: {
    type: 'object',
    properties: {
      reportDate:    { type: 'string' },
      variety:       { type: 'string' },
      globalAverage: { type: 'number' },
      marketSummary: { type: 'string' },
      supplyContext: { type: 'string' },
      keyFactors:    { type: 'array', items: { type: 'string' } },
      india: {
        type: 'object',
        properties: {
          flag:                   { type: 'string' },
          domesticMarketPriceUSD: { type: 'number' },
          fobPriceUSD:            { type: 'number' },
          rangeMin: { type: 'number' }, rangeMax: { type: 'number' },
          trend:  { type: 'string' },
          notes:  { type: 'string' },
          source: { type: 'string' },
        },
        required: ['flag','domesticMarketPriceUSD','fobPriceUSD','rangeMin','rangeMax','trend','notes','source'],
      },
      countries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            country:     { type: 'string' },
            flag:        { type: 'string' },
            avgPriceUSD: { type: 'number' },
            rangeMin: { type: 'number' }, rangeMax: { type: 'number' },
            trend:   { type: 'string' },
            notes:   { type: 'string' },
            source:  { type: 'string' },
          },
          required: ['country','flag','avgPriceUSD','rangeMin','rangeMax','trend','notes','source'],
        },
      },
      sources: {
        type: 'array',
        items: {
          type: 'object',
          properties: { name: { type: 'string' }, url: { type: 'string' } },
        },
      },
    },
    required: ['reportDate','variety','india','countries','globalAverage','marketSummary','supplyContext','sources','keyFactors'],
  },
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS })
  }

  try {
    const url = new URL(request.url)
    const dateParam = url.searchParams.get('date')
    const variety = url.searchParams.get('variety') || 'Teja S17'
    const varietyDesc = VARIETY_INFO[variety] || `${variety} is an Indian chilli variety exported from India.`

    const dateLabel = dateParam
      ? new Date(dateParam + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

    const prompt = `You are a commodity spice trade analyst with deep expertise in Indian chilli exports.

Provide accurate price data for ${variety} dried red chilli. Use these verified market anchors as your baseline:
${varietyDesc}

Use the FOB India price as your anchor. Import prices in each country will be higher than FOB India due to freight (typically $0.10-0.30/kg sea freight), import duties, and local distribution margins.
Key context for June 2026: Indian chilli supply is tight (15-20% production shortfall in 2025/26), driving prices 15-25% above 2024 levels. Byadagi is a premium colour chilli in a separate pricing tier from heat chillies.

Include ALL these countries: China, Bangladesh, Sri Lanka, Malaysia, Indonesia, Vietnam, Thailand, Philippines, Myanmar, Nepal, Pakistan, Japan, South Korea, UAE, USA, UK, Germany, Spain.
trend values: rising | falling | stable
All prices in USD per kg for ${variety} dried red chilli. Keep all string values under 90 characters.`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        tools: [SCHEMA],
        tool_choice: { type: 'tool', name: 'submit_price_data' },
        messages: [{ role: 'user', content: `Today's date is ${dateLabel}. Provide price data as of this date.\n\n${prompt}` }],
      }),
    })

    const message = await res.json()
    const toolUse = message.content?.find(c => c.type === 'tool_use')
    if (!toolUse) throw new Error('No tool use in response')
    const data = toolUse.input

    let usdToInr = 84.0
    try {
      const rateRes = await fetch('https://open.er-api.com/v6/latest/USD')
      if (rateRes.ok) {
        const rateData = await rateRes.json()
        usdToInr = rateData.rates?.INR ?? usdToInr
      }
    } catch (_) {}

    return new Response(JSON.stringify({ ...data, usdToInr }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Failed to fetch price data. Please try again.' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
}
