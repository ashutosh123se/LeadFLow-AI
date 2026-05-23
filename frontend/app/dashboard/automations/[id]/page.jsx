'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Zap, ArrowLeft, Save, Plus, Trash2, Bot, MessageSquare, 
  Mail, Clock, UserCheck, Layers, Globe, Settings, Play, 
  Pause, Loader2, GripVertical, ChevronDown, Edit3 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../../lib/api';

export default function AutomationDetailBuilder() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id;

  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Builder interactive state
  const [steps, setSteps] = useState([]);
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState({ type: 'new_lead_created' });
  const [selectedStepIndex, setSelectedStepIndex] = useState(null);
  
  // Reference data
  const [stages, setStages] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    fetchWorkflowDetails();
    fetchReferenceData();
  }, [workflowId]);

  const fetchWorkflowDetails = async () => {
    if (!workflowId || workflowId === 'new') return;
    setLoading(true);
    try {
      const res = await api.get(`/automation/${workflowId}`);
      if (res.success) {
        setWorkflow(res.data);
        setName(res.data.name || '');
        setTrigger(res.data.trigger || { type: 'new_lead_created' });
        setSteps(res.data.steps || []);
      }
    } catch (err) {
      toast.error('Failed to load automation details.');
      router.push('/dashboard/automations');
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const [stagesRes, usersRes, templatesRes] = await Promise.all([
        api.get('/pipeline/board'),
        api.get('/users'),
        api.get('/whatsapp/templates')
      ]);
      if (stagesRes.success) setStages(stagesRes.data);
      if (usersRes.success) setTeamMembers(usersRes.data);
      if (templatesRes.success) setTemplates(templatesRes.data);
    } catch (err) {
      console.error('Failed fetching config metadata', err);
    }
  };

  // Toggle active status
  const handleToggleActive = async () => {
    if (!workflow) return;
    try {
      const res = await api.post(`/automation/${workflowId}/toggle`);
      if (res.success) {
        toast.success(`Workflow ${res.data.isActive ? 'activated' : 'paused'}`);
        setWorkflow({ ...workflow, isActive: res.data.isActive });
      }
    } catch {
      toast.error('Toggle status failed.');
    }
  };

  // Step drag-reorder handlers
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('stepIndex', index.toString());
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetIndex) => {
    const sourceIndex = parseInt(e.dataTransfer.getData('stepIndex'), 10);
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

    const reordered = [...steps];
    const [removed] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    setSteps(reordered);
    setSelectedStepIndex(targetIndex);
    toast.success('Step position updated');
  };

  // Add Step configurations
  const addStepNode = (type) => {
    let newStep = { type };
    if (type === 'wait') {
      newStep.delay = 300; // 5 mins
      newStep.unit = 'seconds';
    } else if (type === 'make_ai_call') {
      newStep.delay = 10;
    } else if (type === 'send_whatsapp') {
      newStep.templateName = templates[0]?.name || 'welcome';
      newStep.variables = [];
    } else if (type === 'send_email') {
      newStep.templateName = 'welcome';
      newStep.subject = 'Welcome aboard!';
    } else if (type === 'assign_lead') {
      newStep.role = 'AGENT';
    } else if (type === 'change_stage') {
      newStep.stageId = stages[0]?.id || '';
    } else if (type === 'webhook') {
      newStep.url = 'https://';
    }

    setSteps([...steps, newStep]);
    setSelectedStepIndex(steps.length);
    toast.success(`${type.toUpperCase()} node added`);
  };

  const deleteStepNode = (index) => {
    const updated = steps.filter((_, idx) => idx !== index);
    setSteps(updated);
    if (selectedStepIndex === index) {
      setSelectedStepIndex(null);
    } else if (selectedStepIndex > index) {
      setSelectedStepIndex(selectedStepIndex - 1);
    }
    toast.success('Step removed');
  };

  // Step property updates
  const updateStepProperty = (index, property, value) => {
    const updated = steps.map((step, idx) => {
      if (idx === index) {
        return { ...step, [property]: value };
      }
      return step;
    });
    setSteps(updated);
  };

  const handleSaveWorkflow = async () => {
    if (!name.trim()) {
      toast.error('Workflow name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        trigger,
        steps
      };

      let res;
      if (workflowId === 'new') {
        res = await api.post('/automation', payload);
        if (res.success) {
          toast.success('Workflow created successfully');
          router.push(`/dashboard/automations/${res.data.id}`);
        }
      } else {
        res = await api.patch(`/automation/${workflowId}`, payload);
        if (res.success) {
          toast.success('Workflow details updated');
          setWorkflow(res.data);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Workflow save failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-slate-400 text-xs font-semibold">Loading visual builder...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col overflow-hidden relative">
      {/* Top action header bar */}
      <div className="flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/dashboard/automations')}
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-400" /> Automation Designer
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Design multi-channel flow trigger diagrams.</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {workflow && (
            <button 
              onClick={handleToggleActive}
              className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors ${
                workflow.isActive 
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20' 
                  : 'bg-indigo-600/15 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/25'
              }`}
            >
              {workflow.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{workflow.isActive ? 'Pause Flow' : 'Go Live'}</span>
            </button>
          )}

          <button 
            onClick={handleSaveWorkflow}
            disabled={saving}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white flex items-center gap-1.5 shadow-lg transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Workflow
          </button>
        </div>
      </div>

      {/* Main Designer Grid layout */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-[500px]">
        {/* Left pane: Canvas workflow chain list */}
        <div className="flex-1 glass border border-slate-900 rounded-3xl p-6 overflow-y-auto flex flex-col gap-6 bg-slate-950/20">
          
          {/* Workflow Name Editor card */}
          <div className="p-4 bg-slate-900/30 rounded-2xl border border-slate-900 space-y-3 flex-shrink-0">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Workflow Campaign Name</label>
            <div className="relative">
              <Edit3 className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Instant Call Qualifier for Facebook Leads" 
                className="w-full bg-slate-950 border border-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 font-bold focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Trigger Card Node */}
          <div className="relative pl-6 before:absolute before:left-2.5 before:top-6 before:bottom-0 before:w-0.5 before:bg-slate-900 flex-shrink-0">
            <span className="absolute left-0 top-1 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-[9px] text-white">⚡</span>
            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">Campaign Entry Node</div>
            <div className="glass p-4 rounded-xl border border-slate-900 max-w-lg">
              <h4 className="font-bold text-xs text-white">Trigger Source</h4>
              <div className="flex items-center gap-3 mt-3">
                <select 
                  value={trigger.type} 
                  onChange={(e) => setTrigger({ ...trigger, type: e.target.value })}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none w-56"
                >
                  <option value="new_lead_created">New Lead Captured (Any Source)</option>
                  <option value="whatsapp_reply_received">WhatsApp Reply Received</option>
                  <option value="call_completed">Outbound AI Call Completed</option>
                </select>
                <span className="text-[11px] text-slate-500">Activates automation instantly.</span>
              </div>
            </div>
          </div>

          {/* Intermediate Steps timeline */}
          <div className="space-y-6 pl-6 relative before:absolute before:left-2.5 before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-900">
            {steps.map((step, idx) => {
              const isSelected = selectedStepIndex === idx;
              return (
                <div 
                  key={idx}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, idx)}
                  onClick={() => setSelectedStepIndex(idx)}
                  className={`group relative glass rounded-xl border transition-all cursor-pointer p-4 max-w-lg flex items-center gap-4 hover:border-slate-700/80 ${
                    isSelected ? 'border-indigo-500/70 bg-indigo-950/5 ring-1 ring-indigo-500/30' : 'border-slate-900'
                  }`}
                >
                  {/* Step index counter indicator */}
                  <span className={`absolute -left-[23px] top-4 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-extrabold text-white transition-colors ${
                    isSelected ? 'bg-indigo-500' : 'bg-slate-800 border border-slate-700'
                  }`}>
                    {idx + 1}
                  </span>

                  {/* Drag Grip Icon */}
                  <div className="cursor-grab text-slate-700 group-hover:text-slate-500 active:cursor-grabbing">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Icon representations */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    step.type === 'make_ai_call' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    step.type === 'send_whatsapp' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                    step.type === 'send_email' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                    step.type === 'wait' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    step.type === 'assign_lead' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' :
                    step.type === 'change_stage' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                    'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {step.type === 'make_ai_call' && <Bot className="w-4 h-4" />}
                    {step.type === 'send_whatsapp' && <MessageSquare className="w-4 h-4" />}
                    {step.type === 'send_email' && <Mail className="w-4 h-4" />}
                    {step.type === 'wait' && <Clock className="w-4 h-4" />}
                    {step.type === 'assign_lead' && <UserCheck className="w-4 h-4" />}
                    {step.type === 'change_stage' && <Layers className="w-4 h-4" />}
                    {step.type === 'webhook' && <Globe className="w-4 h-4" />}
                  </div>

                  {/* Step details text preview */}
                  <div className="flex-1 overflow-hidden">
                    <div className="font-bold text-xs text-slate-100 flex items-center gap-1.5 capitalize">
                      {step.type.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 truncate">
                      {step.type === 'wait' && `Delay: ${step.delay} ${step.unit || 'seconds'}`}
                      {step.type === 'make_ai_call' && `Qualify script | Delay: ${step.delay || 10}s`}
                      {step.type === 'send_whatsapp' && `Template: ${step.templateName}`}
                      {step.type === 'send_email' && `Template: ${step.templateName} | Subject: ${step.subject}`}
                      {step.type === 'assign_lead' && `Assign target: ${step.role}`}
                      {step.type === 'change_stage' && `Move to: ${stages.find(s=>s.id === step.stageId)?.name || 'Stage ID'}`}
                      {step.type === 'webhook' && `POST: ${step.url}`}
                    </div>
                  </div>

                  {/* Action Trash Delete Icon */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteStepNode(idx); }}
                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-slate-900 border border-transparent hover:border-slate-800 rounded-lg text-slate-500 hover:text-red-400 transition-all flex-shrink-0"
                    title="Delete step"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Plus Add Step node selector */}
          <div className="pl-6 pt-2 flex-shrink-0">
            <div className="relative max-w-lg">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Add Flow Step:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => addStepNode('make_ai_call')} className="px-2.5 py-1.5 rounded-xl border border-slate-900 bg-slate-950/40 text-[10px] text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors font-semibold flex items-center gap-1">
                    <Bot className="w-3 h-3" /> Call
                  </button>
                  <button onClick={() => addStepNode('send_whatsapp')} className="px-2.5 py-1.5 rounded-xl border border-slate-900 bg-slate-950/40 text-[10px] text-slate-400 hover:text-green-400 hover:border-green-500/30 transition-colors font-semibold flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> WhatsApp
                  </button>
                  <button onClick={() => addStepNode('send_email')} className="px-2.5 py-1.5 rounded-xl border border-slate-900 bg-slate-950/40 text-[10px] text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-colors font-semibold flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email
                  </button>
                  <button onClick={() => addStepNode('wait')} className="px-2.5 py-1.5 rounded-xl border border-slate-900 bg-slate-950/40 text-[10px] text-slate-400 hover:text-amber-400 hover:border-amber-500/30 transition-colors font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Wait
                  </button>
                  <button onClick={() => addStepNode('assign_lead')} className="px-2.5 py-1.5 rounded-xl border border-slate-900 bg-slate-950/40 text-[10px] text-slate-400 hover:text-teal-400 hover:border-teal-500/30 transition-colors font-semibold flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" /> Assign
                  </button>
                  <button onClick={() => addStepNode('change_stage')} className="px-2.5 py-1.5 rounded-xl border border-slate-900 bg-slate-950/40 text-[10px] text-slate-400 hover:text-purple-400 hover:border-purple-500/30 transition-colors font-semibold flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" /> Stage
                  </button>
                  <button onClick={() => addStepNode('webhook')} className="px-2.5 py-1.5 rounded-xl border border-slate-900 bg-slate-950/40 text-[10px] text-slate-400 hover:text-sky-400 hover:border-sky-500/30 transition-colors font-semibold flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Webhook
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right pane: Properties settings controller */}
        <div className="w-80 glass border border-slate-900 rounded-3xl p-6 overflow-y-auto bg-slate-950/20">
          <div className="flex justify-between items-center border-b border-slate-900 pb-3 flex-shrink-0">
            <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-indigo-400" /> Card properties
            </h3>
            {selectedStepIndex !== null && (
              <span className="text-[10px] text-slate-500 font-bold">Step {selectedStepIndex + 1}</span>
            )}
          </div>

          <div className="py-4">
            {selectedStepIndex !== null && steps[selectedStepIndex] ? (
              <div className="space-y-5 animate-in fade-in duration-200">
                
                {/* 1. WAIT DELAY CONFIG */}
                {steps[selectedStepIndex].type === 'wait' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Delay Duration</label>
                      <input 
                        type="number" 
                        value={steps[selectedStepIndex].delay || ''}
                        onChange={(e) => updateStepProperty(selectedStepIndex, 'delay', parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Time Unit</label>
                      <select 
                        value={steps[selectedStepIndex].unit || 'seconds'}
                        onChange={(e) => updateStepProperty(selectedStepIndex, 'unit', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="seconds">Seconds</option>
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                  </>
                )}

                {/* 2. MAKE AI CALL CONFIG */}
                {steps[selectedStepIndex].type === 'make_ai_call' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Wait Delay before dialing (s)</label>
                      <input 
                        type="number" 
                        value={steps[selectedStepIndex].delay || 10}
                        onChange={(e) => updateStepProperty(selectedStepIndex, 'delay', parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Initiates Exotel Call, playing Sarvam AI synthesized speech scripts. Evaluates customer answer using Deepgram & GPT-4o.
                    </p>
                  </>
                )}

                {/* 3. SEND WHATSAPP CONFIG */}
                {steps[selectedStepIndex].type === 'send_whatsapp' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Meta Notification Template</label>
                      <select 
                        value={steps[selectedStepIndex].templateName || ''}
                        onChange={(e) => updateStepProperty(selectedStepIndex, 'templateName', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="">Choose template...</option>
                        {templates.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Variable (e.g. Lead Name)</label>
                      <input 
                        type="text" 
                        placeholder="Dynamic lead field name..."
                        value={steps[selectedStepIndex].variables ? steps[selectedStepIndex].variables[0] || '' : ''}
                        onChange={(e) => updateStepProperty(selectedStepIndex, 'variables', e.target.value ? [e.target.value] : [])}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </>
                )}

                {/* 4. SEND EMAIL CONFIG */}
                {steps[selectedStepIndex].type === 'send_email' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Transaction Template ID</label>
                      <select 
                        value={steps[selectedStepIndex].templateName || 'welcome'}
                        onChange={(e) => updateStepProperty(selectedStepIndex, 'templateName', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="welcome">Welcome Onboarding</option>
                        <option value="invite">Team Invite</option>
                        <option value="password_reset">Password Reset</option>
                        <option value="payment_receipt">Payment Receipt</option>
                        <option value="call_summary">Call Summary</option>
                        <option value="usage_warning">Billing Limit Alert</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Email Subject line</label>
                      <input 
                        type="text" 
                        value={steps[selectedStepIndex].subject || ''}
                        onChange={(e) => updateStepProperty(selectedStepIndex, 'subject', e.target.value)}
                        placeholder="Subject..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </>
                )}

                {/* 5. ASSIGN LEAD CONFIG */}
                {steps[selectedStepIndex].type === 'assign_lead' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Assign Criteria</label>
                      <select 
                        value={steps[selectedStepIndex].role || 'AGENT'}
                        onChange={(e) => updateStepProperty(selectedStepIndex, 'role', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="AGENT">Round-robin Agents</option>
                        <option value="MANAGER">Round-robin Managers</option>
                        <option value="ADMIN">Round-robin Admins</option>
                      </select>
                    </div>
                  </>
                )}

                {/* 6. CHANGE STAGE CONFIG */}
                {steps[selectedStepIndex].type === 'change_stage' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Shift Target CRM Stage</label>
                      <select 
                        value={steps[selectedStepIndex].stageId || ''}
                        onChange={(e) => updateStepProperty(selectedStepIndex, 'stageId', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="">Select target stage...</option>
                        {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {/* 7. WEBHOOK CONFIG */}
                {steps[selectedStepIndex].type === 'webhook' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">POST URL</label>
                      <input 
                        type="url" 
                        value={steps[selectedStepIndex].url || 'https://'}
                        onChange={(e) => updateStepProperty(selectedStepIndex, 'url', e.target.value)}
                        placeholder="https://yourserver.com/callback"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </>
                )}

              </div>
            ) : (
              <div className="text-center py-20 text-[11px] text-slate-700">
                Select a step on the canvas to configure properties.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
