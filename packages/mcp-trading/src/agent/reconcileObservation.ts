// Owns closed-trade accounting, sync progress and bounded trade memory.
// Call once per deduplicated observation, before capturing observed evidence
// and evaluating drawdown. It does not decide whether observation reads succeeded.
import type { RunState, Observation } from "./types.js";
import { accrueRealized } from "./state.js";
import { asObj, asNum, asStr } from "./extract.js";

export function reconcileObservation(
  state: RunState,
  observation: Observation,
): void {
  accrueRealized(state, observation.newClosedTrades);
  state.cursor = observation.syncCursor;
  for (const t of observation.newClosedTrades) {
    state.seen.push(
      `${asStr(asObj(t).venue) ?? "futures"}:${asNum(asObj(t).id) ?? String(asObj(t).id)}`,
    );
  }
  state.seen = state.seen.slice(-500);

  // Slice-3 reflection: journal closed-trade OUTCOMES (not just opens) so the agent
  // remembers how its theses RESOLVED — a stop-out it should not revenge-trade, a
  // winner its style works on. Defensive field reads (the /trades shape varies);
  // a partial entry is harmless, a missing one is skipped.
  for (const t of observation.newClosedTrades.slice(-5)) {
    const o = asObj(t);
    const sym = asStr(o.symbol) ?? asStr(o.coinSymbol) ?? asStr(o.coinId);
    const pnl =
      asNum(o.realizedPnlMusd) ??
      asNum(o.pnlMusd) ??
      asNum(o.realizedPnl) ??
      asNum(o.pnl);
    const side = asStr(o.side);
    if (sym || pnl != null) {
      const did =
        `closed ${side ?? ""} ${sym ?? "position"}`.trim() +
        (pnl != null
          ? `: ${pnl >= 0 ? "+" : ""}${Math.round(pnl)}mUSD ${pnl >= 0 ? "WIN" : "LOSS"}`
          : "");
      state.journal = [
        ...(state.journal ?? []),
        { at: observation.asOf, did },
      ].slice(-12);
    }
  }
}
