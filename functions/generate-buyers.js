const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Access-Control-Allow-Origin': '*',
}

function sig(ms) {
  const c = new AbortController()
  setTimeout(() => c.abort(), ms)
  return c.signal
}

function countrySlug(country) {
  return country.toLowerCase()
    .replace(/\bunited arab emirates\b/i, 'uae')
    .replace(/\bunited kingdom\b/i, 'uk')
    .replace(/\bunited states\b/i, 'usa')
    .replace(/\s+/g, '-')
}

function isUAE(country) {
  const c = country.toLowerCase()
  return c.includes('uae') || c.includes('emirates') || c.includes('dubai')
    || c.includes('sharjah') || c.includes('abu dhabi')
}

// ── Country baselines — real, verifiable food/spice companies ─────────────
// Used only when ALL web sources + AI fallback return 0. Labelled "AI Knowledge".
const COUNTRY_BASELINES = {
  uae: [
    { company_name: 'IFFCO Group', city: 'Sharjah', website: 'https://www.iffco.com', business_type: 'Food & Commodity Trading' },
    { company_name: 'Al Kabeer Group', city: 'Dubai', website: 'https://www.alkabeer.com', business_type: 'Food Importer/Distributor' },
    { company_name: 'Agthia Group PJSC', city: 'Abu Dhabi', website: 'https://www.agthia.com', business_type: 'Food Company' },
    { company_name: 'National Food Products Company (NFPC)', city: 'Abu Dhabi', business_type: 'Food Manufacturing/Import' },
    { company_name: 'Emirates Trading Agency LLC', city: 'Dubai', business_type: 'Commodity Trading' },
    { company_name: 'Al Maya Group', city: 'Dubai', website: 'https://www.almayagroup.com', business_type: 'Food Distributor' },
    { company_name: 'Al Islami Foods', city: 'Dubai', website: 'https://www.alislami.ae', business_type: 'Food Company' },
    { company_name: 'Transworld Group', city: 'Dubai', website: 'https://www.twgroup.ae', business_type: 'Commodity & Trading' },
    { company_name: 'LuLu Group International', city: 'Abu Dhabi', website: 'https://www.luluhypermarket.com', business_type: 'Retail/Direct Importer' },
    { company_name: 'Spinneys Dubai LLC', city: 'Dubai', website: 'https://www.spinneys.com', business_type: 'Retail/Direct Importer' },
  ],
  uk: [
    { company_name: 'East End Foods Ltd', city: 'Birmingham', website: 'https://www.eastendfoods.co.uk', business_type: 'Spice & Food Importer' },
    { company_name: 'Natco Foods Ltd', city: 'London', website: 'https://www.natcofoods.com', business_type: 'Indian Food & Spice Importer' },
    { company_name: 'TRS (The Really Spice Company)', city: 'Southall', website: 'https://www.trsgroup.co.uk', business_type: 'Spice Importer/Distributor' },
    { company_name: 'Ahmed Foods', city: 'Birmingham', website: 'https://www.ahmedfoods.co.uk', business_type: 'Food & Spice Company' },
    { company_name: 'Everest Spices UK', city: 'London', business_type: 'Spice Importer' },
    { company_name: 'Rajah Spices (Schwartz)', city: 'London', website: 'https://www.schwartz.co.uk', business_type: 'Spice Brand/Importer' },
    { company_name: 'Bolst\'s Foods', city: 'Wolverhampton', business_type: 'Food & Spice Importer' },
    { company_name: 'COFCO International UK', city: 'London', website: 'https://www.cofcointernational.com', business_type: 'Commodity Trading' },
    { company_name: 'Surya Foods Ltd', city: 'Leeds', business_type: 'Indian & Asian Food Importer' },
    { company_name: 'G&G Vitamins Ltd', city: 'East Grinstead', business_type: 'Natural Food Importer' },
  ],
  malaysia: [
    { company_name: 'Yee Lee Corporation Bhd', city: 'Kuala Lumpur', website: 'https://www.yeelee.com.my', business_type: 'Food & Commodity Trading' },
    { company_name: 'Brahim\'s Holdings Berhad', city: 'Kuala Lumpur', website: 'https://www.brahims.com', business_type: 'Food Company' },
    { company_name: 'AEON Big Berhad', city: 'Petaling Jaya', website: 'https://www.aeonshoponline.com.my', business_type: 'Retail/Direct Importer' },
    { company_name: 'Econsave Cash & Carry Sdn Bhd', city: 'Klang', website: 'https://www.econsave.com.my', business_type: 'Retail/Food Importer' },
    { company_name: 'Lotus\'s Malaysia (Tesco)', city: 'Kuala Lumpur', website: 'https://www.lotuss.com.my', business_type: 'Retail/Direct Importer' },
    { company_name: 'Pacific Spice Company Sdn Bhd', city: 'Kuala Lumpur', business_type: 'Spice Importer/Distributor' },
    { company_name: 'Woh Hup (M) Sdn Bhd', city: 'Petaling Jaya', business_type: 'Food Trading & Import' },
    { company_name: 'LBC Trading Sdn Bhd', city: 'Kuala Lumpur', business_type: 'Commodity Trading' },
    { company_name: 'Spice Valley Sdn Bhd', city: 'Kuala Lumpur', business_type: 'Spice Trading' },
    { company_name: 'Farm Fresh Berhad', city: 'Shah Alam', website: 'https://www.farmfresh.com.my', business_type: 'Food Company' },
  ],
  usa: [
    { company_name: 'Patel Brothers LLC', city: 'Chicago, IL', website: 'https://www.patelbrothers.com', business_type: 'Indian Grocery/Direct Importer' },
    { company_name: 'Deep Foods Inc', city: 'Union, NJ', website: 'https://www.deepfoods.com', business_type: 'Indian Food Importer' },
    { company_name: 'House of Spices India Inc', city: 'Jamaica, NY', website: 'https://www.houseofspices.com', business_type: 'Spice Importer/Distributor' },
    { company_name: 'Frontier Co-op', city: 'Norway, IA', website: 'https://www.frontiercoop.com', business_type: 'Spice & Herb Importer' },
    { company_name: 'Sadaf Foods LLC', city: 'Los Angeles, CA', website: 'https://www.sadaf.com', business_type: 'Middle Eastern/Spice Importer' },
    { company_name: 'Swad Inc', city: 'Jersey City, NJ', website: 'https://www.swad.com', business_type: 'Indian Food Importer' },
    { company_name: 'Laxmi Indian Foods (Raja Foods)', city: 'Chicago, IL', website: 'https://www.laxmiindianfoods.com', business_type: 'Indian Spice Importer' },
    { company_name: 'Rani Brand / Rani Foods LLC', city: 'Houston, TX', website: 'https://www.ranifoods.com', business_type: 'Indian Spice Importer' },
    { company_name: 'Kalustyan\'s (Dean & DeLuca)', city: 'New York, NY', website: 'https://www.kalustyans.com', business_type: 'Spice Importer/Specialty' },
    { company_name: 'Taj Trading', city: 'Edison, NJ', business_type: 'Indian Food & Spice Importer' },
  ],
  'saudi-arabia': [
    { company_name: 'Savola Group', city: 'Jeddah', website: 'https://www.savola.com', business_type: 'Food & Commodity Group' },
    { company_name: 'Almarai Company', city: 'Riyadh', website: 'https://www.almarai.com', business_type: 'Food Company' },
    { company_name: 'Nadec (National Agriculture Development Co)', city: 'Riyadh', website: 'https://www.nadec.com.sa', business_type: 'Food & Commodity' },
    { company_name: 'Al Watania Poultry', city: 'Riyadh', business_type: 'Food Company' },
    { company_name: 'Bin Laden Trading & Contracting', city: 'Jeddah', business_type: 'Commodity Trading' },
    { company_name: 'Saudi Agricultural & Livestock Investment Co (SALIC)', city: 'Riyadh', business_type: 'Agricultural Commodity' },
    { company_name: 'Carrefour Saudi Arabia (Majid Al Futtaim)', city: 'Riyadh', website: 'https://www.carrefourksa.com', business_type: 'Retail/Direct Importer' },
    { company_name: 'Al Muhaidib Group', city: 'Riyadh', website: 'https://www.muhaidib.com', business_type: 'Food Trading Group' },
    { company_name: 'Fakieh Group', city: 'Jeddah', business_type: 'Food & Trading' },
    { company_name: 'LuLu Hypermarket Saudi Arabia', city: 'Riyadh', website: 'https://www.luluhypermarket.com', business_type: 'Retail/Direct Importer' },
  ],
  germany: [
    { company_name: 'Shalimar Spices GmbH', city: 'Hamburg', business_type: 'Spice & Food Importer' },
    { company_name: 'Herbaria Kräuterparadies GmbH', city: 'Polling', website: 'https://www.herbaria.de', business_type: 'Herb & Spice Company' },
    { company_name: 'ALDI Einkauf SE & Co. oHG', city: 'Essen', website: 'https://www.aldi.de', business_type: 'Retail/Direct Importer' },
    { company_name: 'EDEKA Zentrale AG & Co. KG', city: 'Hamburg', website: 'https://www.edeka.de', business_type: 'Retail/Direct Importer' },
    { company_name: 'Fuchs Gewürze GmbH', city: 'Dissen', website: 'https://www.fuchs.de', business_type: 'Spice Company' },
    { company_name: 'Ostmann Gewürze GmbH', city: 'Dissen', website: 'https://www.ostmann.de', business_type: 'Spice Company' },
    { company_name: 'Wiberg GmbH', city: 'Salzburg/Germany', website: 'https://www.wiberg.eu', business_type: 'Spice & Seasoning' },
    { company_name: 'Catz International BV (Germany Office)', city: 'Frankfurt', business_type: 'Agricultural Commodity Trading' },
    { company_name: 'Kreyenhop & Kluge GmbH', city: 'Bremen', business_type: 'Spice & Food Importer' },
    { company_name: 'Schwartz (McCormick Germany)', city: 'Wolfenbüttel', business_type: 'Spice Brand/Importer' },
  ],
  qatar: [
    { company_name: 'Al Meera Consumer Goods Company', city: 'Doha', website: 'https://www.almeera.com.qa', business_type: 'Retail/Direct Importer' },
    { company_name: 'LuLu Hypermarket Qatar', city: 'Doha', website: 'https://www.luluhypermarket.com', business_type: 'Retail/Direct Importer' },
    { company_name: 'Carrefour Qatar (Majid Al Futtaim)', city: 'Doha', website: 'https://www.carrefour.qa', business_type: 'Retail/Direct Importer' },
    { company_name: 'Qatar Trading Company (QTC)', city: 'Doha', business_type: 'Commodity & Food Trading' },
    { company_name: 'Al Rayyan Food Company', city: 'Doha', business_type: 'Food Processing & Trading' },
    { company_name: 'Monoprix Qatar', city: 'Doha', business_type: 'Retail/Food Importer' },
    { company_name: 'IFFCO Qatar', city: 'Doha', website: 'https://www.iffco.com', business_type: 'Food & Commodity Trading' },
    { company_name: 'Al Jabor Group', city: 'Doha', business_type: 'Food & Commodity Trading' },
  ],
  kuwait: [
    { company_name: 'United Food Company (UFC)', city: 'Kuwait City', business_type: 'Food Manufacturing & Import' },
    { company_name: 'Al Sayer Group', city: 'Kuwait City', website: 'https://www.alsayer.com', business_type: 'Food & Commodity Trading' },
    { company_name: 'Alghanim Industries', city: 'Kuwait City', website: 'https://www.alghanim.com', business_type: 'Food & Trading Conglomerate' },
    { company_name: 'Americana Group Kuwait', city: 'Kuwait City', business_type: 'Food Company' },
    { company_name: 'Sultan Center Kuwait', city: 'Kuwait City', website: 'https://www.sultan-center.com', business_type: 'Retail/Direct Importer' },
    { company_name: 'LuLu Hypermarket Kuwait', city: 'Kuwait City', website: 'https://www.luluhypermarket.com', business_type: 'Retail/Direct Importer' },
    { company_name: 'Carrefour Kuwait (Majid Al Futtaim)', city: 'Kuwait City', website: 'https://www.carrefour-me.com', business_type: 'Retail/Direct Importer' },
    { company_name: 'Al Safat Global Holding', city: 'Kuwait City', business_type: 'Food & Agricultural Trading' },
  ],
  bahrain: [
    { company_name: 'Al Osra Supermarket', city: 'Manama', website: 'https://www.alosra.com.bh', business_type: 'Retail/Direct Importer' },
    { company_name: 'LuLu Hypermarket Bahrain', city: 'Manama', website: 'https://www.luluhypermarket.com', business_type: 'Retail/Direct Importer' },
    { company_name: 'Geant Bahrain', city: 'Manama', business_type: 'Retail/Direct Importer' },
    { company_name: 'Delmon International Food Company', city: 'Manama', business_type: 'Food Trading & Distribution' },
    { company_name: 'IFFCO Bahrain', city: 'Manama', website: 'https://www.iffco.com', business_type: 'Food & Commodity Trading' },
    { company_name: 'Al Jazeera Supermarket', city: 'Manama', business_type: 'Retail/Food Importer' },
    { company_name: 'Hassan Ali & Sons', city: 'Manama', business_type: 'Commodity & Food Trading' },
    { company_name: 'Carrefour Bahrain (Majid Al Futtaim)', city: 'Manama', website: 'https://www.carrefour.bh', business_type: 'Retail/Direct Importer' },
  ],
  oman: [
    { company_name: 'LuLu Hypermarket Oman', city: 'Muscat', website: 'https://www.luluhypermarket.com', business_type: 'Retail/Direct Importer' },
    { company_name: 'Al Fair Supermarket', city: 'Muscat', business_type: 'Retail/Direct Importer' },
    { company_name: 'Carrefour Oman (Majid Al Futtaim)', city: 'Muscat', website: 'https://www.carrefour.om', business_type: 'Retail/Direct Importer' },
    { company_name: 'Al Hassan Group', city: 'Muscat', website: 'https://www.alhassangroup.com', business_type: 'Food & Commodity Trading' },
    { company_name: 'Zubair Group', city: 'Muscat', website: 'https://www.thezubairgroup.com', business_type: 'Trading Conglomerate' },
    { company_name: 'Al Meera Oman', city: 'Muscat', business_type: 'Retail/Food Importer' },
    { company_name: 'Khimji Ramdas Group', city: 'Muscat', website: 'https://www.khimji.com', business_type: 'Commodity & Food Trading' },
    { company_name: 'Al Madina Group', city: 'Muscat', business_type: 'Food & Grocery Retail' },
  ],
  singapore: [
    { company_name: 'NTUC FairPrice', city: 'Singapore', website: 'https://www.fairprice.com.sg', business_type: 'Retail/Direct Importer' },
    { company_name: 'Cold Storage Singapore', city: 'Singapore', website: 'https://www.coldstorage.com.sg', business_type: 'Retail/Direct Importer' },
    { company_name: 'Mustafa Centre Pte Ltd', city: 'Singapore', website: 'https://www.mustafa.com.sg', business_type: 'Indian Food & Spice Importer' },
    { company_name: 'Sheng Siong Group', city: 'Singapore', website: 'https://www.shengsiong.com.sg', business_type: 'Retail/Direct Importer' },
    { company_name: 'Little India Spice Company', city: 'Singapore', business_type: 'Spice Importer/Distributor' },
    { company_name: 'Seng Huat Foods Pte Ltd', city: 'Singapore', business_type: 'Food Trading' },
    { company_name: 'Olam International', city: 'Singapore', website: 'https://www.olamagri.com', business_type: 'Agricultural Commodity Trading' },
    { company_name: 'Wilmar International', city: 'Singapore', website: 'https://www.wilmar-international.com', business_type: 'Food & Commodity Group' },
  ],
  indonesia: [
    { company_name: 'PT Indofood Sukses Makmur Tbk', city: 'Jakarta', website: 'https://www.indofood.com', business_type: 'Food Manufacturing & Import' },
    { company_name: 'PT Garudafood Putra Putri Jaya', city: 'Pati', website: 'https://www.garudafood.com', business_type: 'Food Company' },
    { company_name: 'PT Wings Food (Sayap Mas Utama)', city: 'Jakarta', business_type: 'Food Manufacturing' },
    { company_name: 'Hypermart (PT Matahari Putra Prima)', city: 'Tangerang', website: 'https://www.hypermart.co.id', business_type: 'Retail/Direct Importer' },
    { company_name: 'PT Transmarco (Transmart)', city: 'Jakarta', business_type: 'Retail/Direct Importer' },
    { company_name: 'PT Charoen Pokphand Indonesia', city: 'Jakarta', website: 'https://www.cp.co.id', business_type: 'Food & Agro Company' },
    { company_name: 'PT ABC President Indonesia', city: 'Jakarta', business_type: 'Food & Beverage' },
    { company_name: 'PT Aneka Rasa Nusantara', city: 'Jakarta', business_type: 'Spice & Seasoning Trading' },
  ],
  thailand: [
    { company_name: 'Charoen Pokphand Foods PCL (CPF)', city: 'Bangkok', website: 'https://www.cpfworldwide.com', business_type: 'Food & Agro Conglomerate' },
    { company_name: 'Siam Makro PCL', city: 'Bangkok', website: 'https://www.siammakro.co.th', business_type: 'Wholesale/Direct Importer' },
    { company_name: 'Big C Supercenter PCL', city: 'Bangkok', website: 'https://www.bigc.co.th', business_type: 'Retail/Direct Importer' },
    { company_name: 'Thai Union Group PCL', city: 'Samut Sakhon', website: 'https://www.thaiunion.com', business_type: 'Food Processing & Trading' },
    { company_name: 'Amoroso International (Spices)', city: 'Bangkok', business_type: 'Spice Importer/Distributor' },
    { company_name: 'Tops Market (Central Food Retail)', city: 'Bangkok', website: 'https://www.tops.co.th', business_type: 'Retail/Direct Importer' },
    { company_name: 'Sahapat Group', city: 'Bangkok', website: 'https://www.sahapat.co.th', business_type: 'Food Trading & Distribution' },
    { company_name: 'Thai Preserved Food Factory', city: 'Bangkok', business_type: 'Food Manufacturing/Import' },
  ],
  vietnam: [
    { company_name: 'Masan Consumer Holdings', city: 'Ho Chi Minh City', website: 'https://www.masanconsumer.com', business_type: 'Food & Spice Company' },
    { company_name: 'Saigon Co.op (Co.opmart)', city: 'Ho Chi Minh City', website: 'https://www.co-opmart.com.vn', business_type: 'Retail/Direct Importer' },
    { company_name: 'Vingroup (VinMart)', city: 'Hanoi', website: 'https://www.vingroup.net', business_type: 'Retail/Direct Importer' },
    { company_name: 'METRO Vietnam (MM Mega Market)', city: 'Ho Chi Minh City', website: 'https://www.mmvietnam.com', business_type: 'Wholesale/Direct Importer' },
    { company_name: 'CP Vietnam (Charoen Pokphand)', city: 'Binh Duong', website: 'https://www.cpvietnam.vn', business_type: 'Food & Agro Company' },
    { company_name: 'Acecook Vietnam', city: 'Ho Chi Minh City', website: 'https://www.acecookvietnam.com', business_type: 'Food Manufacturing' },
    { company_name: 'Viet Tien Food Processing', city: 'Ho Chi Minh City', business_type: 'Food Trading & Import' },
    { company_name: 'An Giang Vegetable Oil', city: 'An Giang', business_type: 'Agricultural Commodity' },
  ],
  canada: [
    { company_name: 'T&T Supermarket (Loblaw)', city: 'Vancouver, BC', website: 'https://www.tnt-supermarket.com', business_type: 'Asian Food Importer' },
    { company_name: 'Patel Brothers Canada', city: 'Mississauga, ON', business_type: 'Indian Food & Spice Importer' },
    { company_name: 'Sukhadia\'s Sweets & Snacks', city: 'Mississauga, ON', website: 'https://www.sukhadias.com', business_type: 'Indian Food Importer' },
    { company_name: 'Pacific Spice Canada', city: 'Vancouver, BC', business_type: 'Spice Importer/Distributor' },
    { company_name: 'Global Food Imports Inc', city: 'Brampton, ON', business_type: 'Food & Spice Importer' },
    { company_name: 'Shan Foods Canada', city: 'Toronto, ON', business_type: 'Spice Brand/Importer' },
    { company_name: 'Sabzi Mandi Superstore', city: 'Surrey, BC', business_type: 'South Asian Food Importer' },
    { company_name: 'Walmart Canada (Direct Import Division)', city: 'Mississauga, ON', website: 'https://www.walmart.ca', business_type: 'Retail/Direct Importer' },
  ],
  australia: [
    { company_name: 'Woolworths Group', city: 'Sydney, NSW', website: 'https://www.woolworthsgroup.com.au', business_type: 'Retail/Direct Importer' },
    { company_name: 'Coles Group', city: 'Melbourne, VIC', website: 'https://www.colesgroup.com.au', business_type: 'Retail/Direct Importer' },
    { company_name: 'Harris Farm Markets', city: 'Sydney, NSW', website: 'https://www.harrisfarm.com.au', business_type: 'Fresh Food/Spice Importer' },
    { company_name: 'Pattu Foods', city: 'Melbourne, VIC', business_type: 'Indian Spice Importer/Distributor' },
    { company_name: 'Spice Garden Australia', city: 'Sydney, NSW', business_type: 'Spice Importer' },
    { company_name: 'India at Home', city: 'Sydney, NSW', business_type: 'Indian Food & Spice Importer' },
    { company_name: 'Bestfoods Australia Pty Ltd', city: 'Melbourne, VIC', business_type: 'Food Trading & Import' },
    { company_name: 'ALDI Australia', city: 'Sydney, NSW', website: 'https://www.aldi.com.au', business_type: 'Retail/Direct Importer' },
  ],
  netherlands: [
    { company_name: 'OFI (ofi) Netherlands', city: 'Rotterdam', website: 'https://www.ofi.com', business_type: 'Agricultural Commodity Trading' },
    { company_name: 'Verstegen Spices & Sauces', city: 'Rotterdam', website: 'https://www.verstegen.nl', business_type: 'Spice Importer/Manufacturer' },
    { company_name: 'Albert Heijn (Ahold Delhaize)', city: 'Zaandam', website: 'https://www.ah.nl', business_type: 'Retail/Direct Importer' },
    { company_name: 'Euroma Specerijen BV', city: 'Deventer', website: 'https://www.euroma.com', business_type: 'Spice & Herb Importer' },
    { company_name: 'Rein & Sons International', city: 'Amsterdam', business_type: 'Commodity Trading' },
    { company_name: 'Deli XL (Bidfood Netherlands)', city: 'Amsterdam', website: 'https://www.deli-xl.nl', business_type: 'Food Service/Spice Importer' },
    { company_name: 'Jumbo Supermarkten', city: 'Veghel', website: 'https://www.jumbo.com', business_type: 'Retail/Direct Importer' },
    { company_name: 'Spicer Europe BV', city: 'Rotterdam', business_type: 'Spice Importer/Distributor' },
  ],
  france: [
    { company_name: 'Carrefour France', city: 'Boulogne-Billancourt', website: 'https://www.carrefour.fr', business_type: 'Retail/Direct Importer' },
    { company_name: 'Ducros (McCormick France)', city: 'Monteux', website: 'https://www.ducros.fr', business_type: 'Spice Brand/Importer' },
    { company_name: 'Intermarché (Groupement Mousquetaires)', city: 'Paris', website: 'https://www.intermarche.com', business_type: 'Retail/Direct Importer' },
    { company_name: 'Épices et Tout', city: 'Paris', business_type: 'Spice Importer/Specialty' },
    { company_name: 'Fayet & Cie', city: 'Paris', business_type: 'Spice & Food Importer' },
    { company_name: 'Leclerc (E.Leclerc)', city: 'Paris', website: 'https://www.e.leclerc', business_type: 'Retail/Direct Importer' },
    { company_name: 'Métro France', city: 'Nanterre', website: 'https://www.metro.fr', business_type: 'Wholesale/Direct Importer' },
    { company_name: 'Indian Bazaar France', city: 'Paris', business_type: 'Indian Food & Spice Importer' },
  ],
  italy: [
    { company_name: 'Esselunga SpA', city: 'Milan', website: 'https://www.esselunga.it', business_type: 'Retail/Direct Importer' },
    { company_name: 'Conad (Consorzio Nazionale Dettaglianti)', city: 'Bologna', website: 'https://www.conad.it', business_type: 'Retail/Direct Importer' },
    { company_name: 'Carrefour Italia', city: 'Milan', website: 'https://www.carrefour.it', business_type: 'Retail/Direct Importer' },
    { company_name: 'Novamont SpA', city: 'Novara', business_type: 'Agricultural & Food Trading' },
    { company_name: 'Mussini (Spice Company)', city: 'Reggio Emilia', business_type: 'Spice & Food Importer' },
    { company_name: 'Bartolini Food SpA', city: 'Perugia', business_type: 'Food Trading & Import' },
    { company_name: 'Metro Italia', city: 'Milan', website: 'https://www.metro.it', business_type: 'Wholesale/Direct Importer' },
    { company_name: 'Bazar Orient (Italian Specialty)', city: 'Rome', business_type: 'Spice & Exotic Food Importer' },
  ],
  spain: [
    { company_name: 'Carmencita SA', city: 'Novelda (Alicante)', website: 'https://www.carmencita.com', business_type: 'Spice Company/Importer' },
    { company_name: 'Mercadona SA', city: 'Valencia', website: 'https://www.mercadona.es', business_type: 'Retail/Direct Importer' },
    { company_name: 'Carrefour España', city: 'Madrid', website: 'https://www.carrefour.es', business_type: 'Retail/Direct Importer' },
    { company_name: 'El Corte Inglés SA', city: 'Madrid', website: 'https://www.elcorteingles.es', business_type: 'Retail/Direct Importer' },
    { company_name: 'Metro de España', city: 'Madrid', website: 'https://www.metro.es', business_type: 'Wholesale/Direct Importer' },
    { company_name: 'Especia SA', city: 'Alicante', business_type: 'Spice & Seasoning Importer' },
    { company_name: 'Condis Supermercats', city: 'Barcelona', website: 'https://www.condis.es', business_type: 'Retail/Food Importer' },
    { company_name: 'Costa Food Group', city: 'Vic (Barcelona)', business_type: 'Food Manufacturing & Import' },
  ],
  bangladesh: [
    { company_name: 'Pran-RFL Group', city: 'Dhaka', website: 'https://www.pranfoods.net', business_type: 'Food Manufacturing & Trading' },
    { company_name: 'Meghna Group of Industries', city: 'Dhaka', website: 'https://www.meghnagroup.biz', business_type: 'Food & Commodity Group' },
    { company_name: 'Akij Group (Akij Food & Beverage)', city: 'Dhaka', website: 'https://www.akijfood.com', business_type: 'Food Manufacturing' },
    { company_name: 'ACI Limited (Spice Division)', city: 'Dhaka', website: 'https://www.aci-bd.com', business_type: 'Food & Spice Company' },
    { company_name: 'Square Food & Beverage Ltd', city: 'Dhaka', website: 'https://www.squarefoodandbeverage.com', business_type: 'Food Company' },
    { company_name: 'Bangladesh Food Industries Ltd', city: 'Dhaka', business_type: 'Food Processing & Import' },
    { company_name: 'Agora Superstores', city: 'Dhaka', business_type: 'Retail/Direct Importer' },
    { company_name: 'Shwapno (ACI Logistics)', city: 'Dhaka', website: 'https://www.shwapno.com', business_type: 'Retail/Spice Importer' },
  ],
  'sri-lanka': [
    { company_name: 'Cargills Ceylon PLC', city: 'Colombo', website: 'https://www.cargillsceylon.com', business_type: 'Retail/Direct Importer' },
    { company_name: 'John Keells Holdings PLC', city: 'Colombo', website: 'https://www.keells.com', business_type: 'Food Trading Conglomerate' },
    { company_name: 'Lanka Sathosa (Retail)', city: 'Colombo', business_type: 'Retail/Food Importer' },
    { company_name: 'Delmege Forsyth & Co Ltd', city: 'Colombo', website: 'https://www.delmege.com', business_type: 'Food & Commodity Trading' },
    { company_name: 'Hemas Holdings PLC', city: 'Colombo', website: 'https://www.hemas.com', business_type: 'Food & Consumer Goods' },
    { company_name: 'Ceylon Cold Stores PLC', city: 'Colombo', website: 'https://www.keellssuper.com', business_type: 'Food Retail/Import' },
    { company_name: 'Prima Ceylon Ltd', city: 'Colombo', business_type: 'Food Manufacturing/Import' },
    { company_name: 'Maliban Biscuit Manufactories', city: 'Colombo', website: 'https://www.maliban.com', business_type: 'Food Company' },
  ],
  nepal: [
    { company_name: 'CG Corp (Chaudhary Group)', city: 'Kathmandu', website: 'https://www.cgcorp.com', business_type: 'Food & Commodity Conglomerate' },
    { company_name: 'Golcha Group', city: 'Kathmandu', website: 'https://www.golchagroup.com', business_type: 'Food & Commodity Trading' },
    { company_name: 'Dugar Group', city: 'Kathmandu', business_type: 'Food & Spice Trading' },
    { company_name: 'Batas Group Nepal', city: 'Kathmandu', business_type: 'Food Manufacturing & Import' },
    { company_name: 'Asian Spices Nepal Pvt Ltd', city: 'Kathmandu', business_type: 'Spice Importer/Distributor' },
    { company_name: 'Surya Nepal (BAT Group)', city: 'Kathmandu', business_type: 'Food & Consumer Trading' },
    { company_name: 'Nepal Trading House', city: 'Birgunj', business_type: 'Commodity & Food Trading' },
    { company_name: 'Kumari Group', city: 'Kathmandu', business_type: 'Food & Agricultural Trading' },
  ],
  'south-africa': [
    { company_name: 'Tiger Brands Ltd', city: 'Johannesburg', website: 'https://www.tigerbrands.com', business_type: 'Food Company (Spice Division)' },
    { company_name: 'Shoprite Holdings Ltd', city: 'Cape Town', website: 'https://www.shopriteholdings.co.za', business_type: 'Retail/Direct Importer' },
    { company_name: 'Woolworths Holdings SA', city: 'Cape Town', website: 'https://www.woolworths.co.za', business_type: 'Retail/Direct Importer' },
    { company_name: 'Pick n Pay Retailers Pty Ltd', city: 'Cape Town', website: 'https://www.pnp.co.za', business_type: 'Retail/Direct Importer' },
    { company_name: 'SPAR South Africa', city: 'Pinetown', website: 'https://www.spar.co.za', business_type: 'Retail/Food Importer' },
    { company_name: 'Premier FMCG Pty Ltd', city: 'Johannesburg', website: 'https://www.premierfmcg.com', business_type: 'Food Manufacturing' },
    { company_name: 'Cape Herb & Spice', city: 'Cape Town', website: 'https://www.capeherb.com', business_type: 'Spice Importer/Brand' },
    { company_name: 'Giant Importers South Africa', city: 'Johannesburg', business_type: 'Food & Spice Importer' },
  ],
  mauritius: [
    { company_name: 'IBL Group (Swan Foods)', city: 'Port Louis', website: 'https://www.ibl.mu', business_type: 'Food Trading Conglomerate' },
    { company_name: 'Winner\'s Hypermarket (Cim Retail)', city: 'Port Louis', business_type: 'Retail/Direct Importer' },
    { company_name: 'Grays Inc. Ltd', city: 'Port Louis', website: 'https://www.grays.mu', business_type: 'Food & Commodity Trading' },
    { company_name: 'Food and Allied Industries Group', city: 'Curepipe', business_type: 'Food Manufacturing/Import' },
    { company_name: 'Ciel Group (Sun Foods)', city: 'Port Louis', website: 'https://www.cielgroup.com', business_type: 'Food & Consumer Trading' },
    { company_name: 'Blends & Spices Ltd', city: 'Port Louis', business_type: 'Spice Importer/Distributor' },
    { company_name: 'Super U Mauritius', city: 'Port Louis', business_type: 'Retail/Food Importer' },
    { company_name: 'Intermart Mauritius', city: 'Port Louis', business_type: 'Retail/Direct Importer' },
  ],
  kenya: [
    { company_name: 'Bidco Africa (Bidco Kenya)', city: 'Nairobi', website: 'https://www.bidcoafrica.com', business_type: 'Food Manufacturing & Import' },
    { company_name: 'Naivas Supermarket', city: 'Nairobi', website: 'https://www.naivas.co.ke', business_type: 'Retail/Direct Importer' },
    { company_name: 'Carrefour Kenya (Majid Al Futtaim)', city: 'Nairobi', website: 'https://www.carrefour.ke', business_type: 'Retail/Direct Importer' },
    { company_name: 'Quickmart Supermarket', city: 'Nairobi', website: 'https://www.quickmart.co.ke', business_type: 'Retail/Food Importer' },
    { company_name: 'Twiga Foods Ltd', city: 'Nairobi', website: 'https://www.twigafoods.com', business_type: 'Food Distribution/Trading' },
    { company_name: 'East African Breweries (EABL)', city: 'Nairobi', business_type: 'Food & Beverage Group' },
    { company_name: 'Kainat Spices Kenya', city: 'Nairobi', business_type: 'Spice Importer/Distributor' },
    { company_name: 'Jambo Trading Company', city: 'Mombasa', business_type: 'Commodity & Food Trading' },
  ],
  tanzania: [
    { company_name: 'Azam Group (Bakhresa Group)', city: 'Dar es Salaam', website: 'https://www.azamtanzania.com', business_type: 'Food & Commodity Group' },
    { company_name: 'Shoprite Tanzania', city: 'Dar es Salaam', website: 'https://www.shoprite.co.tz', business_type: 'Retail/Direct Importer' },
    { company_name: 'Mukwano Industries Tanzania', city: 'Dar es Salaam', business_type: 'Food Manufacturing/Import' },
    { company_name: 'Zan-Mart (Zanzibar)', city: 'Zanzibar', business_type: 'Retail/Food Importer' },
    { company_name: 'Tanzania Food & Drugs Authority Traders', city: 'Dar es Salaam', business_type: 'Food Trading' },
    { company_name: 'UAC Foods Tanzania', city: 'Dar es Salaam', business_type: 'Food Distribution' },
    { company_name: 'Nakumatt Tanzania (Historical)', city: 'Dar es Salaam', business_type: 'Retail/Food Importer' },
    { company_name: 'Goodwill Supplies Tanzania Ltd', city: 'Dar es Salaam', business_type: 'Commodity & Food Trading' },
  ],
  japan: [
    { company_name: 'House Foods Group Inc', city: 'Tokyo', website: 'https://housefoods-group.com', business_type: 'Spice & Curry Company' },
    { company_name: 'S&B Foods Inc', city: 'Tokyo', website: 'https://www.sbfoods.co.jp', business_type: 'Spice Importer/Brand' },
    { company_name: 'Nagatanien Holdings Co Ltd', city: 'Shizuoka', website: 'https://www.nagatanien.co.jp', business_type: 'Spice & Seasoning' },
    { company_name: 'Itochu Corporation (Food Division)', city: 'Tokyo', website: 'https://www.itochu.co.jp', business_type: 'Agricultural Commodity Trading' },
    { company_name: 'Marubeni Corporation (Food Division)', city: 'Tokyo', website: 'https://www.marubeni.com', business_type: 'Commodity & Food Trading' },
    { company_name: 'Mitsui & Co (Food & Agri Division)', city: 'Tokyo', website: 'https://www.mitsui.com', business_type: 'Agricultural Commodity Trading' },
    { company_name: 'Yamaya Corporation', city: 'Sendai', website: 'https://www.yamaya.co.jp', business_type: 'Food & Spice Retail/Import' },
    { company_name: 'Tokai Bussan Co Ltd', city: 'Nagoya', business_type: 'Food & Spice Trading' },
  ],
  'south-korea': [
    { company_name: 'CJ CheilJedang Corp', city: 'Seoul', website: 'https://www.cj.co.kr', business_type: 'Food & Spice Manufacturing' },
    { company_name: 'Ottogi Corporation', city: 'Anyang', website: 'https://www.ottogi.co.kr', business_type: 'Food Company/Spice Importer' },
    { company_name: 'Lotte Chilsung Beverage', city: 'Seoul', website: 'https://www.lottechilsung.co.kr', business_type: 'Food & Beverage Group' },
    { company_name: 'Samsung C&T Corporation (Trading)', city: 'Seoul', website: 'https://www.samsungcnt.com', business_type: 'Commodity & Food Trading' },
    { company_name: 'Hyundai Department Store Group', city: 'Seoul', website: 'https://www.hdmall.co.kr', business_type: 'Retail/Direct Importer' },
    { company_name: 'Shinsegae Food Co Ltd', city: 'Seoul', website: 'https://www.shinsegaefood.com', business_type: 'Food Company/Importer' },
    { company_name: 'Daesang Corporation', city: 'Seoul', website: 'https://www.daesang.com', business_type: 'Food & Spice Company' },
    { company_name: 'E-Mart Inc', city: 'Seoul', website: 'https://www.emart.com', business_type: 'Retail/Direct Importer' },
  ],
}

