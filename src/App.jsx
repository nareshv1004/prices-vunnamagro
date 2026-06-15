import { useState, useEffect, useRef } from 'react'
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

const NAV_LINKS = ['Products', 'Prices', 'Calculator', 'About', 'Contact']

const SECTIONS = [
  { id: 'hero',     label: 'Home' },
  { id: 'products', label: 'Products' },
  { id: 'prices',   label: 'Prices' },
  { id: 'about',    label: 'About' },
  { id: 'process',  label: 'Process' },
  { id: 'contact',  label: 'Contact' },
]

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

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleNav = (link) => {
    if (link === 'Calculator') {
      window.open('/calculator.html', '_blank', 'noopener,noreferrer')
    } else {
      document.getElementById(link.toLowerCase())?.scrollIntoView({ behavior: 'smooth' })
    }
    setMenuOpen(false)
  }

  return (
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
        <FarmToPort />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
