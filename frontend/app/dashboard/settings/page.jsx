'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Bot, CreditCard, Layers, Loader2, Copy, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { PRICING_PLANS, formatInr, monthlyDisplayPrice } from '../../../lib/plans';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Badge } from '../../../components/ui/Badge';

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'ai-settings');
  const [loading, setLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(null);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [lang, setLang] = useState('hindi');
  const [voice, setVoice] = useState('meera');
  const [callingStart, setCallingStart] = useState('09:00');
  const [callingEnd, setCallingEnd] = useState('20:00');
  const [questions, setQuestions] = useState('');
  const [usage, setUsage] = useState(null);
  const [integrations, setIntegrations] = useState([]);
  const [billingInterval, setBillingInterval] = useState('monthly');

  const loadUsage = async () => {
    const useRes = await api.get('/billing/usage');
    if (useRes.success) setUsage(useRes.data);
  };

  useEffect(() => {
    (async () => {
      try {
        const [orgRes, intRes] = await Promise.all([
          api.get('/organizations'), api.get('/integrations'),
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
        if (intRes.success) setIntegrations(intRes.data);
        await loadUsage();
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

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

  const handleSelectPlan = async (planSlug) => {
    if (planSlug === 'ENTERPRISE') {
      window.location.href = 'mailto:sales@leadflow.ai?subject=LeadFlow-AI%20Enterprise';
      return;
    }
    setBillingLoading(planSlug);
    try {
      const endpoint = !usage?.razorpaySubId ? '/billing/subscribe' : '/billing/change-plan';
      const res = await api.post(endpoint, { planSlug, billingInterval });
      if (res.data?.paymentUrl) {
        window.location.href = res.data.paymentUrl;
      } else {
        toast.success(`Plan updated to ${planSlug}.`);
        await loadUsage();
      }
    } catch (err) {
      toast.error(err?.message || 'Billing update failed.');
    } finally {
      setBillingLoading(null);
    }
  };

  const tabs = [
    { id: 'ai-settings', label: 'AI dialer' },
    { id: 'billing', label: 'Billing' },
    { id: 'webhooks', label: 'Integrations' },
  ];

  const aiCalls = usage?.usage?.aiCalls;
  const usagePct = aiCalls?.limit ? Math.min(100, (aiCalls.used / aiCalls.limit) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Configure AI dialer, billing, and lead source integrations." />

      <div className="tab-bar">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`tab-item ${activeTab === t.id ? 'tab-item-active' : ''}`}>{t.label}</button>
        ))}
      </div>

      <div className="max-w-4xl">
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

        {activeTab === 'billing' && usage && (
          <div className="space-y-6">
            <div className="card p-6 space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-border">
                <h3 className="font-semibold flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> Current plan</h3>
                <Badge variant={usage.plan.isTrialing ? 'trial' : 'active'}>
                  {usage.plan.name}{usage.plan.isTrialing ? ' · Trial' : ''}
                </Badge>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted">{usage.plan.isTrialing ? 'Trial leads used' : 'AI leads used this cycle'}</span>
                  <span className="font-medium tabular-nums">{aiCalls.used} / {aiCalls.limit}</span>
                </div>
                <div className="w-full bg-muted-surface h-2 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${usagePct >= 90 ? 'bg-danger' : usagePct >= 80 ? 'bg-warning' : 'bg-primary'}`}
                    style={{ width: `${usagePct}%` }} />
                </div>
                {aiCalls.inOverage && (
                  <p className="text-xs text-muted mt-2">
                    Overage this cycle: {aiCalls.overageLeadsUsed} leads · ₹{formatInr(aiCalls.overageAmountPending)} pending invoice
                  </p>
                )}
                {usage.plan.overageRatePerLead > 0 && (
                  <p className="text-xs text-muted mt-1">Overage rate: ₹{usage.plan.overageRatePerLead}/lead beyond {aiCalls.planLimit} included leads</p>
                )}
                {usage.planExpiresAt && (
                  <p className="text-xs text-muted mt-2">Renews {new Date(usage.planExpiresAt).toLocaleDateString()}</p>
                )}
              </div>
              {usage.upgradePrompt && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-warning-light border border-warning/20">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{usage.upgradePrompt.message}</p>
                    <p className="text-xs text-muted mt-1">Recommended: {usage.upgradePrompt.next} plan</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Billing cycle:</span>
              <div className="inline-flex segmented">
                <button type="button" onClick={() => setBillingInterval('monthly')}
                  className={`segmented-item ${billingInterval === 'monthly' ? 'segmented-item-active' : ''}`}>Monthly</button>
                <button type="button" onClick={() => setBillingInterval('annual')}
                  className={`segmented-item ${billingInterval === 'annual' ? 'segmented-item-active' : ''}`}>Annual · 15% off</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {PRICING_PLANS.map((plan) => {
                const isCurrent = usage.plan.slug === plan.slug;
                const displayPrice = monthlyDisplayPrice(plan, billingInterval);
                return (
                  <div key={plan.slug} className={`card p-5 flex flex-col ${plan.featured ? 'ring-1 ring-primary' : ''} ${isCurrent ? 'border-primary/40' : ''}`}>
                    {plan.featured && <span className="text-xs font-semibold text-primary mb-2">Recommended</span>}
                    {isCurrent && <span className="text-xs font-semibold text-muted mb-2">Current plan</span>}
                    <h5 className="font-semibold text-sm">{plan.name}</h5>
                    <p className="text-xl font-semibold mt-2">
                      {displayPrice != null ? `₹${formatInr(displayPrice)}` : 'Custom'}
                      {displayPrice != null && <span className="text-xs text-muted font-normal">/mo</span>}
                    </p>
                    <ul className="text-xs text-muted space-y-1.5 mt-4 flex-1">
                      <li>{plan.leads}</li>
                      <li>{plan.seats}</li>
                      <li>Overage: {plan.overage}</li>
                    </ul>
                    <button
                      type="button"
                      disabled={isCurrent || billingLoading === plan.slug}
                      onClick={() => handleSelectPlan(plan.slug)}
                      className={`mt-4 w-full text-xs ${plan.featured && !isCurrent ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {billingLoading === plan.slug && <Loader2 className="w-3 h-3 animate-spin inline mr-1" />}
                      {isCurrent ? 'Current plan' : plan.slug === 'ENTERPRISE' ? 'Contact sales' : `Switch to ${plan.name}`}
                    </button>
                  </div>
                );
              })}
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
