import { useEffect, useRef } from 'react';

export function useBlinkSummaryFlush(_deviceId: string) {
  // Deprecated: No longer flushes to backend
  // App is now fully local-first with immediate localStorage persistence
  const lastFlushTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // No-op: no backend flush needed
  }, []);

  return {
    lastFlushTime: lastFlushTimeRef.current,
    nextFlushIn: 0,
    totalBlinks: 0,
  };
}
