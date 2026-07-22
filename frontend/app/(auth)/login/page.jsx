'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../../store/authStore';
import Logo from '../../../components/Logo';
import { getPostLoginPath } from '../../../lib/permissions';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, init, isAuthenticated, user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => { init(); }, [init]);
  useEffect(() => {
    if (isAuthenticated && user) router.push(getPostLoginPath(user));
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email and password.');
      return;
    }
    const res = await login(email, password);
    if (res.success) {
      toast.success(res.superAdmin ? 'Welcome, administrator.' : 'Signed in successfully.');
      router.push(res.superAdmin ? '/admin' : '/dashboard');
    } else {
      toast.error(res.error || 'Invalid credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo href="/" className="justify-center" />
          <h1 className="text-2xl font-semibold text-foreground mt-8">Sign in</h1>
          <p className="text-sm text-muted mt-2">Access your sales workspace</p>
        </div>
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com" className="input pl-10" />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="label mb-0">Password</label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password" className="input pl-10" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : <>Sign in <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
          <p className="text-center mt-6 text-sm text-muted">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary font-medium hover:underline">Create account</Link>
          </p>
          <p className="text-center mt-3 text-xs text-muted-foreground">
            Platform admin: admin@leadflow.ai
          </p>
        </div>
      </div>
    </div>
  );
}
