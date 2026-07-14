import { useState, useEffect, useRef } from 'react'
import { ComposableMap, Geographies, Geography, Marker, Line } from 'react-simple-maps'
import './App.css'

function CountUp({ to, suffix = '', duration = 1800 }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const start = performance.now()
        const tick = (now) => {
          const progress = Math.min((now - start) / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setCount(Math.floor(eased * to))
          if (progress < 1) requestAnimationFrame(tick)
          else setCount(to)
        }
        requestAnimationFrame(tick)
        observer.disconnect()
      }
    }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [to, duration])
  return <strong ref={ref}>{count}{suffix}</strong>
}

function FadeIn({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.12 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={`fade-in ${visible ? 'fade-in--visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function ScrollProgress() {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight
      setPct(total > 0 ? (window.scrollY / total) * 100 : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return <div className="scroll-progress" style={{ width: `${pct}%` }} aria-hidden="true" />
}

const PRODUCTS = [
  {
    id: 'dry-red-chilli',
    emoji: '🌶️',
    image: '/product-dry-chilli.jpg',
    hoverImage: null,
    name: 'Dry Red Chillies',
    tagline: 'Whole Dried Chillies',
    category: 'Chillies',
    description:
      'Sun-dried whole red chillies with intense colour, rich aroma, and bold heat. Sourced from the finest chilli-growing regions of Andhra Pradesh.',
    specs: ['Moisture: ≤ 12%', 'Pungency: 20,000–50,000 SHU', 'Colour: ASTA 100+', 'Packaging: 25 kg jute bags'],
    gradient: 'linear-gradient(135deg, #8B1A0A 0%, #C0392B 60%, #E74C3C 100%)',
  },
  {
    id: 'chilli-powder',
    emoji: '🧂',
    image: '/product-dry-chilli-powder.jpg',
    hoverImage: null,
    name: 'Chilli Powder',
    tagline: 'Ground Red Chilli',
    category: 'Chillies',
    description:
      'Finely milled from select dried red chillies, our chilli powder delivers consistent heat, vibrant red colour, and deep flavour to every dish.',
    specs: ['Moisture: ≤ 10%', 'Granularity: 60–80 mesh', 'Colour: ASTA 120+', 'Packaging: 1 kg / 5 kg / 25 kg'],
    gradient: 'linear-gradient(135deg, #7B1A00 0%, #A93226 60%, #CB4335 100%)',
  },
  {
    id: 'chilli-flakes',
    emoji: '✨',
    image: '/product-chilli-flakes.jpg',
    hoverImage: null,
    name: 'Chilli Flakes',
    tagline: 'Crushed Red Chilli',
    category: 'Chillies',
    description:
      'Coarsely crushed dried chillies with seeds intact, offering bursts of heat and texture. A favourite for pizzas, marinades, and culinary applications worldwide.',
    specs: ['Moisture: ≤ 11%', 'Particle size: 3–5 mm', 'Colour: ASTA 90+', 'Packaging: 500 g / 5 kg / 20 kg'],
    gradient: 'linear-gradient(135deg, #6E1A00 0%, #922B21 60%, #B03A2E 100%)',
  },
  {
    id: 'kabuli-chana',
    emoji: '🫘',
    image: '/products/kabuli-chana-bowl.jpg',
    hoverImage: '/products/kabuli-chana.png',
    name: 'Kabuli Chana',
    tagline: 'White Chickpeas',
    category: 'Whole Pulses',
    description:
      'Premium white chickpeas with firm texture and mild, nutty flavour. Widely used in hummus, curries, and salads — a staple across Middle Eastern, Mediterranean, and Asian cuisines.',
    specs: ['Moisture: ≤ 12%', 'Protein: 24%', 'Purity: 99%+', 'Packaging: 25 kg / 50 kg bags'],
    gradient: 'linear-gradient(135deg, #7A6020 0%, #B08A30 60%, #C9A84C 100%)',
  },
  {
    id: 'kala-chana',
    emoji: '🫘',
    image: '/products/kala-chana-bowl.jpg',
    hoverImage: '/products/kala-chana.webp',
    name: 'Kala Chana',
    tagline: 'Black Chickpeas',
    category: 'Whole Pulses',
    description:
      'Small, dark brown black chickpeas (Bengal gram) with rough coat and nutty flavour. High protein content makes them a staple across South Asian, African, and Middle Eastern cuisines.',
    specs: ['Moisture: ≤ 12%', 'Protein: 17.7%', 'Purity: 98%+', 'Packaging: 25 kg / 50 kg bags'],
    gradient: 'linear-gradient(135deg, #3A2010 0%, #6A4020 60%, #8A5830 100%)',
  },
  {
    id: 'mung-whole',
    emoji: '🌿',
    image: '/products/mung-whole-bowl.jpg',
    hoverImage: '/products/mung-whole.webp',
    name: 'Mung Whole',
    tagline: 'Whole Green Gram',
    category: 'Whole Pulses',
    description:
      'Whole mung beans — flat, smooth, and vivid green throughout. A versatile legume used for sprouting, cooking, and food processing. High demand across Asian and health food export markets.',
    specs: ['Dry Matter: 89.7%', 'Protein: 24.6%', 'Fibre: 3.2%', 'Packaging: 25 kg / 50 kg bags'],
    gradient: 'linear-gradient(135deg, #1A5020 0%, #2D7A30 60%, #3A9040 100%)',
  },
  {
    id: 'urad-whole',
    emoji: '🫘',
    image: '/products/urad-whole-bowl.png',
    hoverImage: '/products/urad-whole.png',
    name: 'Urad Whole',
    tagline: 'Whole Black Gram',
    category: 'Whole Pulses',
    description:
      'Uniformly flat black whole urad (black gram) with a very slight visibility of brown beans. A key ingredient in Indian cuisine and a high-value export commodity across Asia.',
    specs: ['Dry Matter: 89.7%', 'Protein: 24.6%', 'Fibre: 3.2%', 'Packaging: 25 kg / 50 kg bags'],
    gradient: 'linear-gradient(135deg, #1A0A05 0%, #3A2010 60%, #5A3020 100%)',
  },
  {
    id: 'chana-dal',
    emoji: '🫘',
    image: '/products/chana-dal-bowl.jpg',
    hoverImage: '/products/chana-dal.png',
    name: 'Chana Dal',
    tagline: 'Split Bengal Gram',
    category: 'Dal',
    description:
      'Split and polished chickpeas with a mild, nutty flavour and firm texture. Typical yellow colour with a hard, free-flowing texture — a staple dal across South Asian and global markets.',
    specs: ['Moisture: ≤ 12%', 'Protein: 22.2%', 'Fat: 5.8%', 'Packaging: 25 kg / 50 kg bags'],
    gradient: 'linear-gradient(135deg, #8B6914 0%, #C9941A 60%, #E8B84B 100%)',
  },
  {
    id: 'toor-dal',
    emoji: '🫘',
    image: '/products/split-pigeon-bowl.jpg',
    hoverImage: '/products/split-pigeon-peas.jpg',
    name: 'Toor Dal',
    tagline: 'Split Pigeon Peas',
    category: 'Dal',
    description:
      'A staple of Indian cuisine and key export commodity. Machine-cleaned toor dal with uniform split, available in oily and dry varieties to suit diverse culinary markets worldwide.',
    specs: ['Moisture: ≤ 12%', 'Protein: 18%', 'Fibre: 20%', 'Packaging: 1 kg / 5 kg / 25 kg'],
    gradient: 'linear-gradient(135deg, #7A5010 0%, #B07820 60%, #D4A030 100%)',
  },
  {
    id: 'moong-dal',
    emoji: '🌿',
    image: '/products/mung-dal-bowl.jpg',
    hoverImage: '/products/mung-dal.jpg',
    name: 'Moong Dal',
    tagline: 'Split Green Gram',
    category: 'Dal',
    description:
      'Light, easily digestible moong dal with creamy yellow colour and mild flavour. A favourite for health-conscious consumers globally and a key ingredient in Asian cuisine.',
    specs: ['Moisture: ≤ 12%', 'Protein: 26%', 'Purity: 99%+', 'Packaging: 500 g / 1 kg / 25 kg'],
    gradient: 'linear-gradient(135deg, #1A5020 0%, #2D7A30 60%, #40A040 100%)',
  },
  {
    id: 'mung-chilka',
    emoji: '🌿',
    image: '/products/mung-chilka-bowl.jpg',
    hoverImage: '/products/mung-chilka.jpg',
    name: 'Mung Chilka',
    tagline: 'Split Green Gram with Husk',
    category: 'Dal',
    description:
      'Byproduct of whole mung, Mung Chilka Dal includes the husk for a slightly coarse texture and added nutrition. Mixed green and light yellow colour with high fibre content.',
    specs: ['Moisture: ≤ 12%', 'Protein: 26%', 'Fibre: 4%', 'Packaging: 25 kg / 50 kg bags'],
    gradient: 'linear-gradient(135deg, #2A5015 0%, #4A7825 60%, #6A9A35 100%)',
  },
  {
    id: 'urad-dal',
    emoji: '🫘',
    image: '/products/urad-dal-bowl.jpg',
    hoverImage: '/products/urad-dal.jpg',
    name: 'Urad Dal',
    tagline: 'Black Gram Lentil',
    category: 'Dal',
    description:
      'Premium huskless urad dal processed through gravity separation and Sortex cleaning. Key ingredient in idli, dosa, and vada — popular across Asian and diaspora markets worldwide.',
    specs: ['Moisture: ≤ 12%', 'Protein: 50%', 'Purity: 99%+', 'Packaging: 1 kg / 5 kg / 25 kg'],
    gradient: 'linear-gradient(135deg, #2A1A0A 0%, #5A4020 60%, #8A6030 100%)',
  },
  {
    id: 'urad-chilka',
    emoji: '🫘',
    image: '/products/urad-chilka-bowl.jpg',
    hoverImage: '/products/urad-chilka.jpg',
    name: 'Urad Chilka',
    tagline: 'Split Black Gram with Husk',
    category: 'Dal',
    description:
      'Whole urad beans split with the black skin intact, offering a rich flavour and enhanced nutrition. The combination of black skin and creamy white interior adds distinctive taste to dishes.',
    specs: ['Dry Matter: 91%', 'Protein: 50%', 'Fibre: 64%', 'Packaging: 25 kg / 50 kg bags'],
    gradient: 'linear-gradient(135deg, #1A0A05 0%, #3A1A0A 60%, #5A2A10 100%)',
  },
  {
    id: 'black-eyed-beans',
    emoji: '🫘',
    image: '/products/black-eye-bean-bowl.jpg',
    hoverImage: '/products/black-eyed-beans.jpg',
    name: 'Cow Peas',
    tagline: 'Black-Eyed Beans',
    category: 'Beans',
    description:
      'Nutritious and versatile black-eyed beans (cow peas) used in curries, salads, and soups. A key export crop with strong demand in African, European, and American markets.',
    specs: ['Moisture: ≤ 13%', 'Protein: 24%', 'Purity: 98%+', 'Packaging: 25 kg / 50 kg bags'],
    gradient: 'linear-gradient(135deg, #3A5010 0%, #5A7820 60%, #7A9A30 100%)',
  },
  {
    id: 'red-cow-peas',
    emoji: '🫘',
    image: '/products/red-cow-peas-bowl.jpg',
    hoverImage: '/products/red-cow-peas.jpg',
    name: 'Red Cow Peas',
    tagline: 'Red Legumes',
    category: 'Beans',
    description:
      'Small, oval-shaped red cow peas with a reddish-brown smooth texture. Commonly used in Indian and African cuisines, and popular in wellness and health food markets globally.',
    specs: ['Moisture: ≤ 13%', 'Protein: 23.5%', 'Purity: 98%+', 'Packaging: 25 kg / 50 kg bags'],
    gradient: 'linear-gradient(135deg, #7B1A0A 0%, #A83020 60%, #C04030 100%)',
  },
]

function LogoText() {
  const [vae, setVae] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    // Initial collapse animation after 1.1s on load
    const initTimer = setTimeout(() => {
      initialized.current = true
      setVae(window.scrollY > 50)
    }, 1100)

    // Scroll: collapse when scrolled, expand when back at top
    const onScroll = () => {
      if (!initialized.current) return
      setVae(window.scrollY > 50)
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      clearTimeout(initTimer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  // Collapse delays: stagger left→right so A arrives at V first, then E
  // Expand delays: stagger right→left so it unfurls naturally
  const collapseDelay = ['0ms', '70ms', '160ms', '230ms', '320ms']
  const expandDelay   = ['300ms', '200ms', '100ms', '60ms', '0ms']
  const d = (i) => vae ? collapseDelay[i] : expandDelay[i]

  return (
    <span className={`logo-anim${vae ? ' logo-anim--vae' : ''}`}>
      <span className="la-k">V</span>
      <span className="la-f" style={{ transitionDelay: d(0) }}>unnam</span>
      <span className="la-f la-sp" style={{ transitionDelay: d(1) }}>&nbsp;</span>
      <span className="la-k">A</span>
      <span className="la-f" style={{ transitionDelay: d(2) }}>gro</span>
      <span className="la-f la-sp" style={{ transitionDelay: d(3) }}>&nbsp;</span>
      <span className="la-k">E</span>
      <span className="la-f" style={{ transitionDelay: d(4) }}>xports</span>
    </span>
  )
}

const TICKER_ITEMS = [
  'Teja S17 Chilli', 'Toor Dal', 'Chana Dal', 'Kabuli Chana', 'Urad Dal',
  'Moong Dal', 'Red Cow Peas', 'Mung Whole', 'Chilli Flakes', 'Chilli Powder',
  'Kala Chana', 'Urad Chilka', 'Black-Eyed Beans', 'Mung Chilka', 'Urad Whole',
]

const FTP_STEPS = [
  { icon: '🌱', label: 'Farm Sourcing',      desc: 'Direct from Andhra Pradesh farms' },
  { icon: '🧹', label: 'Sorting & Cleaning', desc: 'Machine & hand sorted' },
  { icon: '🔬', label: 'Lab Testing',        desc: 'Moisture, pungency & purity verified' },
  { icon: '📦', label: 'Packing',            desc: 'Custom sizes for every market' },
  { icon: '🚚', label: 'Inland Transport',   desc: 'Reefer logistics to port' },
  { icon: '🚢', label: 'Port & Export',      desc: 'Timely container shipment' },
]

const CERTS = [
  { code: 'APEDA',  name: 'Agri Export Development Authority', icon: '🏛️' },
  { code: 'FSSAI',  name: 'Food Safety & Standards Certified', icon: '🍃' },
  { code: 'PHYTO',  name: 'Phyto-Sanitary Certificate',        icon: '🌿' },
  { code: 'ISO',    name: 'Quality Management Compliant',      icon: '🎖️' },
]

const NAV_LINKS = ['Products', 'Prices', 'Calculator', 'Buyers', 'About', 'Contact']

const SECTIONS = [
  { id: 'hero',     label: 'Home' },
  { id: 'products', label: 'Products' },
  { id: 'prices',   label: 'Prices' },
  { id: 'about',    label: 'About' },
  { id: 'reach',    label: 'Global Reach' },
  { id: 'process',  label: 'Process' },
  { id: 'contact',  label: 'Contact' },
]

const GEO_URL    = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
const INDIA_COORDS = [78.9629, 20.5937]

const W = [72.8, 18.9]
const E = [80.0, 13.0]
const GULF = [[67,20],[62,22],[58,22.5],[56.5,24]]
const SUEZ = [[68,14],[57,12],[44.8,11.8],[43,13],[40.5,17],[38,22],[34.5,27.5],[32.5,30.5],[32.3,31.2]]
const MED  = [[24,34],[15,36],[7,37.5]]
const GRIB = [[7,37.5],[-1,37.5],[-5.5,36]]
const BOB  = [[84,10],[88,7],[92,4.5],[96.5,4],[100,2.5],[103.8,1.3]]

function mkr(name, flag, numId, coords, ship, products) {
  return { name, flag, numId, coords, ship, products }
}

const EXPORT_ROUTES = [
  mkr('UAE',         '🇦🇪','784',[53.8,23.4], [W,...GULF,[54.5,24.5],[53.8,25.2]], ['Red Chilli (Teja S17)','Toor Dal','Turmeric']),
  mkr('Oman',        '🇴🇲','512',[57.6,21.5],  [W,[67,20],[62,22],[59,23],[58.5,23.6]], ['Red Chilli','Spices','Toor Dal']),
  mkr('Kuwait',      '🇰🇼','414',[47.5,29.3],  [W,...GULF,[55,25.5],[51,26.5],[48.5,29],[47.7,29.3]], ['Chilli Powder','Turmeric','Pulses']),
  mkr('Iraq',        '🇮🇶','368',[43.7,33.2],  [W,...GULF,[55,25.5],[51,26.5],[48.5,29],[47.5,29.8],[48,30]], ['Red Chilli','Turmeric','Agricultural Products']),
  mkr('Saudi Arabia','🇸🇦','682',[45.1,23.9],  [W,[68,14],[57,12],[44.8,11.8],[43,13],[40.5,17],[39.5,20],[39.2,21.5]], ['Red Chilli','Spices','Pulses']),
  mkr('Egypt',       '🇪🇬','818',[30.8,26.8],  [W,...SUEZ], ['Chilli','Turmeric','Agricultural Products']),
  mkr('Pakistan',    '🇵🇰','586',[67.7,30.4],  [W,[69,21],[67,23],[67.1,24.9]], ['Red Chilli','Toor Dal','Cumin']),
  mkr('Bangladesh',  '🇧🇩','50',[90.4,23.7],   [E,[84,18],[87,19],[90,22],[90.4,23.7]], ['Red Chilli','Turmeric','Pulses']),
  mkr('Sri Lanka',   '🇱🇰','144',[80.7,7.9],   [[80,10],[80.2,8.5],[79.9,7.9]], ['Red Chilli','Toor Dal','Spices']),
  mkr('Singapore',   '🇸🇬','702',[103.8,1.4],  [E,...BOB], ['Pulses','Red Chilli','Agricultural Products']),
  mkr('Thailand',    '🇹🇭','764',[101.0,15.9], [E,...BOB,[100.5,6],[101,13.5]], ['Chilli','Turmeric','Agricultural Products']),
  mkr('Malaysia',    '🇲🇾','458',[109.7,4.2],  [E,...BOB,[104,2],[107,4],[109.7,4.2]], ['Chilli Varieties','Toor Dal']),
  mkr('Indonesia',   '🇮🇩','360',[113.9,-0.8], [E,...BOB,[106,-5],[106.8,-6.2],[110,-7.5],[113,-7]], ['Red Chilli','Spices','Agricultural Products']),
  mkr('Vietnam',     '🇻🇳','704',[108.3,14.1], [E,...BOB,[104,4],[106,9],[106.7,10.8]], ['Chilli','Turmeric','Pulses']),
  mkr('Philippines', '🇵🇭','608',[121.8,12.9], [E,...BOB,[107,5],[113,10],[118,12],[120.9,14.6]], ['Chilli','Agricultural Products']),
  mkr('China',       '🇨🇳','156',[104.2,35.9], [E,...BOB,[108,12],[114,20],[118,26],[121.5,30.5]], ['Red Chilli','Turmeric','Pulses','Spices']),
  mkr('Japan',       '🇯🇵','392',[138.3,36.2], [E,...BOB,[108,12],[114,20],[120,28],[128,32],[135,34],[139.7,35.7]], ['Turmeric','Spices','Organic Products']),
  mkr('Turkey',      '🇹🇷','792',[35.2,38.9],  [W,...SUEZ,[30,35],[28,38],[28.9,41]], ['Red Chilli','Spices','Pulses']),
  mkr('France',      '🇫🇷','250',[2.2,46.2],   [W,...SUEZ,...MED,[5.5,42],[5.3,43.3]], ['Turmeric','Spice Blends','Agricultural Products']),
  mkr('Spain',       '🇪🇸','724',[-3.7,40.5],  [W,...SUEZ,...MED,[2.5,40.5],[2.2,41.4]], ['Red Chilli','Spices']),
  mkr('Morocco',     '🇲🇦','504',[-7.1,31.8],  [W,...SUEZ,...GRIB,[-7.6,33.6]], ['Red Chilli','Spices','Agricultural Products']),
  mkr('Senegal',     '🇸🇳','686',[-14.5,14.5], [W,...SUEZ,...GRIB,[-10,28],[-17.4,14.7]], ['Chilli','Agricultural Products']),
  mkr('Ghana',       '🇬🇭','288',[-1.0,7.9],   [W,...SUEZ,...GRIB,[-10,20],[-10,10],[-3,6],[-0.2,5.6]], ['Red Chilli','Pulses']),
  mkr('Nigeria',     '🇳🇬','566',[8.7,9.1],    [W,...SUEZ,...GRIB,[-10,20],[-10,10],[0,5],[3.4,6.5]], ['Red Chilli','Turmeric','Agricultural Products']),
  mkr('Germany',     '🇩🇪','276',[10.5,51.2],  [W,...SUEZ,...GRIB,[-9,40],[0,50],[5,54],[9,54],[10,53.6]], ['Turmeric','Spice Blends','Organic Products']),
  mkr('UK',          '🇬🇧','826',[-3.4,55.4],  [W,...SUEZ,...GRIB,[-9,40],[-10,44],[-7,50],[-3.5,55.4]], ['Spice Mixes','Red Chilli Powder','Turmeric']),
  mkr('Kenya',       '🇰🇪','404',[37.9,-0.0],  [W,[68,12],[60,8],[53,5],[45,-1],[40,-3],[39.7,-4.1]], ['Red Chilli','Spices','Pulses']),
  mkr('South Africa','🇿🇦','710',[22.9,-30.6], [W,[68,12],[60,5],[50,-5],[40,-15],[30,-25],[25,-32],[18.4,-33.9]], ['Chilli','Turmeric','Agricultural Products']),
  mkr('USA',         '🇺🇸','840',[-95.7,37.1], [W,...SUEZ,...GRIB,[-18,38],[-35,38],[-55,38],[-72,40],[-74,40.7]], ['Turmeric Powder','Spice Blends','Chilli Powder']),
  mkr('Canada',      '🇨🇦','124',[-96.8,56.1], [W,...SUEZ,...GRIB,[-18,38],[-35,38],[-50,40],[-60,44],[-63.6,44.6]], ['Turmeric','Spice Blends']),
  mkr('Mexico',      '🇲🇽','484',[-102.6,23.6],[W,...SUEZ,...GRIB,[-18,38],[-40,32],[-60,22],[-85,20],[-90,20],[-97,19.5]], ['Red Chilli','Spices']),
  mkr('Venezuela',   '🇻🇪','862',[-66.6,6.4],  [W,...SUEZ,...GRIB,[-15,30],[-30,18],[-55,12],[-65,10.5],[-66.9,10.5]], ['Agricultural Products','Spices']),
  mkr('Brazil',      '🇧🇷','76',[-51.9,-14.2], [W,...SUEZ,...GRIB,[-10,28],[-15,15],[-25,0],[-38,-8],[-45,-20],[-46.6,-23.5]], ['Red Chilli','Turmeric','Agricultural Products']),
  mkr('Argentina',   '🇦🇷','32',[-63.6,-38.4], [W,...SUEZ,...GRIB,[-10,28],[-20,10],[-30,-5],[-40,-15],[-50,-28],[-58.4,-34.6]], ['Chilli','Agricultural Products']),
  mkr('Australia',   '🇦🇺','36',[133.8,-25.3], [E,[87,0],[90,-8],[96,-16],[104,-20],[112,-22],[120,-26],[128,-26],[133.8,-25.3]], ['Organic Chilli','Turmeric','Pulses']),
  mkr('New Zealand', '🇳🇿','554',[174.9,-40.9],[E,[87,0],[90,-8],[96,-16],[104,-20],[112,-22],[120,-26],[138,-37],[150,-40],[168,-45],[174.8,-40.9]], ['Organic Products','Spices']),
]

const DEST_IDS = new Set(EXPORT_ROUTES.map(r => r.numId))

function GlobalReach() {
  const sectionRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [tooltip, setTooltip] = useState(null)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.15 }
    )
    if (sectionRef.current) obs.observe(sectionRef.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section className="reach" id="reach">
      <div className="container">
        <FadeIn className="fade-in--block">
          <div className="section-header">
            <span className="section-label">Global Presence</span>
            <h2 className="section-title">From Andhra Pradesh<br />to the World</h2>
            <p className="section-subtitle">
              Trusted agro exports across 5 continents.{' '}
              <span className="reach__hint">Hover a country to see what we ship there.</span>
            </p>
          </div>
        </FadeIn>

        <div
          ref={sectionRef}
          className="reach__map"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top })
          }}
          onMouseLeave={() => setTooltip(null)}
        >
          <ComposableMap
            projection="geoNaturalEarth1"
            projectionConfig={{ scale: 148, center: [10, 5] }}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const id = String(geo.id ?? '')
                  const isIndia = id === '356'
                  const isDest  = DEST_IDS.has(id)
                  const route   = EXPORT_ROUTES.find(r => r.numId === id)
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={isIndia ? 'rgba(220,70,35,0.82)' : '#1e3e6e'}
                      stroke="rgba(255,255,255,0.07)"
                      strokeWidth={0.4}
                      style={{
                        default: { outline: 'none' },
                        hover: {
                          fill: isIndia ? 'rgba(235,85,45,1)' : '#2a5490',
                          outline: 'none',
                          cursor: (isIndia || isDest) ? 'pointer' : 'default',
                        },
                        pressed: { outline: 'none' },
                      }}
                      onMouseEnter={() => {
                        if (isIndia) setTooltip({ name: 'India', flag: '🇮🇳', isOrigin: true })
                        else if (isDest) setTooltip(route)
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  )
                })
              }
            </Geographies>

            {visible && EXPORT_ROUTES.map((r, i) => (
              <Line
                key={r.name}
                coordinates={r.ship}
                stroke="rgba(255,255,255,0.55)"
                strokeWidth={1.4}
                strokeLinecap="butt"
                className="reach__route"
                style={{ animationDelay: `${i * 0.08}s` }}
              />
            ))}

            {visible && EXPORT_ROUTES.map((r, i) => (
              <Marker key={r.name} coordinates={r.coords}>
                <circle
                  r={5}
                  fill="rgba(255,130,45,0.95)"
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth={1}
                  className="reach__dest-dot"
                  style={{ animationDelay: `${i * 0.08 + 2.0}s` }}
                  onMouseEnter={() => setTooltip(r)}
                  onMouseLeave={() => setTooltip(null)}
                />
                <circle
                  r={11}
                  fill="none"
                  stroke="rgba(255,130,45,0.35)"
                  strokeWidth={1.2}
                  className="reach__dest-ring"
                  style={{ animationDelay: `${i * 0.08 + 2.3}s` }}
                />
              </Marker>
            ))}

            <Marker coordinates={INDIA_COORDS}>
              <circle r={7} fill="rgba(220,70,35,1)" stroke="rgba(255,255,255,0.7)" strokeWidth={1.5}/>
              <circle r={15} fill="none" stroke="rgba(220,70,35,0.45)" strokeWidth={1.5} className="reach__source-ring"/>
              <text
                textAnchor="middle" y={-14}
                style={{ fontSize: '10px', fontFamily: 'Inter,sans-serif', fontWeight: 700, fill: 'rgba(255,255,255,0.95)', letterSpacing: '0.5px', pointerEvents: 'none' }}
              >INDIA</text>
            </Marker>
          </ComposableMap>

          {tooltip && (
            <div className="reach__tooltip" style={{ left: mouse.x, top: mouse.y }}>
              <div className="reach__tt-header">
                <span>{tooltip.flag}</span>
                <strong>{tooltip.name}</strong>
              </div>
              {tooltip.isOrigin
                ? <p className="reach__tt-origin">Export Origin — Andhra Pradesh, India</p>
                : (
                  <ul className="reach__tt-list">
                    {tooltip.products.map(p => <li key={p}>{p}</li>)}
                  </ul>
                )
              }
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function SectionNav() {
  const [active, setActive] = useState('hero')
  useEffect(() => {
    const observers = SECTIONS.map(({ id }) => {
      const el = document.getElementById(id)
      if (!el) return null
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(id) },
        { threshold: 0.35 }
      )
      obs.observe(el)
      return obs
    })
    return () => observers.forEach(o => o?.disconnect())
  }, [])
  return (
    <nav className="section-nav" aria-label="Page sections">
      {SECTIONS.map(({ id, label }) => (
        <button
          key={id}
          className={`section-nav__dot${active === id ? ' section-nav__dot--active' : ''}`}
          onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
          aria-label={label}
          title={label}
        />
      ))}
    </nav>
  )
}

function Ticker() {
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker__track">
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
          <span key={i} className="ticker__item">
            <span className="ticker__sep">⬤</span>{item}
          </span>
        ))}
      </div>
    </div>
  )
}

const BUYER_COUNTRIES = [
  'UAE', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman',
  'Malaysia', 'Singapore', 'Indonesia', 'Thailand', 'Vietnam',
  'United Kingdom', 'United States', 'Canada', 'Australia',
  'Germany', 'Netherlands', 'France', 'Italy', 'Spain',
  'Bangladesh', 'Sri Lanka', 'Nepal',
  'South Africa', 'Mauritius', 'Kenya', 'Tanzania',
  'Japan', 'South Korea',
]

function BuyerRow({ buyer }) {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent('"' + buyer.company_name + '" ' + (buyer.business_type || 'importer'))}`
  const linkedinUrl = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(buyer.company_name)}`
  const confClass = buyer.confidence >= 80 ? 'hi' : buyer.confidence >= 60 ? 'mid' : 'lo'

  return (
    <div className="brow">
      <div className="brow__head">
        {buyer.business_type && <span className="brow__type">{buyer.business_type}</span>}
        <strong className="brow__name">{buyer.company_name}</strong>
        {(buyer.city || buyer.country) && (
          <span className="brow__city">📍 {[buyer.city, buyer.country].filter(Boolean).join(', ')}</span>
        )}
        {buyer.confidence != null && (
          <span className={`brow__conf brow__conf--${confClass}`} title="Confidence score from web search">
            {buyer.confidence}%
          </span>
        )}
      </div>

      {(buyer.website || buyer.email || buyer.phone) && (
        <div className="brow__contacts">
          {buyer.website && (
            <a className="brow__link brow__link--web" href={buyer.website} target="_blank" rel="noopener noreferrer">
              🌐 {buyer.website.replace(/^https?:\/\//, '').split('/')[0]}
            </a>
          )}
          {buyer.email && (
            <a className="brow__link brow__link--email" href={`mailto:${buyer.email}`}>
              ✉️ {buyer.email}
            </a>
          )}
          {buyer.phone && <span className="brow__link brow__link--phone">📞 {buyer.phone}</span>}
        </div>
      )}

      {buyer.sources && buyer.sources.length > 0 && (
        <div className="brow__srcs">
          {buyer.sources.slice(0, 3).map((src, i) =>
            typeof src === 'string' && src.startsWith('http')
              ? <a key={i} className="brow__src" href={src} target="_blank" rel="noopener noreferrer">🔗 Source</a>
              : <span key={i} className="brow__src">{src}</span>
          )}
        </div>
      )}

      <div className="brow__actions">
        <a className="brow__action" href={searchUrl} target="_blank" rel="noopener noreferrer">🔍 Google</a>
        <a className="brow__action" href={linkedinUrl} target="_blank" rel="noopener noreferrer">💼 LinkedIn</a>
      </div>
    </div>
  )
}

function SearchDebug({ debugLines, pages }) {
  const [open, setOpen] = useState(false)
  const phaseIcon = (phase) =>
    phase === 'crawling' ? '⏳' : phase === 'extracting' ? '🔍' : phase === 'done' ? '✓' : phase === 'failed' ? '✗' : '•'

  if (!debugLines.length && !pages.length) return null
  return (
    <div className="bmodal__search-debug">
      <button className="bmodal__debug-toggle" onClick={() => setOpen(o => !o)}>
        {open ? '▲' : '▼'} Search details ({pages.length} sources, {debugLines.length} log lines)
      </button>
      {open && (
        <div className="bmodal__debug-body">
          {debugLines.length > 0 && (
            <div className="bmodal__debug">
              {debugLines.map((l, i) => <p key={i} className="bmodal__debug-line">{l}</p>)}
            </div>
          )}
          {pages.length > 0 && (
            <div className="bmodal__pages">
              {pages.map((p, i) => (
                <div key={i} className={`bmodal__page bmodal__page--${p.phase}`}>
                  <span className="bmodal__page-icon">{phaseIcon(p.phase)}</span>
                  <span className="bmodal__page-url">{p.url}</span>
                  {p.found != null && (
                    <span className="bmodal__page-cnt">{p.found > 0 ? `${p.found} lead${p.found > 1 ? 's' : ''}` : 'none'}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BuyersModal({ onClose }) {
  const [country, setCountry] = useState('')
  const [product, setProduct] = useState('')
  const [view, setView] = useState('form') // 'form' | 'loading' | 'results' | 'error'
  const [buyers, setBuyers] = useState([])
  const [statusMsg, setStatusMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [noResults, setNoResults] = useState(false)
  const [noResultsMsg, setNoResultsMsg] = useState('')
  const [searchMode, setSearchMode] = useState('')
  const [debugLines, setDebugLines] = useState([])   // debug / info messages
  const [pages, setPages] = useState([])             // { url, phase, found }

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', handler)
    }
  }, [onClose])

  const handleGenerate = async () => {
    if (!country || !product) return
    setView('loading')
    setBuyers([])
    setStatusMsg('')
    setErrorMsg('')
    setNoResults(false)
    setNoResultsMsg('')
    setSearchMode('')
    setDebugLines([])
    setPages([])

    const url = `/generate-buyers?country=${encodeURIComponent(country)}&product=${encodeURIComponent(product)}`
    try {
      const resp = await fetch(url)
      const ct = resp.headers.get('content-type') || ''
      if (!ct.includes('text/event-stream')) {
        setErrorMsg('Search service unavailable. Ensure OPENAI_API_KEY is set in Cloudflare Pages environment variables.')
        setView('error')
        return
      }

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let gotResults = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          try {
            const evt = JSON.parse(raw)
            if (evt.type === 'status') {
              setStatusMsg(evt.message || '')
            } else if (evt.type === 'debug') {
              setDebugLines((prev) => [...prev, evt.message])
            } else if (evt.type === 'page_status') {
              setPages((prev) => {
                const existing = prev.findIndex((p) => p.url === evt.url)
                const entry = { url: evt.url, phase: evt.phase, found: evt.found ?? null }
                if (existing >= 0) {
                  const next = [...prev]; next[existing] = entry; return next
                }
                return [...prev, entry]
              })
            } else if (evt.type === 'meta') {
              setSearchMode(evt.searchMode || '')
            } else if (evt.type === 'buyer') {
              if (!gotResults) { setView('results'); gotResults = true }
              const { type: _t, ...buyer } = evt
              setBuyers((prev) => [...prev, buyer])
            } else if (evt.type === 'no_results') {
              setNoResults(true)
              setNoResultsMsg(evt.message || `No verified ${product} importers found in ${country}.`)
              setView('results')
              gotResults = true
            } else if (evt.type === 'error') {
              setErrorMsg(evt.message || 'Search failed. Please try again.')
              setView('error')
            } else if (evt.type === 'done' && !gotResults) {
              setNoResults(true)
              setNoResultsMsg(`No verified ${product} importers found in ${country}.`)
              setView('results')
            }
          } catch (_) {}
        }
      }
    } catch (_err) {
      setErrorMsg('Connection error. Please check your internet connection and try again.')
      setView('error')
    }
  }

  const handleBack = () => {
    setView('form')
    setBuyers([])
    setNoResults(false)
  }

  if (view === 'loading') {
    const phaseIcon = (phase) =>
      phase === 'crawling'    ? '⏳'
      : phase === 'extracting' ? '🔍'
      : phase === 'done'       ? '✓'
      : phase === 'failed'     ? '✗'
      : '•'

    return (
      <div className="bmodal-overlay" onClick={onClose}>
        <div className="bmodal bmodal--loading" onClick={(e) => e.stopPropagation()}>
          <button className="bmodal__close" onClick={onClose}>×</button>
          <div className="bmodal__top">
            <span className="bmodal__globe" aria-hidden="true">🌍</span>
            <h2 className="bmodal__title">Searching…</h2>
            <p className="bmodal__sub">{product} importers in {country}</p>
          </div>
          <div className="bmodal__spin-wrap">
            <div className="bmodal__spinner" />
            <p className="bmodal__spin-txt">{statusMsg || 'Starting search…'}</p>
          </div>
          {debugLines.length > 0 && (
            <div className="bmodal__debug">
              {debugLines.map((l, i) => <p key={i} className="bmodal__debug-line">{l}</p>)}
            </div>
          )}
          {pages.length > 0 && (
            <div className="bmodal__pages">
              <p className="bmodal__pages-hd">Pages being crawled</p>
              {pages.map((p, i) => (
                <div key={i} className={`bmodal__page bmodal__page--${p.phase}`}>
                  <span className="bmodal__page-icon">{phaseIcon(p.phase)}</span>
                  <span className="bmodal__page-url">{p.url}</span>
                  {p.found != null && (
                    <span className="bmodal__page-cnt">{p.found > 0 ? `${p.found} lead${p.found > 1 ? 's' : ''}` : 'none'}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (view === 'error') {
    return (
      <div className="bmodal-overlay" onClick={onClose}>
        <div className="bmodal" onClick={(e) => e.stopPropagation()}>
          <button className="bmodal__close" onClick={onClose}>×</button>
          <div className="bmodal__top">
            <span className="bmodal__globe" aria-hidden="true">⚠️</span>
            <h2 className="bmodal__title">Search Failed</h2>
            <p className="bmodal__sub">{errorMsg}</p>
          </div>
          <SearchDebug debugLines={debugLines} pages={pages} />
          <div className="bmodal__form">
            <button className="bmodal__gen bmodal__gen--active" onClick={handleBack}>
              ← Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'results') {
    return (
      <div className="bmodal-overlay" onClick={onClose}>
        <div className="bmodal bmodal--wide" onClick={(e) => e.stopPropagation()}>
          <div className="bmodal__rhead">
            <button className="bmodal__back" onClick={handleBack}>← New Search</button>
            <div className="bmodal__rctx">
              <span className="bmodal__rctx-prod">{product}</span>
              <span className="bmodal__rctx-sep"> importers in </span>
              <span className="bmodal__rctx-prod">{country}</span>
              {!noResults && <span className="bmodal__rctx-cnt"> · {buyers.length} verified</span>}
            </div>
            <button className="bmodal__close bmodal__close--dk" onClick={onClose}>×</button>
          </div>
          <div className="bmodal__src-bar">
            {noResults
              ? <span className="bmodal__src-badge bmodal__src-badge--empty">🔍 Search completed — no verified buyers found</span>
              : searchMode === 'web_search'
              ? <span className="bmodal__src-badge bmodal__src-badge--live">✓ Live web search (Brave/Google) · crawled + extracted by GPT-4o mini</span>
              : searchMode === 'directory_crawl'
              ? <span className="bmodal__src-badge bmodal__src-badge--crawl">✓ Crawled from trade directories · extracted by GPT-4o mini · add BRAVE_API_KEY for broader results</span>
              : <span className="bmodal__src-badge bmodal__src-badge--ai">ℹ️ From AI training knowledge · add BRAVE_API_KEY for live web search</span>
            }
          </div>
          {noResults ? (
            <div className="bmodal__empty">
              <span className="bmodal__empty-icon">🔍</span>
              <p className="bmodal__empty-txt">No verified buyers were found for this search.</p>
              <p className="bmodal__empty-sub">{noResultsMsg || 'Try a different country or product combination.'}</p>
              <button className="bmodal__gen bmodal__gen--active bmodal__gen--sm" onClick={handleBack}>← New Search</button>
            </div>
          ) : (
            <div className="bmodal__rlist">
              {buyers.map((b, i) => <BuyerRow key={i} buyer={b} />)}
            </div>
          )}
          <SearchDebug debugLines={debugLines} pages={pages} />
        </div>
      </div>
    )
  }

  return (
    <div className="bmodal-overlay" onClick={onClose}>
      <div className="bmodal" onClick={(e) => e.stopPropagation()}>
        <button className="bmodal__close" onClick={onClose}>×</button>
        <div className="bmodal__top">
          <span className="bmodal__globe" aria-hidden="true">🌍</span>
          <h2 className="bmodal__title">Find Buyers</h2>
          <p className="bmodal__sub">Live web search for verified importers by country and product.</p>
        </div>
        <div className="bmodal__form">
          <label className="bmodal__label" htmlFor="bm-country">Importing Country</label>
          <div className="bmodal__sel-wrap">
            <select id="bm-country" className="bmodal__sel" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">Select country…</option>
              {BUYER_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <label className="bmodal__label" htmlFor="bm-product">Product</label>
          <div className="bmodal__sel-wrap">
            <select id="bm-product" className="bmodal__sel" value={product} onChange={(e) => setProduct(e.target.value)}>
              <option value="">Select product…</option>
              {PRODUCTS.map((prod) => <option key={prod.id} value={prod.name}>{prod.name}</option>)}
            </select>
          </div>
          <button
            className={`bmodal__gen${country && product ? ' bmodal__gen--active' : ''}`}
            onClick={handleGenerate}
            disabled={!country || !product}
          >
            Search Verified Buyers
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [buyersOpen, setBuyersOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleNav = (link) => {
    if (link === 'Calculator') {
      window.open('/calculator.html', '_blank', 'noopener,noreferrer')
    } else if (link === 'Buyers') {
      setBuyersOpen(true)
    } else {
      document.getElementById(link.toLowerCase())?.scrollIntoView({ behavior: 'smooth' })
    }
    setMenuOpen(false)
  }

  return (
    <>
      <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <a className="navbar__logo" href="#hero" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
        <img src="/vae_logo.png" alt="Vunnam Agro Exports logo" className="navbar__logo-img" />
        <LogoText />
      </a>
      <button className="navbar__hamburger" aria-label="Toggle menu" onClick={() => setMenuOpen(!menuOpen)}>
        <span /><span /><span />
      </button>
      <ul className={`navbar__links ${menuOpen ? 'navbar__links--open' : ''}`}>
        {NAV_LINKS.map((link) => (
          <li key={link}>
            <button onClick={() => handleNav(link)}>{link}</button>
          </li>
        ))}
        <li>
          <button className="navbar__cta" onClick={() => handleNav('Contact')}>
            Get a Quote
          </button>
        </li>
      </ul>
      </nav>
      {buyersOpen && <BuyersModal onClose={() => setBuyersOpen(false)} />}
    </>
  )
}

const EDGE_CHILLIS = [
  { left: '1%',  delay: 0,   duration: 9,  size: 18 },
  { left: '5%',  delay: 2.5, duration: 11, size: 14 },
  { left: '3%',  delay: 5,   duration: 8,  size: 20 },
  { left: '7%',  delay: 1.5, duration: 12, size: 16 },
  { left: '93%', delay: 0.8, duration: 10, size: 16 },
  { left: '97%', delay: 3,   duration: 9,  size: 20 },
  { left: '95%', delay: 1,   duration: 11, size: 14 },
  { left: '91%', delay: 4,   duration: 8,  size: 18 },
]

function Hero() {
  const bgRef = useRef(null)
  useEffect(() => {
    const onScroll = () => {
      if (bgRef.current) bgRef.current.style.transform = `translateY(${window.scrollY * 0.3}px)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <section className="hero" id="hero">
      <div className="hero__bg" ref={bgRef} />
      <div className="hero__overlay" />
      <div className="hero__edge-rain" aria-hidden="true">
        {EDGE_CHILLIS.map((c, i) => (
          <span key={i} className="hero__edge-chilli" style={{
            left: c.left,
            fontSize: `${c.size}px`,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.duration}s`,
          }}>🌶️</span>
        ))}
      </div>
      <div className="container hero__inner">
        <div className="hero__content">
          <span className="hero__badge">🌿 Export Quality · India Origin</span>
          <h1 className="hero__title">Premium Indian<br />Chilli Products</h1>
          <p className="hero__subtitle">
            From the fertile fields of Andhra Pradesh to global markets — we export
            the finest dry red chillies, chilli powder, and chilli flakes with
            consistent quality and reliable supply.
          </p>
          <div className="hero__actions">
            <button className="btn btn--primary" onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}>
              Explore Products
            </button>
            <button className="btn btn--outline" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>
              Contact Us
            </button>
          </div>
          <div className="hero__stats">
            <div className="hero__stat"><CountUp to={4} /><span>Product Lines</span></div>
            <div className="hero__stat-divider" />
            <div className="hero__stat"><CountUp to={100} suffix="%" /><span>Natural</span></div>
            <div className="hero__stat-divider" />
            <div className="hero__stat"><strong>Global</strong><span>Export</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ProductModal({ product, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="pmodal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={product.name}>
      <div className="pmodal" onClick={e => e.stopPropagation()}>
        <button className="pmodal__close" onClick={onClose} aria-label="Close">✕</button>
        <div className="pmodal__img-wrap" style={{ background: product.gradient }}>
          {product.image
            ? <img src={product.image} alt={product.name} className="pmodal__img" />
            : <span className="pmodal__emoji">{product.emoji}</span>
          }
        </div>
        <div className="pmodal__body">
          <span className="product-card__category">{product.category}</span>
          <h2 className="pmodal__name">{product.name}</h2>
          <p className="pmodal__tagline">{product.tagline}</p>
          <p className="pmodal__desc">{product.description}</p>
          <ul className="pmodal__specs">
            {product.specs.map(s => <li key={s}>{s}</li>)}
          </ul>
          <button className="btn btn--primary" onClick={() => {
            onClose()
            document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
          }}>
            Request Sample →
          </button>
        </div>
      </div>
    </div>
  )
}

function ProductCard({ product, onOpen }) {
  const handleMouseMove = (e) => {
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    card.style.transform = `perspective(1200px) rotateY(${x * 10}deg) rotateX(${-y * 6}deg)`
  }

  const handleMouseLeave = (e) => { e.currentTarget.style.transform = '' }

  return (
    <article
      className="product-card"
      onClick={() => onOpen(product)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="product-card__inner">
        <div className="product-card__front">
          <div className="product-card__img-wrap">
            {product.image ? (
              <>
                <img src={product.image} alt={product.name} className="product-card__img-default" />
                {product.hoverImage && (
                  <img src={product.hoverImage} alt={`${product.name} raw`} className="product-card__img-raw" />
                )}
              </>
            ) : (
              <div className="product-card__img-fallback" style={{ background: product.gradient }}>
                <span className="product-card__emoji" role="img" aria-label={product.name}>{product.emoji}</span>
              </div>
            )}
          </div>
          <div className="product-card__front-info">
            <span className="product-card__category">{product.category}</span>
            <h3 className="product-card__front-name">{product.name}</h3>
            <span className="product-card__tap-hint">Click to view details</span>
          </div>
        </div>
        <div className="product-card__back">
          <span className="product-card__back-emoji" aria-hidden="true">{product.emoji}</span>
          <h3 className="product-card__back-name">{product.name}</h3>
          <p className="product-card__desc">{product.description}</p>
          <ul className="product-card__specs">
            {product.specs.map((s) => <li key={s}>{s}</li>)}
          </ul>
          <button
            className="btn btn--outline-white"
            onClick={(e) => {
              e.stopPropagation()
              document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            Request Sample
          </button>
        </div>
      </div>
    </article>
  )
}

const PRODUCT_CATEGORIES = ['All', 'Chillies', 'Whole Pulses', 'Dal', 'Beans']

function Products() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const filtered = activeFilter === 'All' ? PRODUCTS : PRODUCTS.filter(p => p.category === activeFilter)

  return (
    <section className="products" id="products">
      <div className="container">
        <FadeIn className="fade-in--block">
          <div className="section-header">
            <span className="section-label">Our Products</span>
            <h2 className="section-title">Premium Agro Exports<br />for Global Markets</h2>
            <p className="section-subtitle">
              Every batch is tested for quality, purity, and consistency before export.
            </p>
          </div>
        </FadeIn>
        <FadeIn className="fade-in--block">
          <div className="products__filter">
            {PRODUCT_CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`products__filter-btn${activeFilter === cat ? ' products__filter-btn--active' : ''}`}
                onClick={() => setActiveFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </FadeIn>
        {selectedProduct && (
          <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
        )}
        <div className="products__grid">
          {filtered.map((p, i) => (
            <FadeIn key={p.id} delay={i * 100}>
              <ProductCard product={p} onOpen={setSelectedProduct} />
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

const PRICE_VARIETIES = [
  {
    variety: 'Teja S17',
    products: [
      { type: 'Dried Red Chilli', href: '/price-list.html' },
      { type: 'Chilli Flakes', href: '/chilli-flakes-prices-2026.html' },
      { type: 'Chilli Powder', href: '/chilli-powder-prices-2026.html' },
    ],
  },
  {
    variety: 'LCA-334',
    products: [
      { type: 'Dried Red Chilli', href: '/price-list.html?product=lca334-dry' },
      { type: 'Chilli Flakes',    href: '/price-list.html?product=lca334-flakes' },
      { type: 'Chilli Powder',    href: '/price-list.html?product=lca334-powder' },
    ],
  },
  {
    variety: 'Byadagi',
    products: [
      { type: 'Dried Red Chilli', href: '/price-list.html?product=byadagi-dry' },
      { type: 'Chilli Flakes',    href: '/price-list.html?product=byadagi-flakes' },
      { type: 'Chilli Powder',    href: '/price-list.html?product=byadagi-powder' },
    ],
  },
  {
    variety: 'Wonder Hot',
    products: [
      { type: 'Dried Red Chilli', href: '/price-list.html?product=wonderhot-dry' },
      { type: 'Chilli Flakes',    href: '/price-list.html?product=wonderhot-flakes' },
      { type: 'Chilli Powder',    href: '/price-list.html?product=wonderhot-powder' },
    ],
  },
  {
    variety: 'Mahi Teja - S15',
    products: [
      { type: 'Dried Red Chilli', href: '/price-list.html?product=mahiteja-dry' },
      { type: 'Chilli Flakes',    href: '/price-list.html?product=mahiteja-flakes' },
      { type: 'Chilli Powder',    href: '/price-list.html?product=mahiteja-powder' },
    ],
  },
]

function Prices() {
  return (
    <section className="prices" id="prices">
      <div className="container">
        <FadeIn className="fade-in--block">
          <div className="section-header">
            <span className="section-label">Price Lists</span>
            <h2 className="section-title">2026 Export Prices<br />by Variety</h2>
            <p className="section-subtitle">
              View current FOB / CIF pricing for each product variety.
            </p>
          </div>
        </FadeIn>
        <div className="prices__varieties">
          {PRICE_VARIETIES.map(({ variety, products }) => (
            <div className="prices__variety-row" key={variety}>
              <h3 className="prices__variety-label">{variety}</h3>
              <div className="prices__grid">
                {products.map(({ type, href }) => (
                  <div className="prices__card" key={type}>
                    <span className="prices__card-icon">🌶️</span>
                    <h3 className="prices__card-name">{type}</h3>
                    {href === '#'
                      ? <span className="btn btn--price-list prices__btn prices__btn--soon">Coming Soon</span>
                      : <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn--price-list prices__btn">🌐 Global Price List</a>
                    }
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function About() {
  return (
    <section className="about" id="about">
      <div className="container">

        <FadeIn className="fade-in--block">
          <div className="section-header">
            <span className="section-label">About Us</span>
            <h2 className="section-title">Built on Quality,<br />Driven by Trust</h2>
            <p className="section-subtitle">
              A dedicated chilli exporter rooted in Andhra Pradesh — connecting India's finest farms to global markets.
            </p>
          </div>
        </FadeIn>

        <FadeIn className="fade-in--block">
          <div className="about__story">
            <h3 className="about__story-title">Our Story</h3>
            <p>
              Vunnam Agro Exports was founded with a clear purpose — to bring the finest Indian
              chilli products to global markets with transparency, quality, and reliability at every
              step. Rooted in Andhra Pradesh, India's largest chilli-growing belt, we work directly
              with experienced farmers who have cultivated these crops for generations.
            </p>
            <p>
              From careful farm-level sourcing to hygienic processing, lab-verified quality testing,
              and timely shipment — every stage is handled with precision. We serve importers, spice
              traders, and food manufacturers across Asia, the Middle East, Europe, and the Americas.
            </p>
          </div>
        </FadeIn>

        <FadeIn className="fade-in--block">
          <div className="about__stats-strip">
            {[
              { to: 15,  suffix: '+', label: 'Products Exported' },
              { to: 10,  suffix: '+', label: 'Countries Served' },
              { to: 100, suffix: '%', label: 'Natural & Pure' },
              { text: 'Global',       label: 'Export Reach' },
            ].map(({ to, suffix, text, label }) => (
              <div className="about__stat-item" key={label}>
                {text ? <strong>{text}</strong> : <CountUp to={to} suffix={suffix} />}
                <span>{label}</span>
              </div>
            ))}
          </div>
        </FadeIn>

        <div className="about__vm-grid">
          <FadeIn>
            <div className="about__vm-card about__vm-card--vision">
              <span className="about__vm-icon">🎯</span>
              <h3>Our Vision</h3>
              <p>To become a globally recognized name in premium Indian spice exports — built on consistent quality, ethical sourcing, and trusted long-term partnerships across every continent we serve.</p>
            </div>
          </FadeIn>
          <FadeIn delay={150}>
            <div className="about__vm-card about__vm-card--mission">
              <span className="about__vm-icon">🌿</span>
              <h3>Our Mission</h3>
              <p>To connect the rich agricultural heritage of Andhra Pradesh with international buyers by delivering lab-certified, farm-fresh chilli products with full traceability and on-time delivery.</p>
            </div>
          </FadeIn>
        </div>

        <FadeIn className="fade-in--block">
          <h3 className="about__whyus-title">Why Choose Us</h3>
        </FadeIn>
        <div className="about__pillars">
          {[
            { icon: '✅', label: 'Quality Certified',      desc: 'Every lot lab-verified for moisture, pungency, colour (ASTA), and contamination before shipment.' },
            { icon: '🌾', label: 'Farm Direct',            desc: 'We source directly from experienced farmers in Andhra Pradesh — no middlemen, fair pricing.' },
            { icon: '📜', label: 'Export Compliant',       desc: 'APEDA registered, phytosanitary certified, and compliant with international food safety standards.' },
            { icon: '📦', label: 'Flexible Packaging',     desc: 'Retail packs to bulk containers — custom options to suit your market and logistics requirements.' },
            { icon: '⏱️', label: 'On-Time Delivery',       desc: 'Pre-booked container slots and streamlined CHA processes ensure reliable, punctual shipments.' },
            { icon: '🤝', label: 'Long-Term Partnerships', desc: 'We build relationships, not just transactions. Consistent quality keeps our clients coming back.' },
          ].map(({ icon, label, desc }, i) => (
            <FadeIn key={label} delay={i * 70}>
              <div className="about__pillar">
                <span>{icon}</span>
                <div>
                  <strong>{label}</strong>
                  <p>{desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn className="fade-in--block">
          <h3 className="about__whyus-title" style={{ marginTop: '64px' }}>Certifications</h3>
        </FadeIn>
        <div className="about__certs">
          {CERTS.map((cert, i) => (
            <FadeIn key={cert.code} delay={i * 80}>
              <div className="cert-stamp">
                <div className="cert-stamp__ring">
                  <span className="cert-stamp__icon">{cert.icon}</span>
                  <strong className="cert-stamp__code">{cert.code}</strong>
                </div>
                <p className="cert-stamp__name">{cert.name}</p>
              </div>
            </FadeIn>
          ))}
        </div>

      </div>
    </section>
  )
}

function Contact() {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' })
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(false)
    try {
      const res = await fetch('https://formspree.io/f/mjgzpbpl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setSent(true)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="contact" id="contact">
      <div className="container contact__inner">
        <div className="contact__info">
          <span className="section-label section-label--light">Contact</span>
          <h2 className="section-title contact__title">Let's Start<br />a Conversation</h2>
          <p className="contact__blurb">
            Looking for a reliable supplier for dry red chillies, chilli powder,
            or chilli flakes? We'd love to hear from you.
          </p>
          <div className="contact__details">
            <div className="contact__detail">
              <span>📧</span>
              <a href="mailto:nareshv@vunnamagroexports.net">nareshv@vunnamagroexports.net</a>
            </div>
            <div className="contact__detail">
              <span>🌍</span>
              <span>Andhra Pradesh, India</span>
            </div>
          </div>
        </div>
        <form className="contact__form" onSubmit={handleSubmit}>
          {sent ? (
            <div className="contact__thanks">
              <span>✅</span>
              <p>Thank you! Your inquiry has been sent. We'll respond within 24 hours.</p>
            </div>
          ) : (
            <>
              <FadeIn delay={50} className="fade-in--block">
                <div className="form-row">
                  <div className="form-group form-group--float">
                    <input id="name" name="name" type="text" required value={form.name} onChange={handleChange} placeholder=" " />
                    <label htmlFor="name">Your Name *</label>
                  </div>
                  <div className="form-group form-group--float">
                    <input id="email" name="email" type="email" required value={form.email} onChange={handleChange} placeholder=" " />
                    <label htmlFor="email">Email Address *</label>
                  </div>
                </div>
              </FadeIn>
              <FadeIn delay={150} className="fade-in--block">
                <div className="form-group form-group--float">
                  <input id="company" name="company" type="text" value={form.company} onChange={handleChange} placeholder=" " />
                  <label htmlFor="company">Company / Organisation</label>
                </div>
              </FadeIn>
              <FadeIn delay={250} className="fade-in--block">
                <div className="form-group form-group--float">
                  <textarea id="message" name="message" required rows={5} value={form.message} onChange={handleChange} placeholder=" " />
                  <label htmlFor="message">Message *</label>
                </div>
              </FadeIn>
              {error && <p className="contact__error">Something went wrong. Please try again or email us directly.</p>}
              <button type="submit" className="btn btn--primary btn--full" disabled={submitting}>
                {submitting ? <><span className="btn-spinner" aria-hidden="true" /> Sending…</> : 'Send Inquiry →'}
              </button>
            </>
          )}
        </form>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <Ticker />
      <div className="container footer__inner">
        <div className="footer__brand">
          <div className="footer__logo">
            <img src="/vae_logo.png" alt="Vunnam Agro Exports" className="footer__logo-img" />
            <span>Vunnam Agro Exports</span>
          </div>
          <p>Premium Indian chilli products for global markets.</p>
        </div>
        <div className="footer__links">
          {NAV_LINKS.map((link) => (
            <button key={link} onClick={() => {
              if (link === 'Calculator') window.open('/calculator.html', '_blank', 'noopener,noreferrer')
              else if (link === 'Buyers') window.open('/buyers.html', '_blank', 'noopener,noreferrer')
              else document.getElementById(link.toLowerCase())?.scrollIntoView({ behavior: 'smooth' })
            }}>
              {link}
            </button>
          ))}
        </div>
      </div>
      <div className="footer__bottom">
        <p>© {new Date().getFullYear()} Vunnam Agro Exports. All rights reserved.</p>
      </div>
    </footer>
  )
}

function FarmToPort() {
  return (
    <section className="ftp" id="process">
      <div className="container">
        <FadeIn className="fade-in--block">
          <div className="section-header">
            <span className="section-label">Our Process</span>
            <h2 className="section-title">Farm to Port</h2>
            <p className="section-subtitle">Every stage quality-controlled for consistent export standards.</p>
          </div>
        </FadeIn>
        <div className="ftp__steps">
          {FTP_STEPS.map((step, i) => (
            <FadeIn key={step.label} delay={i * 100}>
              <div className="ftp__step">
                <div className="ftp__step-num">{step.icon}</div>
                <strong className="ftp__label">{step.label}</strong>
                <p className="ftp__desc">{step.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function App() {
  return (
    <>
      <ScrollProgress />
      <SectionNav />
      <Navbar />
      <main>
        <Hero />
        <Products />
        <Prices />
        <About />
        <GlobalReach />
        <FarmToPort />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
