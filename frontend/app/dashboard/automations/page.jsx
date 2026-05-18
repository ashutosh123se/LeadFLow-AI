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
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Zap className="w-6 h-6 text-indigo-400" /> Automation Workflows
          </h2>
          <p className="text-sm text-slate-400 mt-1">Configure multi-step trigger campaigns.</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-sm font-bold shadow-lg flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Create Workflow
        </button>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden min-h-[500px]">
        <div className="w-72 glass rounded-3xl border border-slate-900 overflow-hidden flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-slate-900 bg-slate-950/40 text-[10px] text-slate-500 uppercase tracking-widest font-bold">Active Campaigns</div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-900/60">
            {loading ? <div className="text-center py-10 text-xs text-slate-500 animate-pulse">Loading...</div>
              : automations.length > 0 ? automations.map((w) => (
              <div key={w.id} onClick={() => setActiveWorkflow(w)}
                className={`p-4 cursor-pointer hover:bg-slate-900/20 transition-all flex justify-between items-center ${activeWorkflow?.id === w.id ? 'bg-indigo-500/5' : ''}`}>
                <div className="overflow-hidden flex-1 mr-2">
                  <div className="font-bold text-xs truncate text-slate-200">{w.name}</div>
                  <div className="text-[9px] text-slate-500 mt-1">Trigger: {w.trigger?.type}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleToggle(w.id); }} className="text-slate-400">
                  {w.isActive ? <ToggleRight className="w-6 h-6 text-indigo-400" /> : <ToggleLeft className="w-6 h-6 text-slate-600" />}
                </button>
              </div>
            )) : <div className="text-center py-20 text-xs text-slate-600">No automations yet.</div>}
          </div>
        </div>

        <div className="flex-1 glass rounded-3xl border border-slate-900 overflow-y-auto p-8 bg-slate-950/20">
          {activeWorkflow ? (
            <div className="space-y-8">
              <div>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">{activeWorkflow.name}</h3>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${activeWorkflow.isActive ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-800 text-slate-500'}`}>
                    {activeWorkflow.isActive ? 'LIVE' : 'PAUSED'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Executions: <strong>{activeWorkflow.executionCount || 0}</strong></p>
              </div>
              <div className="space-y-6 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-900">
                <div className="relative">
                  <span className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-indigo-950" />
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Trigger Node</div>
                  <div className="glass p-4 rounded-xl border border-slate-800 text-xs text-slate-300 mt-2 font-bold max-w-sm">⚡ Lead Arrives / Captured in CRM</div>
                </div>
                {activeWorkflow.steps && activeWorkflow.steps.map((step, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-purple-500 ring-4 ring-purple-950" />
                    <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Step {idx + 1}</div>
                    <div className="glass p-4 rounded-xl border border-slate-800 mt-2 max-w-md flex gap-3.5 items-start">
                      {step.type === 'make_ai_call' && (<><div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400"><Bot className="w-4 h-4" /></div><div><h4 className="font-bold text-xs">Outbound AI Qualifier Call</h4><p className="text-[10px] text-slate-500 mt-1"><Clock className="inline w-3 h-3 mr-1" />Delayed {step.delay || 10}s</p></div></>)}
                      {step.type === 'send_whatsapp' && (<><div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400"><MessageSquare className="w-4 h-4" /></div><div><h4 className="font-bold text-xs">WhatsApp Template</h4><p className="text-[10px] text-slate-500 mt-1">{step.templateName}</p></div></>)}
                      {step.type === 'assign_lead' && (<><div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400"><UserCheck className="w-4 h-4" /></div><div><h4 className="font-bold text-xs">Assign Lead</h4><p className="text-[10px] text-slate-500 mt-1">Role: {step.role || 'AGENT'}</p></div></>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="text-center py-24 text-xs text-slate-700">Select a workflow to preview steps.</div>}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md p-8 rounded-3xl shadow-2xl space-y-6 border border-slate-800">
            <div>
              <h3 className="text-xl font-bold">Create Automation</h3>
              <p className="text-xs text-slate-400 mt-1">Triggers on new lead capture.</p>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Workflow Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Noida Real Estate Qualifier"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-4 text-sm focus:border-indigo-500 focus:outline-none text-slate-200" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 bg-slate-900 hover:bg-slate-800 font-semibold py-2.5 rounded-xl border border-slate-800 text-sm">Cancel</button>
                <button type="submit" className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 font-semibold py-2.5 rounded-xl text-sm">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
