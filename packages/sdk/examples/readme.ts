// Compile-check for the code blocks in README.md.
//
// WHY THIS FILE EXISTS: the README's only write example used to be
// `POST /api/agent/orders/quote` with `{ coinId: 1, amountMusd: 100 }` — a
// path that is not in the contract, a numeric coinId where the contract says
// string, and a body field that does not exist instead of the required
// `quantity`. It shipped to npm that way. Three errors in the one snippet a
// new user copies first.
//
// Keep this file in sync with README.md: `npm run typecheck` compiles it, and
// `npm run build` does NOT (tsconfig.build.json excludes it), so nothing here
// reaches dist. If you change a README example, change it here too — a
// non-compiling example should fail the check, not the user.
import { createClient } from "../src/index.js";

const client = createClient({ apiKey: process.env.COINRITHM_API_KEY });

// --- "Use" block ---
const { data, error } = await client.GET("/api/agent/portfolio");
void data;
void error;

const quote = await client.POST("/api/agent/spot/quote", {
  body: { coinId: "1", side: "buy", quantity: 0.01 },
});
void quote;

const movers = await client.GET("/api/coins/top-gainers", {
  params: { query: { limit: 20 } },
});
void movers;

// --- "Streaming" block: the parseAs escape hatch must stay typed ---
const stream = await client.GET("/api/prediction-markets/stream", {
  parseAs: "stream",
});
void stream;
