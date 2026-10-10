// Operator-only, create-only provisioning. Never imported by the scheduler.
// A replay verifies durable identity; it never funds, resets, revives or rekeys it.
import { createHash, randomBytes } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import {
  buildSpec,
  validateSkill,
  parseCadenceMs,
  makeRunId,
  newState,
  type AgentSpec,
} from "@coinrithm/mcp-trading/engine";
import { encrypt, decrypt, secretEquals } from "./crypto.js";
import { assertOperatorConnection } from "./operatorConnection.js";

const VERSION = "pm_paper_house_identity_v1";
const SIGNUP = "pm-paper-house-v1";
const INITIAL_CASH = 50_000;
const CASH_COIN = "825";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
export class PmHouseIdentityError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}
const refuse = (code: string): never => {
  throw new PmHouseIdentityError(code);
};
function canonical(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value))
    return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length)
      return refuse("invalid_plan_json");
    return `[${value.map(canonical).join(",")}]`;
  }
  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  )
    return `{${Object.keys(value)
      .sort()
      .map(
        (k) =>
          `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`,
      )
      .join(",")}}`;
  return refuse("invalid_plan_json");
}

export interface PmHouseTarget {
  database: string;
  systemIdentifier: string;
  serverVersionNum: number;
}
export interface PmHousePlanInput {
  handle: string;
  displayName: string;
  agentPublic: boolean;
  target: PmHouseTarget;
  raw: Record<string, unknown>;
  prose: string;
}
export interface PmHousePlan extends PmHousePlanInput {
  version: typeof VERSION;
  email: string;
  spec: AgentSpec;
  cadenceSeconds: number;
  startingEquityMusd: 50000;
  cashCoinId: "825";
  initialStatus: "paused";
  initialLive: false;
  entryEnabled: false;
  planHash: string;
}
export function planPmPaperHouse(input: PmHousePlanInput): PmHousePlan {
  const encoded = canonical(input);
  if (Buffer.byteLength(encoded) > 131072) return refuse("plan_too_large");
  if (
    !/^pm-v2-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.handle) ||
    input.handle.length > 48
  )
    return refuse("invalid_new_house_handle");
  if (
    typeof input.displayName !== "string" ||
    !input.displayName.trim() ||
    input.displayName.length > 80 ||
    [...input.displayName].some((character) => character.charCodeAt(0) < 32)
  )
    return refuse("invalid_display_name");
  if (typeof input.agentPublic !== "boolean")
    return refuse("explicit_public_choice_required");
  if (
    !input.target ||
    typeof input.target.database !== "string" ||
    typeof input.target.systemIdentifier !== "string" ||
    !/^[a-zA-Z0-9_-]{1,63}$/.test(input.target.database) ||
    !/^\d{1,20}$/.test(input.target.systemIdentifier) ||
    !Number.isSafeInteger(input.target.serverVersionNum) ||
    input.target.serverVersionNum < 170000 ||
    input.target.serverVersionNum >= 180000
  )
    return refuse("invalid_target");
  if (
    typeof input.prose !== "string" ||
    !input.prose.trim() ||
    input.prose.length > 65536
  )
    return refuse("invalid_prose");
  const raw = JSON.parse(canonical(input.raw)) as Record<string, unknown>;
  const rawModel = raw.model;
  if (!rawModel || typeof rawModel !== "object" || Array.isArray(rawModel))
    return refuse("explicit_model_required");
  const modelChoice = rawModel as Record<string, unknown>;
  if (
    typeof modelChoice.provider !== "string" ||
    typeof modelChoice.name !== "string" ||
    !modelChoice.name.trim()
  )
    return refuse("explicit_model_required");
  const spec = buildSpec(raw);
  if (!validateSkill({ raw, spec, body: input.prose }, "hosted").valid)
    return refuse("invalid_hosted_definition");
  if (spec.venues.length !== 1 || spec.venues[0] !== "pm")
    return refuse("pm_only_required");
  if (
    !spec.model ||
    spec.model.provider === "mechanical" ||
    !spec.model.name.trim()
  )
    return refuse("explicit_model_required");
  const cadence = parseCadenceMs(spec.trigger.cadence);
  if (
    cadence === null ||
    cadence < 60000 ||
    cadence > 86400000 ||
    cadence % 1000
  )
    return refuse("invalid_cadence");
  const body = {
    version: VERSION,
    handle: input.handle,
    displayName: input.displayName,
    agentPublic: input.agentPublic,
    target: { ...input.target },
    raw,
    prose: input.prose,
    email: `${input.handle}@paper-agents.coinrithm.invalid`,
    // Strip optional undefineds from the existing spec builder before hashing.
    spec: JSON.parse(JSON.stringify(spec)) as AgentSpec,
    cadenceSeconds: cadence / 1000,
    startingEquityMusd: INITIAL_CASH,
    cashCoinId: CASH_COIN,
    initialStatus: "paused",
    initialLive: false,
    entryEnabled: false,
  } as const;
  return { ...body, planHash: sha(canonical(body)) };
}

