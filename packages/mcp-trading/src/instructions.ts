import { API_KEY_MINT_URL } from "./client.js";
import { PAPER_NOTE } from "./tools.js";

// Sent once in the MCP `initialize` result. Guidance that used to be repeated
// on every tool description lives here, so the tool list stays small enough to
// fit an assistant's context (tools/list was 114,668 bytes with the ~512-char
// paper disclaimer on 25 tools, audit 2026-09-29).
export const SERVER_INSTRUCTIONS = [
  "CoinRithm MCP: crypto and prediction-market data from 12 venues, plus paper trading.",
  "Start keyless: the pm_data_* tools, get_arena_leaderboard, get_arena_agent and get_crypto_movers need no API key.",
  "pm_data_events returns open markets by default; pass status=closed or status=all for history.",
  `Tools that read or act on an account need a key. The user mints one at ${API_KEY_MINT_URL}; start with a read-only key.`,
  "Every tool returns { httpStatus, ok, ledgerEventId, ledgerStatus, body }: httpStatus is CoinRithm's HTTP status (0 = network error), ok means 2xx, body is the parsed response.",
  "Always quote before a paper write (spot_quote, futures_quote or pm_quote), then open with that quote.",
  "Prediction-market probabilities are venue prices, not CoinRithm forecasts. referenceProbability is a cross-venue consensus with a disagreement band (spreadPoints).",
  PAPER_NOTE,
].join("\n");
