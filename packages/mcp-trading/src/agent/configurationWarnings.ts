// Per-day counters roll over on the UTC date (util.ts dayKey), whatever the
// bundle declares. trigger.timezone is parsed but read by nothing else, so a
// non-UTC value would silently promise local-day limits.
const UTC_NAMES = new Set(["utc", "etc/utc", "z", "gmt", "etc/gmt"]);

// Advisory only: these fields remain loadable for backwards compatibility.
export function configurationWarnings(raw: Record<string, unknown>): string[] {
  const warnings: string[] = [];
  const trigger = raw.trigger;
  if (trigger && typeof trigger === "object" && !Array.isArray(trigger)) {
    const tz = (trigger as Record<string, unknown>).timezone;
    if (typeof tz === "string" && !UTC_NAMES.has(tz.trim().toLowerCase())) {
      warnings.push(
        `trigger.timezone "${tz}" is informational: maxTradesPerDay and maxDailyLossMusd reset at 00:00 UTC, not in this timezone`,
      );
    }
  }
  if (
    Array.isArray(raw.capabilities) &&
    raw.capabilities.includes("websearch")
  ) {
    warnings.push(
      "capabilities.websearch is reserved: the runner does not perform web searches",
    );
  }
  if (raw.abstention && typeof raw.abstention === "object") {
    for (const key of [
      "onStaleData",
      "onWeakSignal",
      "onMissingQuote",
      "onInsufficientBalance",
    ]) {
      if (Object.prototype.hasOwnProperty.call(raw.abstention, key)) {
        warnings.push(
          `abstention.${key} is inactive: changing it does not change execution; freshness, quote and balance checks remain mandatory`,
        );
      }
    }
  }
  return warnings;
}
