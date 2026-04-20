import { useState, useEffect } from 'react';
import { Check, Phone, Mail, MapPin, Menu, X, Star, ChevronRight } from 'lucide-react';
import { ComparisonChatBot } from '@/components/comparison/ComparisonChatBot';

const navLinks = ['Home', 'About Us', 'Our Services', 'Facilities', 'Blog', 'Contact Us'];

const insuranceLogos = [
  { name: 'Aetna', color: '#7B2D8E' },
  { name: 'Cigna', color: '#0072CE' },
  { name: 'BlueCross BlueShield', color: '#0057A8' },
];

const features = [
  'Medically supervised detoxification programs',
  'Individual and group therapy sessions',
  'Evidence-based treatment approaches',
  'Dual-diagnosis support for co-occurring disorders',
  'Holistic wellness and mindfulness practices',
  'Comprehensive aftercare and relapse prevention',
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

const Comparison = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      {/* Google Font */}
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,700;1,800&display=swap" rel="stylesheet" />

      {/* ─── Sticky Nav ─── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: scrolled ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.92)',
          boxShadow: scrolled ? '0 2px 20px rgba(0,0,0,0.08)' : 'none',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: '#1E3A5F' }}>
              T
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ color: '#1E3A5F' }}>
              Treatment Center
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a key={link} href="#" className="text-sm font-medium transition-colors hover:opacity-70" style={{ color: '#1E3A5F' }}>
                {link}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="tel:+10000000000"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold transition-transform hover:scale-105"
              style={{ backgroundColor: '#2E7D32' }}
            >
              <Phone className="h-4 w-4" />
              +1 000-000-0000
            </a>
          </div>

          {/* Mobile menu toggle */}
          <button className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" style={{ color: '#1E3A5F' }} /> : <Menu className="h-6 w-6" style={{ color: '#1E3A5F' }} />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t px-4 py-4 space-y-3" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            {navLinks.map((link) => (
              <a key={link} href="#" className="block text-sm font-medium py-2" style={{ color: '#1E3A5F' }}>
                {link}
              </a>
            ))}
            <a
              href="tel:+10000000000"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold mt-2"
              style={{ backgroundColor: '#2E7D32' }}
            >
              <Phone className="h-4 w-4" />
              +1 000-000-0000
            </a>
          </div>
        )}
      </nav>

      {/* ─── Hero ─── */}
      <section
        className="relative min-h-[90vh] flex items-center justify-center pt-20"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(30,58,95,0.75) 0%, rgba(30,58,95,0.55) 100%)' }} />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold italic uppercase leading-tight mb-6"
            style={{ color: 'white', letterSpacing: '0.02em' }}
          >
            Safe and Supportive Care at Every Step
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Our medically supervised detox programs provide the foundation for lasting recovery. Compassionate care from admission through aftercare.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="tel:+10000000000"
              className="flex items-center gap-2 text-lg font-semibold"
              style={{ color: 'white' }}
            >
              <Phone className="h-5 w-5" />
              +1 000-000-0000
            </a>
            <button
              className="px-8 py-3.5 rounded-full text-white font-bold text-base transition-transform hover:scale-105 shadow-lg"
              style={{ backgroundColor: '#2E7D32' }}
            >
              Verify Insurance
            </button>
          </div>
        </div>
      </section>

      {/* ─── Insurance Logos ─── */}
      <section className="py-16" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: '#1E3A5F' }}>
            Insurance We Accept
          </h2>
          <p className="mb-10 text-sm" style={{ color: '#64748B' }}>We work with most major insurance providers</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {insuranceLogos.map((ins) => (
              <div key={ins.name} className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                <div className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: ins.color }}>
                  {ins.name.charAt(0)}
                </div>
                <span className="text-sm font-semibold" style={{ color: '#334155' }}>{ins.name}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="h-12 w-12 rounded-lg flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#E2E8F0', color: '#64748B' }}>
                +
              </div>
              <span className="text-sm font-semibold" style={{ color: '#64748B' }}>And More</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features Checklist ─── */}
      <section className="py-20" style={{ backgroundColor: 'white' }}>
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <img
              src="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80"
              alt="Treatment facility lounge"
              className="rounded-2xl shadow-xl w-full h-80 object-cover"
            />
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: '#1E3A5F' }}>
              Why Choose Treatment Center
            </h2>
            <p className="mb-8 text-base" style={{ color: '#64748B' }}>
              We provide comprehensive, evidence-based care in a safe and healing environment.
            </p>
            <ul className="space-y-4">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: '#E8F5E9' }}>
                    <Check className="h-3.5 w-3.5" style={{ color: '#2E7D32' }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: '#334155' }}>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="py-20" style={{ backgroundColor: '#1E3A5F' }}>
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: 'white' }}>
            Our Impact
          </h2>
          <p className="text-center mb-12 text-base" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Numbers that reflect our commitment to recovery
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            {stats.map((s) => (
              <div
                key={s.value}
                className="rounded-2xl p-8 text-center transition-transform hover:scale-105"
                style={{ backgroundColor: '#2E7D32' }}
              >
                <div className="text-5xl md:text-6xl font-extrabold mb-3" style={{ color: 'white' }}>{s.value}</div>
                <div className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.9)' }}>{s.accent}</div>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="py-20" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: '#1E3A5F' }}>
            Stories of Recovery
          </h2>
          <p className="text-center mb-12 text-base" style={{ color: '#64748B' }}>
            Hear from those who have walked the path to recovery
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl p-6 transition-all hover:shadow-lg"
                style={{ backgroundColor: 'white', border: '1px solid #E2E8F0' }}
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" style={{ color: '#F59E0B' }} />
                  ))}
                </div>
                <p className="text-sm mb-6 leading-relaxed" style={{ color: '#475569' }}>
                  {t.text}
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: '#1E3A5F' }}>
                    {t.name.charAt(0)}
                  </div>
                  <span className="font-semibold text-sm" style={{ color: '#1E3A5F' }}>{t.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Whole-Person Recovery ─── */}
      <section className="py-20" style={{ backgroundColor: 'white' }}>
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#1E3A5F' }}>
              Whole-Person Recovery
            </h2>
            <p className="text-base mb-6 leading-relaxed" style={{ color: '#64748B' }}>
              We believe true recovery addresses every aspect of a person — mind, body, and spirit. Our integrative programs combine clinical excellence with holistic therapies to build a strong foundation for lasting sobriety.
            </p>
            <ul className="space-y-3 mb-8">
              {['Group therapy and peer support', 'Mindfulness and meditation', 'Nutritional counseling', 'Family involvement programs'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <ChevronRight className="h-4 w-4 shrink-0" style={{ color: '#2E7D32' }} />
                  <span className="text-sm font-medium" style={{ color: '#334155' }}>{item}</span>
                </li>
              ))}
            </ul>
            <button
              className="px-8 py-3.5 rounded-full text-white font-bold text-sm transition-transform hover:scale-105"
              style={{ backgroundColor: '#2E7D32' }}
            >
              Learn More About Our Programs
            </button>
          </div>
          <div>
            <img
              src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&q=80"
              alt="Group therapy session"
              className="rounded-2xl shadow-xl w-full h-96 object-cover"
            />
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-16" style={{ backgroundColor: '#1E3A5F' }}>
        <div className="max-w-6xl mx-auto px-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                T
              </div>
              <span className="text-lg font-bold" style={{ color: 'white' }}>
                Treatment Center
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Providing compassionate, evidence-based addiction treatment and recovery services.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-sm mb-4" style={{ color: 'white' }}>Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link}>
                  <a href="#" className="text-xs transition-colors hover:underline" style={{ color: 'rgba(255,255,255,0.6)' }}>{link}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Treatments */}
          <div>
            <h4 className="font-bold text-sm mb-4" style={{ color: 'white' }}>Treatments</h4>
            <ul className="space-y-2">
              {treatments.map((t) => (
                <li key={t}>
                  <a href="#" className="text-xs transition-colors hover:underline" style={{ color: 'rgba(255,255,255,0.6)' }}>{t}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-sm mb-4" style={{ color: 'white' }}>Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
                <a href="tel:+10000000000" className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>+1 000-000-0000</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
                <a href="mailto:t-treatment2@center.org" className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>t-treatment2@center.org</a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>123 Recovery Lane, Healing Springs, CA 90210</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 mt-12 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
            © 2026 Treatment Center. All rights reserved. This is a demo website.
          </p>
        </div>
      </footer>

      {/* Care Assist Chatbot */}
      <ComparisonChatBot />
    </div>
  );
};

export default Comparison;