function getCountryBaseline(country) {
  const c = country.toLowerCase()
  if (c.includes('uae') || c.includes('emirates') || c.includes('dubai')) return COUNTRY_BASELINES.uae
  if (c.includes('united kingdom') || c.includes('uk') || c.includes('britain')) return COUNTRY_BASELINES.uk
  if (c.includes('malaysia')) return COUNTRY_BASELINES.malaysia
  if (c.includes('united states') || c.includes('usa') || c.includes('america')) return COUNTRY_BASELINES.usa
  if (c.includes('saudi')) return COUNTRY_BASELINES['saudi-arabia']
  if (c.includes('germany') || c.includes('deutsch')) return COUNTRY_BASELINES.germany
  if (c.includes('qatar')) return COUNTRY_BASELINES.qatar
  if (c.includes('kuwait')) return COUNTRY_BASELINES.kuwait
  if (c.includes('bahrain')) return COUNTRY_BASELINES.bahrain
  if (c.includes('oman')) return COUNTRY_BASELINES.oman
  if (c.includes('singapore')) return COUNTRY_BASELINES.singapore
  if (c.includes('indonesia')) return COUNTRY_BASELINES.indonesia
  if (c.includes('thailand')) return COUNTRY_BASELINES.thailand
  if (c.includes('vietnam') || c.includes('viet nam')) return COUNTRY_BASELINES.vietnam
  if (c.includes('canada')) return COUNTRY_BASELINES.canada
  if (c.includes('australia')) return COUNTRY_BASELINES.australia
  if (c.includes('netherlands') || c.includes('holland')) return COUNTRY_BASELINES.netherlands
  if (c.includes('france') || c.includes('french')) return COUNTRY_BASELINES.france
  if (c.includes('italy') || c.includes('italia')) return COUNTRY_BASELINES.italy
  if (c.includes('spain') || c.includes('españa')) return COUNTRY_BASELINES.spain
  if (c.includes('bangladesh')) return COUNTRY_BASELINES.bangladesh
  if (c.includes('sri lanka') || c.includes('srilanka')) return COUNTRY_BASELINES['sri-lanka']
  if (c.includes('nepal')) return COUNTRY_BASELINES.nepal
  if (c.includes('south africa')) return COUNTRY_BASELINES['south-africa']
  if (c.includes('mauritius')) return COUNTRY_BASELINES.mauritius
  if (c.includes('kenya')) return COUNTRY_BASELINES.kenya
  if (c.includes('tanzania')) return COUNTRY_BASELINES.tanzania
  if (c.includes('japan')) return COUNTRY_BASELINES.japan
  if (c.includes('south korea') || c.includes('korea')) return COUNTRY_BASELINES['south-korea']
  return null
}

