import { useState, useEffect, useRef } from 'react';

interface UseCountdownOptions {
  /** Total duration in seconds. */
  durationSeconds: number;
  /** Epoch-ms timestamp when the countdown started. */
  startedAt: number | undefined;
  /** Called once when the countdown reaches zero (on the polling interval). */
  onExpire?: () => void;
  /** How often to recalculate remaining time, in ms. Default 200. */
  tickMs?: number;
}

interface UseCountdownResult {
  /** Remaining seconds (0–durationSeconds), floored. */
  secondsLeft: number;
  /** 0–1 progress fraction (0 = just started, 1 = expired). */
  progress: number;
  expired: boolean;
}

/**
 * Generic countdown hook.
 * Computes remaining time from a `startedAt` epoch timestamp so it stays
 * synchronised across renders without drifting.
 */
export const useCountdown = ({
  durationSeconds,
  startedAt,
  onExpire,
  tickMs = 200,
}: UseCountdownOptions): UseCountdownResult => {
  const durationMs = durationSeconds * 1000;
  const expireFiredRef = useRef(false);

  const compute = () => {
    if (startedAt == null) return { secondsLeft: durationSeconds, progress: 0, expired: false };
    const elapsed = Math.max(0, Date.now() - startedAt);
    const remaining = Math.max(0, durationMs - elapsed);
    return {
      secondsLeft: Math.ceil(remaining / 1000),
      progress: Math.min(1, elapsed / durationMs),
      expired: remaining === 0,
    };
  };

  const [state, setState] = useState(compute);

  // Reset the expire-fired guard whenever startedAt changes
  useEffect(() => {
    expireFiredRef.current = false;
  }, [startedAt]);

  useEffect(() => {
    if (startedAt == null) return;

    const tick = () => {
      const next = compute();
      setState(next);
      if (next.expired && !expireFiredRef.current) {
        expireFiredRef.current = true;
        onExpire?.();
      }
    };

    tick(); // immediate update
    const id = setInterval(tick, tickMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, durationMs, tickMs]);

  return state;
};
