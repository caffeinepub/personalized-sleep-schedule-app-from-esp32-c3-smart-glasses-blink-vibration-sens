# Specification

## Summary
**Goal:** Add an actuation latency timer to the EyeR Sleep Monitor that measures the time (in milliseconds) between receiving an 'eye-closed' BLE signal and issuing the 'trigger-vibration' command, and displays this metric on the dashboard.

**Planned changes:**
- Add a backend function to record the timestamp (ms) when an 'eye-closed' signal is received, stored in stable storage (overwrites on each new signal)
- Add a backend function that, when vibration is triggered, computes and stores the latency as `(current time ms) - (eye-closed time ms)`, returning the value or -1 if no prior eye-closed timestamp exists
- Add a backend query function to retrieve the most recently computed actuation latency without re-triggering vibration
- Update the BLE context/hook in the frontend to call `recordEyeClosedTimestamp()` on eye-close and `triggerVibrationAndGetLatency()` on vibration trigger, making the latency value available via shared state
- Add an "Actuation Latency (ms)" metric card to the Dashboard that polls `getActuationLatency()` every 2 seconds via React Query, displaying the value in ms or "—" when no data is available

**User-visible outcome:** The dashboard shows a live "Actuation Latency (ms)" card that automatically updates with the time elapsed between eye closure detection and vibration trigger, giving users real-time feedback on system response time.
