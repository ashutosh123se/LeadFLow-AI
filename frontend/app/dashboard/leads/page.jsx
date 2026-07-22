'use client';

import React, { useEffect, useState } from 'react';
import { Search, PhoneCall, Send, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { getAllDemoLeads, DEMO_TEAM } from '../../../lib/demoData';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Badge } from '../../../components/ui/Badge';

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [scoreLabel, setScoreLabel] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [team, setTeam] = useState([]);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      let data = getAllDemoLeads();
      if (search) {
        const q = search.toLowerCase();
        data = data.filter((l) => l.name?.toLowerCase().includes(q) || l.phone?.includes(q));
      }
      if (scoreLabel) data = data.filter((l) => l.scoreLabel === scoreLabel);
      setLeads(data);
      setLoading(false);
    }, 200);
    setTeam(DEMO_TEAM);
  }, [search, scoreLabel]);

  const handleSelectLead = (lead) => {
    setSelectedLead(lead);
    setTimeline([
      { id: 1, description: 'Lead captured via website', createdAt: lead.createdAt },
      { id: 2, description: 'AI qualifier call queued', createdAt: new Date(new Date(lead.createdAt).getTime() + 10000).toISOString() },
      { id: 3, description: 'Call completed. Intent extracted.', createdAt: new Date(new Date(lead.createdAt).getTime() + 50000).toISOString() },
    ]);
  };

  const handleManualCall = () => toast.success('AI qualifier call queued.');
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote) return;
    try {
      const res = await api.post(`/leads/${selectedLead.id}/notes`, { content: newNote });
      if (res.success) { toast.success('Note added.'); setNewNote(''); handleSelectLead(selectedLead); }
    } catch { toast.error('Failed to add note.'); }
  };

  const handleAssignAgent = async (agentId) => {
    try {
      await api.post(`/leads/${selectedLead.id}/assign`, { userId: agentId || null });
      toast.success('Lead assigned.');
      handleSelectLead(selectedLead);
    } catch { toast.error('Assignment failed.'); }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader title="Leads" description="Prospect database with AI scores and assignment status." />

      <div className="filter-row">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or phone..." className="input pl-9" />
        </div>
        <select value={scoreLabel} onChange={(e) => setScoreLabel(e.target.value)} className="select w-40">
          <option value="">All scores</option>
          <option value="HOT">Hot</option>
          <option value="WARM">Warm</option>
          <option value="COLD">Cold</option>
        </select>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden min-h-[420px]">
        <div className="flex-1 table-shell flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Source</th>
                  <th>Score</th>
                  <th>Assigned</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center text-muted py-12">Loading...</td></tr>
                ) : leads.length > 0 ? leads.map((item) => (
                  <tr key={item.id} onClick={() => handleSelectLead(item)}
                    className={`cursor-pointer ${selectedLead?.id === item.id ? 'row-selected' : ''}`}>
                    <td>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted mt-0.5">{item.phone}</p>
                    </td>
                    <td><Badge>{item.source}</Badge></td>
                    <td>
                      {item.scoreLabel
                        ? <Badge variant={item.scoreLabel}>{item.scoreLabel} ({item.score}/100)</Badge>
                        : <span className="text-xs text-muted">Pending</span>}
                    </td>
                    <td className="text-muted">{item.assignedTo?.name || 'Unassigned'}</td>
                    <td className="text-muted">{new Date(item.createdAt).toLocaleDateString()}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="text-center text-muted py-12">No leads match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedLead && (
          <div className="detail-panel">
            <div className="card-header">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-foreground">{selectedLead.name}</h3>
                  <p className="text-xs text-muted mt-0.5">{selectedLead.phone}</p>
                </div>
                <button onClick={() => setSelectedLead(null)} className="btn-ghost text-xs py-1 px-2">Close</button>
              </div>
              <button onClick={handleManualCall} className="btn-primary w-full mt-4 text-xs">
                <PhoneCall className="w-3.5 h-3.5" /> Schedule qualifier call
              </button>
            </div>

            <div className="flex-1 overflow-y-auto card-body space-y-5">
              {selectedLead.scoreLabel && (
                <div className="bg-primary-light/50 border border-primary/10 rounded-md p-4 space-y-3">
                  <p className="text-xs font-semibold text-primary">Extracted intent</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-muted block mb-0.5">Budget</span><span className="font-medium">{selectedLead.budget || 'N/A'}</span></div>
                    <div><span className="text-muted block mb-0.5">Timeline</span><span className="font-medium">{selectedLead.timeline || 'N/A'}</span></div>
                    <div className="col-span-2"><span className="text-muted block mb-0.5">Requirement</span><span className="font-medium">{selectedLead.requirement || 'N/A'}</span></div>
                  </div>
                </div>
              )}
              <div>
                <label className="label">Assigned representative</label>
                <select value={selectedLead.assignedToId || ''} onChange={(e) => handleAssignAgent(e.target.value)} className="select">
                  <option value="">Unassigned</option>
                  {team.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.role})</option>)}
                </select>
              </div>
              <div>
                <p className="label">Activity timeline</p>
                <div className="space-y-3">
                  {timeline.map((act) => (
                    <div key={act.id} className="flex gap-2 text-xs border-l-2 border-border pl-3">
                      <Clock className="w-3.5 h-3.5 text-muted flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-foreground">{act.description}</p>
                        <p className="text-muted mt-0.5">{new Date(act.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <form onSubmit={handleAddNote} className="p-4 border-t border-border flex gap-2">
              <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note..." className="input flex-1" />
              <button type="submit" className="btn-primary px-3"><Send className="w-4 h-4" /></button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
