'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, PhoneCall, BarChart3, MessageSquare, Shield, Check, ChevronDown,
  Zap, Workflow, Bot, Star, Play, Sparkles, IndianRupee,
} from 'lucide-react';
import Logo from '../components/Logo';
import DashboardPreview from '../components/landing/DashboardPreview';

const LOGOS = ['PropStack', 'FinEdge', 'BuildRight', 'MediCore', 'CloudNine', 'RetailMax'];

const FEATURES = [
  {
    icon: PhoneCall,
    title: '90-second speed-to-lead',
    desc: 'Inbound leads trigger governed AI voice calls automatically. Every conversation is recorded, scored, and routed.',
    tag: 'Core',
  },
  {
    icon: Bot,
    title: 'AI qualification engine',
    desc: 'Structured hot, warm, and cold scoring from real conversation data — not guesswork from form fields.',
    tag: 'AI',
  },
  {
    icon: Workflow,
    title: 'Pipeline automation',
    desc: 'Drag-and-drop kanban with assignment rules, stage triggers, and team notifications built in.',
    tag: 'Workflow',
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp follow-up',
    desc: 'Meta-approved templates and real-time reply handling to continue conversations after the first call.',
    tag: 'Omnichannel',
  },
  {
    icon: BarChart3,
    title: 'Revenue analytics',
    desc: 'Funnel conversion, channel attribution, and response-time reporting in one operations view.',
    tag: 'Analytics',
  },
  {
    icon: Shield,
    title: 'Governance & consent',
    desc: 'Role-based access, consent verification, and audit trails for regulated industries.',
    tag: 'Enterprise',
  },
];

const TESTIMONIALS = [
  {
    quote: 'LeadFlow cut our response time from 4 hours to under 90 seconds. Our qualification rate doubled in the first month.',
    name: 'Arjun Mehta',
    role: 'Head of Sales, PropStack Realty',
    metric: '2×',
    metricLabel: 'qualification rate',
  },
  {
    quote: 'The AI voice agent handles Hindi and Hinglish better than our manual team ever could. Pipeline velocity is up 40%.',
    name: 'Priya Nair',
    role: 'VP Revenue, FinEdge Capital',
    metric: '40%',
    metricLabel: 'pipeline velocity',
  },
  {
    quote: 'We replaced three tools with LeadFlow — CRM, dialer, and WhatsApp. One stack, one source of truth.',
    name: 'Vikram Singh',
    role: 'Founder, BuildRight Infrastructure',
    metric: '3→1',
    metricLabel: 'tools consolidated',
  },
];

const PLANS = [
  {
    name: 'Starter',
    price: '1,999',
    calls: '20 AI calls',
    seats: '5 seats',
    features: ['Pipeline & kanban', 'WhatsApp templates', 'Basic analytics', 'Email support'],
  },
  {
    name: 'Growth',
    price: '3,499',
    calls: '75 AI calls',
    seats: '15 seats',
    featured: true,
    features: ['Everything in Starter', 'Custom automations', 'Team assignments', 'Priority support'],
  },
  {
    name: 'Enterprise',
    price: '5,999',
    calls: '200 AI calls',
    seats: 'Unlimited seats',
    features: ['Everything in Growth', 'Platform admin', 'Custom integrations', 'Dedicated CSM'],
  },
];

const FAQS = [
  { q: 'How does automated qualification work?', a: 'When a lead arrives from any source, LeadFlow places an AI voice call within 90 seconds. The conversation is transcribed, scored, and the lead is routed to the right pipeline stage automatically.' },
  { q: 'Which languages are supported?', a: 'English, Hindi, and Hinglish are supported out of the box. Enterprise plans can include additional regional languages.' },
  { q: 'Do I need to connect my phone system?', a: 'No. LeadFlow includes telephony infrastructure. You configure calling hours, voice persona, and qualification scripts from Settings.' },
  { q: 'How is usage billed?', a: 'Plans include a monthly AI call allowance. Additional calls are metered per usage, similar to modern SaaS billing models.' },
  { q: 'Can I import existing leads?', a: 'Yes. Import via CSV, API, or connect IndiaMART, JustDial, Facebook Lead Ads, and Zapier webhooks.' },
];

