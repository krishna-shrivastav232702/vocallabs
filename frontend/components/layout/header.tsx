'use client';

import { useState } from 'react';
import { useSignOut, useUserData } from '@nhost/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ROLE_BADGE_CONFIG } from '@/lib/utils';
import type { OrgRole, Org } from '@/lib/types';
import { useOrgContext } from '@/components/providers/org-context';
import { ChevronDown, LogOut, User, Zap } from 'lucide-react';

export function Header() {
  const user = useUserData();
  const { signOut } = useSignOut();
  const router = useRouter();
  const { orgId, setOrgId, role, orgs } = useOrgContext();
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const currentMember = orgs.find((m) => m.org.id === orgId) ?? orgs[0];
  const currentOrg = currentMember?.org;
  const currentRole = (currentMember?.role ?? role) as OrgRole;
  const roleConfig = ROLE_BADGE_CONFIG[currentRole] ?? ROLE_BADGE_CONFIG.viewer;

  async function handleSignOut() {
    await signOut();
    toast.success('Signed out');
    router.replace('/sign-in');
  }

  return (
    <header
      className="h-14 flex items-center justify-between px-4 border-b shrink-0"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Left: Logo + Org switcher */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'var(--color-accent)' }}
            aria-hidden="true"
          >
            S
          </div>
          <span className="font-semibold text-sm hidden sm:block" style={{ color: 'var(--color-text-primary)' }}>
            Synflow
          </span>
        </Link>

        <div className="w-px h-5 hidden sm:block" style={{ background: 'var(--color-border)' }} />

        {/* Org switcher */}
        <div className="relative">
          <button
            id="org-switcher"
            onClick={() => setOrgMenuOpen((o) => !o)}
            aria-haspopup="true"
            aria-expanded={orgMenuOpen}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--color-surface-2)]"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <Zap className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
            <span className="max-w-[140px] truncate">{currentOrg?.name ?? 'Select org'}</span>
            <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--color-text-tertiary)' }} />
          </button>

          {orgMenuOpen && orgs.length > 0 && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOrgMenuOpen(false)} />
              <div
                className="absolute top-full left-0 mt-1 w-56 rounded-xl py-1 z-20 shadow-lg"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-lg)',
                }}
                role="menu"
              >
                {orgs.map((m) => (
                  <button
                    key={m.org.id}
                    role="menuitem"
                    onClick={() => {
                      setOrgId(m.org.id);
                      setOrgMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[var(--color-surface-2)] transition-colors"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    <span className="truncate">{m.org.name}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${ROLE_BADGE_CONFIG[m.role].className}`}
                    >
                      {ROLE_BADGE_CONFIG[m.role].label}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Role badge + user menu */}
      <div className="flex items-center gap-3">
        <span
          className={`hidden sm:inline-flex items-center text-xs px-2 py-1 rounded-md font-medium ${roleConfig.className}`}
        >
          {roleConfig.label}
        </span>

        <div className="relative">
          <button
            id="user-menu"
            onClick={() => setUserMenuOpen((o) => !o)}
            aria-haspopup="true"
            aria-expanded={userMenuOpen}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors"
            style={{
              background: 'var(--color-accent-subtle)',
              color: 'var(--color-accent-text)',
              border: '1px solid var(--color-accent-border)',
            }}
            title={user?.displayName ?? user?.email ?? 'Account'}
          >
            {user?.displayName?.charAt(0).toUpperCase() ?? user?.email?.charAt(0).toUpperCase() ?? <User className="w-4 h-4" />}
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
              <div
                className="absolute top-full right-0 mt-1 w-52 rounded-xl py-1 z-20"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-lg)',
                }}
                role="menu"
              >
                <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {user?.displayName ?? 'User'}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                    {user?.email}
                  </p>
                </div>
                <button
                  role="menuitem"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--color-surface-2)] transition-colors"
                  style={{ color: 'var(--color-failed)' }}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
