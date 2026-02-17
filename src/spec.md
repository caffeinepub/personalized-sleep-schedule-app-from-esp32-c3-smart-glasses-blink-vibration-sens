# Specification

## Summary
**Goal:** Treat BLE notifications containing the eye-state token "close" (case-insensitive) as a blink event for the live 60-second rolling blink rate, even when no numeric light-level value is present.

**Planned changes:**
- Update the frontend BLE notification parsing to detect text payloads that include "close" (any casing) and record a blink into the existing 60-second rolling window.
- Add a simple de-duplication/debounce rule to avoid counting repeated consecutive "close" notifications as multiple blinks (e.g., only count the first "close" until an "open" is seen, or enforce a minimum time gap).
- Preserve existing numeric light-level open→closed transition blink detection behavior for numeric payloads.

**User-visible outcome:** When the connected BLE device sends a notification containing "close", the Live Blink Rate (blinks in the last 60 seconds) increases appropriately without runaway double-counting, and numeric-based blink detection continues to work as before.
