'use client';

import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Legend, RadialBarChart, RadialBar 
} from 'recharts';
import { 
  TrendingUp, Users, PhoneCall, CheckSquare, Clock, Download, 
  Calendar, RefreshCw, BarChart2, PieChart as PieIcon, Award, Loader2 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Dates range filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Analytics states
  const [overview, setOverview] = useState({
    totalLeads: 0,
    aiCalls: 0,
    whatsappSent: 0,
    qualifiedCount: 0
  });
  const [leadStats, setLeadStats] = useState([]);
  const [sources, setSources] = useState([]);
  const [pipelineFunnel, setPipelineFunnel] = useState([]);
  const [callsBreakdown, setCallsBreakdown] = useState([]);
  const [teamPerformance, setTeamPerformance] = useState([]);
  const [responseTime, setResponseTime] = useState({ avgSeconds: 90 });

  const fetchAllAnalytics = async () => {
    setLoading(true);
    try {
      const [
        overviewRes,
        leadsRes,
        sourcesRes,
        pipelineRes,
        callsRes,
        responseTimeRes,
        teamRes
      ] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/analytics/leads'),
        api.get('/analytics/sources'),
        api.get('/analytics/pipeline'),
        api.get('/analytics/calls'),
        api.get('/analytics/response-time'),
        api.get('/analytics/team')
      ]);

      if (overviewRes.success) setOverview(overviewRes.data);
      if (leadsRes.success) setLeadStats(leadsRes.data);
      if (sourcesRes.success) setSources(sourcesRes.data);
      if (pipelineRes.success) setPipelineFunnel(pipelineRes.data);
      if (callsRes.success) setCallsBreakdown(callsRes.data);
      if (responseTimeRes.success) setResponseTime(responseTimeRes.data);
      if (teamRes.success) setTeamPerformance(teamRes.data);

    } catch (err) {
      toast.error('Failed to load telemetry analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAnalytics();
  }, []);

  // Expose local Leads database as clean formatted CSV
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await api.get('/leads?limit=500');
      if (res.success && res.data.length > 0) {
        const headers = ['Name', 'Phone', 'Email', 'Source', 'Status', 'AI Score', 'AI Label', 'Qualified', 'Budget', 'Requirement', 'Created At'];
        const csvRows = [
          headers.join(','),
          ...res.data.map(lead => [
            `"${lead.name || ''}"`,
            `"${lead.phone || ''}"`,
            `"${lead.email || ''}"`,
            `"${lead.source || ''}"`,
            `"${lead.status || ''}"`,
            lead.score || 0,
            `"${lead.scoreLabel || 'Cold'}"`,
            lead.isQualified ? 'Yes' : 'No',
            lead.budget || 0,
            `"${(lead.requirement || '').replace(/"/g, '""')}"`,
            new Date(lead.createdAt).toLocaleDateString()
          ].join(','))
        ];

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `LeadFlow_Export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV Download initiated!');
      } else {
        toast.error('No lead records found to export.');
      }
    } catch (err) {
      toast.error('CSV compilation failed.');
    } finally {
      setExporting(false);
    }
  };

  // Curated color list for charts
  const CHART_COLORS = ['#6366f1', '#a855f7', '#14b8a6', '#f59e0b', '#ef4444', '#3b82f6'];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-slate-400 text-xs font-semibold">Analyzing CRM metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col overflow-y-auto">
      {/* Page Title header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-indigo-400" /> Analytical Insights
          </h2>
          <p className="text-xs text-slate-400 mt-1">Real-time statistics regarding calling speed, channels, and conversion metrics.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="bg-transparent text-slate-200 border-none outline-none w-24 text-[11px]" 
            />
            <span className="px-1">-</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="bg-transparent text-slate-200 border-none outline-none w-24 text-[11px]" 
            />
          </div>

          <button 
            onClick={handleExportCSV}
            disabled={exporting}
            className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-lg disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export Leads CSV
          </button>
        </div>
      </div>

      {/* Grid Row 1: KPI Stats Summary Panels */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Captured Panel */}
        <div className="p-5 glass border border-slate-900 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Leads</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{overview.totalLeads}</div>
          <div className="text-[9px] text-indigo-400/80 font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Lifetime Captures</span>
          </div>
        </div>

        {/* AI Voice Dials Panel */}
        <div className="p-5 glass border border-slate-900 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">AI Voice Dials</span>
            <PhoneCall className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{overview.aiCalls}</div>
          <div className="text-[9px] text-slate-500">Qualifiers Dialed</div>
        </div>

        {/* WhatsApp templates sent */}
        <div className="p-5 glass border border-slate-900 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">WhatsApp Sent</span>
            <MessageSquare className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-black text-white">{overview.whatsappSent}</div>
          <div className="text-[9px] text-slate-500">Templates Dispatched</div>
        </div>

        {/* Qualified Matches count */}
        <div className="p-5 glass border border-slate-900 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Hot Leads</span>
            <CheckSquare className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400">{overview.qualifiedCount}</div>
          <div className="text-[9px] text-red-500/80 font-bold uppercase tracking-wider">
            🔥 AI Qualified
          </div>
        </div>

        {/* Response Time (Speed-to-lead) */}
        <div className="p-5 glass border border-slate-900 rounded-2xl space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Avg Dial Speed</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">{responseTime.avgSeconds || 90}s</div>
          <div className="text-[9px] text-amber-500/80 font-bold uppercase tracking-wider">
            ⚡ Target: &lt;90s Dial
          </div>
        </div>

      </div>

      {/* Grid Row 2: Lead capture and Channels Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lead capture line volume chart */}
        <div className="lg:col-span-2 glass border border-slate-900 rounded-3xl p-6 space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-200">Capture Trend (30 Days)</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Daily volume of incoming lead records.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={leadStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#475569" fontSize={9} />
                <YAxis stroke="#475569" fontSize={9} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 12 }} 
                  labelStyle={{ fontSize: 10, fontWeight: 'bold', color: '#fff' }}
                  itemStyle={{ fontSize: 11, color: '#a5b4fc' }}
                />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Source Channels distribution Pie Chart */}
        <div className="glass border border-slate-900 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-200">Ingestion Channels</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Where leads are captured from.</p>
          </div>

          <div className="h-48 my-4 relative">
            {sources.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sources}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="source"
                  >
                    {sources.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 12 }}
                    itemStyle={{ fontSize: 11, color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-700">No sources distribution data.</div>
            )}
          </div>

          {/* Color legend */}
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
            {sources.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                <span className="truncate max-w-[100px] uppercase font-bold">{entry.source.replace(/_/g, ' ')} ({entry.count})</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Grid Row 3: Pipeline and Calls stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pipeline Stage Bar Chart */}
        <div className="glass border border-slate-900 rounded-3xl p-6 space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-200">Stage Distributions</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Total counts of leads currently active in each funnel node.</p>
          </div>
          <div className="h-64">
            {pipelineFunnel.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineFunnel} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="stageName" stroke="#475569" fontSize={9} />
                  <YAxis stroke="#475569" fontSize={9} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 12 }}
                    itemStyle={{ fontSize: 11, color: '#fff' }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {pipelineFunnel.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-700">No stage distribution data yet.</div>
            )}
          </div>
        </div>

        {/* AI Call Outcome breakdown */}
        <div className="glass border border-slate-900 rounded-3xl p-6 space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-200">AI Dialer Telemetry Outcome</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Calls statuses logs distribution.</p>
          </div>
          <div className="h-64">
            {callsBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={callsBreakdown} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis type="number" stroke="#475569" fontSize={9} />
                  <YAxis type="category" dataKey="status" stroke="#475569" fontSize={9} width={90} style={{ textTransform: 'uppercase' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 12 }}
                    itemStyle={{ fontSize: 11, color: '#fff' }}
                  />
                  <Bar dataKey="count" fill="#14b8a6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-700">No outbound call logs recorded.</div>
            )}
          </div>
        </div>

      </div>

      {/* Grid Row 4: Team Performance table card */}
      <div className="glass border border-slate-900 rounded-3xl p-6 space-y-4 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Award className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="font-bold text-sm text-slate-200">Team Conversion Performance</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Conversion metrics per assigned organization team member.</p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-900 rounded-2xl bg-slate-950/15">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-900 bg-slate-950/40 text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                <th className="p-4">Agent Name</th>
                <th className="p-4">Assigned Leads</th>
                <th className="p-4">AI Qualified (Hot/Warm)</th>
                <th className="p-4">Deals Won</th>
                <th className="p-4">Conversion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60 text-slate-300">
              {teamPerformance.length > 0 ? (
                teamPerformance.map((agent) => {
                  const rate = agent.assigned > 0 ? Math.round((agent.won / agent.assigned) * 100) : 0;
                  return (
                    <tr key={agent.id} className="hover:bg-slate-900/10 transition-colors">
                      <td className="p-4 font-bold flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-650 flex items-center justify-center text-[10px] text-indigo-300 font-extrabold uppercase">
                          {agent.name.charAt(0)}
                        </div>
                        <span>{agent.name}</span>
                      </td>
                      <td className="p-4">{agent.assigned}</td>
                      <td className="p-4 text-amber-400 font-bold">{agent.qualified}</td>
                      <td className="p-4 text-emerald-400 font-bold">{agent.won}</td>
                      <td className="p-4 font-black">
                        {rate}%
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-700">No active team members registered.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
