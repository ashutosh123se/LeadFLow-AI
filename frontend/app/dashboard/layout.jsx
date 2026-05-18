'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Trello,
  Users,
  PhoneCall,
  MessageSquare,
  Zap,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import useNotificationStore from '../../store/notificationStore';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, loading, init, logout } = useAuthStore();
  const { initSocket, disconnect, notifications } = useNotificationStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
    if (isAuthenticated && user) {
      initSocket(user.organizationId);
    }
    return () => {
      disconnect();
    };
  }, [isAuthenticated, loading, user]);

  if (loading) {
    return (
      <div className="bg-slate-950 text-slate-50 min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xl animate-bounce shadow-xl shadow-indigo-500/20">
          LF
        </div>
        <div className="text-sm font-semibold tracking-wide text-slate-400 animate-pulse">
          Loading your AI Workspace...
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Kanban Pipeline', path: '/dashboard/pipeline', icon: Trello },
    { name: 'Leads Database', path: '/dashboard/leads', icon: Users },
    { name: 'Telephony AI Logs', path: '/dashboard/calls', icon: PhoneCall },
    { name: 'WhatsApp Inbox', path: '/dashboard/whatsapp', icon: MessageSquare },
    { name: 'Automations', path: '/dashboard/automations', icon: Zap },
    { name: 'Settings & Billing', path: '/dashboard/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    toast.success('Successfully logged out.');
    router.push('/login');
  };

  return (
    <div className="bg-slate-950 text-slate-50 min-h-screen flex flex-col md:flex-row relative">
      {/* Background neon elements */}
      <div className="absolute top-[5%] left-[5%] w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      {/* Mobile Header Nav */}
      <header className="md:hidden flex justify-between items-center bg-slate-900/60 backdrop-blur-md px-6 py-4 border-b border-slate-900 z-30 w-full sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm shadow-md">
            LF
          </div>
          <span className="font-bold text-sm bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            LeadLFlowAI
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-slate-400 hover:text-slate-200">
            <Bell className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 text-slate-400 hover:text-slate-200"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Sidebar Nav (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-950 border-r border-slate-900 px-6 py-8 relative z-20 flex-shrink-0">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/20">
            LF
          </div>
          <div>
            <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              LeadLFlowAI
            </span>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              CRM Platform
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="glass p-4 rounded-2xl mb-8 flex items-center gap-3 border border-slate-900">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-sm font-bold shadow-md uppercase">
            {user.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold truncate">{user.name}</div>
            <div className="text-[10px] text-slate-400 capitalize truncate flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" /> {user.role.toLowerCase()}
            </div>
          </div>
        </div>

        {/* Main Menu Links */}
        <nav className="space-y-1.5 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500/10 to-purple-600/10 border-l-2 border-indigo-500 text-indigo-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all mt-auto"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </aside>

      {/* Mobile Drawer Navigation overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-950 flex flex-col px-6 py-8 border-r border-slate-900">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm shadow-md">
                LF
              </div>
              <span className="font-bold text-sm bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                LeadLFlowAI
              </span>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-slate-200">
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="space-y-2 flex-1">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-900 border-l-2 border-indigo-500 text-indigo-400 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all mt-auto"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col relative z-10">
        {/* Desktop Header */}
        <header className="hidden md:flex justify-between items-center px-10 py-6 border-b border-slate-900 bg-slate-950/40 backdrop-blur-md sticky top-0 z-20">
          <div>
            <h1 className="text-xl font-bold tracking-tight">AI Control Center</h1>
            <p className="text-xs text-slate-400 mt-0.5">Indian speed-to-lead qualification cockpit.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative cursor-pointer">
              <Bell className="w-5 h-5 text-slate-400 hover:text-indigo-400 transition-colors" />
              {notifications.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-indigo-500 text-[9px] font-bold flex items-center justify-center shadow-lg">
                  {notifications.length}
                </span>
              )}
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-xs font-semibold">{user.name}</div>
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{user.role}</div>
              </div>
            </div>
          </div>
        </header>

        {/* App Router Page Contents */}
        <div className="flex-1 p-6 md:p-10 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
