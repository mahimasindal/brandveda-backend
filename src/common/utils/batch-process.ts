/**
 * Processes items in rate-limited batches.
 * Fires `batchSize` items in parallel, then waits `delayMs` before the next batch.
 */
export async function batchProcess<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  batchSize: number,
  delayMs: number,
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(processor));
    if (i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
