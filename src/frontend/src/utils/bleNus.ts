/**
 * Nordic UART Service (NUS) utilities for BLE communication.
 * NUS is a simple serial-like protocol over BLE GATT.
 */

// Nordic UART Service (NUS) UUIDs
export const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const NUS_TX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // TX (notify from device)
export const NUS_RX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // RX (write to device)

// Client Characteristic Configuration Descriptor (CCCD) UUID
export const CCCD_UUID = 0x2902;

/**
 * Parses a Nordic UART Service (NUS) notification payload into a numeric blink rate.
 * NUS sends data as UTF-8 text, typically in formats like:
 * - "12\n"
 * - "blink=12"
 * - "rate:12"
 * 
 * @param dataView - The DataView from the BLE notification
 * @returns The extracted blink rate number, or null if parsing fails
 */
export function parseNusBlinkRate(dataView: DataView): number | null {
  try {
    // Convert DataView to Uint8Array
    const bytes = new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);
    
    // Decode as UTF-8 text
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(bytes).trim();
    
    // Extract first numeric value from the text
    const numberMatch = text.match(/\d+/);
    if (numberMatch) {
      const value = parseInt(numberMatch[0], 10);
      if (!isNaN(value) && value >= 0) {
        return value;
      }
    }
    
    return null;
  } catch (err) {
    console.error('Failed to parse NUS blink rate:', err);
    return null;
  }
}

/**
 * Parses a UTF-8 text string into a numeric blink rate.
 * Accepts formats like:
 * - "12\n"
 * - "blink=12"
 * - "rate:12"
 * 
 * @param text - The decoded UTF-8 text string
 * @returns The extracted blink rate number, or null if parsing fails
 */
export function parseBlinkRateFromText(text: string): number | null {
  try {
    const trimmed = text.trim();
    
    // Extract first numeric value from the text
    const numberMatch = trimmed.match(/\d+/);
    if (numberMatch) {
      const value = parseInt(numberMatch[0], 10);
      if (!isNaN(value) && value >= 0) {
        return value;
      }
    }
    
    return null;
  } catch (err) {
    console.error('Failed to parse blink rate from text:', err);
    return null;
  }
}

/**
 * Parses a Heart Rate Measurement characteristic value (standard BLE format).
 * This is the legacy format used before switching to NUS.
 * 
 * @param dataView - The DataView from the BLE notification
 * @returns The extracted blink rate number, or null if parsing fails
 */
export function parseHeartRateBlinkRate(dataView: DataView): number | null {
  try {
    if (dataView.byteLength < 2) {
      return null;
    }
    
    // Standard Heart Rate Measurement format:
    // Byte 0: Flags
    // Byte 1+: Heart Rate Value (uint8 or uint16 depending on flags)
    const flags = dataView.getUint8(0);
    const is16Bit = (flags & 0x01) !== 0;
    
    let blinkRate: number;
    if (is16Bit && dataView.byteLength >= 3) {
      blinkRate = dataView.getUint16(1, true); // little-endian
    } else if (dataView.byteLength >= 2) {
      blinkRate = dataView.getUint8(1);
    } else {
      return null;
    }
    
    return blinkRate;
  } catch (err) {
    console.error('Failed to parse Heart Rate blink rate:', err);
    return null;
  }
}
