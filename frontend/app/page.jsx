'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, PhoneCall, Zap, ShieldCheck, BarChart3, 
  Users, MessageSquare, Bot, HelpCircle, Star, CheckCircle, 
  ArrowRightLeft, Play, Info, Sparkles, ChevronDown 
} from 'lucide-react';

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const faqs = [
    {
      q: "How does the speed-to-lead calling work?",
      a: "The moment a lead is captured via your website form or integrations (IndiaMART, Justdial, Facebook, etc.), a job is pushed to our Redis queue. Our background worker instantly schedules a call via Exotel connecting the client to our Sarvam AI TTS synthesized voice agent, all completed within 90 seconds."
    },
    {
      q: "Do you support Indian languages?",
      a: "Yes, our voice caller fully supports native Hindi, Hinglish, and English accents. The AI agent speaks naturally with correct local inflections and records responses for analysis."
    },
    {
      q: "How does the lead scoring engine evaluate intent?",
      a: "As soon as a call completes, we retrieve the recording, transcribe it using Deepgram Nova-2, and feed the entire transcript history to GPT-4o. The model extracts parameters (budget, timeline, requirement notes) and updates the lead status automatically."
    },
    {
      q: "Is explicit user consent mandatory?",
      a: "Yes. To remain compliant with telecom regulations, our API checks if the lead has given explicit consent (e.g., via the consent checkbox in our widget) before queueing an outbound call."
    }
  ];

  return (
    <div className="bg-slate-950 text-slate-50 min-h-screen relative overflow-x-hidden selection:bg-indigo-500/30">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center border-b border-slate-900/60 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/20">
            LF
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            LeadFlow-AI
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-400">
          <a href="#features" className="hover:text-indigo-400 transition-colors">Features</a>
          <a href="#flow" className="hover:text-indigo-400 transition-colors">Workflow</a>
          <a href="#competitors" className="hover:text-indigo-400 transition-colors">Comparison</a>
          <a href="#pricing" className="hover:text-indigo-400 transition-colors">Pricing</a>
          <a href="#faqs" className="hover:text-indigo-400 transition-colors">FAQ</a>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hover:text-indigo-400 transition-colors">
            Sign In
          </Link>
          <Link href="/register" className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-650 hover:to-purple-750 text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-1.5">
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-24 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/5 text-[11px] text-indigo-400 font-bold uppercase tracking-wider mb-6">
          <Zap className="w-3.5 h-3.5 fill-current" /> India's First 90-Second AI Speed-to-Lead CRM
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight max-w-5xl mx-auto leading-[1.1] mb-8">
          Call & Qualify Inbound Leads in{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Hindi & English in 90s
          </span>
        </h1>
        <p className="text-base md:text-lg text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
          LeadFlow-AI calls your buyers instantly the second they inquire. Qualifying script nodes extract budgets & intent in real-time, moving qualified leads directly to your sales closures.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link href="/register" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-650 hover:to-purple-750 text-sm font-bold shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 group">
            Start Free Trial <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a href="#flow" className="w-full sm:w-auto px-8 py-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900 text-sm font-semibold hover:border-slate-700 transition-all flex items-center justify-center gap-2">
            <PhoneCall className="w-4 h-4 text-indigo-400" /> Learn Workflow
          </a>
        </div>
      </section>

      {/* Dynamic Workflow Diagram */}
      <section id="flow" className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl font-extrabold tracking-tight mb-2">90-Second Lead Processing Cycle</h2>
          <p className="text-xs text-slate-400">Our automated speed-to-lead system handles lead captures asynchronously.</p>
        </div>

        {/* Timeline block flow visual */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          
          {/* Step 1 */}
          <div className="glass p-5 rounded-2xl border border-slate-900/80 text-center relative space-y-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center mx-auto text-indigo-400 text-xs font-bold">1</div>
            <h4 className="font-bold text-xs">Lead Captured</h4>
            <p className="text-[10px] text-slate-500">Captured via Website Widget, IndiaMART, Justdial, or FB Ads webhook.</p>
          </div>

          {/* Step 2 */}
          <div className="glass p-5 rounded-2xl border border-slate-900/80 text-center relative space-y-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto text-amber-400 text-xs font-bold">2</div>
            <h4 className="font-bold text-xs">Asynchronous Dial</h4>
            <p className="text-[10px] text-slate-500">Outbound call queued instantly via Exotel. Dialer respects IST calling hours.</p>
          </div>

          {/* Step 3 */}
          <div className="glass p-5 rounded-2xl border border-slate-900/80 text-center relative space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-400 text-xs font-bold">3</div>
            <h4 className="font-bold text-xs">Natural Voice Script</h4>
            <p className="text-[10px] text-slate-500">Sarvam AI synthesizes bilingual speech questions. Client responses recorded.</p>
          </div>

          {/* Step 4 */}
          <div className="glass p-5 rounded-2xl border border-slate-900/80 text-center relative space-y-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto text-purple-400 text-xs font-bold">4</div>
            <h4 className="font-bold text-xs">GPT-4o Scoring</h4>
            <p className="text-[10px] text-slate-500">Transcribed via Deepgram. GPT-4o analyzes intent, scoring hot/warm/cold.</p>
          </div>

          {/* Step 5 */}
          <div className="glass p-5 rounded-2xl border border-slate-900/80 text-center relative space-y-2">
            <div className="w-8 h-8 rounded-xl bg-pink-500/10 flex items-center justify-center mx-auto text-pink-400 text-xs font-bold">5</div>
            <h4 className="font-bold text-xs">CRM Routing & WA</h4>
            <p className="text-[10px] text-slate-500">Updates pipeline board, sends WA follow-ups, and alerts team members.</p>
          </div>

        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20 relative z-10 border-t border-slate-900/60">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight mb-3">
            Stop losing leads to slow response times.
          </h2>
          <p className="text-sm text-slate-400">
            Automate the first response to inbound inquiries, ensuring high conversions without increasing sales rep overhead.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="glass p-8 rounded-2xl border border-slate-900 hover:border-slate-800 transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <PhoneCall className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold">90-Second Call Backs</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When a lead submits details, our backend triggers an Exotel outbound qualifying call in under 90 seconds. Speak to buyers while their intent is hot.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass p-8 rounded-2xl border border-slate-900 hover:border-slate-800 transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Bot className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold">Hindi & Hinglish Natural Voices</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Synthesize natural speaking voices using Sarvam AI Bulbul. Fully tailored to understand local accents, budgets, and timelines.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass p-8 rounded-2xl border border-slate-900 hover:border-slate-800 transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-teal-400" />
            </div>
            <h3 className="text-lg font-bold">AI Intent Analyzer</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Transcription via Deepgram Nova-2 is evaluated by GPT-4o, converting verbal responses into structured budgets, requirements, and qualified stages.
            </p>
          </div>
        </div>
      </section>

      {/* Competitor Grid */}
      <section id="competitors" className="max-w-6xl mx-auto px-6 py-20 relative z-10 border-t border-slate-900/60">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight mb-3">Why B2B Sales Teams Choose LeadFlow-AI</h2>
          <p className="text-sm text-slate-400">See how we stack up against traditional calling agencies and static CRMs.</p>
        </div>

        <div className="overflow-x-auto border border-slate-900 rounded-3xl bg-slate-950/20">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-900 bg-slate-950/60 font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                <th className="p-5">Feature Core</th>
                <th className="p-5 text-indigo-400 bg-indigo-950/10">LeadFlow-AI</th>
                <th className="p-5 text-slate-500">Calling Agencies</th>
                <th className="p-5 text-slate-500">Traditional CRMs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60 text-slate-350">
              <tr className="hover:bg-slate-900/10">
                <td className="p-5 font-bold">Speed-to-lead callback</td>
                <td className="p-5 bg-indigo-950/10 font-bold text-indigo-300">✅ Under 90 seconds (Automated)</td>
                <td className="p-5">❌ 15 - 45 Minutes delay</td>
                <td className="p-5">❌ None (Manual dialing only)</td>
              </tr>
              <tr className="hover:bg-slate-900/10">
                <td className="p-5 font-bold">Availability</td>
                <td className="p-5 bg-indigo-950/10 font-bold text-indigo-300">✅ 24/7 capture (Dials during IST hours)</td>
                <td className="p-5">❌ Office hours only (9 AM - 6 PM)</td>
                <td className="p-5">❌ Manual task assignment</td>
              </tr>
              <tr className="hover:bg-slate-900/10">
                <td className="p-5 font-bold">Automatic Scoring & transcription</td>
                <td className="p-5 bg-indigo-950/10 font-bold text-indigo-300">✅ Deepgram transcription & GPT-4o score</td>
                <td className="p-5">❌ Manual notes (often inconsistent)</td>
                <td className="p-5">❌ Needs manual form entries</td>
              </tr>
              <tr className="hover:bg-slate-900/10">
                <td className="p-5 font-bold">Monthly Cost</td>
                <td className="p-5 bg-indigo-950/10 font-bold text-indigo-300">✅ Flat rates starting ₹1,999/mo</td>
                <td className="p-5">❌ ₹25,000+ per executive</td>
                <td className="p-5">❌ ₹5,000+ per user license</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-900/60 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight mb-3">Simple Plans for Active Sales</h2>
          <p className="text-sm text-slate-400">Choose the volume suitable for your daily inbound lead capture velocity.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Plan 1 */}
          <div className="glass p-8 rounded-3xl border border-slate-900 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Starter</span>
              <div className="text-3xl font-black mt-2">₹1,999<span className="text-xs text-slate-500 font-normal">/mo</span></div>
              <p className="text-xs text-slate-500 mt-2">Best for boutique agencies & brokers.</p>
              <ul className="text-xs text-slate-400 space-y-3 mt-6 border-t border-slate-900 pt-6">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-indigo-400" /> 20 AI Dialing Calls / Mo</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-indigo-400" /> Up to 5 Team Seats</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-indigo-400" /> Standard Hindi & English accents</li>
              </ul>
            </div>
            <Link href="/register" className="w-full mt-8 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-center text-xs font-bold transition-all border border-slate-800">
              Select Starter
            </Link>
          </div>

          {/* Plan 2 */}
          <div className="glass p-8 rounded-3xl border-2 border-indigo-500 flex flex-col justify-between relative shadow-2xl shadow-indigo-500/10">
            <span className="absolute top-0 right-6 -translate-y-1/2 bg-indigo-500 text-[8px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">Most Popular</span>
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Growth</span>
              <div className="text-3xl font-black mt-2 text-indigo-400">₹3,499<span className="text-xs text-slate-500 font-normal">/mo</span></div>
              <p className="text-xs text-indigo-300/60 mt-2">Designed for fast scaling B2B teams.</p>
              <ul className="text-xs text-slate-350 space-y-3 mt-6 border-t border-slate-900 pt-6">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-indigo-400" /> 75 AI Dialing Calls / Mo</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-indigo-400" /> Up to 15 Team Seats</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-indigo-400" /> Sarvam AI Natural Voices</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-indigo-400" /> Meta WhatsApp Templates Dispatch</li>
              </ul>
            </div>
            <Link href="/register" className="w-full mt-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-center text-xs font-bold text-white transition-all shadow-lg shadow-indigo-500/25 hover:opacity-95">
              Select Growth
            </Link>
          </div>

          {/* Plan 3 */}
          <div className="glass p-8 rounded-3xl border border-slate-900 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Enterprise</span>
              <div className="text-3xl font-black mt-2">₹5,999<span className="text-xs text-slate-500 font-normal">/mo</span></div>
              <p className="text-xs text-slate-500 mt-2">For custom scripts and high lead counts.</p>
              <ul className="text-xs text-slate-400 space-y-3 mt-6 border-t border-slate-900 pt-6">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-indigo-400" /> 200 AI Dialing Calls / Mo</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-indigo-400" /> Unlimited Team Seats</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-indigo-400" /> Custom script qualifiers</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-indigo-400" /> Direct outbound webhooks</li>
              </ul>
            </div>
            <Link href="/register" className="w-full mt-8 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-center text-xs font-bold transition-all border border-slate-800">
              Select Enterprise
            </Link>
          </div>
        </div>
      </section>

      {/* Accordion FAQ Section */}
      <section id="faqs" className="max-w-3xl mx-auto px-6 py-20 border-t border-slate-900/60 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight mb-3">Frequently Asked Questions</h2>
          <p className="text-sm text-slate-400">Everything you need to know about setting up your AI CRM.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div key={idx} className="glass border border-slate-900 rounded-2xl overflow-hidden transition-all">
                <button 
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left font-bold text-xs sm:text-sm text-slate-200 hover:text-white flex justify-between items-center outline-none bg-slate-950/10"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-250 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="p-5 border-t border-slate-900/60 text-xs text-slate-400 leading-relaxed bg-slate-950/30 animate-in fade-in duration-200">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-900/60 text-center text-xs text-slate-500 z-10 relative">
        <p>&copy; {new Date().getFullYear()} LeadFlow-AI. All rights reserved. Indian speed-to-lead sales qualify leader.</p>
      </footer>
    </div>
  );
}
