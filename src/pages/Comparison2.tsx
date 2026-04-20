import { useState, useEffect, useRef } from 'react';
import { Check, Phone, Mail, MapPin, Menu, X, Star, ChevronRight, Send, Heart, Shield, Users } from 'lucide-react';

const navLinks = ['Home', 'About Us', 'Our Services', 'Facilities', 'Blog', 'Contact Us'];

const insuranceLogos = [
  { name: 'Aetna', color: '#7B2D8E' },
  { name: 'Cigna', color: '#0072CE' },
  { name: 'BlueCross BlueShield', color: '#0057A8' },
];

const features = [
  { text: 'Medically supervised detoxification programs', icon: Shield },
  { text: 'Individual and group therapy sessions', icon: Users },
  { text: 'Evidence-based treatment approaches', icon: Heart },
  { text: 'Dual-diagnosis support for co-occurring disorders', icon: Shield },
  { text: 'Holistic wellness and mindfulness practices', icon: Heart },
  { text: 'Comprehensive aftercare and relapse prevention', icon: Users },
];

const stats = [
  { value: '70%', label: 'Of patients complete their full treatment program', accent: 'Success Rate' },
  { value: '!', label: 'Personalized treatment plans tailored to each individual', accent: 'Individualized Care' },
  { value: '6/10', label: 'Patients report significant improvement within 60 days', accent: 'Recovery Progress' },
];

const testimonials = [
  {
    name: 'James T.',
    text: '"Treatment Center gave me the tools I needed to rebuild my life. The staff was incredible and truly cared about my recovery journey."',
    rating: 5,
  },
  {
    name: 'Nicole M.',
    text: '"I was scared to ask for help, but from the moment I walked in, I felt safe. The programs here changed everything for me and my family."',
    rating: 5,
  },
  {
    name: 'Sarah M.',
    text: '"The holistic approach to recovery helped me heal not just physically but emotionally and spiritually. I\'m forever grateful."',
    rating: 5,
  },
];

const treatments = [
  'Alcohol Addiction',
  'Drug Rehabilitation',
  'Opioid Treatment',
  'Dual Diagnosis',
  'Detox Programs',
  'Outpatient Services',
];

const quickLinks = ['Home', 'About Us', 'Our Services', 'Facilities', 'Blog', 'Contact Us'];

// Refined palette — deep navy + warm sage + soft gold accent
const PRIMARY = '#2D6A4F';
const PRIMARY_LIGHT = '#52B788';
const ACCENT = '#B08D57';
const DARK_BG = '#1B2A3B';
const NAVY = '#0F1B2D';

// Scroll-reveal hook
const useReveal = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
};

