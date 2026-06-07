const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const VARIETY_INFO = {
  'Teja S17':      'Teja S17 chilli flakes 3-5mm, stemmed & deseeded. Raw dried chilli FOB ~$2.50-2.75/kg. Flakes add ~25-35% processing premium: FOB India flakes ~$3.30-3.80/kg. High pungency, widely used in pizza toppings.',
  'LCA-334':       'LCA-334 chilli flakes 3-5mm, stemmed & deseeded. Raw dried chilli FOB ~$2.90-3.10/kg. Flakes FOB India ~$3.80-4.20/kg. Good colour and medium-high pungency.',
  'Byadagi':       'Byadagi chilli flakes 3-5mm stemmed & deseeded, GI-tagged variety from Karnataka. Prized for deep red colour and mild heat. Raw dried Byadagi B2B export FOB $3.35-6.60/kg. Flakes add processing premium: FOB India flakes ~$4.50-8.00/kg. Stemless/premium grade commands higher. Sources: agmarknet.gov.in, KSAMB, indiamart.com.',
  'Wonder Hot':    'Wonder Hot chilli flakes 3-5mm, high-pungency. Raw dried chilli FOB ~$2.80-3.20/kg. Flakes FOB India ~$3.60-4.20/kg. Used for hot seasoning blends.',
  'Mahi Teja S15': 'Mahi Teja S15 chilli flakes 3-5mm. Raw dried chilli FOB ~$2.50-2.80/kg. Flakes FOB India ~$3.20-3.70/kg. Medium-high pungency hybrid gaining export market share.',
}

const SCHEMA = {
  name: 'submit_price_data',
  description: 'Submit the chilli flakes global price report',
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
    const varietyDesc = VARIETY_INFO[variety] || `${variety} chilli flakes are processed in India.`

    const dateLabel = dateParam
      ? new Date(dateParam + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

    const prompt = `You are a commodity spice trade analyst with deep expertise in Indian chilli exports.

Provide accurate price data for ${variety} Chilli Flakes (3-5mm crushed, stemmed & deseeded). Use these verified market anchors as your baseline:
${varietyDesc}

Use the FOB India flakes price as your anchor. Import prices in each country will be higher than FOB India due to freight (typically $0.10-0.30/kg sea freight), import duties, and local distribution margins.
Key context for June 2026: Indian chilli supply is tight (15-20% production shortfall in 2025/26), driving prices 15-25% above 2024 levels. Byadagi flakes are in a premium tier due to colour value.

Include ALL these countries: China, Bangladesh, Sri Lanka, Malaysia, Indonesia, Vietnam, Thailand, Philippines, Myanmar, Nepal, Pakistan, Japan, South Korea, UAE, USA, UK, Germany, Spain.
trend: rising | falling | stable
All prices in USD per kg for ${variety} chilli flakes (3-5mm crushed, stemmed & deseeded). Keep all string values under 90 characters.`

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
