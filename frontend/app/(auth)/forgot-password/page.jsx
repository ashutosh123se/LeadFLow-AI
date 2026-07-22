'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import Logo from '../../../components/Logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email address.');
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email });
      if (response.success) { toast.success('Verification code sent if the email exists.'); setOtpSent(true); }
    } catch (error) {
      toast.error(error.message || 'Request failed.');
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword) return toast.error('Please enter OTP and new password.');
    setLoading(true);
    try {
      const response = await api.post('/auth/reset-password', { email, otp, newPassword });
      if (response.success) { toast.success('Password updated. You may sign in now.'); setOtpSent(false); }
    } catch (error) {
      toast.error(error.message || 'Verification failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Logo href="/" />
        <h1 className="text-2xl font-semibold text-foreground mt-8">Reset password</h1>
        <p className="text-sm text-muted mt-2 mb-8">We will send a verification code to your email.</p>

        <div className="card p-8">
          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="label">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-10" placeholder="you@company.com" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                {loading ? 'Sending...' : 'Send verification code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div><label className="label">Verification code</label>
                <input type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} className="input text-center tracking-wide" placeholder="000000" />
              </div>
              <div><label className="label">New password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input pl-10" placeholder="Minimum 8 characters" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">Update password</button>
            </form>
          )}
          <div className="text-center mt-6">
            <Link href="/login" className="text-sm text-muted hover:text-primary inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