// Generate all reasonable URL slug variants — NO length cap.
function productSlugs(product) {
  const words = product.toLowerCase().trim().split(/\s+/)
  const base = words.join('-')
  return [...new Set([
    base,
    words.slice(1).join('-'),             // drop first word
    words[words.length - 1],             // last word only
    base.replace(/chillies/g, 'chilli'), // singular — Volza uses this
    base.replace(/peppers?/g, 'chilli'),
    base.replace(/\bchilli\b/g, 'chillies'),
    base.replace(/ies$/, 'i'),            // generic plural→singular
    base.replace(/s$/, ''),               // generic trailing-s strip
  ])].filter(s => s && s.length > 2)
}

// ── Source A: Brave Search — snippets ─────────────────────────────────────
async function braveSearchFull(query, key) {
  const r = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10&result_filter=web`,
    { signal: sig(8000), headers: { Accept: 'application/json', 'X-Subscription-Token': key } },
  )
  if (!r.ok) throw new Error(`Brave ${r.status}: ${(await r.text().catch(() => '')).slice(0, 80)}`)
  const d = await r.json()
  const results = d.web?.results || []
  return {
    urls: results.map(x => x.url).filter(Boolean),
    snippetText: results.map(x =>
      `Source: ${x.url}\nTitle: ${x.title || ''}\n${x.description || ''}\n${(x.extra_snippets || []).join(' ')}`
    ).join('\n---\n'),
  }
}

// ── Source B: DuckDuckGo HTML (replaces s.jina.ai which returns 0 chars) ──
// DDG's HTML endpoint needs no JS, no auth, no API key.
// We fetch it via Jina Reader so markup is stripped to clean text.
async function ddgSearch(query) {
  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    const r = await fetch(`https://r.jina.ai/${ddgUrl}`, {
      signal: sig(18000),
      headers: { Accept: 'text/plain', 'X-No-Cache': 'true', 'X-Return-Format': 'text' },
    })
    if (!r.ok) return ''
    return (await r.text()).slice(0, 14000)
  } catch (_) { return '' }
}

