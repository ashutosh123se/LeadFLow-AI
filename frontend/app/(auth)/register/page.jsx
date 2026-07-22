'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../../store/authStore';
import Logo from '../../../components/Logo';

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading, init, isAuthenticated, user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [industry, setIndustry] = useState('Technology');
  const [teamSize, setTeamSize] = useState('1-10');
  const [aiLang, setAiLang] = useState('hindi');
  const [aiVoice, setAiVoice] = useState('meera');

  useEffect(() => { init(); }, [init]);
  useEffect(() => {
    if (isAuthenticated && user) router.push('/dashboard');
  }, [isAuthenticated, user, router]);

  const nextStep = () => {
    if (step === 1) {
      if (!name || !email || !password) return toast.error('Please complete all fields.');
      if (password.length < 8) return toast.error('Password must be at least 8 characters.');
      setStep(2);
    } else if (step === 2) {
      if (!companyName || !phone) return toast.error('Please complete all fields.');
      setStep(3);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await register(companyName, name, email, phone.replace(/[^0-9]/g, ''), password, industry, { aiLang, aiVoice, teamSize });
    if (res.success) {
      toast.success('Account created. Welcome to LeadFlow.');
      router.push('/dashboard');
    } else {
      toast.error(res.error || 'Registration failed.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="mb-8"><Logo href="/" /></div>
        <h1 className="text-2xl font-semibold text-foreground">Create your account</h1>
        <p className="text-sm text-muted mt-1 mb-8">Set up your organization in three steps.</p>

        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                step >= n ? 'bg-primary text-primary-foreground' : 'bg-muted-surface text-muted border border-border'
              }`}>
                {step > n ? <Check className="w-3.5 h-3.5" /> : n}
              </div>
              {n < 3 && <div className={`w-12 h-px mx-1 ${step > n ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold mb-2">Account details</h2>
                <div><label className="label">Full name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></div>
                <div><label className="label">Work email</label><input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></div>
                <div><label className="label">Password</label><input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" /></div>
                <button type="button" onClick={nextStep} className="btn-primary w-full mt-2">Continue</button>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold mb-2">Organization</h2>
                <div><label className="label">Company name</label><input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
                <div><label className="label">Phone number</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Industry</label>
                    <select className="select" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                      <option>Technology</option><option>Real Estate</option><option>Finance</option><option>Education</option>
                    </select>
                  </div>
                  <div><label className="label">Team size</label>
                    <select className="select" value={teamSize} onChange={(e) => setTeamSize(e.target.value)}>
                      <option>1-10</option><option>11-50</option><option>51-200</option><option>200+</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                  <button type="button" onClick={nextStep} className="btn-primary flex-1">Continue</button>
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold mb-2">AI dialer configuration</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Language</label>
                    <select className="select" value={aiLang} onChange={(e) => setAiLang(e.target.value)}>
                      <option value="hindi">Hindi / Hinglish</option><option value="english">English</option>
                    </select>
                  </div>
                  <div><label className="label">Voice</label>
                    <select className="select" value={aiVoice} onChange={(e) => setAiVoice(e.target.value)}>
                      <option value="meera">Meera (Female)</option><option value="rohan">Rohan (Male)</option>
                    </select>
                  </div>
                </div>
                <p className="text-xs text-muted bg-muted-surface p-3 rounded-md border border-border">
                  Includes 20 free AI calls and 100 WhatsApp templates to get started.
                </p>
                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1">
                    {loading ? 'Creating...' : 'Complete setup'}
                  </button>
                </div>
              </div>
            )}
          </form>
          {step === 1 && (
            <p className="text-center mt-6 text-sm text-muted">
              Already have an account? <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
