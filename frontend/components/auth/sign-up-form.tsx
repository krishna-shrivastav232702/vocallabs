'use client';

import { useState, useEffect } from 'react';
import { useSignUpEmailPassword, useAuthenticationStatus } from '@nhost/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const { signUpEmailPassword, isLoading, isError, error } = useSignUpEmailPassword();
  const { isAuthenticated } = useAuthenticationStatus();
  const router = useRouter();

  // Auto-redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await signUpEmailPassword(email, password, {
      displayName,
    });
    if (result.isSuccess) {
      toast.success('Account created! Please check your email to verify your account.');
      router.replace('/sign-in');
    } else if (result.needsEmailVerification) {
      toast.info('Check your email to verify your account before signing in.');
      router.replace('/sign-in');
    } else {
      toast.error(result.error?.message ?? 'Sign up failed. Please try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="signup-name"
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Name
        </label>
        <input
          id="signup-name"
          type="text"
          autoComplete="name"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            outline: 'none',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
          placeholder="Your name"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="signup-email"
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Email
        </label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm"
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
          htmlFor="signup-password"
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Password
          <span className="ml-1 font-normal" style={{ color: 'var(--color-text-tertiary)' }}>
            (min. 9 characters)
          </span>
        </label>
        <input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={9}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm"
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
          {error?.message ?? 'Sign up failed'}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-1"
        style={{ background: 'var(--color-accent)' }}
      >
        {isLoading ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
