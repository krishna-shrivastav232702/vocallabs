'use client';

import { useState, useEffect } from 'react';
import { useSignInEmailPassword, useAuthenticationStatus } from '@nhost/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signInEmailPassword, isLoading, isError, error } = useSignInEmailPassword();
  const { isAuthenticated } = useAuthenticationStatus();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auto-redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      const next = searchParams.get('next') || '/dashboard';
      router.replace(next);
    }
  }, [isAuthenticated, router, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await signInEmailPassword(email, password);
    if (result.isSuccess) {
      const next = searchParams.get('next') || '/dashboard';
      router.replace(next);
    } else {
      toast.error(result.error?.message ?? 'Sign in failed. Please check your credentials.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="signin-email"
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Email
        </label>
        <input
          id="signin-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm transition-colors"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            outline: 'none',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
          placeholder="you@company.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="signin-password"
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Password
        </label>
        <input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm transition-colors"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            outline: 'none',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
          placeholder="••••••••••"
        />
      </div>

      {isError && (
        <p
          className="text-sm px-3 py-2 rounded-lg"
          style={{
            color: 'var(--color-failed)',
            background: 'var(--color-failed-bg)',
            border: '1px solid var(--color-failed-border)',
          }}
          role="alert"
        >
          {error?.message ?? 'Sign in failed'}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-1"
        style={{
          background: isLoading ? 'var(--color-accent-hover)' : 'var(--color-accent)',
        }}
      >
        {isLoading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