export interface PmHouseIdentity {
  userId: number;
  apiKeyId: number;
  walletId: number;
  houseAgentId: number;
}
export interface PmHouseProvisionResult {
  action: "created" | "replayed";
  planHash: string;
  identity: PmHouseIdentity;
  // Initial plan facts, not a read of current API/scheduler environment.
  provisioningOnly: true;
  enrollmentApplied: false;
  initialEntryEnabled: false;
  currentEnrollment: "not_read";
  status: string;
  live: boolean;
}
function id(value: unknown): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > 2147483647)
    return refuse("identity_out_of_range");
  return n;
}
function mintKey() {
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let n = BigInt(`0x${randomBytes(32).toString("hex")}`);
  let base62 = "";
  do {
    base62 = alphabet[Number(n % 62n)] + base62;
    n /= 62n;
  } while (n);
  const core = `crk_live_${base62}`;
  const raw = `${core}_${sha(core).slice(0, 6)}`;
  return { raw, hash: sha(raw), prefix: raw.slice(0, 17) };
}

async function checkTarget(db: PoolClient, target: PmHouseTarget) {
  await assertOperatorConnection(db, "seedPmPaperHouseIdentity");
  const { rows } = await db.query<{
    role: string;
    database: string;
    version: number;
    system: string;
  }>(
    `SELECT current_user AS role, current_database() AS database,
      current_setting('server_version_num')::int AS version,
      system_identifier::text AS system FROM pg_control_system()`,
  );
  const r = rows[0];
  if (!r || ["coinrithm_app", "coinrithm_scheduler"].includes(r.role))
    return refuse("operator_role_required");
  if (
    r.database !== target.database ||
    r.version !== target.serverVersionNum ||
    r.system !== target.systemIdentifier
  )
    return refuse("target_mismatch");
  const coin = await db.query(
    `SELECT ucid FROM public."Coin" WHERE ucid=$1 AND symbol='USDT'`,
    [CASH_COIN],
  );
  if (coin.rowCount !== 1) return refuse("cash_coin_identity_mismatch");
}

