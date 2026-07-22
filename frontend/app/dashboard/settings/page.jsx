'use client';

import React, { useEffect, useState } from 'react';
import { Bot, CreditCard, Layers, Loader2, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Badge } from '../../../components/ui/Badge';

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
        const [orgRes, useRes, intRes] = await Promise.all([
          api.get('/organizations'), api.get('/organizations/usage'), api.get('/integrations'),
        ]);
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
      await api.patch('/organizations/ai-caller', {
        aiCallerEnabled: aiEnabled, aiCallerLanguage: lang, aiCallerVoice: voice,
        callingHoursStart: callingStart, callingHoursEnd: callingEnd, qualifyQuestions: questions,
      });
      toast.success('Settings saved.');
    } catch {
      toast.error('Save failed.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'ai-settings', label: 'AI dialer' },
    { id: 'billing', label: 'Billing' },
    { id: 'webhooks', label: 'Integrations' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Configure AI dialer, billing, and lead source integrations." />

      <div className="tab-bar">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`tab-item ${activeTab === t.id ? 'tab-item-active' : ''}`}>{t.label}</button>
        ))}
      </div>

      <div className="max-w-3xl">
        {activeTab === 'ai-settings' && (
          <form onSubmit={handleSaveAi} className="card p-6 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" /> Voice qualifier
                </h3>
                <p className="text-sm text-muted mt-1">Language, voice, calling hours, and qualification script.</p>
              </div>
              <button type="button" onClick={() => setAiEnabled(!aiEnabled)}
                className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors ${
                  aiEnabled ? 'bg-primary-light text-primary border-primary/20' : 'bg-muted-surface text-muted border-border'
                }`}>
                {aiEnabled ? 'Active' : 'Paused'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="label">Language</label>
                <select value={lang} onChange={(e) => setLang(e.target.value)} className="select">
                  <option value="hindi">Hindi / Hinglish</option>
                  <option value="english">English</option>
                </select>
              </div>
              <div><label className="label">Voice</label>
                <select value={voice} onChange={(e) => setVoice(e.target.value)} className="select">
                  <option value="meera">Meera (Female)</option>
                  <option value="rohan">Rohan (Male)</option>
                </select>
              </div>
              <div><label className="label">Calling start (IST)</label>
                <input type="time" value={callingStart} onChange={(e) => setCallingStart(e.target.value)} className="input" />
              </div>
              <div><label className="label">Calling end (IST)</label>
                <input type="time" value={callingEnd} onChange={(e) => setCallingEnd(e.target.value)} className="input" />
              </div>
            </div>
            <div>
              <label className="label">Qualification questions</label>
              <textarea value={questions} onChange={(e) => setQuestions(e.target.value)} rows={3}
                placeholder="Q1: Budget, Q2: Timeline..." className="input min-h-[80px] py-2" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Save settings
            </button>
          </form>
        )}

        {activeTab === 'billing' && (
          <div className="card p-6 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-border">
              <h3 className="font-semibold flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> Billing</h3>
              <Badge variant="trial">{usage.plan} plan</Badge>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted">AI calls used</span>
                <span className="font-medium tabular-nums">{usage.aiCallsUsed} / {usage.aiCallsLimit}</span>
              </div>
              <div className="w-full bg-muted-surface h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (usage.aiCallsUsed / usage.aiCallsLimit) * 100)}%` }} />
              </div>
              {usage.planExpiresAt && (
                <p className="text-xs text-muted mt-2">Renews {new Date(usage.planExpiresAt).toLocaleDateString()}</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {[
                { id: 'STARTER', label: 'Starter', price: '₹1,999', calls: '20', members: '5' },
                { id: 'GROWTH', label: 'Growth', price: '₹3,499', calls: '75', members: '15', featured: true },
                { id: 'PRO', label: 'Pro', price: '₹5,999', calls: '200', members: 'Unlimited' },
              ].map((plan) => (
                <div key={plan.id} className={`card p-5 flex flex-col ${plan.featured ? 'ring-1 ring-primary' : ''}`}>
                  {plan.featured && <span className="text-xs font-semibold text-primary mb-2">Recommended</span>}
                  <h5 className="font-semibold text-sm">{plan.label}</h5>
                  <p className="text-2xl font-semibold mt-2">{plan.price}<span className="text-xs text-muted font-normal">/mo</span></p>
                  <ul className="text-xs text-muted space-y-1.5 mt-4 flex-1">
                    <li>{plan.calls} AI calls per month</li>
                    <li>{plan.members} team members</li>
                  </ul>
                  <button className={`mt-4 w-full ${plan.featured ? 'btn-primary' : 'btn-secondary'} text-xs`}>
                    Select {plan.label}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'webhooks' && (
          <div className="card p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /> Lead sources</h3>
            <div className="divide-y divide-border">
              {integrations.map((app) => (
                <div key={app.type} className="py-5 flex flex-col sm:flex-row justify-between gap-4 first:pt-0">
                  <div>
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      {app.name}
                      {app.connected && <Badge variant="active">Connected</Badge>}
                    </h4>
                    <p className="text-sm text-muted mt-1">{app.description}</p>
                    {app.connected && app.webhookUrl && (
                      <div className="mt-3 bg-muted-surface p-2.5 rounded-md border border-border flex items-center gap-2 max-w-md">
                        <span className="text-xs font-mono text-muted truncate">{app.webhookUrl}</span>
                        <button onClick={() => { navigator.clipboard.writeText(app.webhookUrl); toast.success('Copied.'); }}
                          className="text-muted hover:text-foreground flex-shrink-0"><Copy className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                  {!app.connected ? (
                    <button className="btn-secondary text-xs self-start">Connect</button>
                  ) : (
                    <button className="btn-danger text-xs self-start border border-danger/20">Disconnect</button>
                  )}
                </div>
              ))}
              {integrations.length === 0 && <p className="text-sm text-muted text-center py-8">No integrations configured.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
