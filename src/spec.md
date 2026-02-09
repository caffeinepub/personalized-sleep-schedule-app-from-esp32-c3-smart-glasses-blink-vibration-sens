# Specification

## Summary
**Goal:** Transition the blink-tracking app to a fully local-first model by removing all Internet Computer actor/Internet Identity runtime usage, eliminating storage availability UI, and persisting blink history in `localStorage`.

**Planned changes:**
- Remove/disable all runtime frontend connectivity to the Internet Computer backend (no actor bootstrap, no Internet Identity login gating, and no backend queries/mutations executed during normal use).
- Remove the “Storage unavailable” notification UI, including the “Retry” button logic and any “Connecting to storage…” indicator.
- Persist blink measurement history locally using browser `localStorage` as the primary/only storage, appending new Bluetooth blink readings to stored history; gracefully fall back to in-memory if `localStorage` is unavailable without showing popups.
- Update “Generate Schedule” to read blink history from the `localStorage`-backed data and complete immediately without storage-related errors or simulated delays.
- Remove any backend-flush/periodic summary logic from the dashboard/session flow and update user-facing copy to reflect that data is saved locally on the device.

**User-visible outcome:** The app loads and works without Internet Identity or any backend connectivity, blink history persists across refreshes via `localStorage`, schedule generation works instantly from local data, and no storage/connection error popups or retry UI appear.
