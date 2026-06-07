const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const VARIETY_INFO = {
  'Teja S17':       'Teja S17 chilli powder (80-100 ASTA grade) is processed in Andhra Pradesh and Telangana. High pungency, widely used in spice blends and food processing.',
  'LCA-334':        'LCA-334 chilli powder is processed in Andhra Pradesh and Telangana. Medium-high pungency with good colour, used in food processing and seasoning blends.',
  'Byadagi':        'Byadagi chilli powder is processed in Karnataka. Prized for deep red colour and mild heat. Premium grade used for colour-rich powders, paprika, and natural food colouring.',
  'Wonder Hot':     'Wonder Hot chilli powder is high-pungency, processed in Andhra Pradesh. Used for hot seasoning blends, oleoresin-grade applications, and industrial spice processing.',
  'Mahi Teja S15':  'Mahi Teja S15 chilli powder is processed in Andhra Pradesh and Telangana. Medium-high pungency hybrid gaining export market share in global spice markets.',
}

const SCHEMA = {
  name: 'submit_price_data',
  description: 'Submit the chilli powder global price report',
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
    const varietyDesc = VARIETY_INFO[variety] || `${variety} chilli powder is processed in India.`

    const dateLabel = dateParam
      ? new Date(dateParam + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

    const prompt = `You are a commodity spice trade analyst with deep expertise in Indian chilli exports.

Provide realistic, accurate price data for ${variety} Chilli Powder (80-100 ASTA grade) based on your knowledge. ${varietyDesc}

Return ONLY a raw JSON object — nothing before { or after }, no markdown, no backticks. Keep all string values under 90 characters.

Include ALL these countries: China, Bangladesh, Sri Lanka, Malaysia, Indonesia, Vietnam, Thailand, Philippines, Myanmar, Nepal, Pakistan, Japan, South Korea, UAE, USA, UK, Germany, Spain.
trend: rising | falling | stable
All prices in USD per kg for ${variety} chilli powder (80-100 ASTA grade).`

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
