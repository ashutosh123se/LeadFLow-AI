'use client';

import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  PhoneCall,
  Clock,
  CheckCircle2,
  Users,
  Plus,
  ArrowRight,
  TrendingDown,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import useLeadStore from '../../store/leadStore';

// Dynamic charts to bypass next.js SSR hydration mismatch
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    aiCalls: 0,
    whatsappSent: 0,
    qualifiedCount: 0,
  });

  const [leadTimeline, setLeadTimeline] = useState([]);
  const [sources, setSources] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [responseTime, setResponseTime] = useState({ avgSeconds: 90 });
  const [activities, setActivities] = useState([]);
  const [showAddLead, setShowAddLead] = useState(false);

  // New Lead Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [requirement, setRequirement] = useState('');

  const fetchDashboardData = async () => {
    try {
      const [ovRes, tmRes, scRes, fnRes, rtRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/analytics/leads'),
        api.get('/analytics/sources'),
        api.get('/analytics/pipeline'),
        api.get('/analytics/response-time'),
      ]);

      if (ovRes.success) setStats(ovRes.data);
      if (tmRes.success) setLeadTimeline(tmRes.data);
      if (scRes.success) setSources(scRes.data);
      if (fnRes.success) setFunnel(fnRes.data);
      if (rtRes.success) setResponseTime(rtRes.data);
    } catch (err) {
      console.error('Error loading dashboard analytics:', err.message);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const res = await api.get('/leads');
      if (res.success) {
        setActivities(res.data.slice(0, 5));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchRecentActivities();
  }, []);

  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!name || !phone) {
      toast.error('Name and phone number are required.');
      return;
    }

    try {
      const res = await api.post('/leads', {
        name,
        phone,
        requirement,
        source: 'MANUAL',
      });

      if (res.success) {
        toast.success('Lead created and calling sequence scheduled!');
        setName('');
        setPhone('');
        setRequirement('');
        setShowAddLead(false);
        fetchDashboardData();
        fetchRecentActivities();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create lead.');
    }
  };

  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b'];

  const mockTimeData = leadTimeline.length > 0 ? leadTimeline : [
    { date: 'Mon', count: 12 },
    { date: 'Tue', count: 19 },
    { date: 'Wed', count: 15 },
    { date: 'Thu', count: 22 },
    { date: 'Fri', count: 30 },
    { date: 'Sat', count: 24 },
    { date: 'Sun', count: 28 },
  ];

  const mockSourceData = sources.length > 0 ? sources : [
    { source: 'Website', count: 40 },
    { source: 'WhatsApp', count: 30 },
    { source: 'Manual', count: 20 },
    { source: 'IndiaMart', count: 10 },
  ];

  const mockFunnelData = funnel.length > 0 ? funnel : [
    { stageName: 'New Lead', count: 50 },
    { stageName: 'Contacted', count: 35 },
    { stageName: 'Qualified', count: 20 },
    { stageName: 'Closed', count: 8 },
  ];

  return (
    <div className="space-y-8 relative">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Performance Summary</h2>
          <p className="text-sm text-slate-400 mt-1">Qualification rates and speed metrics.</p>
        </div>
        <button
          onClick={() => setShowAddLead(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-sm font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass p-6 rounded-2xl border border-slate-900 flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Leads</div>
            <div className="text-2xl font-extrabold mt-1">{stats.totalLeads}</div>
            <div className="text-[10px] text-indigo-400 font-bold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3.5 h-3.5" /> +12% this week
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="glass p-6 rounded-2xl border border-slate-900 flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">AI Voice Calls</div>
            <div className="text-2xl font-extrabold mt-1">{stats.aiCalls}</div>
            <div className="text-[10px] text-purple-400 font-bold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3.5 h-3.5" /> +20% this week
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <PhoneCall className="w-6 h-6" />
          </div>
        </div>

        <div className="glass p-6 rounded-2xl border border-slate-900 flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Avg Speed-to-Lead</div>
            <div className="text-2xl font-extrabold mt-1">{responseTime.avgSeconds}s</div>
            <div className="text-[10px] text-teal-400 font-bold flex items-center gap-1 mt-1">
              <Clock className="w-3.5 h-3.5" /> Brand Standard limit
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="glass p-6 rounded-2xl border border-slate-900 flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Qualified Leads</div>
            <div className="text-2xl font-extrabold mt-1">{stats.qualifiedCount}</div>
            <div className="text-[10px] text-pink-400 font-bold flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {stats.totalLeads > 0 ? Math.round((stats.qualifiedCount / stats.totalLeads) * 100) : 0}% qualification rate
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charting Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 glass p-6 rounded-3xl border border-slate-900 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold">Leads Flow Over Time</h3>
            <span className="text-xs text-slate-500">Last 30 Days</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockTimeData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#475569" fontSize={11} />
                <YAxis stroke="#475569" fontSize={11} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" fillOpacity={1} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sources Chart */}
        <div className="glass p-6 rounded-3xl border border-slate-900 flex flex-col justify-between">
          <h3 className="text-base font-bold mb-6">Lead Channels</h3>
          <div className="h-48 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mockSourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {mockSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-extrabold">{stats.totalLeads}</span>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Inbound</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mt-4">
            {mockSourceData.map((entry, index) => (
              <div key={entry.source} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="capitalize">{entry.source.toLowerCase()}: {entry.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Funnel & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Funnel */}
        <div className="glass p-6 rounded-3xl border border-slate-900 flex flex-col justify-between">
          <h3 className="text-base font-bold mb-6">Funnel Conversion</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockFunnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#475569" fontSize={11} />
                <YAxis dataKey="stageName" type="category" stroke="#475569" fontSize={11} width={80} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
                <Bar dataKey="count" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live CRM Lead activity list */}
        <div className="lg:col-span-2 glass p-6 rounded-3xl border border-slate-900 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400 animate-pulse" /> Inbound Activity
            </h3>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Realtime</span>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-64 pr-2">
            {activities.length > 0 ? (
              activities.map((item) => (
                <div key={item.id} className="flex justify-between items-start border-b border-slate-900/60 pb-3 last:border-0">
                  <div>
                    <div className="text-sm font-bold">{item.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Phone: {item.phone} | Source: {item.source}</div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      item.scoreLabel === 'HOT' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      item.scoreLabel === 'WARM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {item.scoreLabel || 'PENDING'}
                    </span>
                    <span className="text-[9px] text-slate-600 mt-1">{new Date(item.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-xs text-slate-600 py-12">
                No active leads captured yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Lead Slideover Modal */}
      {showAddLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md p-8 rounded-3xl shadow-2xl space-y-6 relative border border-slate-800">
            <div>
              <h3 className="text-xl font-bold">Add New Prospect</h3>
              <p className="text-xs text-slate-400 mt-1">Manual creation instantly triggers speed-to-lead queue calls.</p>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Prospect Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-4 text-sm focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  10-Digit Mobile Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-4 text-sm focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Prospect Requirements
                </label>
                <textarea
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                  placeholder="e.g. Looking for 3 BHK flat in Noida sector 62."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-4 text-sm focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLead(false)}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 font-semibold py-2.5 px-4 rounded-xl border border-slate-800 text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 font-semibold py-2.5 px-4 rounded-xl shadow-lg text-sm text-center transition-all"
                >
                  Save & Trigger Call
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
