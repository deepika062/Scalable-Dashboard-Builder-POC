/**
 * Minimal concurrency limiter (no external dependency).
 * Runs `fn` over `items` with at most `limit` tasks in flight at once, so a
 * batch of widget-data requests is served efficiently without overwhelming
 * downstream resources. Results preserve input order.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]!, index);
    }
  };

  const poolSize = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: poolSize }, worker));
  return results;
}

/** Simulated network/compute latency for realism. */
export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