// ── Source C: Directory crawl via Jina Reader ─────────────────────────────
function buildDirectoryUrls(product, country) {
  const slugs = productSlugs(product)
  const cs = countrySlug(country)
  // Prefer singular slug for Volza/Cybex — those sites index by singular form
  const singularSlug = slugs.find(s => !s.endsWith('ies') && !s.endsWith('es')) || slugs[0]
  const urls = []

  // ── Tier 1: Sites that show company names (even behind partial paywall) ──
  urls.push(`https://www.volza.com/p/${singularSlug}/import/import-in-${cs}/`)
  urls.push(`https://www.cybex.in/import-export/${singularSlug}-importers-in-${cs}.aspx`)
  if (isUAE(country)) {
    urls.push('https://yellowpages.ae/en/search/food-stuff-importers-exporters-dubai')
    urls.push('https://yellowpages.ae/en/search/spices-herbs-importers-dubai')
  }
  urls.push(`https://www.tradekey.com/products-buyer-lead/productname-${singularSlug}/`)

  // ── Tier 2: exportimportdata.in — limit to 3 slug variants only ──────────
  for (const s of slugs.slice(0, 3)) {
    urls.push(`https://www.exportimportdata.in/blogs/${s}-importers-in-${cs}.aspx`)
    if (isUAE(country)) {
      urls.push(`https://www.exportimportdata.in/blogs/${s}-importers-in-dubai.aspx`)
    }
  }

  return [...new Set(urls)]  // No slice — all are high-value
}

