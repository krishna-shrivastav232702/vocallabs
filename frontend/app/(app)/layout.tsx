'use client';

import { useAuthenticationStatus } from '@nhost/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { QuotaBar } from '@/components/layout/quota-bar';
import { OrgContextProvider } from '@/components/providers/org-context';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const router = useRouter();

  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  if (isLoading) {
    // Full-screen skeleton while auth resolves — prevents layout shift
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg"
            style={{ background: 'var(--color-accent)', opacity: 0.2 }}
          />
          <div className="skeleton h-3 w-20 rounded" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <OrgContextProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        <Header />
        <QuotaBar />
        <main className="flex-1 overflow-auto" style={{ background: 'var(--color-bg)' }}>
          {children}
        </main>
      </div>
    </OrgContextProvider>
  );
}
