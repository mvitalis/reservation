import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from './supabaseClient';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [readyForReset, setReadyForReset] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || session) {
        setReadyForReset(true);
      }
      setCheckingSession(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        setReadyForReset(true);
      }
      setCheckingSession(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (password.length < 6) {
      setStatusMsg({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    if (password !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setStatusMsg({
        type: 'success',
        text: 'Your password has been updated! Redirecting to login...',
      });
      setPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Failed to update password. The reset link may have expired.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 text-slate-900 dark:text-slate-100">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-md max-w-md w-full p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2">
          <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Set New Password</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose a strong password for your account
            </p>
          </div>
        </div>

        {statusMsg && (
          <div
            className={`p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-medium border ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {checkingSession ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Verifying recovery link...</p>
        ) : !readyForReset ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Invalid or expired reset session. Please request a new password reset link from the login page.
            </p>
            <Link
              to="/login"
              className="inline-block w-full text-center py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;