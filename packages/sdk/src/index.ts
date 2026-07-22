// @coinrithm/sdk — typed client for the CoinRithm Agent Trading API.
// Generated types come from the repository's OpenAPI 3.1 contract
// (openapi.yaml, contract version in info.version); the runtime is
// openapi-fetch, so every path, parameter and response body is checked
// against the contract at compile time.
//
// All trading on this surface is PAPER ONLY (virtual mUSD). Nothing here
// touches real money. Not financial advice.
import createOpenApiClient from 'openapi-fetch';
import type { paths } from './schema.js';

export type { paths } from './schema.js';
export type CoinRithmClient = ReturnType<typeof createClient>;

export type CreateClientOptions = {
  /** Personal API key from your CoinRithm profile (`crk_live_…`). */
  apiKey?: string;
  /** Defaults to the production API. */
  baseUrl?: string;
  /** Extra fetch options applied to every request. */
  fetch?: typeof globalThis.fetch;
};

export const PRODUCTION_BASE_URL = 'https://api.coinrithm.com';

/**
 * Create a typed CoinRithm client.
 *
 * ```ts
 * import { createClient } from '@coinrithm/sdk';
 *
 * const client = createClient({ apiKey: process.env.COINRITHM_API_KEY });
 * const { data, error } = await client.GET('/api/agent/portfolio');
 * ```
 */
export function createClient(options: CreateClientOptions = {}) {
  const { apiKey, baseUrl = PRODUCTION_BASE_URL, fetch } = options;
  return createOpenApiClient<paths>({
    baseUrl,
    ...(fetch ? { fetch } : {}),
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  });
}
