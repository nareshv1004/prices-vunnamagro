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

const PRODUCTS = [
  {
    id: 'dry-red-chilli',
    emoji: '🌶️',
    image: '/product-dry-chilli.jpg',
    name: 'Dry Red Chillies',
    tagline: 'Whole Dried Chillies',
    description:
      'Sun-dried whole red chillies with intense colour, rich aroma, and bold heat. Sourced from the finest chilli-growing regions of Andhra Pradesh.',
    specs: ['Moisture: ≤ 12%', 'Pungency: 20,000–50,000 SHU', 'Colour: ASTA 100+', 'Packaging: 25 kg jute bags'],
    gradient: 'linear-gradient(135deg, #8B1A0A 0%, #C0392B 60%, #E74C3C 100%)',
  },
  {
    id: 'chilli-powder',
    emoji: '🧂',
    image: '/product-dry-chilli-powder.jpg',
    name: 'Chilli Powder',
    tagline: 'Ground Red Chilli',
    description:
      'Finely milled from select dried red chillies, our chilli powder delivers consistent heat, vibrant red colour, and deep flavour to every dish.',
    specs: ['Moisture: ≤ 10%', 'Granularity: 60–80 mesh', 'Colour: ASTA 120+', 'Packaging: 1 kg / 5 kg / 25 kg'],
    gradient: 'linear-gradient(135deg, #7B1A00 0%, #A93226 60%, #CB4335 100%)',
  },
  {
    id: 'chilli-flakes',
    emoji: '✨',
    image: '/product-chilli-flakes.jpg',
    name: 'Chilli Flakes',
    tagline: 'Crushed Red Chilli',
    description:
      'Coarsely crushed dried chillies with seeds intact, offering bursts of heat and texture. A favourite for pizzas, marinades, and culinary applications worldwide.',
    specs: ['Moisture: ≤ 11%', 'Particle size: 3–5 mm', 'Colour: ASTA 90+', 'Packaging: 500 g / 5 kg / 20 kg'],
    gradient: 'linear-gradient(135deg, #6E1A00 0%, #922B21 60%, #B03A2E 100%)',
  },
]

const NAV_LINKS = ['Products', 'About', 'Contact']

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id.toLowerCase())?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <a className="navbar__logo" href="#hero" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
        <img src="/vae_logo.png" alt="Vunnam Agro Exports logo" className="navbar__logo-img" />
        <span className="navbar__logo-text">
          <strong>Vunnam</strong> Agro Exports
        </span>
      </a>
      <button className="navbar__hamburger" aria-label="Toggle menu" onClick={() => setMenuOpen(!menuOpen)}>
        <span /><span /><span />
      </button>
      <ul className={`navbar__links ${menuOpen ? 'navbar__links--open' : ''}`}>
        {NAV_LINKS.map((link) => (
          <li key={link}>
            <button onClick={() => scrollTo(link)}>{link}</button>
          </li>
        ))}
        <li>
          <button className="navbar__cta" onClick={() => scrollTo('Contact')}>
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
  return (
    <section className="hero" id="hero">
      <div className="hero__bg" />
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
            <div className="hero__stat"><CountUp to={3} suffix="+" /><span>Product Lines</span></div>
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

function ProductCard({ product }) {
  return (
    <article className="product-card">
      <div className="product-card__header" style={{ background: product.image ? 'none' : product.gradient }}>
        {product.image
          ? <img src={product.image} alt={product.name} className="product-card__img" />
          : <span className="product-card__emoji" role="img" aria-label={product.name}>{product.emoji}</span>
        }
      </div>
      <div className="product-card__body">
        <span className="product-card__tagline">{product.tagline}</span>
        <h3 className="product-card__name">{product.name}</h3>
        <p className="product-card__desc">{product.description}</p>
        <ul className="product-card__specs">
          {product.specs.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        {product.id === 'dry-red-chilli' && (
          <a href="/price-list.html" target="_blank" rel="noopener noreferrer" className="btn btn--price-list">
            🌐 Global Price List
          </a>
        )}
        {product.id === 'chilli-powder' && (
          <a href="/chilli-powder-prices-2026.html" target="_blank" rel="noopener noreferrer" className="btn btn--price-list">
            🌐 Global Price List
          </a>
        )}
        {product.id === 'chilli-flakes' && (
          <a href="/chilli-flakes-prices-2026.html" target="_blank" rel="noopener noreferrer" className="btn btn--price-list">
            🌐 Global Price List
          </a>
        )}
        <button className="btn btn--outline-red" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>
          Request Sample
        </button>
      </div>
    </article>
  )
}

function Products() {
  return (
    <section className="products" id="products">
      <div className="container">
        <div className="section-header">
          <span className="section-label">Our Products</span>
          <h2 className="section-title">Finest Chilli Products<br />for Global Markets</h2>
          <p className="section-subtitle">
            Every batch is tested for quality, purity, and consistency before export.
          </p>
        </div>
        <div className="products__grid">
          {PRODUCTS.map((p, i) => (
            <FadeIn key={p.id} delay={i * 150}>
              <ProductCard product={p} />
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

function About() {
  return (
    <section className="about" id="about">
      <div className="container about__inner">
        <FadeIn className="about__visual">
          <div className="about__icon-grid">
            <div className="about__icon-cell">🌱</div>
            <div className="about__icon-cell">🌶️</div>
            <div className="about__icon-cell">☀️</div>
            <div className="about__icon-cell">🚢</div>
          </div>
        </FadeIn>
        <div className="about__content">
          <FadeIn delay={100}>
            <span className="section-label">About Us</span>
            <h2 className="section-title">From Farm to<br />World Markets</h2>
            <p>
              Vunnam Agro Exports is a dedicated exporter of premium Indian chilli
              products. We work directly with experienced farmers in Andhra Pradesh —
              India's largest chilli-growing belt — to source the best produce each
              season.
            </p>
            <p>
              Our focus is on quality at every step: proper sun-drying and processing,
              hygienic packaging, and timely delivery. We serve importers, spice
              traders, and food manufacturers across Asia, the Middle East, Europe,
              and the Americas.
            </p>
          </FadeIn>
          <div className="about__pillars">
            {[
              { icon: '✅', label: 'Quality Tested', desc: 'Every lot lab-verified for moisture, pungency, and colour.' },
              { icon: '📦', label: 'Flexible Packaging', desc: 'Retail packs to bulk containers — we accommodate your needs.' },
              { icon: '🤝', label: 'Direct Sourcing', desc: 'No middlemen. We work with farmers for fair pricing.' },
            ].map(({ icon, label, desc }, i) => (
              <FadeIn key={label} delay={200 + i * 120}>
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
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Your Name *</label>
                  <input id="name" name="name" type="text" required value={form.name} onChange={handleChange} placeholder="John Smith" />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input id="email" name="email" type="email" required value={form.email} onChange={handleChange} placeholder="john@company.com" />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="company">Company / Organisation</label>
                <input id="company" name="company" type="text" value={form.company} onChange={handleChange} placeholder="Your company name" />
              </div>
              <div className="form-group">
                <label htmlFor="message">Message *</label>
                <textarea id="message" name="message" required rows={5} value={form.message} onChange={handleChange} placeholder="Tell us about your requirements — product, quantity, destination..." />
              </div>
              {error && <p className="contact__error">Something went wrong. Please try again or email us directly.</p>}
              <button type="submit" className="btn btn--primary btn--full" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send Inquiry →'}
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
            <button key={link} onClick={() => document.getElementById(link.toLowerCase())?.scrollIntoView({ behavior: 'smooth' })}>
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

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Products />
        <About />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
