# Eye-R Sleep Schedule App

## Current State
The app connects to an ESP32-C3 via BLE and receives packets in the format `LAT:[float]|VAL:[int]|BPM:[int]`. The 5-minute rolling average is computed from LAT (actuation latency / eye-closure duration) values. The sleep schedule and alertness state are derived from this LAT-based rolling average.

## Requested Changes (Diff)

### Add
- A new rolling average calculation based on **blink count per minute divided by 5** (i.e. blinks/min ÷ 5).
- Updated thresholds in `personalizedSleepSchedule.ts` to match the new metric.

### Modify
- `useRollingBlinkRateAverage5Min.ts`: Instead of averaging raw LAT/blink-rate values, compute the metric as `(total blinks in last 300s) / 5` (i.e. total blinks over 5 minutes divided by 5 — which equals average blinks per minute divided by 5). Each call to `addDataPoint` receives the current blink count from the 60s window; the hook accumulates timestamped blink events and computes `total_blinks_in_300s / 5`.
- `Dashboard.tsx`: Update the "5-Min Rolling Avg" card label to reflect the new metric: "Blinks/min ÷ 5".
- `personalizedSleepSchedule.ts`: Update thresholds to be appropriate for the new metric (blinks/min ÷ 5 is roughly 1/5th the BPM). Adjust the state boundaries proportionally (e.g., High Alertness > 3.6, Normal 2–3.6, Drowsy < 2 as blinks/5min equivalent).

### Remove
- Nothing removed structurally; the LAT-based rolling average logic is replaced by the blink-count-based approach.

## Implementation Plan
1. Update `useRollingBlinkRateAverage5Min.ts` to store individual blink timestamps over 300s and return `totalBlinksIn5Min / 5` as the rolling value.
2. Update `Dashboard.tsx` to pass the blink count correctly and update the card subtitle.
3. Update `personalizedSleepSchedule.ts` thresholds to match new metric scale.
