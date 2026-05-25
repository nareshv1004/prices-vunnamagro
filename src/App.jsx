import { useState, useEffect } from 'react'
import './App.css'

const PRODUCTS = [
  {
    id: 'dry-red-chilli',
    emoji: '🌶️',
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
        <span className="navbar__logo-icon">🌶</span>
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

function Hero() {
  return (
    <section className="hero" id="hero">
      <div className="hero__bg" />
      <div className="hero__overlay" />
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
            <div className="hero__stat"><strong>3+</strong><span>Product Lines</span></div>
            <div className="hero__stat-divider" />
            <div className="hero__stat"><strong>100%</strong><span>Natural</span></div>
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
      <div className="product-card__header" style={{ background: product.gradient }}>
        <span className="product-card__emoji" role="img" aria-label={product.name}>{product.emoji}</span>
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
          {PRODUCTS.map((p) => (
            <ProductCard key={p.id} product={p} />
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
        <div className="about__visual">
          <div className="about__icon-grid">
            <div className="about__icon-cell">🌱</div>
            <div className="about__icon-cell">🌶️</div>
            <div className="about__icon-cell">☀️</div>
            <div className="about__icon-cell">🚢</div>
          </div>
        </div>
        <div className="about__content">
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
          <div className="about__pillars">
            {[
              { icon: '✅', label: 'Quality Tested', desc: 'Every lot lab-verified for moisture, pungency, and colour.' },
              { icon: '📦', label: 'Flexible Packaging', desc: 'Retail packs to bulk containers — we accommodate your needs.' },
              { icon: '🤝', label: 'Direct Sourcing', desc: 'No middlemen. We work with farmers for fair pricing.' },
            ].map(({ icon, label, desc }) => (
              <div className="about__pillar" key={label}>
                <span>{icon}</span>
                <div>
                  <strong>{label}</strong>
                  <p>{desc}</p>
                </div>
              </div>
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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = (e) => {
    e.preventDefault()
    const subject = encodeURIComponent(`Inquiry from ${form.name}${form.company ? ` — ${form.company}` : ''}`)
    const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\nCompany: ${form.company}\n\n${form.message}`)
    window.location.href = `mailto:info@vunnamagroexports.net?subject=${subject}&body=${body}`
    setSent(true)
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
              <a href="mailto:info@vunnamagroexports.net">info@vunnamagroexports.net</a>
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
              <p>Your email client has been opened. We'll respond within 24 hours.</p>
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
              <button type="submit" className="btn btn--primary btn--full">Send Inquiry →</button>
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
          <span className="footer__logo">🌶 Vunnam Agro Exports</span>
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
