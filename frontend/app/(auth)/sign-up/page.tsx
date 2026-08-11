import type { Metadata } from 'next';
import { SignUpForm } from '@/components/auth/sign-up-form';

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create your Synflow account',
};

export default function SignUpPage() {
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
            Create an account
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            Get started with Synflow for free
          </p>
          <SignUpForm />
        </div>

        <p className="text-center text-sm mt-4" style={{ color: 'var(--color-text-tertiary)' }}>
          Already have an account?{' '}
          <a href="/sign-in" style={{ color: 'var(--color-accent-text)' }} className="font-medium hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
