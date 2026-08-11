'use client';

import { useMemo } from 'react';
import { Provider } from 'urql';
import { useAccessToken } from '@nhost/react';
import { createUrqlClient } from '@/lib/urql';

export function UrqlProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAccessToken();

  // Recreate the urql client whenever the access token changes (login/logout/refresh).
  // This ensures subscriptions re-establish with the new JWT.
  const client = useMemo(() => {
    return createUrqlClient(accessToken ?? undefined);
  }, [accessToken]);

  return <Provider value={client}>{children}</Provider>;
}