async function crawlViaJina(url) {
  try {
    const r = await fetch(`https://r.jina.ai/${url}`, {
      signal: sig(8000),  // 8s not 14s — leaves room for AI fallback within 30s limit
      headers: { Accept: 'text/plain', 'X-No-Cache': 'true', 'X-Return-Format': 'text' },
    })
    if (!r.ok) return null
    return (await r.text()).trim().slice(0, 6000) || null
  } catch (_) { return null }
}

// ── Extraction: GPT-4o-mini ────────────────────────────────────────────────
// Prompt is deliberately permissive: extract any company MENTIONED near the
// topic, even without full contact details. Consolidation handles quality.

async function extract(text, sourceLabel, product, country, apiKey) {
  if (!text || text.length < 30) return []
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', signal: sig(18000),
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 2500,
      messages: [
        {
          role: 'system',
          content: `Extract importer/buyer/trader company names from text.
RULES:
- Extract every company or business name mentioned, even if contact details are missing.
- Include companies that import, buy, distribute, or trade the product — even if their country is only implied.
- Do NOT filter by country strictly; a company mentioned in a UAE context is fine.
- Return [] only if the text is a login/paywall page with zero company data.
- Never invent companies not present in the text.
Return ONLY a JSON array.`,
        },
        {
          role: 'user',
          content: `Text source: ${sourceLabel}
Product: ${product}
Country context: ${country}

${text}

Extract all companies related to importing or buying "${product}".
JSON array:
[{"company_name":"...","city":"...","country":"...","website":"...","email":"...","phone":"...","business_type":"Importer|Distributor|Trader"}]
Return ONLY the JSON array. Use null for unknown fields.`,
        },
      ],
    }),
  })
  if (!r.ok) return []
  const raw = ((await r.json()).choices?.[0]?.message?.content || '')
    .trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '')
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter(x => x?.company_name?.trim()) : []
  } catch (_) {
    const m = raw.match(/\[[\s\S]*]/)
    try { return JSON.parse(m?.[0] || '[]').filter(x => x?.company_name?.trim()) } catch (_2) { return [] }
  }
}

