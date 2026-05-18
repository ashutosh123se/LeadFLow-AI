'use client';
import React, { useEffect, useState } from 'react';
import { PhoneCall, Clock, Award, Volume2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';

export default function CallsPage() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalCalls: 0, answeredCalls: 0, qualifyRate: 0, avgDuration: 0, hotCount: 0 });
  const [activeCall, setActiveCall] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [c, s] = await Promise.all([api.get('/calls'), api.get('/calls/stats')]);
        if (c.success) setCalls(c.data);
        if (s.success) setStats(s.data);
      } catch { toast.error('Failed to load call logs.'); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="flex-shrink-0">
        <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <PhoneCall className="w-6 h-6 text-indigo-400" /> Outbound Call Logs
        </h2>
        <p className="text-sm text-slate-400 mt-1">Transcripts, telemetry stats, and AI-extracted notes.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-shrink-0">
        {[
          { label: 'Total Attempts', value: stats.totalCalls, icon: PhoneCall, color: 'indigo' },
          { label: 'Answer Rate', value: `${stats.qualifyRate}%`, icon: Volume2, color: 'purple' },
          { label: 'Avg Duration', value: `${stats.avgDuration}s`, icon: Clock, color: 'teal' },
          { label: 'Hot Qualified', value: stats.hotCount, icon: Award, color: 'pink' },
        ].map((s) => (
          <div key={s.label} className="glass p-5 rounded-2xl border border-slate-900 flex items-center justify-between">
            <div>
              <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{s.label}</div>
              <div className="text-xl font-extrabold mt-1">{s.value}</div>
            </div>
            <div className={`w-10 h-10 rounded-xl bg-${s.color}-500/10 flex items-center justify-center text-${s.color}-400`}>
              <s.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden min-h-[400px]">
        <div className="flex-1 glass rounded-3xl border border-slate-900 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/60 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  <th className="py-4 px-6">Prospect</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Duration</th>
                  <th className="py-4 px-6">Summary</th>
                  <th className="py-4 px-6">Call Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-xs">
                {loading ? (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-500 animate-pulse">Loading call logs...</td></tr>
                ) : calls.length > 0 ? calls.map((item) => (
                  <tr key={item.id} onClick={() => setActiveCall(item)}
                    className={`hover:bg-slate-900/40 cursor-pointer transition-all ${activeCall?.id === item.id ? 'bg-indigo-500/5' : ''}`}>
                    <td className="py-4 px-6 font-bold text-slate-100">
                      {item.lead?.name || 'Unknown'}
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.lead?.phone}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                        item.status === 'COMPLETED' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' :
                        item.status === 'NO_ANSWER' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>{item.status}</span>
                    </td>
                    <td className="py-4 px-6 text-slate-400">{item.duration || 0}s</td>
                    <td className="py-4 px-6 text-slate-400 max-w-xs truncate">{item.summary || '—'}</td>
                    <td className="py-4 px-6 text-slate-500">{new Date(item.createdAt).toLocaleString()}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-600">No calls triggered yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {activeCall && (
          <div className="w-[400px] glass rounded-3xl border border-slate-900 flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-900 bg-slate-950/60 flex justify-between">
              <div>
                <h3 className="font-extrabold text-base">Call Transcript</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">{activeCall.id.substring(0, 13)}...</p>
              </div>
              <button onClick={() => setActiveCall(null)} className="text-slate-500 hover:text-slate-300 text-xs">Close</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950/30">
              {activeCall.transcript && activeCall.transcript.length > 0 ? activeCall.transcript.map((b, i) => {
                const isAI = b.speaker === 'assistant';
                return (
                  <div key={i} className={`flex flex-col ${isAI ? 'items-start' : 'items-end'}`}>
                    <span className="text-[9px] text-slate-500 font-bold uppercase mb-1 px-1">{isAI ? '🗣️ AI Voice' : '👤 Prospect'}</span>
                    <div className={`p-3.5 rounded-2xl max-w-xs text-xs leading-relaxed ${
                      isAI ? 'bg-indigo-500/10 text-indigo-200 rounded-tl-none border border-indigo-500/20' : 'bg-slate-900 text-slate-100 rounded-tr-none border border-slate-800'
                    }`}>{b.text}</div>
                  </div>
                );
              }) : (
                <div className="text-center text-xs text-slate-700 py-20">No transcript captured. ({activeCall.status})</div>
              )}
            </div>
            {activeCall.summary && (
              <div className="p-4 border-t border-slate-900 bg-slate-950/60 space-y-2">
                <div className="text-xs font-bold text-indigo-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> AI Extraction
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-300">{activeCall.summary}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
