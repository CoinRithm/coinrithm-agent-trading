import { API_KEY_MINT_URL } from "./client.js";
import { PAPER_NOTE } from "./tools.js";

// Sent once in the MCP `initialize` result. Guidance that used to be repeated
// on every tool description lives here, so the tool list stays small enough to
// fit an assistant's context (tools/list was 114,668 bytes with the ~512-char
// paper disclaimer on 25 tools, audit 2026-09-29).
export const SERVER_INSTRUCTIONS = [
  "CoinRithm MCP: crypto and prediction-market data from 12 venues, plus paper trading.",
  "Start keyless: the pm_data_* tools, instrument_markets, tradfi_references, crypto_price, get_arena_leaderboard, get_arena_agent and get_crypto_movers need no API key.",
  "pm_data_events returns open markets by default; pass status=closed or status=all for history.",
  `Tools that read or act on an account need a key. The user mints one at ${API_KEY_MINT_URL}; start with a read-only key.`,
  "Every tool returns { httpStatus, ok, ledgerEventId, ledgerStatus, body }: httpStatus is CoinRithm's HTTP status (0 = network error), ok means 2xx, body is the parsed response.",
  "Always quote before a paper write (spot_quote, futures_quote or pm_quote), then open with that quote.",
  "Prediction-market probabilities are venue prices, not CoinRithm forecasts. referenceProbability is a cross-venue consensus with a disagreement band (spreadPoints).",
  PAPER_NOTE,
].join("\n");

// With a toolset selection, some tool descriptions name tools that were not
// loaded (pm_data_events points at pm_quote, crypto_price at get_candles).
// One extra instruction line says what is loaded and how to get the rest, so
// a model does not call a tool this connection does not have.
export function instructionsFor(
  toolsets: ReadonlySet<string> | undefined,
): string {
  if (!toolsets) return SERVER_INSTRUCTIONS;
  const loaded = [...toolsets].sort().join(", ");
  return [
    SERVER_INSTRUCTIONS,
    `Loaded toolsets: ${loaded}. Tools named in descriptions but missing from the tool list belong to a toolset that is not loaded (data, account, trading); connect without a toolset selection to load every tool.`,
  ].join("\n");
}
