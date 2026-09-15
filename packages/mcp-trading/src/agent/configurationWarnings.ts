// Advisory only: these fields remain loadable for backwards compatibility.
export function configurationWarnings(raw: Record<string, unknown>): string[] {
  const warnings: string[] = [];
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
