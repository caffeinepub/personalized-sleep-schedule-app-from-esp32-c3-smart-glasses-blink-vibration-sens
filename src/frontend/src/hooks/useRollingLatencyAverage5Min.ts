import { useCallback, useRef, useState } from "react";

export interface LatencyPoint {
  timestamp: number; // ms since epoch
  latency: number; // LAT value in seconds (float)
}

const FIVE_MINUTES_MS = 300 * 1000; // 300 seconds

export function useRollingLatencyAverage5Min() {
  const bufferRef = useRef<LatencyPoint[]>([]);
  const [, forceUpdate] = useState(0);

  const addLatencyPoint = useCallback((latency: number) => {
    const now = Date.now();
    const cutoff = now - FIVE_MINUTES_MS;

    // Append new point
    bufferRef.current.push({ timestamp: now, latency });

    // Prune values older than 300 seconds
    bufferRef.current = bufferRef.current.filter((p) => p.timestamp >= cutoff);

    // Trigger re-render so callers get updated values
    forceUpdate((n) => n + 1);
  }, []);

  const clearBuffer = useCallback(() => {
    bufferRef.current = [];
    forceUpdate((n) => n + 1);
  }, []);

  // Derive current rolling average from the in-memory buffer
  const now = Date.now();
  const cutoff = now - FIVE_MINUTES_MS;
  const recentPoints = bufferRef.current.filter((p) => p.timestamp >= cutoff);

  const hasRecentData = recentPoints.length > 0;
  const sum = recentPoints.reduce((acc, p) => acc + p.latency, 0);
  const rollingAverage = hasRecentData ? sum / recentPoints.length : 0;

  return {
    /** Mean of all LAT values received in the last 300 seconds */
    rollingAverage,
    /** Human-readable string rounded to 2 decimal places */
    rollingAverageFormatted: hasRecentData ? rollingAverage.toFixed(2) : null,
    hasRecentData,
    dataPointCount: recentPoints.length,
    addLatencyPoint,
    clearBuffer,
  };
}
