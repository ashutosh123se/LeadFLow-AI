'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, PhoneCall, Zap, ShieldCheck, BarChart3, Users, MessageSquareCode } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="bg-slate-950 text-slate-50 min-h-screen relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center border-b border-slate-900 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/20">
            LF
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            LeadLFlowAI
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300 font-medium">
          <a href="#features" className="hover:text-indigo-400 transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-indigo-400 transition-colors">90-Second Calling</a>
          <a href="#pricing" className="hover:text-indigo-400 transition-colors">Pricing</a>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hover:text-indigo-400 transition-colors">
            Sign In
          </Link>
          <Link href="/register" className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-1.5">
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-24 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/5 text-xs text-indigo-400 font-semibold mb-6">
          <Zap className="w-3.5 h-3.5 fill-current" /> India's First 90-Second AI Speed-to-Lead CRM
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-[1.15] mb-8">
          Call and qualify your B2B leads in{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Hindi & English in 90 Seconds
          </span>
        </h1>
        <p className="text-base md:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
          LeadLFlowAI instantly calls your leads the moment they arrive, qualifies them using natural AI voice agents, and assigns them to your sales reps. Close more deals without hiring more calling agents.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link href="/register" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-base font-bold shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 group">
            Start Free Trial <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a href="#how-it-works" className="w-full sm:w-auto px-8 py-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-base font-semibold hover:border-slate-700 transition-all flex items-center justify-center gap-2">
            <PhoneCall className="w-5 h-5 text-indigo-400" /> Watch Demo
          </a>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-slate-900 bg-slate-950/50 py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl md:text-4xl font-extrabold text-indigo-400">90s</div>
            <p className="text-xs text-slate-500 uppercase mt-1 font-semibold">Average Response Time</p>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-extrabold text-purple-400">85%</div>
            <p className="text-xs text-slate-500 uppercase mt-1 font-semibold">Qualification Accuracy</p>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-extrabold text-pink-400">3x</div>
            <p className="text-xs text-slate-500 uppercase mt-1 font-semibold">Sales Pipeline Speed</p>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-extrabold text-teal-400">₹0</div>
            <p className="text-xs text-slate-500 uppercase mt-1 font-semibold">Setup Cost</p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Qualify Smarter. Close Faster.
          </h2>
          <p className="text-slate-400">
            Equip your business with modern, hyper-automated systems that turn cold inquiries into hot sales opportunities instantly.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="glass p-8 rounded-2xl border border-slate-900 hover:border-slate-800 transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-6">
              <PhoneCall className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold mb-3">Instant Speed-to-Lead Call</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              When a lead submits an inquiry, our calling queue triggers a natural AI callback within 90 seconds. Speak to buyers while intent is at its highest.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass p-8 rounded-2xl border border-slate-900 hover:border-slate-800 transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6">
              <MessageSquareCode className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold mb-3">Natural Bilingual Agents</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              AI voices qualified via conversational scripts in English, Hindi, or Hinglish. Instantly extracts budget, timeline, and exact intent details.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass p-8 rounded-2xl border border-slate-900 hover:border-slate-800 transition-all">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center mb-6">
              <BarChart3 className="w-6 h-6 text-teal-400" />
            </div>
            <h3 className="text-lg font-bold mb-3">Instant AI Lead Scoring</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              GPT-4o reads conversation transcripts immediately after calls hang up, scoring leads into HOT, WARM, or COLD buckets automatically.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-24 border-t border-slate-900 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-slate-400">
            No contract. Cancel anytime. All plans include full CRM access, standard templates, and live socket support.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Starter Plan */}
          <div className="glass p-8 rounded-2xl border border-slate-900 flex flex-col justify-between">
            <div>
              <div className="text-sm text-indigo-400 font-bold uppercase mb-2">Starter Plan</div>
              <div className="text-4xl font-extrabold mb-4">₹1,999<span className="text-sm text-slate-500 font-normal">/mo</span></div>
              <p className="text-sm text-slate-400 mb-6">Best for small agencies and individuals getting started.</p>
              <ul className="text-sm text-slate-300 space-y-3 border-t border-slate-900 pt-6">
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-400" /> 20 AI qualifying calls</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-400" /> Up to 5 team members</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-400" /> Standard Hindi & English voices</li>
              </ul>
            </div>
            <Link href="/register" className="w-full mt-8 py-3 rounded-xl bg-slate-900 border border-slate-800 text-center text-sm font-semibold hover:bg-slate-800 transition-colors">
              Choose Starter
            </Link>
          </div>

          {/* Growth Plan */}
          <div className="glass p-8 rounded-2xl border-2 border-indigo-500 relative flex flex-col justify-between shadow-2xl shadow-indigo-500/10">
            <div className="absolute top-0 right-6 -translate-y-1/2 px-3 py-1 rounded-full bg-indigo-500 text-xs font-bold uppercase tracking-wider">
              Most Popular
            </div>
            <div>
              <div className="text-sm text-indigo-400 font-bold uppercase mb-2">Growth Plan</div>
              <div className="text-4xl font-extrabold mb-4">₹3,499<span className="text-sm text-slate-500 font-normal">/mo</span></div>
              <p className="text-sm text-slate-400 mb-6">Perfect for scaling sales teams who need ultra-natural voices.</p>
              <ul className="text-sm text-slate-300 space-y-3 border-t border-slate-900 pt-6">
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-400" /> 75 AI qualifying calls</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-400" /> Up to 15 team members</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-400" /> Sarvam AI Natural Voice</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-400" /> WhatsApp Follow-Up Templates</li>
              </ul>
            </div>
            <Link href="/register" className="w-full mt-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-center text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 transition-colors shadow-lg shadow-indigo-500/20">
              Choose Growth
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="glass p-8 rounded-2xl border border-slate-900 flex flex-col justify-between">
            <div>
              <div className="text-sm text-indigo-400 font-bold uppercase mb-2">Pro Plan</div>
              <div className="text-4xl font-extrabold mb-4">₹5,999<span className="text-sm text-slate-500 font-normal">/mo</span></div>
              <p className="text-sm text-slate-400 mb-6">Designed for larger organizations with custom workflows.</p>
              <ul className="text-sm text-slate-300 space-y-3 border-t border-slate-900 pt-6">
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-400" /> 200 AI qualifying calls</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-400" /> Unlimited team members</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-400" /> Custom qualifying questions</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-400" /> CRM custom webhooks</li>
              </ul>
            </div>
            <Link href="/register" className="w-full mt-8 py-3 rounded-xl bg-slate-900 border border-slate-800 text-center text-sm font-semibold hover:bg-slate-800 transition-colors">
              Choose Pro
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-900 text-center text-xs text-slate-500 z-10 relative">
        <p>&copy; {new Date().getFullYear()} LeadLFlowAI. All rights reserved. Made for premium scale. India's B2B CRM Leader.</p>
      </footer>
    </div>
  );
}