const RevealSection = ({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
};

const Comparison2 = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    const t = setTimeout(() => setHeroLoaded(true), 100);
    return () => { window.removeEventListener('scroll', handleScroll); clearTimeout(t); };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    setTimeout(() => setFormSubmitted(false), 4000);
    setFormData({ name: '', email: '', phone: '', message: '' });
  };

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,700;1,800&display=swap" rel="stylesheet" />

      {/* ─── Sticky Nav ─── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: scrolled ? 'rgba(15,27,45,0.97)' : 'rgba(15,27,45,0.85)',
          boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.2)' : 'none',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 md:h-20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: PRIMARY }}>
              T
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Treatment Center
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a key={link} href="#" className="text-sm font-medium transition-colors" style={{ color: 'rgba(255,255,255,0.7)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              >
                {link}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a
              href="tel:+10000000000"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold transition-transform hover:scale-105"
              style={{ backgroundColor: PRIMARY }}
            >
              <Phone className="h-4 w-4" />
              +1 000-000-0000
            </a>
          </div>

          <button className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6 text-white" /> : <Menu className="h-6 w-6 text-white" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t px-4 py-4 space-y-3" style={{ backgroundColor: NAVY, borderColor: 'rgba(255,255,255,0.1)' }}>
            {navLinks.map((link) => (
              <a key={link} href="#" className="block text-sm font-medium py-2 text-white/70">
                {link}
              </a>
            ))}
            <a
              href="tel:+10000000000"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold mt-2"
              style={{ backgroundColor: PRIMARY }}
            >
              <Phone className="h-4 w-4" />
              +1 000-000-0000
            </a>
          </div>
        )}
      </nav>

      {/* ─── Hero ─── */}
      <section
        className="relative min-h-[100vh] flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: NAVY }}
      >
        {/* Background image with overlay */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.2,
          }}
        />
        {/* Gradient mesh */}
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(45,106,79,0.3) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 30%, rgba(82,183,136,0.15) 0%, transparent 40%),
            radial-gradient(ellipse at 50% 80%, rgba(176,141,87,0.1) 0%, transparent 40%)
          `,
        }} />

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center pt-20">
          {/* Animated badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 mb-8"
            style={{
              backgroundColor: 'rgba(82,183,136,0.15)',
              border: '1px solid rgba(82,183,136,0.25)',
              opacity: heroLoaded ? 1 : 0,
              transform: heroLoaded ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s',
            }}
          >
            <Heart className="h-4 w-4" style={{ color: PRIMARY_LIGHT }} />
            <span className="text-sm font-medium" style={{ color: PRIMARY_LIGHT }}>Compassionate Evidence-Based Care</span>
          </div>

          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] mb-6"
            style={{
              color: 'white',
              letterSpacing: '-0.02em',
              opacity: heroLoaded ? 1 : 0,
              transform: heroLoaded ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.97)',
              transition: 'all 0.8s cubic-bezier(0.22,1,0.36,1) 0.35s',
            }}
          >
            Your Path to{' '}
            <span style={{
              background: `linear-gradient(135deg, ${PRIMARY_LIGHT}, ${ACCENT})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Healing
            </span>{' '}
            Starts Here
          </h1>

          <p
            className="text-lg md:text-xl mb-10 max-w-2xl mx-auto"
            style={{
              color: 'rgba(255,255,255,0.7)',
              opacity: heroLoaded ? 1 : 0,
              transform: heroLoaded ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.7s cubic-bezier(0.22,1,0.36,1) 0.55s',
            }}
          >
            Evidence-based addiction treatment in a serene, supportive environment. Let us help you take the first step toward lasting recovery.
          </p>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            style={{
              opacity: heroLoaded ? 1 : 0,
              transform: heroLoaded ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.7s cubic-bezier(0.22,1,0.36,1) 0.7s',
            }}
          >
            <button
              className="px-8 py-4 rounded-full text-white font-bold text-base transition-all hover:scale-105 shadow-xl"
              style={{
                background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_LIGHT})`,
                boxShadow: `0 8px 32px rgba(45,106,79,0.4)`,
              }}
            >
              Verify Insurance
            </button>
            <a
              href="tel:+10000000000"
              className="flex items-center gap-2 text-lg font-semibold transition-colors"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              <Phone className="h-5 w-5" />
              +1 000-000-0000
            </a>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32" style={{
          background: 'linear-gradient(to top, #F7FAF8 0%, transparent 100%)',
        }} />
      </section>

      {/* ─── Insurance Logos ─── */}
      <RevealSection>
        <section className="py-16" style={{ backgroundColor: '#F7FAF8' }}>
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: DARK_BG }}>
              Insurance We Accept
            </h2>
            <p className="mb-10 text-sm" style={{ color: '#64748B' }}>We work with most major insurance providers</p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
              {insuranceLogos.map((ins, i) => (
                <RevealSection key={ins.name} delay={i * 0.1}>
                  <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                    <div className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: ins.color }}>
                      {ins.name.charAt(0)}
                    </div>
                    <span className="text-sm font-semibold" style={{ color: '#334155' }}>{ins.name}</span>
                  </div>
                </RevealSection>
              ))}
              <RevealSection delay={0.3}>
                <div className="flex items-center gap-2">
                  <div className="h-12 w-12 rounded-lg flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#E2E8F0', color: '#64748B' }}>
                    +
                  </div>
                  <span className="text-sm font-semibold" style={{ color: '#64748B' }}>And More</span>
                </div>
              </RevealSection>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ─── Features Checklist ─── */}
      <section className="py-20" style={{ backgroundColor: 'white' }}>
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <RevealSection>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80"
                alt="Treatment facility lounge"
                className="rounded-2xl shadow-xl w-full h-80 object-cover"
              />
              <div className="absolute -bottom-4 -right-4 h-full w-full rounded-2xl -z-10" style={{ backgroundColor: `${PRIMARY}15` }} />
            </div>
          </RevealSection>
          <RevealSection delay={0.15}>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: DARK_BG }}>
                Why Choose Treatment Center
              </h2>
              <p className="mb-8 text-base" style={{ color: '#64748B' }}>
                We provide comprehensive, evidence-based care in a safe and healing environment.
              </p>
              <ul className="space-y-4">
                {features.map((f, i) => (
                  <RevealSection key={f.text} delay={i * 0.08}>
                    <li className="flex items-start gap-3 group">
                      <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors group-hover:scale-110" style={{ backgroundColor: `${PRIMARY}15` }}>
                        <Check className="h-3.5 w-3.5" style={{ color: PRIMARY }} />
                      </div>
                      <span className="text-sm font-medium" style={{ color: '#334155' }}>{f.text}</span>
                    </li>
                  </RevealSection>
                ))}
              </ul>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="py-20" style={{ backgroundColor: NAVY }}>
        <div className="max-w-6xl mx-auto px-4">
          <RevealSection>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-white">
              Our Impact
            </h2>
            <p className="text-center mb-12 text-base" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Numbers that reflect our commitment to recovery
            </p>
          </RevealSection>
          <div className="grid sm:grid-cols-3 gap-6">
            {stats.map((s, i) => (
              <RevealSection key={s.value} delay={i * 0.12}>
                <div
                  className="rounded-2xl p-8 text-center transition-all hover:scale-105 hover:shadow-2xl"
                  style={{
                    background: `linear-gradient(145deg, ${PRIMARY}, ${PRIMARY_LIGHT})`,
                    boxShadow: '0 8px 32px rgba(45,106,79,0.25)',
                  }}
                >
                  <div className="text-5xl md:text-6xl font-extrabold mb-3 text-white">{s.value}</div>
                  <div className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.9)' }}>{s.accent}</div>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{s.label}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="py-20" style={{ backgroundColor: '#F7FAF8' }}>
        <div className="max-w-6xl mx-auto px-4">
          <RevealSection>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: DARK_BG }}>
              Stories of Recovery
            </h2>
            <p className="text-center mb-12 text-base" style={{ color: '#64748B' }}>
              Hear from those who have walked the path to recovery
            </p>
          </RevealSection>
          <div className="grid sm:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <RevealSection key={t.name} delay={i * 0.1}>
                <div
                  className="rounded-2xl p-6 transition-all hover:shadow-xl hover:-translate-y-1 h-full"
                  style={{ backgroundColor: 'white', border: '1px solid #E2E8F0' }}
                >
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" style={{ color: ACCENT }} />
                    ))}
                  </div>
                  <p className="text-sm mb-6 leading-relaxed" style={{ color: '#475569' }}>
                    {t.text}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_LIGHT})` }}>
                      {t.name.charAt(0)}
                    </div>
                    <span className="font-semibold text-sm" style={{ color: DARK_BG }}>{t.name}</span>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Whole-Person Recovery ─── */}
      <section className="py-20" style={{ backgroundColor: 'white' }}>
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <RevealSection>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: DARK_BG }}>
                Whole-Person Recovery
              </h2>
              <p className="text-base mb-6 leading-relaxed" style={{ color: '#64748B' }}>
                We believe true recovery addresses every aspect of a person — mind, body, and spirit. Our integrative programs combine clinical excellence with holistic therapies to build a strong foundation for lasting sobriety.
              </p>
              <ul className="space-y-3 mb-8">
                {['Group therapy and peer support', 'Mindfulness and meditation', 'Nutritional counseling', 'Family involvement programs'].map((item, i) => (
                  <RevealSection key={item} delay={i * 0.08}>
                    <li className="flex items-center gap-3">
                      <ChevronRight className="h-4 w-4 shrink-0" style={{ color: PRIMARY }} />
                      <span className="text-sm font-medium" style={{ color: '#334155' }}>{item}</span>
                    </li>
                  </RevealSection>
                ))}
              </ul>
              <button
                className="px-8 py-3.5 rounded-full text-white font-bold text-sm transition-all hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_LIGHT})`, boxShadow: '0 4px 20px rgba(45,106,79,0.3)' }}
              >
                Learn More About Our Programs
              </button>
            </div>
          </RevealSection>
          <RevealSection delay={0.15}>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&q=80"
                alt="Group therapy session"
                className="rounded-2xl shadow-xl w-full h-96 object-cover"
              />
              <div className="absolute -bottom-4 -left-4 h-full w-full rounded-2xl -z-10" style={{ backgroundColor: `${PRIMARY_LIGHT}15` }} />
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── Footer with Contact Form ─── */}
      <footer className="py-16" style={{ backgroundColor: NAVY }}>
        <div className="max-w-6xl mx-auto px-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                T
              </div>
              <span className="text-lg font-bold text-white">
                Treatment Center
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Providing compassionate, evidence-based addiction treatment and recovery services.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-sm mb-4 text-white">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link}>
                  <a href="#" className="text-xs transition-colors hover:underline" style={{ color: 'rgba(255,255,255,0.5)' }}>{link}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Treatments */}
          <div>
            <h4 className="font-bold text-sm mb-4 text-white">Treatments</h4>
            <ul className="space-y-2">
              {treatments.map((t) => (
                <li key={t}>
                  <a href="#" className="text-xs transition-colors hover:underline" style={{ color: 'rgba(255,255,255,0.5)' }}>{t}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-sm mb-4 text-white">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
                <a href="tel:+10000000000" className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>+1 000-000-0000</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
                <a href="mailto:t-treatment2@center.org" className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>t-treatment2@center.org</a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>123 Recovery Lane, Healing Springs, CA 90210</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ─── Lead Capture Form ─── */}
        <RevealSection className="max-w-2xl mx-auto px-4 mt-14">
          <div className="rounded-2xl p-8" style={{
            background: 'linear-gradient(145deg, rgba(45,106,79,0.15), rgba(82,183,136,0.08))',
            border: '1px solid rgba(82,183,136,0.2)',
          }}>
            <h3 className="text-xl font-bold text-center mb-2 text-white">
              Get Confidential Help Today
            </h3>
            <p className="text-xs text-center mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Fill out the form below and a caring counselor will reach out to you shortly.
            </p>

            {formSubmitted ? (
              <div className="text-center py-6">
                <div className="h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_LIGHT})` }}>
                  <Check className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-semibold text-white">Thank you! We'll be in touch soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Your Name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all focus:ring-2"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all focus:ring-2"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}
                  />
                </div>
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all focus:ring-2"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                />
                <textarea
                  placeholder="How can we help? (optional)"
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all focus:ring-2 resize-none"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                />
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-white font-bold text-sm transition-all hover:scale-[1.02]"
                  style={{
                    background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_LIGHT})`,
                    boxShadow: '0 4px 20px rgba(45,106,79,0.3)',
                  }}
                >
                  <Send className="h-4 w-4" />
                  Get Help Now
                </button>
                <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  100% confidential. We respect your privacy.
                </p>
              </form>
            )}
          </div>
        </RevealSection>

        <div className="max-w-6xl mx-auto px-4 mt-12 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
            © 2026 Treatment Center. All rights reserved. This is a demo website.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Comparison2;
