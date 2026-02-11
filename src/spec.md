# Specification

## Summary
**Goal:** Recalibrate blink detection to use observed light-level ranges for eye open vs. eye closed, and update related UI help/debug copy accordingly.

**Planned changes:**
- Update `frontend/src/contexts/BluetoothContext.tsx` blink detection to classify eye state using calibrated thresholds that separate open (250–290) from closed (160–180), replacing the current `BLINK_THRESHOLD = 30` logic.
- Count a blink only on a transition from open → closed, with a state guard to prevent multiple counts while the reading remains in the closed range until it returns to open.
- Update `frontend/src/pages/DeviceConnection.tsx` debug/help text to remove references to “below 30” and describe the calibrated open/closed light-level thresholds in English.

**User-visible outcome:** Blink counting aligns with the calibrated sensor ranges (open ~250–290, closed ~160–180), and the Device Connection debug/help text reflects the new thresholds.
