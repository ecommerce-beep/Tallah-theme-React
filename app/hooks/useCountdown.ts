import { useEffect, useState } from 'react';

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const parse = (target?: string | null): number | null => {
  if (!target || !target.trim()) return null;
  const time = new Date(target).getTime();
  return Number.isNaN(time) ? null : time;
};

const split = (diff: number): Countdown => ({
  days: Math.floor(diff / 86_400_000),
  hours: Math.floor((diff / 3_600_000) % 24),
  minutes: Math.floor((diff / 60_000) % 60),
  seconds: Math.floor((diff / 1000) % 60),
});

/**
 * Time left until `target` (any `Date`-parsable string), ticking each second.
 * `null` while there is nothing to show: no date, an invalid one, one already
 * past, and on the server / first client paint (so SSR and hydration agree).
 * The interval stops once the countdown ends.
 */
export function useCountdown(target?: string | null): Countdown | null {
  const end = parse(target);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (end === null) return;
    setNow(Date.now());
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= end) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [end]);

  if (end === null || now === null || end - now <= 0) return null;
  return split(end - now);
}