export default function LandingPage() {
  const [faq, setFaq] = useState(0);
  const [billing, setBilling] = useState('monthly');

  return (
    <div className="min-h-screen bg-background">
      {/* Nav — Attio-style minimal */}
      <header className="landing-nav">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo href="/" />
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted">
            <a href="#platform" className="hover:text-foreground transition-colors">Platform</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-muted hover:text-foreground hidden sm:block">Sign in</Link>
            <Link href="/register" className="btn-primary h-9 px-4 rounded-lg">Start for free</Link>
          </div>
        </div>
      </header>

      {/* Hero — Instantly bold headline + Attio product preview */}
      <section className="relative bg-hero-gradient overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-20 lg:pt-20 lg:pb-28">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-light border border-primary/10 text-xs font-medium text-primary mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              AI-powered speed-to-lead CRM
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-semibold text-foreground leading-[1.1] tracking-tight">
              The CRM that calls your leads{' '}
              <span className="hero-gradient-text">before your competitors do</span>
            </h1>
            <p className="text-lg text-muted mt-6 leading-relaxed max-w-2xl mx-auto">
              LeadFlow qualifies inbound prospects through AI voice outreach, structured scoring,
              and pipeline routing — within 90 seconds of every inquiry.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link href="/register" className="btn-primary h-11 px-6 rounded-lg text-base">
                Start for free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login" className="btn-secondary h-11 px-6 rounded-lg text-base">
                <Play className="w-4 h-4" /> View live demo
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-4">No credit card required · 20 free AI calls included</p>
          </div>

          <DashboardPreview />
        </div>
      </section>

      {/* Trust bar — Attio "trusted by" + Instantly logos */}
      <section className="border-y border-border bg-card py-8">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-xs font-medium text-muted uppercase tracking-wider mb-6">
            Trusted by fast-growing sales teams across India
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {LOGOS.map((name) => (
              <span key={name} className="logo-pill">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics strip — Instantly-style proof */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { value: '90s', label: 'Average response time' },
            { value: '2.4×', label: 'Higher qualification rate' },
            { value: '47%', label: 'Faster pipeline velocity' },
            { value: '99.9%', label: 'Platform uptime SLA' },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <p className="metric-highlight">{m.value}</p>
              <p className="text-sm text-muted mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Platform features — Attio bento + Chargebee depth */}
      <section id="platform" className="bg-mesh border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="section-label mb-3">Platform</p>
            <h2 className="text-3xl font-semibold text-foreground tracking-tight">
              Everything your revenue team needs to close faster
            </h2>
            <p className="text-muted mt-4 text-base leading-relaxed">
              From first touch to qualified handoff — one system that fits your process, not the other way around.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bento-card group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <f.icon className="w-5 h-5 text-primary group-hover:text-primary-foreground" />
                  </div>
                  <span className="text-2xs font-medium text-muted bg-muted-surface px-2 py-0.5 rounded-full">{f.tag}</span>
                </div>
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — Chargebee alternating layout */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="section-label mb-3">How it works</p>
          <h2 className="text-3xl font-semibold tracking-tight">From inquiry to qualified lead in three steps</h2>
        </div>
        <div className="space-y-16">
          {[
            {
              step: '01',
              title: 'Capture from any source',
              desc: 'Website forms, IndiaMART, JustDial, Facebook Lead Ads, or API — every inquiry flows into one pipeline.',
              visual: (
                <div className="grid grid-cols-2 gap-2">
                  {['Website', 'IndiaMART', 'JustDial', 'Facebook'].map((s) => (
                    <div key={s} className="bg-muted-surface border border-border rounded-lg p-3 text-sm font-medium text-center">{s}</div>
                  ))}
                </div>
              ),
            },
            {
              step: '02',
              title: 'AI calls within 90 seconds',
              desc: 'Your configured voice agent dials the prospect, asks qualification questions in Hindi, English, or Hinglish, and records the full transcript.',
              visual: (
                <div className="bg-primary-light/50 border border-primary/10 rounded-xl p-4 space-y-3">
                  <div className="flex gap-2">
                    <div className="bg-card border border-border rounded-lg rounded-tl-sm p-3 text-xs max-w-[75%]">Namaste, main LeadFlow se bol rahi hoon. Kya aap 3BHK ke baare mein interested hain?</div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <div className="bg-primary text-primary-foreground rounded-lg rounded-tr-sm p-3 text-xs max-w-[75%]">Haan, Noida Sector 62 mein dekh rahe hain. Budget 80 lakh hai.</div>
                  </div>
                  <div className="flex items-center gap-2 text-2xs text-muted">
                    <span className="px-2 py-0.5 rounded bg-danger-light text-danger font-medium">Hot · 87/100</span>
                    <span>Call completed · 142s</span>
                  </div>
                </div>
              ),
            },
            {
              step: '03',
              title: 'Route to your team instantly',
              desc: 'Scored leads land in the right pipeline stage. Reps get WhatsApp alerts, assignment notifications, and full conversation context.',
              visual: (
                <div className="flex gap-2">
                  {['New', 'Contacted', 'Qualified'].map((s, i) => (
                    <div key={s} className={`flex-1 rounded-lg border p-3 ${i === 2 ? 'border-primary bg-primary-light/30' : 'border-border bg-muted-surface/50'}`}>
                      <p className="text-xs font-semibold">{s}</p>
                      <div className="mt-2 bg-card border border-border rounded-md p-2 text-2xs font-medium shadow-sm">Aditi Sharma</div>
                    </div>
                  ))}
                </div>
              ),
            },
          ].map((item, i) => (
            <div key={item.step} className={`grid lg:grid-cols-2 gap-10 items-center ${i % 2 === 1 ? 'lg:[direction:rtl]' : ''}`}>
              <div className={i % 2 === 1 ? 'lg:[direction:ltr]' : ''}>
                <span className="text-4xl font-semibold text-primary/20">{item.step}</span>
                <h3 className="text-xl font-semibold mt-2">{item.title}</h3>
                <p className="text-muted mt-3 leading-relaxed">{item.desc}</p>
              </div>
              <div className={`card p-5 ${i % 2 === 1 ? 'lg:[direction:ltr]' : ''}`}>{item.visual}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials — Instantly cards with metrics */}
      <section className="bg-card border-y border-border py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="section-label mb-3">Testimonials</p>
            <h2 className="text-3xl font-semibold tracking-tight">Loved by revenue teams that move fast</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="testimonial-card">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-warning text-warning" />)}
                </div>
                <p className="text-sm text-foreground leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-6 pt-5 border-t border-border flex justify-between items-end">
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted mt-0.5">{t.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold text-primary tabular-nums">{t.metric}</p>
                    <p className="text-2xs text-muted">{t.metricLabel}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — Attio tiers + Chargebee usage hint */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="section-label mb-3">Pricing</p>
          <h2 className="text-3xl font-semibold tracking-tight">From startup to enterprise</h2>
          <p className="text-muted mt-3">Transparent plans with usage-based AI call metering. Start free, scale as you grow.</p>
          <div className="inline-flex segmented mt-6">
            <button onClick={() => setBilling('monthly')} className={`segmented-item ${billing === 'monthly' ? 'segmented-item-active' : ''}`}>Monthly</button>
            <button onClick={() => setBilling('annual')} className={`segmented-item ${billing === 'annual' ? 'segmented-item-active' : ''}`}>Annual · Save 20%</button>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {PLANS.map((p) => (
            <div key={p.name} className={p.featured ? 'pricing-card-featured' : 'pricing-card'}>
              {p.featured && <span className="text-xs font-semibold text-primary mb-3">Most popular</span>}
              <h3 className="font-semibold text-lg">{p.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <IndianRupee className="w-5 h-5 text-muted" />
                <span className="text-4xl font-semibold tabular-nums">
                  {billing === 'annual' ? Math.round(parseInt(p.price.replace(',', '')) * 0.8).toLocaleString('en-IN') : p.price}
                </span>
                <span className="text-sm text-muted">/mo</span>
              </div>
              <p className="text-sm text-muted mt-2">{p.calls} · {p.seats}</p>
              <ul className="space-y-2.5 mt-6 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-muted">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className={`mt-6 w-full rounded-lg ${p.featured ? 'btn-primary' : 'btn-secondary'}`}>
                {p.name === 'Enterprise' ? 'Talk to sales' : 'Start for free'}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-muted-surface/40 border-t border-border py-20">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-semibold">Your questions, answered</h2>
          </div>
          <div className="card divide-y divide-border rounded-xl overflow-hidden">
            {FAQS.map((item, i) => (
              <div key={i}>
                <button onClick={() => setFaq(faq === i ? -1 : i)}
                  className="w-full px-5 py-4 text-left flex justify-between items-center hover:bg-muted-surface/50 transition-colors">
                  <span className="text-sm font-medium pr-4">{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-muted flex-shrink-0 transition-transform ${faq === i ? 'rotate-180' : ''}`} />
                </button>
                {faq === i && <p className="px-5 pb-4 text-sm text-muted leading-relaxed">{item.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band — Instantly closing CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="cta-band">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl font-semibold tracking-tight">Start building your AI sales engine</h2>
            <p className="text-white/70 mt-3 max-w-lg mx-auto text-base">
              Join teams who respond to every lead in under 90 seconds. 20 free AI calls included — no credit card required.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link href="/register" className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-white text-foreground font-medium text-sm hover:bg-white/90 transition-colors">
                Start for free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login" className="inline-flex items-center gap-2 h-11 px-6 rounded-lg border border-white/20 text-white font-medium text-sm hover:bg-white/10 transition-colors">
                View demo environment
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer — Attio-style multi-column */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <Logo href="/" size="sm" />
              <p className="text-sm text-muted mt-3 leading-relaxed">AI-powered speed-to-lead CRM for modern sales teams.</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Product</p>
              <ul className="space-y-2 text-sm text-muted">
                <li><a href="#platform" className="hover:text-foreground">Platform</a></li>
                <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
                <li><Link href="/login" className="hover:text-foreground">Demo</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Company</p>
              <ul className="space-y-2 text-sm text-muted">
                <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
                <li><Link href="/register" className="hover:text-foreground">Contact</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Integrations</p>
              <ul className="space-y-2 text-sm text-muted">
                <li>IndiaMART</li>
                <li>JustDial</li>
                <li>Zapier</li>
                <li>WhatsApp</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-muted">© {new Date().getFullYear()} LeadFlow Technologies. All rights reserved.</p>
            <div className="flex gap-4 text-xs text-muted">
              <span>Privacy</span>
              <span>Terms</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
