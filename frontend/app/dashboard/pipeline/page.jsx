'use client';
import React, { useEffect, useState } from 'react';
import { Sparkles, Calendar, User, Kanban } from 'lucide-react';
import toast from 'react-hot-toast';
import useLeadStore from '../../../store/leadStore';

export default function PipelinePage() {
  const { stages, fetchKanbanBoard, moveLeadStage, loading } = useLeadStore();

  useEffect(() => { fetchKanbanBoard(); }, []);

  const handleDragStart = (e, leadId) => e.dataTransfer.setData('leadId', leadId);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = async (e, targetStageId) => {
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;
    try {
      await moveLeadStage(leadId, targetStageId);
      toast.success('Stage updated!');
    } catch { toast.error('Failed to move lead.'); }
  };

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Kanban className="w-6 h-6 text-indigo-400" /> Pipeline Kanban
          </h2>
          <p className="text-sm text-slate-400 mt-1">Drag and drop leads between qualifying stages.</p>
        </div>
      </div>
      <div className="flex-1 overflow-x-auto pb-4 flex gap-6 items-start min-h-[500px]">
        {stages && stages.length > 0 ? stages.map((stage) => (
          <div key={stage.id} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, stage.id)}
            className="w-80 bg-slate-900/30 rounded-2xl p-4 flex flex-col max-h-[600px] border border-slate-900/80 flex-shrink-0">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color || '#6366f1' }} />
                <span className="font-bold text-sm text-slate-200">{stage.name}</span>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded-full">{stage.leads?.length || 0}</span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto pr-1 min-h-[150px]">
              {stage.leads && stage.leads.length > 0 ? stage.leads.map((lead) => (
                <div key={lead.id} draggable onDragStart={(e) => handleDragStart(e, lead.id)}
                  className="glass p-4 rounded-xl border border-slate-800 hover:border-indigo-500/50 cursor-grab active:cursor-grabbing transition-all space-y-3 shadow-md">
                  <div className="flex justify-between items-start">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      lead.scoreLabel === 'HOT' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      lead.scoreLabel === 'WARM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-500'
                    }`}>{lead.scoreLabel || 'Cold'}</span>
                    {lead.score && <span className="text-[10px] text-slate-500 font-bold">AI: {lead.score}/100</span>}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-100">{lead.name}</h4>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{lead.requirement || 'No requirement noted'}</p>
                  </div>
                  <div className="border-t border-slate-900 pt-3 flex justify-between items-center text-[10px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-indigo-900 flex items-center justify-center text-[9px] font-bold text-indigo-300">
                      {lead.assignedTo?.name ? lead.assignedTo.name.charAt(0) : <User className="w-3 h-3 text-slate-400" />}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center text-xs text-slate-700 py-12 border-2 border-dashed border-slate-900 rounded-xl">Drop leads here</div>
              )}
            </div>
          </div>
        )) : (
          <div className="text-slate-600 text-sm flex-1 flex items-center justify-center">
            {loading ? 'Loading pipeline stages...' : 'No pipeline stages configured yet. Connect your backend.'}
          </div>
        )}
      </div>
    </div>
  );
}
