'use client';
import React, { useEffect, useState } from 'react';
import { Users, Search, PhoneCall, Send, Clock, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [scoreLabel, setScoreLabel] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [team, setTeam] = useState([]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ ...(search && { search }), ...(scoreLabel && { scoreLabel }) }).toString();
      const res = await api.get(`/leads?${query}`);
      if (res.success) setLeads(res.data);
    } catch { toast.error('Failed to fetch leads.'); }
    finally { setLoading(false); }
  };

  const fetchTeam = async () => {
    try { const res = await api.get('/users'); if (res.success) setTeam(res.data); } catch {}
  };

  useEffect(() => { fetchLeads(); fetchTeam(); }, [search, scoreLabel]);

  const handleSelectLead = async (lead) => {
    setSelectedLead(lead);
    try {
      const [ldRes, tlRes] = await Promise.all([api.get(`/leads/${lead.id}`), api.get(`/leads/${lead.id}/timeline`)]);
      if (ldRes.success) setSelectedLead(ldRes.data);
      if (tlRes.success) setTimeline(tlRes.data);
    } catch {}
  };

  const handleManualCall = async (leadId) => {
    try { await api.post(`/leads/${leadId}/call`); toast.success('AI qualifier call queued!'); }
    catch (err) { toast.error(err.message || 'Call failed.'); }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote) return;
    try {
      const res = await api.post(`/leads/${selectedLead.id}/notes`, { content: newNote });
      if (res.success) { toast.success('Note added!'); setNewNote(''); handleSelectLead(selectedLead); }
    } catch { toast.error('Failed to add note.'); }
  };

  const handleAssignAgent = async (agentId) => {
    try {
      await api.post(`/leads/${selectedLead.id}/assign`, { userId: agentId || null });
      toast.success('Lead assigned!');
      handleSelectLead(selectedLead);
      fetchLeads();
    } catch { toast.error('Assignment failed.'); }
  };

  return (
    <div className="space-y-8 relative h-full flex flex-col">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" /> Prospect Database
          </h2>
          <p className="text-sm text-slate-400 mt-1">Leads list, AI scores, call transcripts.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500"><Search className="w-4 h-4" /></span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs focus:border-indigo-500 focus:outline-none" />
        </div>
        <select value={scoreLabel} onChange={(e) => setScoreLabel(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-400 focus:border-indigo-500 focus:outline-none">
          <option value="">All Labels</option>
          <option value="HOT">🔥 Hot</option>
          <option value="WARM">⚡ Warm</option>
          <option value="COLD">❄️ Cold</option>
        </select>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden min-h-[400px]">
        <div className="flex-1 glass rounded-3xl border border-slate-900 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/60 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Source</th>
                  <th className="py-4 px-6">AI Score</th>
                  <th className="py-4 px-6">Assigned</th>
                  <th className="py-4 px-6">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-xs">
                {loading ? (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-500 animate-pulse">Loading...</td></tr>
                ) : leads.length > 0 ? leads.map((item) => (
                  <tr key={item.id} onClick={() => handleSelectLead(item)}
                    className={`hover:bg-slate-900/40 cursor-pointer transition-all ${selectedLead?.id === item.id ? 'bg-indigo-500/5' : ''}`}>
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-100">{item.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.phone}</div>
                    </td>
                    <td className="py-4 px-6"><span className="bg-slate-900 text-slate-400 font-bold px-2 py-0.5 rounded text-[10px]">{item.source}</span></td>
                    <td className="py-4 px-6">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        item.scoreLabel === 'HOT' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        item.scoreLabel === 'WARM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-850 text-slate-500'
                      }`}>{item.scoreLabel ? `${item.scoreLabel} (${item.score}/100)` : 'PENDING'}</span>
                    </td>
                    <td className="py-4 px-6 text-slate-400">{item.assignedTo?.name || 'Unassigned'}</td>
                    <td className="py-4 px-6 text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-600">No leads match filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedLead && (
          <div className="w-[400px] glass rounded-3xl border border-slate-900 flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-900 bg-slate-950/60">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-extrabold text-base">{selectedLead.name}</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">{selectedLead.phone}</p>
                </div>
                <button onClick={() => setSelectedLead(null)} className="text-slate-500 hover:text-slate-300 text-xs">Close</button>
              </div>
              <button onClick={() => handleManualCall(selectedLead.id)}
                className="w-full mt-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-[11px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1">
                <PhoneCall className="w-3.5 h-3.5" /> Trigger AI Qualifier Call
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedLead.scoreLabel && (
                <div className="glass p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-2">
                  <div className="text-xs font-bold text-indigo-300 flex items-center gap-1">
                    <Sparkles className="w-4 h-4" /> AI Extracted Intent
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300">
                    <div><span className="block text-slate-500 uppercase font-semibold">Budget</span><strong>{selectedLead.budget || 'N/A'}</strong></div>
                    <div><span className="block text-slate-500 uppercase font-semibold">Timeline</span><strong>{selectedLead.timeline || 'N/A'}</strong></div>
                    <div className="col-span-2"><span className="block text-slate-500 uppercase font-semibold">Requirement</span><strong>{selectedLead.requirement || 'N/A'}</strong></div>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Assign Rep</label>
                <select value={selectedLead.assignedToId || ''} onChange={(e) => handleAssignAgent(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none">
                  <option value="">Unassigned</option>
                  {team.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.role})</option>)}
                </select>
              </div>
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Timeline</h4>
                <div className="space-y-3">
                  {timeline.map((act) => (
                    <div key={act.id} className="flex gap-2 text-[10px] items-start border-l border-slate-900 pl-3">
                      <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <div>
                        <div className="text-slate-300">{act.description}</div>
                        <span className="text-slate-600">{new Date(act.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                  {timeline.length === 0 && <p className="text-xs text-slate-600">No activity yet.</p>}
                </div>
              </div>
            </div>
            <form onSubmit={handleAddNote} className="p-4 border-t border-slate-900 bg-slate-950/60 flex gap-2">
              <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add note..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-2 px-4 text-xs focus:border-indigo-500 focus:outline-none" />
              <button type="submit" className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
