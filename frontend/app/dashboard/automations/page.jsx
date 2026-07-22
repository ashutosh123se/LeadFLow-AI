'use client';
import React, { useEffect, useState } from 'react';
import { Zap, Plus, ToggleLeft, ToggleRight, Bot, MessageSquare, Clock, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';

export default function AutomationsPage() {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState(null);
  const [name, setName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const fetchAutomations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/automation');
      if (res.success) { setAutomations(res.data); if (res.data.length > 0 && !activeWorkflow) setActiveWorkflow(res.data[0]); }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchAutomations(); }, []);

  const handleToggle = async (id) => {
    try {
      const res = await api.post(`/automation/${id}/toggle`);
      if (res.success) { toast.success('Workflow toggled!'); fetchAutomations(); }
    } catch { toast.error('Toggle failed.'); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name) return;
    try {
      const res = await api.post('/automation', { name, trigger: { type: 'new_lead_created' }, steps: [{ type: 'make_ai_call', delay: 15 }] });
      if (res.success) { toast.success('Workflow created!'); setName(''); setShowCreate(false); fetchAutomations(); }
    } catch { toast.error('Creation failed.'); }
  };

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Zap className="w-6 h-6 text-gold" /> Automation Workflows
          </h2>
          <p className="text-sm text-stone mt-1">Configure multi-step trigger campaigns.</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2.5 rounded-xl bg-gold hover:bg-gold-light text-ink text-sm font-bold shadow-lg flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Create Workflow
        </button>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden min-h-[500px]">
        <div className="w-72 glass rounded-lg border border-line overflow-hidden flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-line bg-surface text-[10px] text-stone-400 uppercase tracking-wide font-bold">Active Campaigns</div>
          <div className="flex-1 overflow-y-auto divide-y divide-line/60">
            {loading ? <div className="text-center py-10 text-xs text-stone-400 animate-pulse">Loading...</div>
              : automations.length > 0 ? automations.map((w) => (
              <div key={w.id} onClick={() => setActiveWorkflow(w)}
                className={`p-4 cursor-pointer hover:bg-canvas/20 transition-all flex justify-between items-center ${activeWorkflow?.id === w.id ? 'bg-gold/5' : ''}`}>
                <div className="overflow-hidden flex-1 mr-2">
                  <div className="font-bold text-xs truncate text-cream">{w.name}</div>
                  <div className="text-[9px] text-stone-400 mt-1">Trigger: {w.trigger?.type}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleToggle(w.id); }} className="text-stone">
                  {w.isActive ? <ToggleRight className="w-6 h-6 text-gold" /> : <ToggleLeft className="w-6 h-6 text-stone-600" />}
                </button>
              </div>
            )) : <div className="text-center py-20 text-xs text-stone-600">No automations yet.</div>}
          </div>
        </div>

        <div className="flex-1 glass rounded-lg border border-line overflow-y-auto p-8 bg-surface">
          {activeWorkflow ? (
            <div className="space-y-8">
              <div>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">{activeWorkflow.name}</h3>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${activeWorkflow.isActive ? 'bg-gold-muted text-gold border border-gold/20' : 'bg-surface text-stone-400'}`}>
                    {activeWorkflow.isActive ? 'LIVE' : 'PAUSED'}
                  </span>
                </div>
                <p className="text-xs text-stone mt-1">Executions: <strong>{activeWorkflow.executionCount || 0}</strong></p>
              </div>
              <div className="space-y-6 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-canvas">
                <div className="relative">
                  <span className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-gold ring-4 ring-ink" />
                  <div className="text-[10px] font-bold font-medium text-gold">Trigger Node</div>
                  <div className="glass p-4 rounded-xl border border-line text-xs text-stone-400 mt-2 font-bold max-w-sm">⚡ Lead Arrives / Captured in CRM</div>
                </div>
                {activeWorkflow.steps && activeWorkflow.steps.map((step, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-sage ring-4 ring-ink" />
                    <div className="text-[10px] font-bold font-medium text-sage-light">Step {idx + 1}</div>
                    <div className="glass p-4 rounded-xl border border-line mt-2 max-w-md flex gap-3.5 items-start">
                      {step.type === 'make_ai_call' && (<><div className="w-8 h-8 rounded-lg bg-gold-muted flex items-center justify-center text-gold"><Bot className="w-4 h-4" /></div><div><h4 className="font-bold text-xs">Outbound AI Qualifier Call</h4><p className="text-[10px] text-stone-400 mt-1"><Clock className="inline w-3 h-3 mr-1" />Delayed {step.delay || 10}s</p></div></>)}
                      {step.type === 'send_whatsapp' && (<><div className="w-8 h-8 rounded-lg bg-sage-muted flex items-center justify-center text-sage-light"><MessageSquare className="w-4 h-4" /></div><div><h4 className="font-bold text-xs">WhatsApp Template</h4><p className="text-[10px] text-stone-400 mt-1">{step.templateName}</p></div></>)}
                      {step.type === 'assign_lead' && (<><div className="w-8 h-8 rounded-lg bg-sage-muted flex items-center justify-center text-sage-light"><UserCheck className="w-4 h-4" /></div><div><h4 className="font-bold text-xs">Assign Lead</h4><p className="text-[10px] text-stone-400 mt-1">Role: {step.role || 'AGENT'}</p></div></>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="text-center py-24 text-xs text-stone-600">Select a workflow to preview steps.</div>}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deep/50 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md p-8 rounded-lg shadow-2xl space-y-6 border border-line">
            <div>
              <h3 className="text-xl font-bold">Create Automation</h3>
              <p className="text-xs text-stone mt-1">Triggers on new lead capture.</p>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold font-medium text-stone mb-2">Workflow Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Noida Real Estate Qualifier"
                  className="w-full bg-canvas border border-line rounded-xl py-2.5 px-4 text-sm focus:border-gold focus:outline-none text-cream" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 bg-canvas hover:bg-surface font-semibold py-2.5 rounded-xl border border-line text-sm">Cancel</button>
                <button type="submit" className="flex-1 bg-gold text-ink font-semibold py-2.5 rounded-xl text-sm">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
