import React, { useState } from 'react';
import type { Language } from '../types';
import { supabase } from '../utils/supabase';
import { ArrowUpRight, Mail, Lock, UserRound } from 'lucide-react';

interface AuthScreenProps { lang: Language; }

export const AuthScreen: React.FC<AuthScreenProps> = ({ lang }) => {
  const zh = lang === 'zh';
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name.trim() || email.split('@')[0] },
          },
        });
        if (authError) throw authError;
        setMessage(data.session
          ? (zh ? '注册成功，正在进入账本…' : 'Account created. Signing you in…')
          : (zh ? '注册成功！请打开邮箱中的验证链接，再回来登录。' : 'Sign-up complete. Verify your email, then sign in.'));
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (zh ? '操作失败，请重试。' : 'Something went wrong. Please try again.'));
    } finally { setBusy(false); }
  };

  const resetPassword = async () => {
    if (!supabase || !email) { setError(zh ? '请先填写邮箱。' : 'Enter your email first.'); return; }
    setBusy(true); setError(''); setMessage('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (resetError) setError(resetError.message);
    else setMessage(zh ? '密码重置链接已发送，请查看邮箱。' : 'Password reset link sent. Check your email.');
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-[#ededeb] flex items-center justify-center p-4 text-[#20241f]">
      <section className="w-full max-w-[420px] bg-white border border-[#e8ebe5] rounded-[20px] shadow-[0_18px_50px_rgba(0,0,0,0.08)] p-7 sm:p-9">
        <div className="flex items-center gap-2.5 font-semibold text-[17px] mb-8">
          <span className="w-8 h-8 rounded-[10px] bg-[#476f53] text-white flex items-center justify-center"><ArrowUpRight className="w-5 h-5" /></span>
          {zh ? '分账拍档' : 'TabMate'}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">{mode === 'login' ? (zh ? '欢迎回来' : 'Welcome back') : (zh ? '创建账号' : 'Create your account')}</h1>
        <p className="text-sm text-[#777e75] mb-6">{zh ? '登录后，在你的设备间同步账本。' : 'Sign in to sync your ledgers across devices.'}</p>

        <form onSubmit={submit} className="space-y-3.5">
          {mode === 'signup' && <label className="block relative"><UserRound className="absolute w-4 h-4 left-3 top-3 text-[#8c9489]" /><input value={name} onChange={e => setName(e.target.value)} placeholder={zh ? '昵称' : 'Display name'} className="w-full rounded-lg border border-[#e3e7e0] pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[#416f54]" autoComplete="nickname" /></label>}
          <label className="block relative"><Mail className="absolute w-4 h-4 left-3 top-3 text-[#8c9489]" /><input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Gmail / Email" className="w-full rounded-lg border border-[#e3e7e0] pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[#416f54]" autoComplete="email" /></label>
          <label className="block relative"><Lock className="absolute w-4 h-4 left-3 top-3 text-[#8c9489]" /><input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={zh ? '密码（至少 6 位）' : 'Password (at least 6 characters)'} className="w-full rounded-lg border border-[#e3e7e0] pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[#416f54]" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
          {error && <p role="alert" className="text-xs text-[#b34c3d] bg-[#fbefed] rounded-lg px-3 py-2">{error}</p>}
          {message && <p role="status" className="text-xs text-[#416f54] bg-[#edf4ee] rounded-lg px-3 py-2">{message}</p>}
          <button disabled={busy} className="w-full rounded-lg bg-[#416f54] hover:bg-[#365c46] disabled:opacity-60 text-white py-2.5 text-sm font-semibold transition-colors">{busy ? (zh ? '请稍候…' : 'Please wait…') : mode === 'login' ? (zh ? '邮箱登录' : 'Sign in') : (zh ? '注册并验证邮箱' : 'Create account')}</button>
        </form>
        {mode === 'login' && <button onClick={resetPassword} disabled={busy} className="mt-3 w-full text-xs text-[#777e75] hover:text-[#416f54]">{zh ? '忘记密码？发送重置邮件' : 'Forgot password? Send reset email'}</button>}
        <div className="mt-6 pt-5 border-t border-[#edf0eb] text-center text-sm text-[#777e75]">
          {mode === 'login' ? (zh ? '还没有账号？' : 'New to TabMate?') : (zh ? '已有账号？' : 'Already have an account?')}
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }} className="ml-1.5 font-semibold text-[#416f54] hover:underline">{mode === 'login' ? (zh ? '立即注册' : 'Sign up') : (zh ? '去登录' : 'Sign in')}</button>
        </div>
      </section>
    </div>
  );
};
