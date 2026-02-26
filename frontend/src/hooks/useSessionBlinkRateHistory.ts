import { useState, useCallback } from 'react';

export interface BlinkRateDataPoint {
  timestamp: number;
  blinkRate: number;
}

const MAX_HISTORY_POINTS = 100;

export function useSessionBlinkRateHistory() {
  const [history, setHistory] = useState<BlinkRateDataPoint[]>([]);

  const addDataPoint = useCallback((blinkRate: number) => {
    const dataPoint: BlinkRateDataPoint = {
      timestamp: Date.now(),
      blinkRate,
    };

    setHistory((prev) => {
      const updated = [...prev, dataPoint];
      // Keep only the most recent MAX_HISTORY_POINTS
      return updated.slice(-MAX_HISTORY_POINTS);
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    history,
    addDataPoint,
    clearHistory,
  };
}
