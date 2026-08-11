import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { NhostProvider } from '@/components/providers/nhost-provider';
import { UrqlProvider } from '@/components/providers/urql-provider';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { template: '%s — Synflow', default: 'Synflow' },
  description: 'Build, run, and monitor AI agent workflows with real-time step visibility.',
  keywords: ['AI workflows', 'agent automation', 'workflow builder'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="h-full">
        <NhostProvider>
          <UrqlProvider>
            {children}
          </UrqlProvider>
        </NhostProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
            },
          }}
        />
      </body>
    </html>
  );
}
