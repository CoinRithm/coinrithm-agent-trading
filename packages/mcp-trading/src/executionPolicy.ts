// Mirror of the backend paper-execution policy. This package is published
// standalone and cannot import the backend, so the versioned policy name is
// mirrored here as the SINGLE place any package text that mentions execution
// cost refers to. That is what stops a served/tool description from drifting
// back into a "costless" claim while the backend charges real modeled costs.
//
// It deliberately does NOT restate the fee/spread/slippage bps — those live in
// the backend SSOT and are disclosed per fill in the response `executionModel`
// and in the OpenAPI cost-model description. Text points THERE instead of
// duplicating numbers that could silently diverge.
//
// Drift-tested in executionPolicy.test.ts: the summary names the versioned
// policy and never matches the costless regex.
export const PAPER_EXECUTION_VERSION = "paper_execution_v1";

export const EXECUTION_POLICY_SUMMARY =
  "Paper execution is not costless: every fill runs under the versioned " +
  `${PAPER_EXECUTION_VERSION} policy — a disclosed taker fee (plus, on spot ` +
  "market orders and PM entries, an adverse spread and size-based slippage; " +
  "futures charge the taker fee and do not model funding) folded into realized " +
  "PnL, so reported PnL is net of modeled costs. The exact per-fill amounts are " +
  "disclosed in each quote/trade `executionModel`; see the OpenAPI cost-model " +
  "description for the bps. A rehearsal cost model, not an exchange-fill guarantee.";