async function replay(
  db: PoolClient,
  agent: Record<string, unknown>,
  plan: PmHousePlan,
  masterKey: Buffer,
): Promise<PmHouseProvisionResult> {
  const manifest = agent.manifest as {
    pmPaperHouseIdentity?: {
      version?: string;
      planHash?: string;
      userId?: number;
      apiKeyId?: number;
      walletId?: number;
      assetId?: number;
    };
  } | null;
  const receipt = manifest?.pmPaperHouseIdentity;
  if (receipt?.version !== VERSION || receipt.planHash !== plan.planHash)
    return refuse("existing_handle_conflict");
  const identity = {
    userId: id(receipt.userId),
    apiKeyId: id(receipt.apiKeyId),
    walletId: id(receipt.walletId),
    houseAgentId: id(agent.id),
  };
  if (
    id(agent.owner_user_id) !== identity.userId ||
    agent.is_house !== true ||
    agent.plan !== "house" ||
    agent.display_name !== plan.displayName ||
    canonical(agent.spec) !== canonical(plan.spec) ||
    agent.prose !== plan.prose ||
    agent.model_provider !== plan.spec.model!.provider ||
    agent.model_name !== plan.spec.model!.name ||
    agent.model_base_url !== (plan.spec.model!.baseUrl ?? null) ||
    agent.cadence_seconds !== plan.cadenceSeconds
  )
    return refuse("persisted_agent_drift");
  const result = await db.query<Record<string, unknown>>(
    `SELECT u.email,u.username,u.password,u."signupMethod",u."emailVerified",u."isActive" AS user_active,
      k."keyHash",k."keyPrefix",k.scopes,k."agentPublic",k."revokedAt",
      w."isActive" AS wallet_active,w.type,w."startingEquityMusd",a.id AS asset_id
     FROM public."User" u JOIN public."ApiKey" k ON k."userId"=u.id AND k.id=$2
     JOIN public."Wallet" w ON w."userId"=u.id AND w."apiKeyId"=k.id AND w.id=$3
     JOIN public."WalletAsset" a ON a."walletId"=w.id AND a."coinId"=$4
     WHERE u.id=$1 FOR UPDATE OF u,k,w,a`,
    [identity.userId, identity.apiKeyId, identity.walletId, CASH_COIN],
  );
  const r = result.rows[0];
  if (
    !r ||
    result.rowCount !== 1 ||
    r.email !== plan.email ||
    r.username !== plan.handle ||
    r.signupMethod !== SIGNUP ||
    r.emailVerified !== null ||
    typeof r.password !== "string" ||
    !/^pm-house-login-disabled:[a-f0-9]{64}$/.test(r.password) ||
    r.user_active !== true ||
    r.wallet_active !== true ||
    r.type !== "mock_spot" ||
    r.startingEquityMusd !== INITIAL_CASH ||
    id(r.asset_id) !== id(receipt.assetId) ||
    r.agentPublic !== plan.agentPublic ||
    canonical(r.scopes) !== canonical(["read", "trade:pm"])
  )
    return refuse("persisted_identity_drift");
  let raw: string;
  try {
    raw = decrypt(String(agent.coinrithm_key_enc), masterKey);
  } catch {
    return refuse("key_envelope_mismatch");
  }
  if (
    !secretEquals(sha(raw), String(r.keyHash)) ||
    r.keyPrefix !== raw.slice(0, 17)
  )
    return refuse("key_identity_mismatch");
  const state = await db.query(
    `SELECT agent_id FROM agent_runtime.agent_state WHERE agent_id=$1`,
    [identity.houseAgentId],
  );
  const oauth = await db.query(
    `SELECT id FROM public."Account" WHERE "userId"=$1 LIMIT 1`,
    [identity.userId],
  );
  if (state.rowCount !== 1 || oauth.rowCount !== 0)
    return refuse("persisted_identity_drift");
  return {
    action: "replayed",
    planHash: plan.planHash,
    identity,
    enrollmentApplied: false,
    provisioningOnly: true,
    initialEntryEnabled: false,
    currentEnrollment: "not_read",
    status: String(agent.status),
    live: agent.live === true,
  };
}

