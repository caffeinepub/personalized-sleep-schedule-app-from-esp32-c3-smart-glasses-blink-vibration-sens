import { useState, useCallback, useRef } from 'react';

export interface BlinkRatePoint {
  timestamp: number;
  blinkRate: number;
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export function useRollingBlinkRateAverage5Min() {
  const [dataPoints, setDataPoints] = useState<BlinkRatePoint[]>([]);
  const lastPruneRef = useRef<number>(Date.now());

  const addDataPoint = useCallback((blinkRate: number) => {
    const now = Date.now();
    const newPoint: BlinkRatePoint = {
      timestamp: now,
      blinkRate,
    };

    setDataPoints((prev) => {
      // Add new point
      const updated = [...prev, newPoint];
      
      // Prune old points (older than 5 minutes)
      const cutoffTime = now - FIVE_MINUTES_MS;
      const pruned = updated.filter(point => point.timestamp >= cutoffTime);
      
      lastPruneRef.current = now;
      return pruned;
    });
  }, []);

  const clearDataPoints = useCallback(() => {
    setDataPoints([]);
  }, []);

  // Calculate 5-minute rolling average
  const now = Date.now();
  const cutoffTime = now - FIVE_MINUTES_MS;
  const recentPoints = dataPoints.filter(point => point.timestamp >= cutoffTime);
  
  const hasRecentData = recentPoints.length > 0;
  const rollingAverage = hasRecentData
    ? recentPoints.reduce((sum, point) => sum + point.blinkRate, 0) / recentPoints.length
    : 0;

  return {
    rollingAverage: Math.round(rollingAverage * 10) / 10,
    hasRecentData,
    dataPointCount: recentPoints.length,
    addDataPoint,
    clearDataPoints,
  };
}
