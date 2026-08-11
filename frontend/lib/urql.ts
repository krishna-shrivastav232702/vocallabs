import {
  createClient,
  cacheExchange,
  fetchExchange,
  subscriptionExchange,
  type Client,
} from 'urql';
import { createClient as createWSClient } from 'graphql-ws';

let _client: Client | null = null;

import { nhost } from './nhost';

function getGraphqlUrl(): string {
  return nhost.graphql.httpUrl;
}

function getWsUrl(): string {
  return nhost.graphql.wsUrl;
}

export function createUrqlClient(accessToken?: string): Client {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const wsClient = createWSClient({
    url: getWsUrl(),
    connectionParams: () => ({
      headers,
    }),
    shouldRetry: () => true,
    retryAttempts: Infinity,
    retryWait: async (retries) => {
      // Exponential back-off: 1s, 2s, 4s… capped at 30s
      const delay = Math.min(1000 * 2 ** retries, 30_000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    },
  });

  return createClient({
    url: getGraphqlUrl(),
    fetchOptions: { method: 'POST', headers },
    preferGetMethod: false,
    exchanges: [
      cacheExchange,
      fetchExchange,
      subscriptionExchange({
        forwardSubscription(request) {
          const input = { ...request, query: request.query ?? '' };
          return {
            subscribe(sink) {
              const unsubscribe = wsClient.subscribe(input, sink);
              return { unsubscribe };
            },
          };
        },
      }),
    ],
  });
}

// Singleton for client-side use; recreated when auth token changes.
export function getUrqlClient(accessToken?: string): Client {
  if (!_client) {
    _client = createUrqlClient(accessToken);
  }
  return _client;
}

export function resetUrqlClient(): void {
  _client = null;
}
