'use client';

import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Sparkles, Calendar, User, Kanban, Eye, SlidersHorizontal, 
  Search, Phone, X, Save, Trash2, CheckCircle2, AlertCircle, 
  FileText, MessageSquare, ChevronRight, Play, Loader2, IndianRupee 
} from 'lucide-react';
import toast from 'react-hot-toast';
import useLeadStore from '../../../store/leadStore';
import { api, isDemoMode } from '../../../lib/api';
import { DEMO_TEAM, getDemoLeadById } from '../../../lib/demoData';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Badge } from '../../../components/ui/Badge';

export default function PipelinePage() {
  const { stages, fetchKanbanBoard, moveLeadStage, updateLead, loading } = useLeadStore();
  const [mounted, setMounted] = useState(false);
  
  // Layout and filter states
  const [viewMode, setViewMode] = useState('comfortable'); // 'comfortable' or 'compact'
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [scoreFilter, setScoreFilter] = useState('ALL');
  const [minBudget, setMinBudget] = useState('');

  // Slide-over states
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [leadDetail, setLeadDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState('details'); // 'details', 'ai', 'integrations'
  
  // Team members (for assignment)
  const [teamMembers, setTeamMembers] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    budget: '',
    requirement: '',
    status: '',
    assignedToId: ''
  });
  const [savingDetail, setSavingDetail] = useState(false);
  const [triggeringCall, setTriggeringCall] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchKanbanBoard();
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    if (isDemoMode()) {
      setTeamMembers(DEMO_TEAM);
      return;
    }
    try {
      const res = await api.get('/users');
      if (res.success) {
        setTeamMembers(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch team members', err);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    const { draggableId, source, destination } = result;
    if (source.droppableId === destination.droppableId) return;

    try {
      await moveLeadStage(draggableId, destination.droppableId);
      toast.success('Stage updated successfully');
    } catch (err) {
      toast.error('Failed to move lead');
    }
  };

  // Fetch detailed lead information
  const openLeadDetail = async (leadId) => {
    setSelectedLeadId(leadId);
    setIsSlideOverOpen(true);
    setLoadingDetail(true);
    setDetailTab('details');

    if (isDemoMode()) {
      const demoLead = getDemoLeadById(leadId);
      if (demoLead) {
        setLeadDetail(demoLead);
        setFormData({
          name: demoLead.name || '',
          phone: demoLead.phone || '',
          email: demoLead.email || '',
          budget: demoLead.budget || '',
          requirement: demoLead.requirement || '',
          status: demoLead.status || 'NEW',
          assignedToId: demoLead.assignedTo?.id || '',
        });
      }
      setLoadingDetail(false);
      return;
    }

    try {
      const res = await api.get(`/leads/${leadId}`);
      if (res.success) {
        setLeadDetail(res.data);
        setFormData({
          name: res.data.name || '',
          phone: res.data.phone || '',
          email: res.data.email || '',
          budget: res.data.budget || '',
          requirement: res.data.requirement || '',
          status: res.data.status || 'NEW',
          assignedToId: res.data.assignedToId || ''
        });
      }
    } catch (err) {
      toast.error('Failed to load lead details');
      setIsSlideOverOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (!selectedLeadId) return;
    setSavingDetail(true);
    try {
      const updatePayload = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null
      };
      const res = await api.patch(`/leads/${selectedLeadId}`, updatePayload);
      if (res.success) {
        toast.success('Lead updated successfully');
        // Update local store state
        updateLead(res.data);
        setLeadDetail(res.data);
        fetchKanbanBoard(); // Refresh column metrics
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update lead');
    } finally {
      setSavingDetail(false);
    }
  };

  const handleTriggerManualCall = async () => {
    if (!selectedLeadId) return;
    setTriggeringCall(true);
    try {
      const res = await api.post(`/leads/${selectedLeadId}/call`);
      if (res.success) {
        toast.success('AI outbound voice dial initiated!');
        // Refresh detail tab
        setTimeout(() => openLeadDetail(selectedLeadId), 1500);
      }
    } catch (err) {
      toast.error(err.message || 'Outbound dial request failed.');
    } finally {
      setTriggeringCall(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!selectedLeadId || !confirm('Are you sure you want to delete this lead? This action is permanent.')) return;
    try {
      const res = await api.delete(`/leads/${selectedLeadId}`);
      if (res.success) {
        toast.success('Lead deleted');
        setIsSlideOverOpen(false);
        fetchKanbanBoard(); // Refresh board
      }
    } catch (err) {
      toast.error('Failed to delete lead');
    }
  };

  // Filter logic
  const getFilteredLeads = (leads = []) => {
    return leads.filter(lead => {
      const matchesSearch = 
        lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone?.includes(searchTerm) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSource = sourceFilter === 'ALL' || lead.source === sourceFilter;
      
      const matchesScore = 
        scoreFilter === 'ALL' || 
        (scoreFilter === 'HOT' && lead.scoreLabel === 'HOT') ||
        (scoreFilter === 'WARM' && lead.scoreLabel === 'WARM') ||
        (scoreFilter === 'COLD' && (!lead.scoreLabel || lead.scoreLabel === 'COLD'));

      const matchesBudget = !minBudget || (lead.budget && lead.budget >= parseFloat(minBudget));

      return matchesSearch && matchesSource && matchesScore && matchesBudget;
    });
  };

  // Calculations for Column Metrics
  const getColumnBudgetSum = (leads = []) => {
    return leads.reduce((sum, lead) => sum + (lead.budget || 0), 0);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 h-full flex flex-col relative overflow-hidden">
      <PageHeader
        title="Pipeline"
        description="Manage lead stages, qualification status, and team assignments."
        action={
          <div className="flex items-center gap-3">
            <button onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary text-xs ${showFilters ? 'ring-1 ring-primary' : ''}`}>
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </button>
            <div className="segmented">
              <button onClick={() => setViewMode('comfortable')}
                className={`segmented-item ${viewMode === 'comfortable' ? 'segmented-item-active' : ''}`}>Comfortable</button>
              <button onClick={() => setViewMode('compact')}
                className={`segmented-item ${viewMode === 'compact' ? 'segmented-item-active' : ''}`}>Compact</button>
            </div>
          </div>
        }
      />

      {/* Filters Form Panel */}
      {showFilters && (
        <div className="card p-4 grid grid-cols-1 sm:grid-cols-4 gap-4 flex-shrink-0">
          <div>
            <label className="label">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, phone, email..." className="input pl-9" />
            </div>
          </div>
          <div>
            <label className="label">Source</label>
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="select">
              <option value="ALL">All sources</option>
              <option value="WEBSITE_FORM">Website</option>
              <option value="INDIAMART">IndiaMART</option>
              <option value="JUSTDIAL">JustDial</option>
              <option value="FACEBOOK">Facebook</option>
              <option value="ZAPIER">Zapier</option>
            </select>
          </div>
          <div>
            <label className="label">Lead score</label>
            <select value={scoreFilter} onChange={(e) => setScoreFilter(e.target.value)} className="select">
              <option value="ALL">All scores</option>
              <option value="HOT">Hot</option>
              <option value="WARM">Warm</option>
              <option value="COLD">Cold</option>
            </select>
          </div>
          <div>
            <label className="label">Min budget (₹)</label>
            <input type="number" value={minBudget} onChange={(e) => setMinBudget(e.target.value)}
              placeholder="e.g. 10000" className="input" />
          </div>
        </div>
      )}

      {/* Kanban Board DND Context */}
      <div className="flex-1 overflow-hidden">
        {loading && !stages.length ? (
          <div className="flex flex-col items-center justify-center h-96 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-stone-400 text-xs font-semibold">Loading pipeline details...</span>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-6 items-start h-full pb-4 overflow-x-auto select-none">
              {stages && stages.map((stage) => {
                const filteredLeads = getFilteredLeads(stage.leads || []);
                const budgetSum = getColumnBudgetSum(filteredLeads);

                return (
                  <Droppable key={stage.id} droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`w-80 max-h-full flex flex-col rounded-lg border transition-colors flex-shrink-0 overflow-hidden ${
                          snapshot.isDraggingOver ? 'border-primary bg-primary-light/30' : 'border-border bg-muted-surface/50'
                        }`}
                      >
                        {/* Stage Header */}
                        <div className="p-4 border-b border-border flex justify-between items-center bg-card">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color || '#1E40AF' }} />
                              <h3 className="font-semibold text-sm">{stage.name}</h3>
                            </div>
                            <div className="text-xs text-muted mt-1 flex items-center gap-1">
                              <IndianRupee className="w-3 h-3" />
                              <span>{budgetSum.toLocaleString('en-IN')} est.</span>
                            </div>
                          </div>
                          <span className="text-xs bg-muted-surface border border-border font-medium px-2 py-0.5 rounded-full tabular-nums">
                            {filteredLeads.length}
                          </span>
                        </div>

                        {/* Leads Cards Box */}
                        <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[300px]">
                          {filteredLeads.length > 0 ? (
                            filteredLeads.map((lead, index) => (
                              <Draggable key={lead.id} draggableId={lead.id} index={index}>
                                {(dragProvided, dragSnapshot) => (
                                  <div 
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    onClick={() => openLeadDetail(lead.id)}
                                    className={`card cursor-pointer transition-all hover:shadow-card ${
                                      dragSnapshot.isDragging ? 'kanban-card-dragging scale-[1.02]' : ''
                                    } ${viewMode === 'comfortable' ? 'p-4 space-y-3' : 'p-2.5 space-y-1'}`}
                                  >
                                    <div className="flex justify-between items-start gap-2">
                                      <Badge variant={lead.scoreLabel || 'COLD'}>{lead.scoreLabel || 'Cold'}</Badge>
                                      {lead.score !== undefined && (
                                        <span className="text-xs font-medium text-muted tabular-nums">{lead.score}</span>
                                      )}
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-sm truncate">{lead.name}</h4>
                                      {viewMode === 'comfortable' && lead.requirement && (
                                        <p className="text-[10px] text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                                          {lead.requirement}
                                        </p>
                                      )}
                                    </div>

                                    {viewMode === 'comfortable' && (
                                      <div className="border-t border-line/60 pt-3 flex justify-between items-center text-[9px] text-stone-400">
                                        <div className="flex items-center gap-1">
                                          <Calendar className="w-3 h-3 text-stone-600" />
                                          <span>{new Date(lead.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                                        </div>
                                        {lead.budget && (
                                          <span className="font-semibold text-stone">
                                            ₹{lead.budget.toLocaleString('en-IN')}
                                          </span>
                                        )}
                                        <div className="w-5 h-5 rounded-full bg-canvas border border-line flex items-center justify-center text-[9px] font-semibold text-stone-400">
                                          {lead.assignedTo?.name ? lead.assignedTo.name.charAt(0).toUpperCase() : <User className="w-2.5 h-2.5 text-stone-600" />}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            ))
                          ) : (
                            <div className="text-center text-[11px] text-stone-600 py-16 border-2 border-dashed border-line/40 rounded-xl">
                              No leads captured here.
                            </div>
                          )}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </div>

      {/* Slide-over Detail Panel */}
      {isSlideOverOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setIsSlideOverOpen(false)} className="panel-overlay" />
          <div className="panel-slide max-w-xl animate-in slide-in-from-right duration-300">
            <div className="p-5 border-b border-border flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={leadDetail?.scoreLabel || 'COLD'}>{leadDetail?.scoreLabel || 'Cold'}</Badge>
                  <span className="text-xs text-muted">Source: {leadDetail?.source}</span>
                </div>
                <h3 className="text-lg font-semibold mt-1.5">
                  {loadingDetail ? 'Loading...' : leadDetail?.name}
                </h3>
              </div>
              <button onClick={() => setIsSlideOverOpen(false)} className="btn-ghost p-1"><X className="w-5 h-5" /></button>
            </div>

            {/* Quick Actions Panel */}
            {!loadingDetail && leadDetail && (
              <div className="px-5 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
                <button onClick={handleTriggerManualCall} disabled={triggeringCall}
                  className="btn-primary flex-1 text-xs">
                  {triggeringCall ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Schedule qualifier call
                </button>
                <button onClick={handleDeleteLead} className="btn-ghost border border-border text-danger" title="Delete lead">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Tabs Selector */}
            {!loadingDetail && (
              <div className="tab-bar px-5 flex-shrink-0">
                {['details', 'ai', 'integrations'].map((tab) => (
                  <button key={tab} onClick={() => setDetailTab(tab)}
                    className={`tab-item capitalize ${detailTab === tab ? 'tab-item-active' : ''}`}>
                    {tab === 'ai' ? 'AI outcomes' : tab === 'integrations' ? 'Webhooks' : 'Details'}
                  </button>
                ))}
              </div>
            )}

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDetail ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <span className="text-stone-400 text-xs">Fetching active telemetry...</span>
                </div>
              ) : leadDetail ? (
                <>
                  {/* TAB 1: DETAILS PROFILE FORM */}
                  {detailTab === 'details' && (
                    <form onSubmit={handleSaveDetails} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-stone-400 uppercase">Lead Name</label>
                          <input 
                            type="text" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required
                            className="input text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-stone-400 uppercase">Phone Number</label>
                          <input 
                            type="text" 
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            required
                            className="input text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-stone-400 uppercase">Email Address</label>
                          <input 
                            type="email" 
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className="input text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-stone-400 uppercase">Inquiry Budget (₹)</label>
                          <input 
                            type="number" 
                            value={formData.budget}
                            onChange={(e) => setFormData({...formData, budget: e.target.value})}
                            className="input text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-stone-400 uppercase">CRM Stage</label>
                          <select 
                            value={leadDetail.stageId}
                            onChange={async (e) => {
                              try {
                                await moveLeadStage(leadDetail.id, e.target.value);
                                toast.success('Stage updated');
                                setLeadDetail({...leadDetail, stageId: e.target.value});
                              } catch {
                                toast.error('Update failed');
                              }
                            }}
                            className="select text-sm"
                          >
                            {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-stone-400 uppercase">Lead Qualification Status</label>
                          <select 
                            value={formData.status}
                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                            className="select text-sm"
                          >
                            <option value="NEW">New Capture</option>
                            <option value="CONTACTED">AI Contacted</option>
                            <option value="QUALIFIED">Qualified Match</option>
                            <option value="UNQUALIFIED">Unqualified Lead</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-stone-400 uppercase">Assigned To</label>
                        <select 
                          value={formData.assignedToId}
                          onChange={(e) => setFormData({...formData, assignedToId: e.target.value})}
                          className="select text-sm"
                        >
                          <option value="">Unassigned</option>
                          {teamMembers.map(user => (
                            <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-stone-400 uppercase">Inquiry Requirement Notes</label>
                        <textarea 
                          rows={4}
                          value={formData.requirement}
                          onChange={(e) => setFormData({...formData, requirement: e.target.value})}
                          className="input text-sm"
                          style={{ resize: 'none' }}
                        />
                      </div>

                      <button 
                        type="submit" 
                        disabled={savingDetail}
                        className="btn-primary w-full text-xs"
                      >
                        {savingDetail ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save Changes
                      </button>
                    </form>
                  )}

                  {/* TAB 2: AI VOICE QUALIFY TELEMETRY */}
                  {detailTab === 'ai' && (
                    <div className="space-y-6">
                      {/* AI Score Radial Box */}
                      <div className="card p-5 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold text-muted uppercase tracking-wide">AI score</span>
                          <div className="text-2xl font-semibold mt-1 flex items-baseline gap-1 tabular-nums">
                            <span>{leadDetail.score || '—'}</span>
                            <span className="text-xs text-muted">/100</span>
                          </div>
                        </div>
                        <Badge variant={leadDetail.scoreLabel || 'COLD'}>{leadDetail.scoreLabel || 'Cold'}</Badge>
                      </div>

                      {/* Call Telemetry Summary */}
                      {leadDetail.calls && leadDetail.calls.length > 0 ? (
                        leadDetail.calls.map((call) => (
                          <div key={call.id} className="card p-5 space-y-4">
                            <div className="flex justify-between items-center border-b border-line/60 pb-3">
                              <div>
                                <span className="text-[10px] font-bold text-stone-400 uppercase">Dial ID: {call.exotelCallId || call.id.substring(0,8)}</span>
                                <div className="text-[11px] font-bold text-stone-400 mt-0.5">
                                  Duration: {call.duration || 0}s | Status: <span className="text-primary uppercase">{call.status}</span>
                                </div>
                              </div>
                              <span className="text-[10px] text-stone-400">{new Date(call.createdAt).toLocaleString('en-IN')}</span>
                            </div>

                            {/* GPT summary card */}
                            {call.summary && (
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-stone-400 font-medium">AI Generated Summary</span>
                                <p className="text-xs text-stone-400 leading-relaxed bg-canvas/40 p-3 rounded-xl border border-line/50">
                                  {call.summary}
                                </p>
                              </div>
                            )}

                            {/* Transcripts dialogue */}
                            {call.transcript && (
                              <div className="space-y-2">
                                <span className="text-[9px] font-bold text-stone-400 font-medium">Call Transcript</span>
                                <div className="space-y-2 bg-canvas/20 p-3 rounded-xl border border-line/30 max-h-48 overflow-y-auto text-xs">
                                  {Array.isArray(call.transcript) ? (
                                    call.transcript.map((t, i) => (
                                      <div key={i} className={`flex flex-col ${t.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <span className="text-[8px] text-stone-400 font-medium font-bold mb-0.5">
                                          {t.role === 'user' ? 'Customer' : 'AI Agent'}
                                        </span>
                                        <div className={`p-2 rounded-md max-w-[85%] text-xs ${
                                          t.role === 'user' ? 'bg-primary-light border border-primary/10' : 'bg-muted-surface border border-border'
                                        }`}>
                                          {t.text}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-stone whitespace-pre-wrap">{call.transcript}</p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Audio Playback Link */}
                            {call.recordingUrl && (
                              <div className="pt-2">
                                <audio controls src={call.recordingUrl} className="w-full h-8" />
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-8 border border-dashed border-line text-center rounded-lg space-y-3">
                          <Phone className="w-8 h-8 text-stone-600 mx-auto" />
                          <p className="text-xs text-stone-400">No outbound AI voice qual dial has been logged yet.</p>
                          <button onClick={handleTriggerManualCall} disabled={triggeringCall} className="btn-primary text-xs px-4 py-2">
                            Schedule qualifier call
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: INBOUND WEBHOOK INTEGRATIONS */}
                  {detailTab === 'integrations' && (
                    <div className="space-y-4">
                      <div className="card p-4 space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-success" /> Capture endpoint
                        </h4>
                        <p className="text-xs text-muted">Route leads from custom web forms into this account.</p>
                        <div className="bg-muted-surface p-3 rounded-md border border-border overflow-x-auto text-xs font-mono text-primary whitespace-nowrap">
                          POST {process.env.NEXT_PUBLIC_API_URL || 'https://api.leadflowai.com/api/v1'}/capture/{localStorage.getItem('orgToken') || 'ORG_TOKEN'}
                        </div>
                      </div>

                      <div className="card p-4 space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-primary" /> Sample payload
                        </h4>
                        <p className="text-xs text-muted">Forms must submit JSON with the required fields.</p>
                        <pre className="bg-muted-surface p-3 rounded-md border border-border text-xs font-mono text-muted overflow-x-auto">
{`{
  "name": "Arjun Kumar",
  "phone": "+919988776655",
  "email": "arjun@gmail.com",
  "requirement": "Interested in 3BHK flat",
  "budget": 8500000,
  "consentGiven": true
}`}
                        </pre>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
