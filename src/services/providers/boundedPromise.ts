/** Default per-provider bound for live Android/WebView federation. */
export const PROVIDER_TIMEOUT_MS = 10_000;

/**
 * Race a promise against a hard timeout that always settles.
 * AbortSignal alone is insufficient on some Android WebViews where fetch
 * remains pending after abort.
 */
export function withBoundedTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  }) as Promise<T>;
}

export function isTimeoutError(err: unknown): boolean {
  return err instanceof Error && /timed out after \d+ms/i.test(err.message);
}
