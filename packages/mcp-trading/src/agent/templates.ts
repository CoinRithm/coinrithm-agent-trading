// Agent templates + risk presets for the scaffolder.
//
// A `new` agent is a folder-of-one (a single agent.md) that ALWAYS emits the
// hosted-required blocks (limits / abstention / sync / killSwitch) so it passes
// `validate --hosted` out of the box. Presets differ only within safe ranges:
// every preset is paper-only, keeps requireStopLoss=true, the kill-switch on,
// and stays under the server caps (leverage <= 20). "bold" is faster + larger
// but still safe.

import { stringify as stringifyYaml } from "yaml";
import { COINRITHM_API } from "./version.js";

export type PresetName = "conservative" | "balanced" | "bold";
export const PRESET_NAMES: PresetName[] = ["conservative", "balanced", "bold"];

interface PresetSpec {
  leverage: number;
  margin: number;
  maxPos: number;
  tradesDay: number;
  writesCycle: number;
  dailyLoss: number;
  openMargin: number;
  minConf: number;
  cadence: string;
  drawdown: number;
  modelFail: number;
}

const PRESETS: Record<PresetName, PresetSpec> = {
  conservative: {
    leverage: 2,
    margin: 50,
    maxPos: 2,
    tradesDay: 6,
    writesCycle: 1,
    dailyLoss: 300,
    openMargin: 600,
    minConf: 0.6,
    cadence: "4h",
    drawdown: 300,
    modelFail: 3,
  },
  balanced: {
    leverage: 3,
    margin: 100,
    maxPos: 3,
    tradesDay: 12,
    writesCycle: 2,
    dailyLoss: 750,
    openMargin: 2000,
    minConf: 0.55,
    cadence: "1h",
    drawdown: 750,
    modelFail: 4,
  },
  bold: {
    leverage: 5,
    margin: 250,
    maxPos: 5,
    tradesDay: 24,
    writesCycle: 3,
    dailyLoss: 2000,
    openMargin: 5000,
    minConf: 0.5,
    cadence: "1h",
    drawdown: 2000,
    modelFail: 5,
  },
};

const THESIS_BODY = `# Momentum Futures — strategy

You operate a CoinRithm **paper-trading** futures account (50,000 virtual mUSD).
Everything here is simulated; it is not financial advice and never touches real
money. Edit this prose freely (any language) — it is your agent's borders.

## Each cycle

1. Ground yourself: read your portfolio and open positions first. Never assume
   balances or what is already open.
2. Scan the watchlist. A candidate is a coin whose short and medium momentum
   agree (both up, or both down) and is not already an open position.
3. Pick the strongest candidate and commit when the read is clear — even a
   moderate-confidence one — sized small with a stop. Skip only when the signals
   contradict or the data is stale; a quiet tape where your edge is still real
   is an act, not a skip.
4. Quote before you open. Read the liquidation price and confirm it is sane. If
   the quote is not eligible, relay the reason and stop.
5. Open small and protected: enter in the trend direction and set a stop-loss at
   open. Place the take-profit a touch wider than the stop.
6. Stay in sync: poll your trades for any stop / take-profit / liquidation that
   fired while you were not looking, and react to what actually happened.

The hard caps (leverage, margin, watchlist) live in the config blocks above and
are enforced by the runner — change them there, not in this prose.`;

const PERSONA_STUB = `# Persona

Decisive and in character. Acts on a clear read — even a moderate-confidence one
— sized small and protected with a stop, and skips only when the read is
contradictory or the data is stale. States its reasoning plainly in its own
voice, and never frames paper results as real-money advice.
`;

export interface AgentTemplate {
  frontmatter: Record<string, unknown>;
  body: string;
}

