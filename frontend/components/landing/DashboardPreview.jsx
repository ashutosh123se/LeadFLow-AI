'use client';

import { useState } from 'react';
import {
  LayoutDashboard, Users, PhoneCall, MessageSquare, TrendingUp,
  CheckCircle2, Clock, BarChart3,
} from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'calls', label: 'Calls' },
];

const BAR_HEIGHTS = [40, 65, 50, 80, 70, 95, 85];

export default function DashboardPreview() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent rounded-3xl blur-2xl" />
      <div className="relative bg-card border border-border rounded-2xl shadow-hero overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted-surface/50">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-danger/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-warning/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-success/60" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-4 py-1 rounded-md bg-card border border-border text-2xs text-muted font-medium">
              app.leadflow.ai/dashboard
            </div>
          </div>
        </div>

        <div className="flex min-h-[380px]">
          {/* Mini sidebar */}
          <div className="w-14 border-r border-border bg-muted-surface/30 py-4 flex flex-col items-center gap-3 hidden sm:flex">
            {[LayoutDashboard, Users, PhoneCall, MessageSquare, BarChart3].map((Icon, i) => (
              <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-primary-light text-primary' : 'text-muted'}`}>
                <Icon className="w-4 h-4" />
              </div>
            ))}
          </div>

          <div className="flex-1 p-4 sm:p-5">
            {/* Tab pills */}
            <div className="flex gap-1 mb-4">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    tab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted hover:bg-muted-surface'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Leads', value: '124', delta: '+12%', icon: Users, color: 'text-primary bg-primary-light' },
                    { label: 'AI Calls', value: '86', delta: '+20%', icon: PhoneCall, color: 'text-success bg-success-light' },
                    { label: 'Qualified', value: '47', delta: '38%', icon: CheckCircle2, color: 'text-accent bg-accent-light' },
                    { label: 'Avg Response', value: '47s', delta: 'SLA met', icon: Clock, color: 'text-warning bg-warning-light' },
                  ].map((s) => (
                    <div key={s.label} className="bg-muted-surface/50 border border-border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-2xs text-muted">{s.label}</p>
                          <p className="text-lg font-semibold tabular-nums mt-0.5">{s.value}</p>
                          <p className="text-2xs text-success mt-0.5 flex items-center gap-0.5">
                            <TrendingUp className="w-3 h-3" />{s.delta}
                          </p>
                        </div>
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${s.color}`}>
                          <s.icon className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-5 gap-3">
                  <div className="col-span-3 bg-muted-surface/50 border border-border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-medium">Lead volume</span>
                      <span className="text-2xs text-muted">Last 7 days</span>
                    </div>
                    <div className="flex items-end gap-1.5 h-24">
                      {BAR_HEIGHTS.map((h, i) => (
                        <div key={i} className="flex-1 rounded-sm bg-primary/20 relative group" style={{ height: `${h}%` }}>
                          <div className="absolute inset-x-0 bottom-0 rounded-sm bg-primary transition-all" style={{ height: `${h}%` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2 bg-muted-surface/50 border border-border rounded-lg p-4">
                    <p className="text-xs font-medium mb-3">Recent activity</p>
                    <div className="space-y-2">
                      {[
                        { name: 'Aditi Sharma', tag: 'Hot', time: '2m ago' },
                        { name: 'Rajesh Kumar', tag: 'Warm', time: '8m ago' },
                        { name: 'Suresh Raina', tag: 'Hot', time: '14m ago' },
                      ].map((l) => (
                        <div key={l.name} className="flex justify-between items-center text-2xs">
                          <span className="font-medium truncate">{l.name}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`px-1.5 py-0.5 rounded text-2xs font-medium ${l.tag === 'Hot' ? 'bg-danger-light text-danger' : 'bg-warning-light text-warning'}`}>{l.tag}</span>
                            <span className="text-muted">{l.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'pipeline' && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {[
                  { stage: 'New', count: 3, leads: ['Aditi S.', 'Vikram P.', 'Neha R.'] },
                  { stage: 'Contacted', count: 2, leads: ['Rajesh K.', 'Priya M.'] },
                  { stage: 'Qualified', count: 2, leads: ['Suresh R.', 'Anita D.'] },
                  { stage: 'Won', count: 1, leads: ['Rohit G.'] },
                ].map((col) => (
                  <div key={col.stage} className="w-36 flex-shrink-0 bg-muted-surface/50 border border-border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold">{col.stage}</span>
                      <span className="text-2xs bg-card border border-border px-1.5 py-0.5 rounded-full tabular-nums">{col.count}</span>
                    </div>
                    <div className="space-y-2">
                      {col.leads.map((l) => (
                        <div key={l} className="bg-card border border-border rounded-md p-2 text-2xs font-medium shadow-sm">{l}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'calls' && (
              <div className="bg-muted-surface/50 border border-border rounded-lg overflow-hidden">
                <table className="w-full text-2xs">
                  <thead>
                    <tr className="border-b border-border text-muted uppercase tracking-wide">
                      <th className="text-left py-2 px-3 font-medium">Prospect</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                      <th className="text-left py-2 px-3 font-medium">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'Aditi Sharma', status: 'Completed', dur: '142s' },
                      { name: 'Rajesh Kumar', status: 'Completed', dur: '98s' },
                      { name: 'Suresh Raina', status: 'No answer', dur: '32s' },
                      { name: 'Priya Mehta', status: 'Completed', dur: '186s' },
                    ].map((c) => (
                      <tr key={c.name} className="border-b border-border last:border-0">
                        <td className="py-2 px-3 font-medium">{c.name}</td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded font-medium ${c.status === 'Completed' ? 'bg-success-light text-success' : 'bg-warning-light text-warning'}`}>{c.status}</span>
                        </td>
                        <td className="py-2 px-3 text-muted tabular-nums">{c.dur}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
