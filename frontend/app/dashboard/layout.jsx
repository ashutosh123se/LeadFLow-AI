'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Trello, Users, PhoneCall, MessageSquare, Zap, Settings, LogOut, Menu, X, Bell,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import useNotificationStore from '../../store/notificationStore';
import Logo from '../../components/Logo';
import { isSuperAdmin, formatRole } from '../../lib/permissions';
import UsageMeter from '../../components/billing/UsageMeter';

const NAV = [
  { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Pipeline', path: '/dashboard/pipeline', icon: Trello },
  { name: 'Leads', path: '/dashboard/leads', icon: Users },
  { name: 'Call Logs', path: '/dashboard/calls', icon: PhoneCall },
  { name: 'WhatsApp', path: '/dashboard/whatsapp', icon: MessageSquare },
  { name: 'Automations', path: '/dashboard/automations', icon: Zap },
  { name: 'Settings', path: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, loading, init, logout } = useAuthStore();
  const { initSocket, disconnect, notifications } = useNotificationStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (!loading && isAuthenticated && user && isSuperAdmin(user)) router.replace('/admin');
  }, [loading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && user && !isSuperAdmin(user)) initSocket(user.organizationId);
    return () => disconnect();
  }, [isAuthenticated, user]);

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <p className="text-sm text-muted">Loading workspace...</p>
      </div>
    );
  }

  const currentUser = user || { name: 'Demo Admin', role: 'ADMIN', organizationId: 'demo-org' };
  const current = NAV.find((n) => n.path === pathname);

  const NavLinks = ({ onNavigate }) => NAV.map((item) => {
    const active = pathname === item.path;
    const Icon = item.icon;
    return (
      <Link key={item.path} href={item.path} onClick={onNavigate}
        className={`nav-item ${active ? 'nav-item-active' : ''}`}>
        <Icon className="w-4 h-4" strokeWidth={1.75} />
        {item.name}
      </Link>
    );
  });

  return (
    <div className="app-shell flex min-h-screen">
      <aside className="sidebar hidden lg:flex">
        <div className="h-14 px-5 flex items-center border-b border-border">
          <Logo href="/dashboard" />
        </div>
        <div className="px-4 py-4 border-b border-border">
          <p className="text-2xs font-semibold text-muted uppercase tracking-wider">Organization</p>
          <p className="text-sm font-medium text-foreground mt-1 truncate">
            {currentUser.organization?.name || 'Demo Company'}
          </p>
        </div>
        <UsageMeter />
        <div className="px-4 py-4 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary-light text-primary text-sm font-semibold flex items-center justify-center">
            {currentUser.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{currentUser.name}</p>
            <p className="text-xs text-muted">{formatRole(currentUser.role)}</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="px-3 py-4 border-t border-border">
          <button onClick={() => { logout(); toast.success('Signed out.'); router.push('/login'); }}
            className="nav-item w-full text-muted hover:text-danger">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-card flex flex-col">
          <div className="h-14 px-5 flex items-center justify-between border-b border-border">
            <Logo href="/dashboard" size="sm" />
            <button onClick={() => setMobileOpen(false)}><X className="w-5 h-5 text-muted" /></button>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-0.5">
            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </nav>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-muted" onClick={() => setMobileOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-foreground">{current?.name || 'Dashboard'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative text-muted hover:text-foreground">
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-primary text-white text-2xs font-semibold rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
            <span className="text-sm text-muted hidden sm:inline">{currentUser.name}</span>
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <div className="page-container">{children}</div>
        </main>
      </div>
    </div>
  );
}
