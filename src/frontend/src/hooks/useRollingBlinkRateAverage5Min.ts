import { useCallback, useState } from "react";

export interface BlinkRatePoint {
  timestamp: number;
  blinkRate: number;
}

/**
 * Tracks the total number of blinks in the current session and exposes
 * the value as `totalBlinks / 5` for use in the sleep schedule.
 *
 * The metric is: total session blinks ÷ 5.
 * `addDataPoint` is kept for API compatibility but is unused internally;
 * the total is driven by `setTotalBlinks` which is called from the Dashboard
 * via the BluetoothContext `totalBlinkCount`.
 */
export function useRollingBlinkRateAverage5Min() {
  // Kept for legacy callers that still call addDataPoint
  const [_unused, _setUnused] = useState<BlinkRatePoint[]>([]);

  const addDataPoint = useCallback((_blinkRate: number) => {
    // No-op: total is now sourced from BluetoothContext.totalBlinkCount
  }, []);

  const clearDataPoints = useCallback(() => {
    // No-op: total resets automatically when device disconnects
  }, []);

  return {
    addDataPoint,
    clearDataPoints,
  };
}