export function buildAgentObject(name: string, preset: PresetName): AgentTemplate {
  const p = PRESETS[preset];
  const frontmatter: Record<string, unknown> = {
    spec: "coinrithm.agent.v1",
    name,
    description: `Trend-following CoinRithm paper-trading agent (momentum-futures, ${preset}).`,
    trigger: { cadence: p.cadence, timezone: "UTC" },
    model: { provider: "anthropic", name: "claude-sonnet-4-6" },
    venues: ["futures"],
    risk: {
      maxLeverage: p.leverage,
      perTradeMarginMusd: p.margin,
      maxConcurrentPositions: p.maxPos,
      requireStopLoss: true,
      watchlist: ["BTC", "ETH", "SOL"],
    },
    sizing: { riskRewardMin: 1.8, riskPerTradePct: 1, kellyFraction: 0.25 },
    limits: {
      maxTradesPerDay: p.tradesDay,
      maxWritesPerCycle: p.writesCycle,
      maxDailyLossMusd: p.dailyLoss,
      maxOpenMarginMusd: p.openMargin,
    },
    abstention: {
      onStaleData: true,
      onWeakSignal: true,
      onMissingQuote: true,
      onInsufficientBalance: true,
      minConfidence: p.minConf,
    },
    sync: { requirePollBeforeWrite: true },
    killSwitch: {
      maxDrawdownMusd: p.drawdown,
      maxConsecutiveRejects: 0,
      maxConsecutiveModelFailures: p.modelFail,
      onRateLimitPressure: true,
    },
    objective: {
      primary: "realized_pnl",
      secondary: ["drawdown_control", "evidence_completeness"],
      horizon: "7d",
    },
  };
  return { frontmatter, body: THESIS_BODY };
}

export function renderFolderOfOne(name: string, preset: PresetName): string {
  const { frontmatter, body } = buildAgentObject(name, preset);
  return `---\n${stringifyYaml(frontmatter)}---\n\n${body}\n`;
}

export function renderCoinrithmPin(): string {
  return stringifyYaml({
    api: {
      kind: COINRITHM_API.kind,
      baseUrl: COINRITHM_API.baseUrl,
      mcpUrl: COINRITHM_API.mcpUrl,
      openapiVersion: COINRITHM_API.openapiVersion,
      mcpPackage: COINRITHM_API.mcpPackage,
      mcpVersion: COINRITHM_API.mcpVersion,
    },
    venues: ["spot", "futures", "pm"],
    note: "Reference pin. The runner warns if this lags the live API; it does not block self-host.",
  });
}

export function renderRuntime(model: unknown, trigger: unknown): string {
  return stringifyYaml({ mode: "self-host", model, trigger });
}

export interface EjectResult {
  files: Record<string, string>; // relpath -> content
}

// Split a folder-of-one frontmatter+body into the decomposed layout. The
// resolved AgentSpec must be unchanged (model/trigger via runtime.yaml extends;
// risk/limits/abstention/killSwitch via $ref; venues/sync/sizing/objective stay
// inline). Prose moves to character/thesis.md + persona.md.
export function ejectFiles(
  fm: Record<string, unknown>,
  body: string,
): EjectResult {
  const files: Record<string, string> = {};
  files["character/thesis.md"] = (body.trim() || THESIS_BODY) + "\n";
  files["character/persona.md"] = PERSONA_STUB;
  if (fm.risk) files["character/risk.yaml"] = stringifyYaml(fm.risk);
  if (fm.limits) files["character/limits.yaml"] = stringifyYaml(fm.limits);
  if (fm.abstention) files["character/abstention.yaml"] = stringifyYaml(fm.abstention);
  if (fm.killSwitch) files["safety/killSwitch.yaml"] = stringifyYaml(fm.killSwitch);
  files["runtime.yaml"] = renderRuntime(fm.model, fm.trigger);
  files["functionality/coinrithm.yaml"] = renderCoinrithmPin();

  const agentFm: Record<string, unknown> = {
    spec: fm.spec,
    name: fm.name,
    description: fm.description,
    extends: ["runtime.yaml"],
    venues: fm.venues,
    sync: fm.sync,
  };
  if (fm.sizing) agentFm.sizing = fm.sizing;
  if (fm.objective) agentFm.objective = fm.objective;
  if (fm.capabilities) agentFm.capabilities = fm.capabilities;
  if (fm.risk) agentFm.risk = { $ref: "character/risk.yaml" };
  if (fm.limits) agentFm.limits = { $ref: "character/limits.yaml" };
  if (fm.abstention) agentFm.abstention = { $ref: "character/abstention.yaml" };
  if (fm.killSwitch) agentFm.killSwitch = { $ref: "safety/killSwitch.yaml" };

  files["agent.md"] =
    `---\n${stringifyYaml(agentFm)}---\n\n` +
    `Strategy lives in [character/thesis.md](character/thesis.md); ` +
    `persona in [character/persona.md](character/persona.md).\n`;
  return { files };
}
