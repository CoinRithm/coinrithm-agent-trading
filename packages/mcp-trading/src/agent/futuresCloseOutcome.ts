import type { ApiResult, ProposedAction } from "./types.js";
import { asObj } from "./extract.js";

/** Future v2 producer contract; legacy responses retain their existing res.ok
 * meaning. A filled exit closes exposure, even while accounting remains pending. */
export function executionOutcome(action: ProposedAction, result: ApiResult) {
  const body = asObj(result.data);
  if (
    action.type !== "futures_close" ||
    body.executionModel !== "hl_paper_v2"
  ) {
    return {
      executed: result.ok,
      pending: false,
      newWrite: result.ok,
      v2: false,
      replayed: false,
    };
  }
  const intent = asObj(body.intent);
  const common =
    result.ok &&
    Number.isSafeInteger(body.positionId) &&
    body.positionId === action.positionId &&
    (action.fraction === undefined || action.fraction === 1) &&
    body.accepted === true &&
    typeof body.replayed === "boolean" &&
    typeof intent.id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      intent.id,
    );
  const pending =
    !!common &&
    result.status === 202 &&
    body.executed === false &&
    typeof intent.status === "string" &&
    typeof body.accountingStatus === "string" &&
    ["pending", "leased", "retry", "manual_attention"].includes(
      intent.status,
    ) &&
    ["open", "pending", "manual_attention"].includes(body.accountingStatus);
  const executed =
    !!common &&
    result.status === 200 &&
    body.executed === true &&
    intent.status === "filled" &&
    typeof body.accountingStatus === "string" &&
    ["pending", "settled", "manual_attention"].includes(body.accountingStatus);
  return {
    executed,
    pending,
    newWrite: (executed || pending) && body.replayed === false,
    v2: true,
    replayed: body.replayed === true,
  };
}

export function exitOutcomeMetadata(
  outcome: ReturnType<typeof executionOutcome>,
) {
  return outcome.v2
    ? {
        executionPending: outcome.pending,
        executionReplayed: outcome.replayed,
        writeRecorded: outcome.newWrite,
      }
    : {};
}