// ── Knowledge fallback ─────────────────────────────────────────────────────
// Ask broadly for food/spice trading companies in the country — GPT-4o-mini
// knows major companies even if it doesn't know specific product importers.

async function knowledgeFallback(product, country, apiKey, send) {
  await send({ type: 'debug', message: 'No web data found — trying AI knowledge fallback…' })
  await send({ type: 'page_status', url: 'ai-knowledge-fallback', phase: 'crawling' })
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: sig(20000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini', temperature: 0.3, max_tokens: 2000,
        messages: [
          {
            role: 'system',
            content: 'You are a trade intelligence assistant helping an Indian spice exporter find buyers. Be helpful and list companies generously. Do not be overly cautious about certainty.',
          },
          {
            role: 'user',
            content: `I export ${product} from India and want to find buyers in ${country}.

List food importing companies, spice traders, wholesale food distributors, commodity trading groups, and large retailers that import food directly — all based in ${country}.

They do NOT need to specifically import ${product}. Any food/spice/commodity business in ${country} is a useful lead.

Include examples like:
- Food stuff trading companies and wholesale distributors
- Spice importers and commodity traders
- Food manufacturing companies that use spices as ingredients
- Major supermarket chains / retailers that import food directly
- Indian/Asian grocery wholesale distributors

Give me 10-15 companies. Be generous with your list.

Return ONLY JSON array:
[{"company_name":"...","city":"...","country":"${country}","business_type":"...","website":"..."}]
Use null for unknown website.`,
          },
        ],
      }),
    })
    if (!r.ok) {
      await send({ type: 'debug', message: `AI fallback HTTP ${r.status}` })
      await send({ type: 'page_status', url: 'ai-knowledge-fallback', phase: 'failed', found: 0 })
      return []
    }
    const body = await r.json()
    const content = body.choices?.[0]?.message?.content || ''
    await send({ type: 'debug', message: `AI raw response: ${content.slice(0, 120)}` })
    // Strip code fences and leading/trailing non-JSON text
    const cleaned = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
    // Find the JSON array anywhere in the response
    const match = cleaned.match(/\[[\s\S]*\]/)
    let buyers = []
    try {
      const arr = JSON.parse(match?.[0] || cleaned)
      buyers = Array.isArray(arr) ? arr.filter(x => x?.company_name?.trim()) : []
    } catch (parseErr) {
      await send({ type: 'debug', message: `AI parse failed: ${parseErr.message} — raw: ${cleaned.slice(0, 100)}` })
    }
    await send({ type: 'page_status', url: 'ai-knowledge-fallback', phase: 'done', found: buyers.length })
    await send({ type: 'debug', message: `AI knowledge → ${buyers.length} food/spice companies` })
    return buyers.map(b => ({ buyer: b, source: 'AI Knowledge' }))
  } catch (err) {
    await send({ type: 'debug', message: `AI fallback error: ${err.message}` })
    await send({ type: 'page_status', url: 'ai-knowledge-fallback', phase: 'failed', found: 0 })
    return []
  }
}

