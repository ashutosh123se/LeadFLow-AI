'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, LayoutDashboard, LogOut, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import Logo from '../../components/Logo';
import { isSuperAdmin, formatRole } from '../../lib/permissions';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const { user, isAuthenticated, loading, init, logout } = useAuthStore();

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    if (!loading && isAuthenticated && user && !isSuperAdmin(user)) router.replace('/dashboard');
    if (!loading && !isAuthenticated) router.replace('/login');
  }, [loading, isAuthenticated, user, router]);

  if (loading || !user || !isSuperAdmin(user)) {
    return (
      <div className="app-shell flex items-center justify-center">
        <p className="text-sm text-muted">Verifying access...</p>
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen">
      <aside className="sidebar">
        <div className="h-14 px-5 flex items-center border-b border-border">
          <Logo href="/admin" />
        </div>
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2 text-xs font-medium text-primary bg-primary-light px-3 py-2 rounded-md">
            <Shield className="w-3.5 h-3.5" /> Platform administrator
          </div>
          <p className="text-sm font-medium mt-3">{user.name}</p>
          <p className="text-xs text-muted">{formatRole(user.role)}</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <Link href="/admin" className="nav-item nav-item-active">
            <Building2 className="w-4 h-4" /> Organizations
          </Link>
          <Link href="/dashboard" className="nav-item">
            <LayoutDashboard className="w-4 h-4" /> Tenant dashboard
          </Link>
        </nav>
        <div className="px-3 py-4 border-t border-border">
          <button onClick={() => { logout(); toast.success('Signed out.'); router.push('/login'); }}
            className="nav-item w-full text-muted hover:text-danger">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        <header className="topbar">
          <h1 className="text-sm font-semibold">Platform administration</h1>
        </header>
        <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <div className="page-container">{children}</div>
        </div>
      </main>
    </div>
  );
}
