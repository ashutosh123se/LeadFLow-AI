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
import { api } from '../../../lib/api';

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
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Kanban className="w-6 h-6 text-indigo-400" /> Lead Pipeline Board
          </h2>
          <p className="text-xs text-slate-400 mt-1">Manage speed-to-lead qualifications and pipeline velocity.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showFilters 
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' 
                : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>

          <div className="bg-slate-900/50 p-1 border border-slate-800 rounded-xl flex items-center gap-1">
            <button 
              onClick={() => setViewMode('comfortable')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'comfortable' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Comfortable
            </button>
            <button 
              onClick={() => setViewMode('compact')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'compact' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Compact
            </button>
          </div>
        </div>
      </div>

      {/* Filters Form Panel */}
      {showFilters && (
        <div className="p-5 glass border border-slate-800 rounded-2xl grid grid-cols-1 sm:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-200 flex-shrink-0">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, Phone, Email..." 
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs focus:border-indigo-500 focus:outline-none text-slate-200"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Source</label>
            <select 
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none text-slate-200"
            >
              <option value="ALL">All Sources</option>
              <option value="WEBSITE_FORM">Website Widget</option>
              <option value="INDIAMART">IndiaMART</option>
              <option value="JUSTDIAL">JustDial</option>
              <option value="FACEBOOK">Facebook Lead Ads</option>
              <option value="ZAPIER">Zapier</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Lead Score</label>
            <select 
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none text-slate-200"
            >
              <option value="ALL">All Scores</option>
              <option value="HOT">🔥 Hot (AI Qualified)</option>
              <option value="WARM">⚡ Warm</option>
              <option value="COLD">❄️ Cold</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Min Budget (₹)</label>
            <input 
              type="number" 
              value={minBudget}
              onChange={(e) => setMinBudget(e.target.value)}
              placeholder="e.g. 10000" 
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none text-slate-200"
            />
          </div>
        </div>
      )}

      {/* Kanban Board DND Context */}
      <div className="flex-1 overflow-hidden">
        {loading && !stages.length ? (
          <div className="flex flex-col items-center justify-center h-96 gap-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="text-slate-500 text-xs font-semibold">Loading pipeline details...</span>
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
                        className={`w-80 max-h-full flex flex-col bg-slate-950/40 rounded-2xl border transition-colors flex-shrink-0 overflow-hidden ${
                          snapshot.isDraggingOver ? 'border-indigo-500/50 bg-indigo-950/5' : 'border-slate-900 bg-slate-900/10'
                        }`}
                      >
                        {/* Stage Header */}
                        <div className="p-4 border-b border-slate-900 flex justify-between items-center bg-slate-950/20">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color || '#6366f1' }} />
                              <h3 className="font-bold text-sm text-slate-200">{stage.name}</h3>
                            </div>
                            <div className="text-[10px] text-indigo-400/80 font-semibold mt-1 flex items-center gap-1.5">
                              <IndianRupee className="w-3 h-3 text-indigo-500" />
                              <span>{budgetSum.toLocaleString('en-IN')} Est.</span>
                            </div>
                          </div>
                          <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded-full">
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
                                    className={`glass rounded-xl border text-left cursor-pointer transition-all hover:scale-[1.01] hover:border-slate-700/80 ${
                                      dragSnapshot.isDragging 
                                        ? 'border-indigo-500/70 shadow-2xl scale-[1.03] bg-indigo-950/30' 
                                        : 'border-slate-900/80 hover:bg-slate-900/10'
                                    } ${
                                      viewMode === 'comfortable' ? 'p-4 space-y-3' : 'p-2.5 space-y-1'
                                    }`}
                                  >
                                    <div className="flex justify-between items-start gap-2">
                                      <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                        lead.scoreLabel === 'HOT' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                        lead.scoreLabel === 'WARM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                                        'bg-slate-900 text-slate-500 border border-slate-800'
                                      }`}>
                                        {lead.scoreLabel || 'Cold'}
                                      </span>
                                      
                                      {lead.score !== undefined && (
                                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded-md">
                                          <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                                          {lead.score}
                                        </div>
                                      )}
                                    </div>

                                    <div>
                                      <h4 className="font-bold text-xs text-slate-100 hover:text-indigo-400 transition-colors truncate">
                                        {lead.name}
                                      </h4>
                                      {viewMode === 'comfortable' && lead.requirement && (
                                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                          {lead.requirement}
                                        </p>
                                      )}
                                    </div>

                                    {viewMode === 'comfortable' && (
                                      <div className="border-t border-slate-900/60 pt-3 flex justify-between items-center text-[9px] text-slate-500">
                                        <div className="flex items-center gap-1">
                                          <Calendar className="w-3 h-3 text-slate-600" />
                                          <span>{new Date(lead.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                                        </div>
                                        {lead.budget && (
                                          <span className="font-semibold text-slate-400">
                                            ₹{lead.budget.toLocaleString('en-IN')}
                                          </span>
                                        )}
                                        <div className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[9px] font-extrabold text-slate-300">
                                          {lead.assignedTo?.name ? lead.assignedTo.name.charAt(0).toUpperCase() : <User className="w-2.5 h-2.5 text-slate-600" />}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            ))
                          ) : (
                            <div className="text-center text-[11px] text-slate-700 py-16 border-2 border-dashed border-slate-900/40 rounded-xl">
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
          {/* Backdrop click closer */}
          <div 
            onClick={() => setIsSlideOverOpen(false)}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm cursor-pointer"
          />

          {/* Slide container */}
          <div className="relative w-full max-w-xl bg-slate-950 border-l border-slate-900 shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-300">
            {/* Slide Header */}
            <div className="p-6 border-b border-slate-900 bg-slate-950 flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    leadDetail?.scoreLabel === 'HOT' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-slate-900 text-slate-400'
                  }`}>
                    {leadDetail?.scoreLabel || 'Cold'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    Source: {leadDetail?.source}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1.5">
                  {loadingDetail ? 'Loading details...' : leadDetail?.name}
                </h3>
              </div>
              <button 
                onClick={() => setIsSlideOverOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Panel */}
            {!loadingDetail && leadDetail && (
              <div className="px-6 py-3 border-b border-slate-900 bg-slate-900/10 flex items-center gap-2 flex-shrink-0">
                <button 
                  onClick={handleTriggerManualCall}
                  disabled={triggeringCall}
                  className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors"
                >
                  {triggeringCall ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Trigger AI Voice Call
                </button>
                <button 
                  onClick={handleDeleteLead}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-colors"
                  title="Delete Lead"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Tabs Selector */}
            {!loadingDetail && (
              <div className="flex border-b border-slate-900 bg-slate-950 flex-shrink-0">
                <button 
                  onClick={() => setDetailTab('details')}
                  className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors ${detailTab === 'details' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                  Details Profile
                </button>
                <button 
                  onClick={() => setDetailTab('ai')}
                  className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors ${detailTab === 'ai' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                  AI Qualify Outcomes
                </button>
                <button 
                  onClick={() => setDetailTab('integrations')}
                  className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors ${detailTab === 'integrations' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                  Inbound Webhooks
                </button>
              </div>
            )}

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDetail ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                  <span className="text-slate-500 text-xs">Fetching active telemetry...</span>
                </div>
              ) : leadDetail ? (
                <>
                  {/* TAB 1: DETAILS PROFILE FORM */}
                  {detailTab === 'details' && (
                    <form onSubmit={handleSaveDetails} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Lead Name</label>
                          <input 
                            type="text" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Phone Number</label>
                          <input 
                            type="text" 
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            required
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                          <input 
                            type="email" 
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Inquiry Budget (₹)</label>
                          <input 
                            type="number" 
                            value={formData.budget}
                            onChange={(e) => setFormData({...formData, budget: e.target.value})}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">CRM Stage</label>
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
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                          >
                            {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Lead Qualification Status</label>
                          <select 
                            value={formData.status}
                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                          >
                            <option value="NEW">New Capture</option>
                            <option value="CONTACTED">AI Contacted</option>
                            <option value="QUALIFIED">Qualified Match</option>
                            <option value="UNQUALIFIED">Unqualified Lead</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Assigned To</label>
                        <select 
                          value={formData.assignedToId}
                          onChange={(e) => setFormData({...formData, assignedToId: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="">Unassigned</option>
                          {teamMembers.map(user => (
                            <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Inquiry Requirement Notes</label>
                        <textarea 
                          rows={4}
                          value={formData.requirement}
                          onChange={(e) => setFormData({...formData, requirement: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                          style={{ resize: 'none' }}
                        />
                      </div>

                      <button 
                        type="submit" 
                        disabled={savingDetail}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:bg-slate-800"
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
                      <div className="p-5 glass border border-slate-800 rounded-2xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">AI Hot Score</span>
                          <div className="text-2xl font-black text-white mt-1 flex items-baseline gap-1">
                            <span>{leadDetail.score || '--'}</span>
                            <span className="text-xs font-semibold text-slate-500">/100</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase ${
                            leadDetail.scoreLabel === 'HOT' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            leadDetail.scoreLabel === 'WARM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-slate-900 text-slate-500 border border-slate-800'
                          }`}>
                            {leadDetail.scoreLabel || 'Cold'}
                          </span>
                        </div>
                      </div>

                      {/* Call Telemetry Summary */}
                      {leadDetail.calls && leadDetail.calls.length > 0 ? (
                        leadDetail.calls.map((call) => (
                          <div key={call.id} className="p-5 glass border border-slate-800 rounded-2xl space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-900/60 pb-3">
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Dial ID: {call.exotelCallId || call.id.substring(0,8)}</span>
                                <div className="text-[11px] font-bold text-slate-300 mt-0.5">
                                  Duration: {call.duration || 0}s | Status: <span className="text-indigo-400 uppercase">{call.status}</span>
                                </div>
                              </div>
                              <span className="text-[10px] text-slate-500">{new Date(call.createdAt).toLocaleString('en-IN')}</span>
                            </div>

                            {/* GPT summary card */}
                            {call.summary && (
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">AI Generated Summary</span>
                                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-3 rounded-xl border border-slate-900/50">
                                  {call.summary}
                                </p>
                              </div>
                            )}

                            {/* Transcripts dialogue */}
                            {call.transcript && (
                              <div className="space-y-2">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Call Transcript</span>
                                <div className="space-y-2 bg-slate-900/20 p-3 rounded-xl border border-slate-900/30 max-h-48 overflow-y-auto text-xs">
                                  {Array.isArray(call.transcript) ? (
                                    call.transcript.map((t, i) => (
                                      <div key={i} className={`flex flex-col ${t.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <span className="text-[8px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">
                                          {t.role === 'user' ? 'Customer' : 'AI Agent'}
                                        </span>
                                        <div className={`p-2 rounded-lg max-w-[85%] ${
                                          t.role === 'user' ? 'bg-indigo-600/10 border border-indigo-500/20 text-slate-200' : 'bg-slate-800/40 border border-slate-700/20 text-slate-300'
                                        }`}>
                                          {t.text}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-slate-400 whitespace-pre-wrap">{call.transcript}</p>
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
                        <div className="p-8 border border-dashed border-slate-800 text-center rounded-2xl space-y-3">
                          <Phone className="w-8 h-8 text-slate-700 mx-auto" />
                          <p className="text-xs text-slate-500">No outbound AI voice qual dial has been logged yet.</p>
                          <button 
                            onClick={handleTriggerManualCall}
                            disabled={triggeringCall}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px]"
                          >
                            Dial Speed-to-Lead Call
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: INBOUND WEBHOOK INTEGRATIONS */}
                  {detailTab === 'integrations' && (
                    <div className="space-y-4">
                      <div className="bg-slate-900/20 border border-slate-800 p-4 rounded-xl space-y-2">
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Direct Capture Endpoint
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Route leads directly into this account from custom web forms.
                        </p>
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-900 overflow-x-auto text-[10px] font-mono text-indigo-300 whitespace-nowrap">
                          POST {process.env.NEXT_PUBLIC_API_URL || 'https://api.leadflowai.com/api/v1'}/capture/{localStorage.getItem('orgToken') || 'ORG_TOKEN'}
                        </div>
                      </div>

                      <div className="bg-slate-900/20 border border-slate-800 p-4 rounded-xl space-y-2">
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-indigo-400" />
                          JSON Sample Payload
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Your forms must submit a JSON object containing the required fields.
                        </p>
                        <pre className="bg-slate-950 p-3 rounded-lg border border-slate-900 text-[10px] font-mono text-slate-400 overflow-x-auto">
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
