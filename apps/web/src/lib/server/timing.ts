/**
 * Execute a function and log its duration.
 */
export async function timed<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    console.log(`[timing] ${name}: ${duration.toFixed(1)}ms`);
  }
}

/**
 * Record a timing measurement (logs to console).
 */
export function recordTiming(name: string, durationMs: number) {
  console.log(`[timing] ${name}: ${durationMs.toFixed(1)}ms`);
}

/**
 * Placeholder for Server-Timing header (not used with console logging).
 */
export function formatServerTiming(): string {
  return "";
}
