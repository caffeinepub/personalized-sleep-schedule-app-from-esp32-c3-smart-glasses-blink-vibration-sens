# Specification

## Summary
**Goal:** Fix BLE device discovery by updating the Bluetooth connection request to use `acceptAllDevices: true` and include the NUS service UUID as an optional service.

**Planned changes:**
- Update `navigator.bluetooth.requestDevice()` in `BluetoothContext.tsx` and/or `useEyeRBluetooth.ts` to use `{ acceptAllDevices: true, optionalServices: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e'] }`, removing any existing `filters` property.
- Ensure the NUS service UUID `6e400001-b5a3-f393-e0a9-e50e24dcca9e` in `bleNus.ts` is consistent with the value used in the request.

**User-visible outcome:** The browser's BLE device picker will show all nearby devices without requiring a name or service filter match, and the app can successfully connect to the user's BLE device and access its NUS GATT service after pairing.
