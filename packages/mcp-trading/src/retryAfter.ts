// Retry-After permits a delay in seconds or an HTTP date. Missing/invalid
// evidence stays absent, so each caller can apply its explicit fallback.
export function retryAfterSeconds(
  value: string | null,
  now = Date.now(),
): number | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const seconds = Number(raw);
    return Number.isFinite(seconds) ? seconds : undefined;
  }
  // Avoid Date.parse treating malformed numeric delays (e.g. "-1") as dates.
  if (!/^[A-Za-z]{3}(?:,|day,|\s)/.test(raw)) return undefined;
  const date = Date.parse(raw);
  return Number.isFinite(date) ? Math.max(0, (date - now) / 1000) : undefined;
}
