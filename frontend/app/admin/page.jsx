'use client';

import React, { useEffect, useState } from 'react';
import { Building2, Users, PhoneCall, PauseCircle, PlayCircle, Search, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, isDemoMode } from '../../lib/api';
import { DEMO_PLATFORM_ORGS, DEMO_PLATFORM_STATS } from '../../lib/demoData';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';

export default function AdminPage() {
  const [orgs, setOrgs] = useState([]);
  const [stats, setStats] = useState(DEMO_PLATFORM_STATS);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    if (isDemoMode()) {
      setOrgs(DEMO_PLATFORM_ORGS);
      setStats(DEMO_PLATFORM_STATS);
      setLoading(false);
      return;
    }
    try {
      const [orgsRes, statsRes] = await Promise.all([
        api.get('/platform/organizations'), api.get('/platform/stats'),
      ]);
      if (orgsRes.success) setOrgs(orgsRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch {
      setOrgs(DEMO_PLATFORM_ORGS);
      setStats(DEMO_PLATFORM_STATS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSuspend = async (orgId) => {
    if (isDemoMode()) {
      setOrgs((prev) => prev.map((o) => o.id === orgId ? { ...o, status: 'suspended', suspendedReason: 'Suspended by platform admin' } : o));
      toast.success('Organization suspended.');
      return;
    }
    try {
      await api.post(`/platform/organizations/${orgId}/suspend`, { reason: 'Suspended by platform admin' });
      toast.success('Organization suspended.');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to suspend.');
    }
  };

  const handleReactivate = async (orgId) => {
    if (isDemoMode()) {
      setOrgs((prev) => prev.map((o) => o.id === orgId ? { ...o, status: 'active', suspendedReason: null } : o));
      toast.success('Organization reactivated.');
      return;
    }
    try {
      await api.post(`/platform/organizations/${orgId}/reactivate`);
      toast.success('Organization reactivated.');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to reactivate.');
    }
  };

  const filtered = orgs.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.slug.toLowerCase().includes(search.toLowerCase()) ||
    o.ownerEmail?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Platform overview" description="Manage tenant organizations across the LeadFlow platform." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total organizations" value={stats.totalOrgs} icon={Building2} />
        <StatCard label="Active" value={stats.activeOrgs} icon={TrendingUp} iconClass="text-success bg-success-light" />
        <StatCard label="Total users" value={stats.totalUsers} icon={Users} />
        <StatCard label="AI calls (month)" value={stats.totalAiCalls} icon={PhoneCall} />
      </div>

      <div className="table-shell">
        <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <span className="text-sm text-muted">{filtered.length} organizations</span>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search org, slug, owner..." className="input pl-9 text-sm" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Organization</th>
                <th>Plan</th>
                <th>Users</th>
                <th>Leads</th>
                <th>AI calls</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center text-muted py-12">Loading organizations...</td></tr>
              ) : filtered.length > 0 ? filtered.map((org) => (
                <tr key={org.id}>
                  <td>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-xs text-muted font-mono mt-0.5">{org.slug}</p>
                    <p className="text-xs text-muted mt-0.5">{org.ownerEmail}</p>
                  </td>
                  <td className="font-mono text-xs text-primary">{org.plan}</td>
                  <td className="tabular-nums">{org.users}</td>
                  <td className="tabular-nums">{org.leads}</td>
                  <td className="tabular-nums text-xs">{org.aiCallsUsed}/{org.aiCallsLimit}</td>
                  <td><Badge variant={org.status}>{org.status}</Badge></td>
                  <td className="text-right">
                    {org.status === 'suspended' ? (
                      <button onClick={() => handleReactivate(org.id)} className="btn-secondary text-xs py-1.5 px-3 inline-flex">
                        <PlayCircle className="w-3.5 h-3.5" /> Reactivate
                      </button>
                    ) : org.slug !== 'leadflow-platform' ? (
                      <button onClick={() => handleSuspend(org.id)} className="btn-ghost text-xs text-danger inline-flex">
                        <PauseCircle className="w-3.5 h-3.5" /> Suspend
                      </button>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="text-center text-muted py-12">No organizations match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
