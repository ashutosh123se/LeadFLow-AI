'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Lock, Mail, User, Building2, Phone, Loader2, 
  ArrowRight, ArrowLeft, Bot, Sparkles, Check, CheckCircle2 
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../../store/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading, init, isAuthenticated } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const [step, setStep] = useState(1);

  // Step 1: Admin Account
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step 2: Org Profile
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [industry, setIndustry] = useState('Technology');
  const [teamSize, setTeamSize] = useState('1-10');

  // Step 3: AI Dialer Choice
  const [aiLang, setAiLang] = useState('hindi');
  const [aiVoice, setAiVoice] = useState('meera');

  const nextStep = () => {
    if (step === 1) {
      if (!name || !email || !password) {
        toast.error('Please enter name, email, and password.');
        return;
      }
      if (password.length < 8) {
        toast.error('Password must be at least 8 characters long.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!companyName || !phone) {
        toast.error('Please enter company name and phone number.');
        return;
      }
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        toast.error('Please enter a valid 10-digit Indian phone number starting with 6-9.');
        return;
      }
      setStep(3);
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyName || !name || !email || !phone || !password) {
      toast.error('Please fill out all mandatory fields.');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    
    // Call store register action
    const res = await register(
      companyName, 
      name, 
      email, 
      cleanPhone, 
      password, 
      industry,
      { aiLang, aiVoice, teamSize }
    );

    if (res.success) {
      toast.success('Account successfully registered! Welcome to LeadFlow-AI.');
      router.push('/dashboard');
    } else {
      toast.error(res.error || 'Registration failed.');
    }
  };

  return (
    <div className="bg-slate-950 text-slate-50 min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
      {/* Neon glowing backdrop lights */}
      <div className="absolute top-[10%] left-[10%] w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 my-8">
        {/* Brand logo header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/20">
              LF
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              LeadFlow-AI
            </span>
          </Link>
          <h2 className="text-2xl font-black tracking-tight">Create your workspace</h2>
          <p className="text-slate-400 text-xs mt-1">Configure your outbound dialer scripts in 3 simple steps.</p>
        </div>

        {/* Wizard progress dots bar */}
        <div className="flex justify-between items-center mb-6 px-10">
          {[1, 2, 3].map((num) => (
            <div key={num} className="flex items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= num 
                  ? 'bg-indigo-650 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400' 
                  : 'bg-slate-900 border border-slate-800 text-slate-500'
              }`}>
                {step > num ? <Check className="w-3.5 h-3.5" /> : num}
              </div>
              {num < 3 && (
                <div className={`w-20 h-0.5 mx-2 transition-all ${
                  step > num ? 'bg-indigo-650' : 'bg-slate-900'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Wizard Cards container */}
        <div className="glass p-8 rounded-3xl shadow-2xl border border-slate-900 bg-slate-950/40">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* STEP 1: ADMIN ACCOUNT CONFIG */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-indigo-400">1. Admin Credentials</h3>
                
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Your Full Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Rahul Sharma"
                      required
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2.5 pl-11 pr-4 text-xs focus:border-indigo-500 focus:outline-none text-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Work Email Address</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="rahul@acme.com"
                      required
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2.5 pl-11 pr-4 text-xs focus:border-indigo-500 focus:outline-none text-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Secure Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="•••••••• (Min 8 characters)"
                      required
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2.5 pl-11 pr-4 text-xs focus:border-indigo-500 focus:outline-none text-slate-200"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={nextStep}
                  className="w-full mt-2 py-3 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg"
                >
                  Continue to Profile <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STEP 2: ORG PROFILE DETAILS */}
            {step === 2 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-indigo-400">2. Company Profile</h3>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Company Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                      <Building2 className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme CRM Corp"
                      required
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2.5 pl-11 pr-4 text-xs focus:border-indigo-500 focus:outline-none text-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Indian Phone Number (For SMS/Verification)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      required
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2.5 pl-11 pr-4 text-xs focus:border-indigo-500 focus:outline-none text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Industry</label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2.5 px-3 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="Technology">Technology / SaaS</option>
                      <option value="Real Estate">Real Estate</option>
                      <option value="Finance">Finance & Banking</option>
                      <option value="Education">Education / Edtech</option>
                      <option value="Consulting">Consultancy</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Team Size</label>
                    <select
                      value={teamSize}
                      onChange={(e) => setTeamSize(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2.5 px-3 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="1-10">1-10 Employees</option>
                      <option value="11-50">11-50 Employees</option>
                      <option value="51-200">51-200 Employees</option>
                      <option value="200+">More than 200</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex-1 py-3 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex-1 py-3 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg"
                  >
                    Next Step <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: DIALER SELECTION & FINISH */}
            {step === 3 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-indigo-400">3. AI Outbound Dialer Settings</h3>

                <div className="p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-2xl flex items-start gap-3">
                  <Bot className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-indigo-300/80 leading-normal">
                    This determines how your qualifier voice call script is generated. You can update these script nodes later in Settings.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Call Accent</label>
                    <select
                      value={aiLang}
                      onChange={(e) => setAiLang(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2.5 px-3 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="hindi">Hindi / Hinglish</option>
                      <option value="english">B2B Indian English</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Voice Persona</label>
                    <select
                      value={aiVoice}
                      onChange={(e) => setAiVoice(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2.5 px-3 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="meera">Meera (Female)</option>
                      <option value="rohan">Rohan (Male)</option>
                    </select>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 leading-normal bg-slate-900/20 p-3 rounded-xl border border-slate-900/40">
                  ⚡ Sign up includes <strong>20 free AI Calls</strong> and <strong>100 WhatsApp templates</strong> to verify system operations.
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={loading}
                    className="flex-1 py-3 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-650 hover:to-purple-750 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Provisioning...
                      </>
                    ) : (
                      <>
                        Complete Setup <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Login redirection */}
          {step === 1 && (
            <div className="text-center mt-6 text-xs text-slate-400">
              Already have an account?{' '}
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