// Call only from the explicit operator CLI. Commit ambiguity is returned as an
// error, never automatically retried; the same reviewed plan can reconcile it.
export async function provisionPmPaperHouse(
  pool: Pool,
  input: PmHousePlan,
  expectedPlanHash: string,
  masterKey: Buffer,
): Promise<PmHouseProvisionResult> {
  const plan = planPmPaperHouse({
    handle: input.handle,
    displayName: input.displayName,
    agentPublic: input.agentPublic,
    target: input.target,
    raw: input.raw,
    prose: input.prose,
  });
  if (
    !/^[a-f0-9]{64}$/.test(expectedPlanHash) ||
    plan.planHash !== expectedPlanHash ||
    canonical(input) !== canonical(plan)
  )
    return refuse("reviewed_plan_mismatch");
  if (!Buffer.isBuffer(masterKey) || masterKey.length !== 32)
    return refuse("master_key_required");
  const db = await pool.connect();
  let begun = false;
  let committing = false;
  let discard = false;
  try {
    await db.query("BEGIN");
    begun = true;
    await db.query(
      "SET LOCAL lock_timeout='2s'; SET LOCAL statement_timeout='5s'; SET LOCAL idle_in_transaction_session_timeout='10s'; SET LOCAL transaction_timeout='20s'",
    );
    await checkTarget(db, plan.target);
    await db.query(
      `SELECT 1 AS locked FROM pg_advisory_xact_lock(1129469005,hashtext($1))`,
      [`${VERSION}:${plan.handle}`],
    );
    const existing = await db.query<Record<string, unknown>>(
      `SELECT * FROM agent_runtime.agents WHERE handle=$1 FOR UPDATE`,
      [plan.handle],
    );
    let output: PmHouseProvisionResult;
    if (existing.rows[0])
      output = await replay(db, existing.rows[0], plan, masterKey);
    else {
      const collision = await db.query(
        `SELECT id FROM public."User" WHERE email=$1 OR username=$2 LIMIT 1`,
        [plan.email, plan.handle],
      );
      if (collision.rowCount) return refuse("existing_user_conflict");
      const key = mintKey();
      const user = await db.query(
        `INSERT INTO public."User" (email,password,username,role,plan,locale,"signupMethod","isActive","createdAt","updatedAt") VALUES ($1,$2,$3,'user','free','en',$4,true,now(),now()) RETURNING id`,
        [
          plan.email,
          `pm-house-login-disabled:${randomBytes(32).toString("hex")}`,
          plan.handle,
          SIGNUP,
        ],
      );
      const userId = id(user.rows[0]?.id);
      const apiKey = await db.query(
        `INSERT INTO public."ApiKey" ("userId","keyPrefix","keyHash",label,"agentName","agentPublic",scopes,plan,"createdAt","updatedAt") VALUES ($1,$2,$3,'PM v2 house',$4,$5,ARRAY['read','trade:pm'],'free',now(),now()) RETURNING id`,
        [userId, key.prefix, key.hash, plan.displayName, plan.agentPublic],
      );
      const apiKeyId = id(apiKey.rows[0]?.id);
      const wallet = await db.query(
        `INSERT INTO public."Wallet" ("userId",type,"apiKeyId","startingEquityMusd","isActive","createdAt","updatedAt") VALUES ($1,'mock_spot',$2,50000,true,now(),now()) RETURNING id`,
        [userId, apiKeyId],
      );
      const walletId = id(wallet.rows[0]?.id);
      const asset = await db.query(
        `INSERT INTO public."WalletAsset" ("walletId","coinId","availableBalance","frozenBalance","frozenBalancePm","frozenBalanceFutures","averageCostUsd","createdAt","updatedAt") VALUES ($1,$2,50000,0,0,0,0,now(),now()) RETURNING id`,
        [walletId, CASH_COIN],
      );
      const assetId = id(asset.rows[0]?.id);
      const manifest = {
        pmPaperHouseIdentity: {
          version: VERSION,
          planHash: plan.planHash,
          userId,
          apiKeyId,
          walletId,
          assetId,
          startingEquityMusd: INITIAL_CASH,
          cashCoinId: CASH_COIN,
          initiallyPaused: true,
          initiallyLive: false,
          enrollmentApplied: false,
        },
      };
      const agent = await db.query(
        `INSERT INTO agent_runtime.agents (owner_user_id,handle,display_name,status,disabled_reason,is_house,live,cadence_seconds,model_provider,model_name,model_base_url,spec,prose,manifest,coinrithm_key_enc,next_run_at,plan) VALUES ($1,$2,$3,'paused','pm_v2_operator_pending_enrollment',true,false,$4,$5,$6,$7,$8::jsonb,$9,$10::jsonb,$11,now(),'house') RETURNING id`,
        [
          userId,
          plan.handle,
          plan.displayName,
          plan.cadenceSeconds,
          plan.spec.model!.provider,
          plan.spec.model!.name,
          plan.spec.model!.baseUrl ?? null,
          JSON.stringify(plan.spec),
          plan.prose,
          JSON.stringify(manifest),
          encrypt(key.raw, masterKey),
        ],
      );
      const houseAgentId = id(agent.rows[0]?.id);
      await db.query(
        `INSERT INTO agent_runtime.agent_state (agent_id,state) VALUES ($1,$2::jsonb)`,
        [houseAgentId, JSON.stringify(newState(makeRunId(plan.spec)))],
      );
      output = {
        action: "created",
        planHash: plan.planHash,
        identity: { userId, apiKeyId, walletId, houseAgentId },
        enrollmentApplied: false,
        provisioningOnly: true,
        initialEntryEnabled: false,
        currentEnrollment: "not_read",
        status: "paused",
        live: false,
      };
    }
    committing = true;
    await db.query("COMMIT");
    begun = false;
    return output;
  } catch (error) {
    if (begun)
      try {
        await db.query("ROLLBACK");
      } catch {
        discard = true;
      }
    if (committing) {
      discard = true;
      return refuse("commit_outcome_unknown_reconcile_same_plan");
    }
    if (error instanceof PmHouseIdentityError) throw error;
    // Do not expose driver errors: INSERT parameters can contain encrypted keys.
    return refuse("operator_transaction_failed");
  } finally {
    db.release(discard);
  }
}
