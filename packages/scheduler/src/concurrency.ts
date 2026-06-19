// Run a list of tasks with a concurrency cap — keeps the fleet under the brain's
// RPM and the per-key trade limits even when a big batch comes due at once.
// Extracted from scheduler.ts (no pg/engine imports) so it is unit-testable in
// isolation. The worker contract: `fn` must NOT throw (the scheduler's
// runAgentOnce isolates per-agent failures); a throwing fn rejects the whole
// batch — covered by a test so a future regression is caught.
export async function withConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const worker = async (): Promise<void> => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
      await fn(item);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(Math.max(1, limit), queue.length) }, worker),
  );
}
