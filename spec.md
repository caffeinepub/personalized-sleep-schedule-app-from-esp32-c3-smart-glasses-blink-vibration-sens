# Specification

## Summary
**Goal:** Add a battery percentage display widget to the EyeR Monitor dashboard so users can monitor their device's charge level while it is connected.

**Planned changes:**
- Parse and expose the battery percentage value (0–100) from incoming BLE notifications in the Bluetooth context, storing it in state and updating on each relevant notification.
- When no battery data has been received, represent the value as undefined/null rather than a misleading default.
- Add a battery widget/card to the Dashboard page that displays the numeric battery percentage and a visual battery icon or progress bar reflecting the charge level.
- Show a "Charging" label or icon on the widget when the device reports a charging state.
- Show a placeholder (e.g., "-- %" or "No data") when the device is not connected or battery data is unavailable.
- Style the widget consistently with the existing dashboard OKLCH color theme and Tailwind conventions.

**User-visible outcome:** Users can see a battery percentage widget on the dashboard that shows the current charge level of their connected BLE device, updates in real time, and indicates when the device is charging.
