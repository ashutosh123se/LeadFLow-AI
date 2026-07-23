'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, PhoneCall, Clock, CheckCircle2, Users, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, isDemoMode } from '../../lib/api';
import {
  DEMO_DASHBOARD_STATS,
  DEMO_ACTIVITIES,
  DEMO_SOURCE_DATA,
  DEMO_FUNNEL_DATA,
} from '../../lib/demoData';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';

export default function DashboardPage() {
  const [stats, setStats] = useState(DEMO_DASHBOARD_STATS);
  const [leadTimeline, setLeadTimeline] = useState([]);
  const [sources, setSources] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [responseTime, setResponseTime] = useState({ avgSeconds: DEMO_DASHBOARD_STATS.avgSeconds });
  const [activities, setActivities] = useState(DEMO_ACTIVITIES);
  const [showAddLead, setShowAddLead] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [requirement, setRequirement] = useState('');

  useEffect(() => {
    (async () => {
      if (isDemoMode()) return;
      try {
        const [overview, sources, pipeline, response] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/analytics/sources'),
          api.get('/analytics/pipeline'),
          api.get('/analytics/response-time'),
        ]);
        if (overview.success) setStats((prev) => ({ ...prev, ...overview.data }));
        if (sources.success) setSources(sources.data?.breakdown || sources.data || []);
        if (pipeline.success) setFunnel(pipeline.data?.stages || pipeline.data || []);
        if (response.success) setResponseTime(response.data || { avgSeconds: 0 });
      } catch (err) {
        console.error('Dashboard analytics fetch failed:', err);
      }
    })();
  }, []);

  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!name || !phone) {
      toast.error('Name and phone number are required.');
      return;
    }
    try {
      const res = await api.post('/leads', { name, phone, requirement, source: 'MANUAL' });
      if (res.success) {
        toast.success('Lead created and call sequence scheduled.');
        setName(''); setPhone(''); setRequirement(''); setShowAddLead(false);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create lead.');
    }
  };

  const COLORS = ['#1E40AF', '#047857', '#B91C1C', '#059669', '#6B7280'];
  const mockTimeData = leadTimeline.length > 0 ? leadTimeline : [
    { date: 'Mon', count: 12 }, { date: 'Tue', count: 19 }, { date: 'Wed', count: 15 },
    { date: 'Thu', count: 22 }, { date: 'Fri', count: 30 }, { date: 'Sat', count: 24 }, { date: 'Sun', count: 28 },
  ];
  const mockSourceData = sources.length > 0 ? sources : DEMO_SOURCE_DATA;
  const mockFunnelData = funnel.length > 0 ? funnel : DEMO_FUNNEL_DATA;
  const qualRate = stats.totalLeads > 0 ? Math.round((stats.qualifiedCount / stats.totalLeads) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance summary"
        description="Qualification rates, channel distribution, and response metrics."
        action={
          <button onClick={() => setShowAddLead(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add lead
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total leads" value={stats.totalLeads} icon={Users}
          delta={<><TrendingUp className="w-3 h-3" /> +12% this week</>} />
        <StatCard label="AI voice calls" value={stats.aiCalls} icon={PhoneCall}
          iconClass="text-success bg-success-light"
          delta={<><TrendingUp className="w-3 h-3" /> +20% this week</>} />
        <StatCard label="Avg speed-to-lead" value={`${responseTime.avgSeconds}s`} icon={Clock}
          iconClass="text-success bg-success-light"
          delta="Within SLA target" />
        <StatCard label="Qualified leads" value={stats.qualifiedCount} icon={CheckCircle2}
          iconClass="text-danger bg-danger-light"
          delta={`${qualRate}% qualification rate`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-foreground">Lead volume over time</h3>
            <span className="caption">Last 30 days</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockTimeData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1E40AF" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1E40AF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#1E40AF" strokeWidth={2} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Lead channels</h3>
          <div className="h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={mockSourceData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="count">
                  {mockSourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-semibold tabular-nums">{stats.totalLeads}</span>
              <span className="text-2xs text-muted uppercase font-medium">Total inbound</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {mockSourceData.map((entry, i) => (
              <div key={entry.source} className="flex items-center gap-2 text-xs text-muted">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="capitalize truncate">{entry.source.toLowerCase()}: {entry.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Funnel conversion</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockFunnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                <YAxis dataKey="stageName" type="category" stroke="#9CA3AF" fontSize={11} width={80} tickLine={false} />
                <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#047857" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 card p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-foreground">Recent activity</h3>
            <span className="caption uppercase tracking-wide">Live</span>
          </div>
          <div className="space-y-0 divide-y divide-border max-h-64 overflow-y-auto">
            {activities.length > 0 ? activities.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-3 first:pt-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted mt-0.5">{item.phone} · {item.source}</p>
                </div>
                <div className="text-right">
                  <Badge variant={item.scoreLabel}>{item.scoreLabel || 'PENDING'}</Badge>
                  <p className="text-2xs text-muted mt-1">{new Date(item.createdAt).toLocaleTimeString()}</p>
                </div>
              </div>
            )) : (
              <div className="empty-state py-12">
                <p className="empty-state-text">No leads captured yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddLead && (
        <div className="panel-overlay flex items-center justify-end p-4" onClick={() => setShowAddLead(false)}>
          <div className="card w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Add prospect</h3>
              <p className="text-sm text-muted mt-1">Manual entry triggers the speed-to-lead call queue.</p>
            </div>
            <form onSubmit={handleCreateLead} className="space-y-4">
              <div>
                <label className="label">Prospect name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramesh Kumar" className="input" />
              </div>
              <div>
                <label className="label">Mobile number</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" className="input" />
              </div>
              <div>
                <label className="label">Requirements</label>
                <textarea value={requirement} onChange={(e) => setRequirement(e.target.value)} rows={3}
                  placeholder="e.g. 3 BHK flat in Noida sector 62" className="input min-h-[80px] py-2" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAddLead(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Save and schedule call</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
