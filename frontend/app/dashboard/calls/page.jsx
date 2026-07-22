'use client';

import React, { useEffect, useState } from 'react';
import { PhoneCall, Clock, Award, Volume2 } from 'lucide-react';
import { api, isDemoMode } from '../../../lib/api';
import { DEMO_CALLS, DEMO_CALL_STATS } from '../../../lib/demoData';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatCard } from '../../../components/ui/StatCard';
import { Badge } from '../../../components/ui/Badge';

export default function CallsPage() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(DEMO_CALL_STATS);
  const [activeCall, setActiveCall] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (isDemoMode()) {
        setCalls(DEMO_CALLS);
        setStats(DEMO_CALL_STATS);
        setLoading(false);
        return;
      }
      try {
        const [c, s] = await Promise.all([api.get('/calls'), api.get('/calls/stats')]);
        if (c.success) setCalls(c.data);
        if (s.success) setStats(s.data);
      } catch {
        setCalls(DEMO_CALLS);
        setStats(DEMO_CALL_STATS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statusVariant = (status) => {
    if (status === 'COMPLETED') return 'COMPLETED';
    if (status === 'NO_ANSWER') return 'WARM';
    return 'HOT';
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader title="Call logs" description="Outbound call records, transcripts, and qualification summaries." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total attempts" value={stats.totalCalls} icon={PhoneCall} />
        <StatCard label="Answer rate" value={`${stats.qualifyRate}%`} icon={Volume2} iconClass="text-success bg-success-light" />
        <StatCard label="Avg duration" value={`${stats.avgDuration}s`} icon={Clock} iconClass="text-success bg-success-light" />
        <StatCard label="Hot qualified" value={stats.hotCount} icon={Award} iconClass="text-danger bg-danger-light" />
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden min-h-[420px]">
        <div className="flex-1 table-shell flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Prospect</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Summary</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center text-muted py-12">Loading call logs...</td></tr>
                ) : calls.length > 0 ? calls.map((item) => (
                  <tr key={item.id} onClick={() => setActiveCall(item)}
                    className={`cursor-pointer ${activeCall?.id === item.id ? 'row-selected' : ''}`}>
                    <td>
                      <p className="font-medium text-foreground">{item.lead?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted mt-0.5">{item.lead?.phone}</p>
                    </td>
                    <td><Badge variant={statusVariant(item.status)}>{item.status}</Badge></td>
                    <td className="text-muted tabular-nums">{item.duration || 0}s</td>
                    <td className="text-muted max-w-xs truncate">{item.summary || '—'}</td>
                    <td className="text-muted">{new Date(item.createdAt).toLocaleString()}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="text-center text-muted py-12">No calls recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {activeCall && (
          <div className="detail-panel">
            <div className="card-header flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-foreground">Call transcript</h3>
                <p className="text-xs text-muted mt-0.5 font-mono">{activeCall.id.substring(0, 16)}</p>
              </div>
              <button onClick={() => setActiveCall(null)} className="btn-ghost text-xs py-1 px-2">Close</button>
            </div>
            <div className="flex-1 overflow-y-auto card-body space-y-4 bg-muted-surface/30">
              {activeCall.transcript?.length > 0 ? activeCall.transcript.map((b, i) => {
                const isAI = b.speaker === 'assistant';
                return (
                  <div key={i} className={`flex flex-col ${isAI ? 'items-start' : 'items-end'}`}>
                    <span className="text-2xs text-muted uppercase font-medium mb-1">{isAI ? 'AI Agent' : 'Prospect'}</span>
                    <div className={`p-3 rounded-md max-w-[85%] text-xs leading-relaxed border ${
                      isAI ? 'bg-primary-light/60 border-primary/10 text-foreground' : 'bg-card border-border text-foreground'
                    }`}>{b.text}</div>
                  </div>
                );
              }) : (
                <p className="text-center text-sm text-muted py-16">No transcript available ({activeCall.status}).</p>
              )}
            </div>
            {activeCall.summary && (
              <div className="p-4 border-t border-border bg-muted-surface/30">
                <p className="text-xs font-semibold text-foreground mb-2">AI summary</p>
                <p className="text-xs text-muted leading-relaxed">{activeCall.summary}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
