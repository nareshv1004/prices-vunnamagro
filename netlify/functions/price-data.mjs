import Anthropic from '@anthropic-ai/sdk'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const PROMPT = `You are a commodity spice trade analyst with deep expertise in Indian chilli exports.

Provide realistic, accurate price data for Teja S17 dried red chilli based on your knowledge. Teja (also called S17) is India's most exported chilli variety, primarily grown in Andhra Pradesh and Telangana.

Return ONLY a raw JSON object — nothing before { or after }, no markdown, no backticks. Keep all string values under 90 characters.

{
  "reportDate": "Mid-2025",
  "variety": "Teja S17",
  "india": {
    "flag": "🇮🇳",
    "domesticMarketPriceUSD": 1.80,
    "fobPriceUSD": 2.05,
    "priceRange": "1.75-2.20",
    "trend": "stable",
    "notes": "Guntur/Khammam mandi price, moisture 10-12%, stemmed",
    "source": "Agmarknet / Spices Board India"
  },
  "countries": [
    {
      "country": "China",
      "flag": "🇨🇳",
      "avgPriceUSD": 2.40,
      "priceRange": "2.10-2.70",
      "trend": "rising",
      "notes": "Largest importer of Indian Teja, mainly for oleoresin",
      "source": "Tridge / APEDA"
    }
  ],
  "globalAverage": 2.25,
  "marketSummary": "2-3 sentences on Teja S17 global market.",
  "supplyContext": "1-2 sentences on Indian Teja S17 crop and supply.",
  "sources": [
    {"name": "APEDA AgriExchange", "url": "https://agriexchange.apeda.gov.in"},
    {"name": "Spices Board India", "url": "https://indianspices.com"},
    {"name": "Tridge", "url": "https://www.tridge.com"}
  ],
  "keyFactors": ["factor 1", "factor 2", "factor 3", "factor 4"]
}

Include ALL these countries: China, Bangladesh, Sri Lanka, Malaysia, Indonesia, Vietnam, Thailand, Philippines, Myanmar, Nepal, Pakistan, Japan, South Korea, UAE, USA, UK, Germany, Spain.
trend values: rising | falling | stable
Provide your best estimates based on typical Teja S17 trade patterns. All prices in USD per kg.`

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' }
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      tools: [{
        name: 'submit_price_data',
        description: 'Submit the Teja S17 global price report',
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
                priceRange:             { type: 'string' },
                trend:                  { type: 'string' },
                notes:                  { type: 'string' },
                source:                 { type: 'string' },
              },
              required: ['flag','domesticMarketPriceUSD','fobPriceUSD','priceRange','trend','notes','source'],
            },
            countries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  country:    { type: 'string' },
                  flag:       { type: 'string' },
                  avgPriceUSD:{ type: 'number' },
                  priceRange: { type: 'string' },
                  trend:      { type: 'string' },
                  notes:      { type: 'string' },
                  source:     { type: 'string' },
                },
                required: ['country','flag','avgPriceUSD','priceRange','trend','notes','source'],
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
      }],
      tool_choice: { type: 'tool', name: 'submit_price_data' },
      messages: [{ role: 'user', content: PROMPT }],
    })

    const toolUse = message.content.find(c => c.type === 'tool_use')
    if (!toolUse) throw new Error('No tool use in response')
    const data = toolUse.input

    return {
      statusCode: 200,
      headers: {
        ...CORS,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
      body: JSON.stringify(data),
    }
  } catch (err) {
    console.error(err)
    return {
      statusCode: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch price data. Please try again.' }),
    }
  }
}
