'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from 'urql';
import { useAuthenticationStatus } from '@nhost/react';
import { GET_MY_ORGS } from '@/lib/graphql/queries';
import type { OrgRole, Org } from '@/lib/types';

interface OrgContextValue {
  orgId: string;
  setOrgId: (id: string) => void;
  role: OrgRole | undefined;
  isLoading: boolean;
  hasNoOrg: boolean;         // authenticated but zero org memberships
  orgError: string | null;   // query-level error message
  orgs: Array<{ role: OrgRole; org: Org }>;
}

const OrgContext = createContext<OrgContextValue>({
  orgId: '',
  setOrgId: () => {},
  role: undefined,
  isLoading: true,
  hasNoOrg: false,
  orgError: null,
  orgs: [],
});

export function OrgContextProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthenticationStatus();
  const [orgId, setOrgId] = useState('');

  const [{ data, fetching, error }] = useQuery({
    query: GET_MY_ORGS,
    pause: !isAuthenticated,
    // Always refetch from network — don't rely on stale cache after login
    requestPolicy: 'network-only',
  });

  // Map the new response shape { organizations: [{ ..., org_members: [{ role }] }] }
  // to the internal array structure { role, org }
  const rawOrgs = data?.organizations ?? [];
  const orgMembers: Array<{ role: OrgRole; org: Org }> = rawOrgs.map((org: any) => ({
    role: org.org_members?.[0]?.role ?? 'viewer',
    org: {
      id: org.id,
      name: org.name,
      quota_limit: org.quota_limit,
      quota_usage: org.quota_usage,
    },
  }));

  // Auto-select the first org once data arrives
  useEffect(() => {
    if (!orgId && orgMembers[0]?.org?.id) {
      setOrgId(orgMembers[0].org.id);
    }
  }, [orgMembers, orgId]);

  const currentMember = orgMembers.find((m) => m.org.id === orgId);
  const role = currentMember?.role as OrgRole | undefined;

  const isLoading = isAuthenticated && fetching;
  const hasNoOrg = isAuthenticated && !fetching && !error && orgMembers.length === 0;
  const orgError = error?.message ?? null;

  return (
    <OrgContext.Provider
      value={{ orgId, setOrgId, role, isLoading, hasNoOrg, orgError, orgs: orgMembers }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrgContext(): OrgContextValue {
  return useContext(OrgContext);
}
