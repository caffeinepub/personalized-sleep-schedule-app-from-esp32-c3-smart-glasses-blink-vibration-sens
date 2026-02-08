# Specification

## Summary
**Goal:** Update the Eye-R Web Bluetooth device discovery to filter for the Heart Rate service (0x180d) instead of UART-based name/optionalServices, while keeping the existing Heart Rate notification flow working.

**Planned changes:**
- Update `navigator.bluetooth.requestDevice` options on the Device Connection flow to include a filter targeting the Heart Rate service (0x180d).
- Remove reliance on a UART-based device name filter (e.g., "UART Service") and stop using the Nordic UART optionalServices UUID (`6e400001-b5a3-f393-e0a9-e50e24dcca9e`) for the Eye-R connection path.
- Ensure the post-selection connection continues to subscribe to GATT notifications on Heart Rate service 0x180d as before.

**User-visible outcome:** Clicking “Connect Device” shows devices advertising the Heart Rate service (0x180d) in the browser picker, and after selection the app connects and continues receiving blink-rate notifications via Heart Rate (0x180d).
