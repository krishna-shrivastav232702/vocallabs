import { NhostClient } from '@nhost/react';

// Singleton nhost client — used both server-side (cookie auth) and client-side.
// JWT is automatically attached to every GraphQL request by the nhost client;
// never set X-Hasura-User-Id manually in the frontend.
export const nhost = new NhostClient({
  subdomain: process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN!,
  region: process.env.NEXT_PUBLIC_NHOST_REGION!,
});
