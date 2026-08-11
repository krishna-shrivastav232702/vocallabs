import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SignInForm } from '@/components/auth/sign-in-form';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Synflow account',
};

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm">
        {/* Logo mark */}
        <div className="flex items-center gap-2.5 mb-8">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
            style={{ background: 'var(--color-accent)' }}
          >
            S
          </div>
          <span className="font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>
            Synflow
          </span>
        </div>

        <div className="surface p-6">
          <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            Welcome back
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            Sign in to your account to continue
          </p>
          <Suspense fallback={<div className="h-40" />}>
            <SignInForm />
          </Suspense>
        </div>

        <p className="text-center text-sm mt-4" style={{ color: 'var(--color-text-tertiary)' }}>
          Don&apos;t have an account?{' '}
          <a href="/sign-up" style={{ color: 'var(--color-accent-text)' }} className="font-medium hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
