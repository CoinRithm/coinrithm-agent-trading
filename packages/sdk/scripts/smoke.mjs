// Live-contract smoke: the built client must wire baseUrl + auth headers and
// speak to the real API. Without a key the agent surface answers 401 with a
// JSON error body — that round-trip proves the client, not the account.
import { createClient, PRODUCTION_BASE_URL } from '../dist/index.js';

const client = createClient();
const { response, error } = await client.GET('/api/agent/me');
if (response.status !== 401) {
  console.error(`expected 401 without a key, got ${response.status}`);
  process.exit(1);
}
if (!error || typeof error !== 'object') {
  console.error('expected a JSON error body on 401');
  process.exit(1);
}
console.log(`smoke OK — ${PRODUCTION_BASE_URL} answered 401 with a JSON body for an unauthenticated /api/agent/me`);
