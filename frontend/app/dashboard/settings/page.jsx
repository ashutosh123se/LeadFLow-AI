'use client';
import React, { useEffect, useState } from 'react';
import { Settings, Bot, CreditCard, KeyRound, Layers, Loader2, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('ai-settings');
  const [loading, setLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [lang, setLang] = useState('hindi');
  const [voice, setVoice] = useState('meera');
  const [callingStart, setCallingStart] = useState('09:00');
  const [callingEnd, setCallingEnd] = useState('20:00');
  const [questions, setQuestions] = useState('');
  const [usage, setUsage] = useState({ plan: 'STARTER', aiCallsUsed: 0, aiCallsLimit: 20, planExpiresAt: null });
  const [integrations, setIntegrations] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [orgRes, useRes, intRes] = await Promise.all([api.get('/organizations'), api.get('/organizations/usage'), api.get('/integrations')]);
        if (orgRes.success) {
          const o = orgRes.data;
          setAiEnabled(o.aiCallerEnabled ?? true);
          setLang(o.aiCallerLanguage || 'hindi');
          setVoice(o.aiCallerVoice || 'meera');
          setCallingStart(o.callingHoursStart || '09:00');
          setCallingEnd(o.callingHoursEnd || '20:00');
          setQuestions(o.qualifyQuestions || '');
        }
        if (useRes.success) setUsage(useRes.data);
        if (intRes.success) setIntegrations(intRes.data);
      } catch {}
    })();
  }, []);

  const handleSaveAi = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch('/organizations/ai-caller', { aiCallerEnabled: aiEnabled, aiCallerLanguage: lang, aiCallerVoice: voice, callingHoursStart: callingStart, callingHoursEnd: callingEnd, qualifyQuestions: questions });
      toast.success('AI settings saved!');
    } catch { toast.error('Save failed.'); }
    finally { setLoading(false); }
  };

  const handleCheckout = async (planId) => {
    try {
      const res = await api.post('/billing/subscribe', { planId });
      if (res.success) {
        toast.success(`Redirecting for ${planId}...`);
        if (res.data.paymentUrl) window.location.href = res.data.paymentUrl;
      }
    } catch { toast.error('Subscription failed.'); }
  };

  const handleConnect = async (type) => {
    try { await api.post(`/integrations/${type}`, {}); toast.success('Connected!'); } catch { toast.error('Failed.'); }
  };

  const tabs = [
    { id: 'ai-settings', label: 'AI Dialer' },
    { id: 'billing', label: 'Billing & Plans' },
    { id: 'webhooks', label: 'Webhooks' },
  ];

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="flex-shrink-0">
        <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-400" /> System Settings
        </h2>
        <p className="text-sm text-slate-400 mt-1">Configure AI caller, billing, and integrations.</p>
      </div>

      <div className="flex gap-4 border-b border-slate-900 flex-shrink-0 pb-px text-xs font-bold uppercase tracking-wider text-slate-500">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`pb-3 transition-colors ${activeTab === t.id ? 'text-indigo-400 border-b-2 border-indigo-500' : ''}`}>{t.label}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto max-w-3xl">
        {activeTab === 'ai-settings' && (
          <form onSubmit={handleSaveAi} className="glass p-8 rounded-3xl border border-slate-900 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-900/60">
              <div>
                <h3 className="font-bold flex items-center gap-2"><Bot className="w-5 h-5 text-indigo-400" /> Voice Qualifier Settings</h3>
                <p className="text-xs text-slate-500 mt-1">Language, voice persona, calling hours, and script questions.</p>
              </div>
              <button type="button" onClick={() => setAiEnabled(!aiEnabled)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all ${aiEnabled ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-800 text-slate-500'}`}>
                {aiEnabled ? 'AI Active' : 'AI Paused'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Language</label>
                <select value={lang} onChange={(e) => setLang(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none">
                  <option value="hindi">Hindi / Hinglish</option>
                  <option value="english">B2B English</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Voice Persona</label>
                <select value={voice} onChange={(e) => setVoice(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none">
                  <option value="meera">Meera (Female)</option>
                  <option value="rohan">Rohan (Male)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Calling Start (IST)</label>
                <input type="time" value={callingStart} onChange={(e) => setCallingStart(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Calling End (IST)</label>
                <input type="time" value={callingEnd} onChange={(e) => setCallingEnd(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">AI Script Questions</label>
              <textarea value={questions} onChange={(e) => setQuestions(e.target.value)} rows={3} placeholder="Q1: Budget, Q2: Timeline..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-300 focus:outline-none" />
            </div>
            <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold shadow-md flex items-center gap-1.5 disabled:opacity-50">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Save AI Settings
            </button>
          </form>
        )}

        {activeTab === 'billing' && (
          <div className="glass p-8 rounded-3xl border border-slate-900 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-900/60">
              <div><h3 className="font-bold flex items-center gap-2"><CreditCard className="w-5 h-5 text-indigo-400" /> Billing & Limits</h3></div>
              <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold px-3 py-1 rounded-xl text-xs uppercase">{usage.plan} PLAN</div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="text-slate-400">AI Calls Used</span>
                <span>{usage.aiCallsUsed} / {usage.aiCallsLimit}</span>
              </div>
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (usage.aiCallsUsed / usage.aiCallsLimit) * 100)}%` }} />
              </div>
              {usage.planExpiresAt && <p className="text-[10px] text-slate-500 mt-2">Renews: <strong>{new Date(usage.planExpiresAt).toLocaleDateString()}</strong></p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-900 pt-6">
              {[
                { id: 'STARTER', label: 'Starter', price: '₹1,999', calls: '20', members: '5' },
                { id: 'GROWTH', label: 'Growth', price: '₹3,499', calls: '75', members: '15', popular: true },
                { id: 'PRO', label: 'Pro', price: '₹5,999', calls: '200', members: 'Unlimited' },
              ].map((plan) => (
                <div key={plan.id} className={`glass p-5 rounded-2xl flex flex-col justify-between ${plan.popular ? 'border-2 border-indigo-500 relative' : 'border border-slate-900/60'}`}>
                  {plan.popular && <span className="absolute top-0 right-4 -translate-y-1/2 bg-indigo-500 text-[8px] font-extrabold px-2 py-0.5 rounded-full">POPULAR</span>}
                  <div>
                    <h5 className="font-bold text-xs">{plan.label}</h5>
                    <div className="text-xl font-extrabold mt-2 text-indigo-400">{plan.price}<span className="text-[10px] text-slate-500 font-normal">/mo</span></div>
                    <ul className="text-[10px] text-slate-400 space-y-2 mt-4">
                      <li>• {plan.calls} AI calls/mo</li>
                      <li>• {plan.members} team members</li>
                    </ul>
                  </div>
                  <button onClick={() => handleCheckout(plan.id)}
                    className={`w-full mt-4 py-2 rounded-xl text-[10px] font-bold ${plan.popular ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90' : 'bg-slate-900 border border-slate-800 hover:bg-slate-800'}`}>
                    Select {plan.label}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'webhooks' && (
          <div className="glass p-8 rounded-3xl border border-slate-900 space-y-6">
            <div><h3 className="font-bold flex items-center gap-2"><Layers className="w-5 h-5 text-indigo-400" /> Lead Source Connections</h3></div>
            <div className="divide-y divide-slate-900/60 border-t border-slate-900 pt-6">
              {integrations.map((app) => (
                <div key={app.type} className="py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 first:pt-0">
                  <div>
                    <h4 className="font-bold text-sm">{app.name}{app.connected && <span className="ml-2 text-[9px] bg-teal-500/10 text-teal-400 font-bold px-1.5 py-0.5 rounded border border-teal-500/20">ACTIVE</span>}</h4>
                    <p className="text-[11px] text-slate-500 mt-1">{app.description}</p>
                    {app.connected && app.webhookUrl && (
                      <div className="mt-3 bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-center gap-3 max-w-sm">
                        <span className="text-[9px] font-mono text-slate-400 truncate">{app.webhookUrl}</span>
                        <button onClick={() => { navigator.clipboard.writeText(app.webhookUrl); toast.success('Copied!'); }} className="text-slate-500 hover:text-indigo-400 flex-shrink-0"><Copy className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                  {!app.connected ? (
                    <button onClick={() => handleConnect(app.type)} className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold border border-slate-800">Connect</button>
                  ) : (
                    <button onClick={async () => { await api.delete(`/integrations/${app.type}`); toast.success('Disconnected.'); }} className="px-4 py-2 rounded-xl bg-red-500/5 hover:bg-red-500/10 text-xs font-semibold text-red-400 border border-red-500/10">Disconnect</button>
                  )}
                </div>
              ))}
              {integrations.length === 0 && <div className="text-center py-12 text-xs text-slate-600">No integrations available.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
