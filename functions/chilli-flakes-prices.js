const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const PROMPT = `You are a commodity spice trade analyst with deep expertise in Indian chilli exports.

Provide realistic, accurate price data for Indian Teja S17 Chilli Flakes (3-5mm crushed, stemmed & deseeded) based on your knowledge. This is processed product exported from Andhra Pradesh/Telangana, India. Chilli flakes typically command a premium over whole dried chilli due to processing.

Return ONLY a raw JSON object — nothing before { or after }, no markdown, no backticks. Keep all string values under 90 characters.

{
  "reportDate": "Mid-2025",
  "variety": "Teja S17 Chilli Flakes",
  "india": {
    "flag": "🇮🇳",
    "domesticMarketPriceUSD": 2.50,
    "fobPriceUSD": 2.90,
    "priceRange": "2.70-3.20",
    "trend": "stable",
    "notes": "3-5mm crushed, stemmed & deseeded, moisture 10%, food-grade packing",
    "source": "Spices Board India / APEDA"
  },
  "countries": [
    {
      "country": "China",
      "flag": "🇨🇳",
      "avgPriceUSD": 3.50,
      "priceRange": "3.20-3.80",
      "trend": "stable",
      "notes": "Pizza/snack industry demand, prefers 3-5mm deseeded flakes",
      "source": "Tridge / APEDA"
    }
  ],
  "globalAverage": 3.60,
  "marketSummary": "2-3 sentences on Indian chilli flakes global market.",
  "supplyContext": "1-2 sentences on Indian chilli flakes processing and supply.",
  "sources": [
    {"name": "APEDA AgriExchange", "url": "https://agriexchange.apeda.gov.in"},
    {"name": "Spices Board India", "url": "https://indianspices.com"},
    {"name": "Tridge", "url": "https://www.tridge.com"}
  ],
  "keyFactors": ["factor 1", "factor 2", "factor 3", "factor 4"]
}

Include ALL these countries: China, Bangladesh, Sri Lanka, Malaysia, Indonesia, Vietnam, Thailand, Philippines, Myanmar, Nepal, Pakistan, Japan, South Korea, UAE, USA, UK, Germany, Spain.
trend: rising | falling | stable
All prices in USD per kg for Teja S17 chilli flakes (3-5mm crushed, stemmed & deseeded).`

const TOOL = {
  name: 'submit_price_data',
  description: 'Submit the Teja S17 Chilli Flakes global price report',
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
    const dateLabel = dateParam
      ? new Date(dateParam + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

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
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'submit_price_data' },
        messages: [{ role: 'user', content: `Today's date is ${dateLabel}. Provide price data as of this date.\n\n${PROMPT}` }],
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
