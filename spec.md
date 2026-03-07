# Specification

## Summary
**Goal:** Wire the ESP32 BLE pipe-delimited string parser into the dashboard so that live `BAT:`, `LAT:`, and `VAL:` values populate the Battery card, Actuation Latency card, and real-time light level chart.

**Planned changes:**
- Update `bleNus.ts` to split incoming BLE strings by `|` and extract `BAT:`, `LAT:`, and `VAL:` fields as numeric values, returning `{ battery, latency, val }`
- Update `BluetoothContext.tsx` to invoke the parser on each BLE notification and store the resulting `battery`, `latency`, and `val` fields in context state
- Update `BatteryIndicator.tsx` to read the `battery` value from context and display the live percentage with progress bar and color-coded icon
- Update `ActuationLatencyCard.tsx` to read the `latency` value from context and display it live in milliseconds
- Update `BlinkRateChart.tsx` to append a new timestamped data point using the `val` field from context on each BLE notification

**User-visible outcome:** When the ESP32 device sends BLE notifications in the format `BAT:85|LAT:2050|VAL:450`, the dashboard Battery card, Actuation Latency card, and real-time light level chart all update live with the parsed values.