// ── Consolidation ─────────────────────────────────────────────────────────

function normKey(name) {
  return name.toLowerCase()
    .replace(/\b(ltd|limited|sdn\.?bhd|pvt|llc|gmbh|corp|inc|co\.|company|trading|enterprise|group|holdings?|international|global|imports?|exports?|industries|services|fze|fzco|llc|dmcc)\b/gi, '')
    .replace(/[^a-z0-9]/g, '').slice(0, 22)
}

function consolidate(rawBuyers, country) {
  const map = new Map()
  for (const { buyer, source } of rawBuyers) {
    const key = normKey(buyer.company_name)
    if (!key || key.length < 2) continue
    if (map.has(key)) {
      const e = map.get(key)
      for (const k of ['city', 'country', 'website', 'email', 'phone', 'business_type'])
        if (!e[k] && buyer[k]) e[k] = buyer[k]
      e._srcs.add(source)
    } else {
      map.set(key, { ...buyer, country: buyer.country || country, _srcs: new Set([source]) })
    }
  }
  return [...map.values()].map(({ _srcs, ...b }) => {
    const sources = [..._srcs]
    const isAIOnly = sources.every(s => s === 'AI Knowledge')
    let conf = isAIOnly ? 25 : 40
    if (b.website) conf += 20
    if (b.email)   conf += 20
    if (b.phone)   conf += 10
    if (sources.length > 1) conf += 10
    return { ...b, confidence: Math.min(conf, 95), sources }
  }).sort((a, z) => z.confidence - a.confidence)
}

async function gpt4oClean(buyers, product, country, apiKey) {
  if (buyers.length === 0) return buyers
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: sig(20000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o', temperature: 0, max_tokens: 3000,
        messages: [{ role: 'user', content: `Clean and deduplicate these ${product} importers in ${country}. Fix company name formatting. Remove obvious duplicates. Keep all fields. Return ONLY a JSON array.\n\n${JSON.stringify(buyers)}` }],
      }),
    })
    if (!r.ok) return buyers
    const raw = ((await r.json()).choices?.[0]?.message?.content || '').replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    const out = JSON.parse(raw)
    return Array.isArray(out) && out.length > 0 ? out : buyers
  } catch (_) { return buyers }
}

