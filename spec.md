# Specification

## Summary
**Goal:** Fix the 5-minute rolling average calculation in the Motoko backend to use Float precision, strict time-window pruning, and a drift-free sum recomputed from scratch on every BLE event.

**Planned changes:**
- Update the rolling average calculation in `backend/main.mo` to use Float arithmetic instead of integer division, so the result retains decimal precision (e.g., 14.6 instead of 14).
- Implement strict pruning logic that removes all buffer entries with timestamps older than 300,000 milliseconds before every rolling average calculation.
- Remove any persistent or incremental running sum; recompute the sum by iterating over the full pruned buffer on each new BLE event to eliminate accumulated drift.
- Return 0.0 (or an appropriate option value) when the buffer is empty after pruning.

**User-visible outcome:** The 5-minute rolling blink rate average will reflect accurate decimal values and will never include stale data points beyond the 5-minute window, with no drift over time.
