import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCountdown } from '../../app/hooks/useCountdown';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('useCountdown', () => {
  it('splits the time left and ticks each second', () => {
    const { result } = renderHook(() => useCountdown('2030-01-02T01:02:03Z'));
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(result.current).toEqual({ days: 1, hours: 1, minutes: 2, seconds: 3 });

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current?.seconds).toBe(2);
  });

  it('is null with no date, an invalid one or a date already past', () => {
    expect(renderHook(() => useCountdown(null)).result.current).toBeNull();
    expect(renderHook(() => useCountdown('   ')).result.current).toBeNull();
    expect(renderHook(() => useCountdown('not a date')).result.current).toBeNull();
    const past = renderHook(() => useCountdown('2029-12-31T00:00:00Z'));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(past.result.current).toBeNull();
  });

  it('stops ticking when it unmounts', () => {
    const { unmount } = renderHook(() => useCountdown('2030-01-02T00:00:00Z'));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