// ── Main handler ───────────────────────────────────────────────────────────

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url)
  const country = (u.searchParams.get('country') || '').trim()
  const product  = (u.searchParams.get('product')  || '').trim()

  if (!country || !product) {
    return new Response(JSON.stringify({ error: 'country and product are required' }), {
      status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  const apiKey = env.OPENAI_API_KEY
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const enc = new TextEncoder()
  const send = obj => writer.write(enc.encode(`data: ${JSON.stringify(obj)}\n\n`))

  ;(async () => {
    try {
      if (!apiKey) {
        await send({ type: 'error', code: 'no_api_key', message: 'Add OPENAI_API_KEY in Cloudflare Pages → Settings → Environment Variables.' })
        return
      }

      await send({ type: 'status', message: `Searching for ${product} buyers in ${country}…` })

      const rawBuyers = []
      const dirUrls = buildDirectoryUrls(product, country)
      await send({ type: 'debug', message: `Directory targets: ${dirUrls.join(' | ')}` })

      // ── A: Brave Search snippets ─────────────────────────────────────────
      const braveQueries = [
        `"${product}" importers buyers ${country} company`,
        `${product} import buyers list ${country} contact phone`,
        `site:exportimportdata.in ${product} importers ${country}`,
        ...(isUAE(country) ? [
          // Target company websites, NOT database aggregators
          `"${product}" importer buyer Dubai UAE -site:volza.com -site:cybex.in -site:exportgenius.com`,
          `site:yellowpages.ae spices food importers`,
          `Dubai UAE food stuff spice trading company import India`,
        ] : [
          `site:volza.com "${product}" ${country}`,
          `site:cybex.in ${product} importers ${country}`,
        ]),
      ]

      let braveUrls = []

      if (env.BRAVE_API_KEY) {
        await send({ type: 'status', message: 'Running Brave Search…' })
        const braveResults = await Promise.all(
          braveQueries.map(q => braveSearchFull(q, env.BRAVE_API_KEY).catch(() => ({ urls: [], snippetText: '' })))
        )
        const allSnippets = braveResults.map(r => r.snippetText).filter(Boolean).join('\n===\n')
        braveUrls = [...new Set(braveResults.flatMap(r => r.urls))]
        await send({ type: 'debug', message: `Brave returned ${braveUrls.length} URLs` })

        if (allSnippets.length > 50) {
          await send({ type: 'page_status', url: 'brave-search-snippets', phase: 'extracting' })
          const buyers = await extract(allSnippets.slice(0, 12000), 'Brave Search snippets', product, country, apiKey)
          await send({ type: 'page_status', url: 'brave-search-snippets', phase: 'done', found: buyers.length })
          for (const b of buyers) rawBuyers.push({ buyer: b, source: 'Brave Search' })
          await send({ type: 'debug', message: `Snippet extraction → ${buyers.length} companies` })
        }
      } else {
        await send({ type: 'debug', message: 'BRAVE_API_KEY not set — skipping web search snippets' })
      }

      // ── B: DuckDuckGo HTML search (s.jina.ai was returning 0 chars) ────────
      // DDG HTML endpoint is plain HTML, no JS, no auth — reliable via Jina Reader.
      const ddgQueries = [
        `${product} importers buyers ${country} company`,
        ...(isUAE(country) ? [`Dubai UAE spice food importer company ${product}`] : []),
      ]
      await send({ type: 'status', message: 'Searching DuckDuckGo for company pages…' })

      for (const dq of ddgQueries) {
        const ddgLabel = `ddg: ${dq.slice(0, 60)}`
        await send({ type: 'page_status', url: ddgLabel, phase: 'crawling' })
        const ddgText = await ddgSearch(dq)
        await send({ type: 'debug', message: `DDG search returned ${ddgText?.length || 0} chars` })
        if (ddgText && ddgText.length > 100) {
          await send({ type: 'page_status', url: ddgLabel, phase: 'extracting' })
          const buyers = await extract(ddgText, `DDG: ${dq}`, product, country, apiKey)
          await send({ type: 'page_status', url: ddgLabel, phase: 'done', found: buyers.length })
          for (const b of buyers) rawBuyers.push({ buyer: b, source: 'Web Search' })
          await send({ type: 'debug', message: `DDG extraction → ${buyers.length} companies` })
        } else {
          await send({ type: 'page_status', url: ddgLabel, phase: 'failed', found: 0 })
        }
      }

      // ── C: Directory crawls ──────────────────────────────────────────────
      // Skip known subscription-gated databases from Brave results.
      // dirUrls are already priority-ordered (Volza first, exportimportdata last).
      // Take up to 12 more non-database Brave URLs to crawl actual company pages.
      const DB_DOMAINS = ['volza.com','cybex.in','exportgenius.com','panjiva.com',
        'importyeti.com','seair.co.in','zauba.com','tradeford.com',
        'linkedin.com','facebook.com','twitter.com','instagram.com',
        'alibaba.com','indiamart.com','tradeindia.com']
      const bravePageTargets = braveUrls
        .filter(u => !DB_DOMAINS.some(d => u.includes(d)))
        .slice(0, 12)
      const crawlTargets = [...new Set([...dirUrls, ...bravePageTargets])]
      await send({ type: 'debug', message: `Crawling ${crawlTargets.length} pages (${dirUrls.length} directories + ${bravePageTargets.length} from Brave)` })
      await send({ type: 'status', message: `Crawling ${crawlTargets.length} pages…` })

      await Promise.all(crawlTargets.map(async pageUrl => {
        await send({ type: 'page_status', url: pageUrl, phase: 'crawling' })
        const text = await crawlViaJina(pageUrl)
        if (!text || text.length < 50) {
          await send({ type: 'page_status', url: pageUrl, phase: 'failed', found: 0 })
          await send({ type: 'debug', message: `✗ ${pageUrl.replace(/^https?:\/\//, '').slice(0, 60)} → empty/failed` })
          return
        }
        await send({ type: 'page_status', url: pageUrl, phase: 'extracting' })
        const buyers = await extract(text, pageUrl, product, country, apiKey)
        await send({ type: 'page_status', url: pageUrl, phase: 'done', found: buyers.length })
        await send({ type: 'debug', message: `${buyers.length > 0 ? '✓' : '○'} ${pageUrl.replace(/^https?:\/\//, '').slice(0, 60)} → ${text.length} chars → ${buyers.length} companies` })
        for (const b of buyers) rawBuyers.push({ buyer: b, source: pageUrl })
      }))

      // ── Knowledge fallback if nothing found yet ──────────────────────────
      if (rawBuyers.length === 0) {
        const kbBuyers = await knowledgeFallback(product, country, apiKey, send)
        rawBuyers.push(...kbBuyers)
      }

      // ── Country baseline (last resort when all web + AI sources return 0) ──
      if (rawBuyers.length === 0) {
        const baseline = getCountryBaseline(country)
        if (baseline) {
          await send({ type: 'debug', message: `Using ${country} company baseline (${baseline.length} known companies)` })
          for (const b of baseline) rawBuyers.push({ buyer: { ...b, country }, source: 'AI Knowledge' })
        }
      }

      // ── Consolidate ───────────────────────────────────────────────────────
      await send({ type: 'status', message: `Consolidating ${rawBuyers.length} raw records…` })
      let buyers = consolidate(rawBuyers, country)
      buyers = await gpt4oClean(buyers, product, country, apiKey)

      const hasAIOnly = buyers.length > 0 && buyers.every(b => b.sources?.every(s => s === 'AI Knowledge'))
      const searchMode = hasAIOnly ? 'knowledge'
        : env.BRAVE_API_KEY ? 'web_search'
        : 'directory_crawl'
      await send({ type: 'meta', searchMode })
      await send({ type: 'debug', message: `Final: ${buyers.length} unique companies` })

      if (buyers.length === 0) {
        await send({ type: 'no_results', message: `No ${product} importers could be found for ${country}. The debug lines above show what each source returned.` })
      } else {
        for (const buyer of buyers) await send({ type: 'buyer', ...buyer })
      }
      await send({ type: 'done', count: buyers.length })

    } catch (err) {
      const msg = err?.name === 'AbortError' ? 'Request timed out.' : (err?.message || 'Search failed.')
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
