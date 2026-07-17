'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { login } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('wbr_token')) {
      router.replace('/dashboard');
      return;
    }
    emailRef.current?.focus();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await login(email.trim(), password);
      localStorage.setItem('wbr_token', token);
      localStorage.setItem('wbr_role', user.role ?? 'viewer');
      document.cookie = `wbr_token=${token}; path=/; max-age=28800; SameSite=Lax`;
      router.replace('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <Image src="/kutlerri-logo.png" alt="Kutlerri" width={160} height={54} className="login-logo" style={{ height: 54, width: 'auto' }} />

      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-title">RASA Analytics</div>
        <div className="login-sub">Financial Dashboard</div>

        <label className="login-label" htmlFor="login-email">Email</label>
        <input
          id="login-email"
          ref={emailRef}
          type="email"
          className="login-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <label className="login-label" htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          className="login-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        {error && <div className="login-error">{error}</div>}

        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
