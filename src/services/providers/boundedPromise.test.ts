import { describe, expect, it, vi } from 'vitest';
import { isTimeoutError, withBoundedTimeout } from './boundedPromise';

describe('withBoundedTimeout', () => {
  it('resolves when the promise settles before the bound', async () => {
    await expect(withBoundedTimeout(Promise.resolve(42), 1000, 'fast')).resolves.toBe(42);
  });

  it('rejects when the promise never settles', async () => {
    vi.useFakeTimers();
    const never = new Promise<number>(() => {});
    const pending = withBoundedTimeout(never, 50, 'hang');
    const expectation = expect(pending).rejects.toThrow(/timed out after 50ms/);
    await vi.advanceTimersByTimeAsync(50);
    await expectation;
    vi.useRealTimers();
  });

  it('detects timeout errors', () => {
    expect(isTimeoutError(new Error('provider gbif timed out after 10000ms'))).toBe(true);
    expect(isTimeoutError(new Error('network fail'))).toBe(false);
  });
});
