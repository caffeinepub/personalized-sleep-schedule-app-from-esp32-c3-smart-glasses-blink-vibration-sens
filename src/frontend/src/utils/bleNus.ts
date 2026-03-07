/**
 * Nordic UART Service (NUS) utilities for BLE communication.
 * NUS is a simple serial-like protocol over BLE GATT.
 */

// Nordic UART Service (NUS) UUIDs
export const NUS_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
export const NUS_TX_CHARACTERISTIC_UUID =
  "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // TX (notify from device)
export const NUS_RX_CHARACTERISTIC_UUID =
  "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // RX (write to device)

// Client Characteristic Configuration Descriptor (CCCD) UUID
export const CCCD_UUID = 0x2902;

// ---------------------------------------------------------------------------
// Eye-state light level threshold constants (inclusive ranges)
// ---------------------------------------------------------------------------

/**
 * Maximum light level (exclusive) that classifies as eyes closed.
 * Any reading strictly below this value is considered eyes closed.
 */
export const EYES_CLOSED_MAX = 600;

/** Minimum light level (inclusive) that classifies as a blink (eye closed). */
export const BLINK_MIN = 1500;
/** Maximum light level (inclusive) that classifies as a blink (eye closed). */
export const BLINK_MAX = 1700;

/** Minimum light level (inclusive) that classifies as eyes open. */
export const EYES_OPEN_MIN = 1800;
/** Maximum light level (inclusive) that classifies as eyes open. */
export const EYES_OPEN_MAX = 2000;

/**
 * Classifies a raw light level reading into an eye state.
 *
 * - Returns 'blink'      when lightLevel < EYES_CLOSED_MAX (< 600, exclusive)
 * - Returns 'blink'      when lightLevel is in [BLINK_MIN, BLINK_MAX]      (1500–1700 inclusive)
 * - Returns 'eyes open'  when lightLevel is in [EYES_OPEN_MIN, EYES_OPEN_MAX] (1800–2000 inclusive)
 * - Returns null         for all other values
 *
 * @param lightLevel - The numeric light level reading from the sensor
 * @returns 'blink' | 'eyes open' | null
 */
export function parseEyeStateFromLight(
  lightLevel: number,
): "blink" | "eyes open" | null {
  if (lightLevel < EYES_CLOSED_MAX) {
    return "blink";
  }
  if (lightLevel >= BLINK_MIN && lightLevel <= BLINK_MAX) {
    return "blink";
  }
  if (lightLevel >= EYES_OPEN_MIN && lightLevel <= EYES_OPEN_MAX) {
    return "eyes open";
  }
  return null;
}

// ---------------------------------------------------------------------------
// ESP32 pipe-delimited format parser
// ---------------------------------------------------------------------------

/**
 * Parsed result from the ESP32 pipe-delimited BLE string format.
 * Format: "LAT:[float]|VAL:[int]"
 */
export interface Esp32ParsedData {
  /** Battery percentage — always null (BAT field removed from protocol) */
  battery: null;
  /**
   * Actuation latency as a float (seconds), or null if not present / malformed.
   * Stored as a float so callers can format it to 2 decimal places (e.g. 0.00).
   */
  latency: number | null;
  /** Raw light level sensor value (VAL, integer 0–4095), or null if not present / malformed */
  value: number | null;
}

/**
 * Parses the ESP32 pipe-delimited BLE notification string.
 * Format: "LAT:[float]|VAL:[int]"
 *
 * Splits on '|', then extracts:
 *   - LAT: float value → latency (seconds, formatted to 0.00)
 *   - VAL: integer value (0–4095) → value
 *
 * Any BAT: segment is silently ignored.
 * Non-matching or malformed segments return null for that field.
 *
 * @param text - The decoded UTF-8 text string from the BLE notification
 * @returns Esp32ParsedData with latency and value fields (battery always null)
 */
export function parseEsp32PipeFormat(text: string): Esp32ParsedData {
  const result: Esp32ParsedData = { battery: null, latency: null, value: null };

  try {
    const segments = text.trim().split("|");

    for (const segment of segments) {
      const trimmed = segment.trim();

      // LAT:<float> — actuation latency in seconds
      if (/^LAT:/i.test(trimmed)) {
        const numStr = trimmed.slice(4); // everything after "LAT:"
        const val = Number.parseFloat(numStr);
        if (!Number.isNaN(val) && val >= 0) {
          result.latency = val; // Keep as float — do NOT round
        }
        continue;
      }

      // VAL:<int> — raw sensor reading 0–4095
      if (/^VAL:/i.test(trimmed)) {
        const numStr = trimmed.slice(4); // everything after "VAL:"
        const val = Number.parseFloat(numStr);
        if (!Number.isNaN(val) && val >= 0) {
          result.value = Math.round(val); // Integer 0–4095
        }
      }

      // BAT: segments are intentionally ignored (eliminated from protocol)
    }
  } catch (_err) {
    // Silently ignore parse errors
  }

  return result;
}

/**
 * Returns true if the given text looks like an ESP32 pipe-delimited string.
 * Checks for LAT: or VAL: prefixes (BAT: is no longer part of the protocol).
 */
export function isEsp32PipeFormat(text: string): boolean {
  return /(?:LAT|VAL):/i.test(text);
}

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
    const bytes = new Uint8Array(
      dataView.buffer,
      dataView.byteOffset,
      dataView.byteLength,
    );

    // Decode as UTF-8 text
    const decoder = new TextDecoder("utf-8");
    const text = decoder.decode(bytes).trim();

    // Extract first numeric value from the text
    const numberMatch = text.match(/\d+/);
    if (numberMatch) {
      const value = Number.parseInt(numberMatch[0], 10);
      if (!Number.isNaN(value) && value >= 0) {
        return value;
      }
    }

    return null;
  } catch (err) {
    console.error("Failed to parse NUS blink rate:", err);
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
      const value = Number.parseInt(numberMatch[0], 10);
      if (!Number.isNaN(value) && value >= 0) {
        return value;
      }
    }

    return null;
  } catch (err) {
    console.error("Failed to parse blink rate from text:", err);
    return null;
  }
}

/**
 * Detects eye-state tokens from decoded UTF-8 text.
 * Recognizes "close" and "open" (case-insensitive) as eye state indicators.
 *
 * @param text - The decoded UTF-8 text string
 * @returns 'close' | 'open' | null depending on detected token
 */
export function parseEyeStateToken(text: string): "close" | "open" | null {
  try {
    const trimmed = text.trim().toLowerCase();

    if (trimmed.includes("close")) {
      return "close";
    }

    if (trimmed.includes("open")) {
      return "open";
    }

    return null;
  } catch (err) {
    console.error("Failed to parse eye state token:", err);
    return null;
  }
}

/**
 * Parses battery percentage from decoded UTF-8 text.
 * Recognizes formats like:
 * - "BAT:72"
 * - "BAT=72"
 * - "battery:72"
 * - "bat:72%"
 * - "CHARGING:1" / "CHARGING:0"
 * - "CHG:1" / "CHG:0"
 *
 * @param text - The decoded UTF-8 text string
 * @returns Object with percentage (0-100) and isCharging flag, or null if no battery data found
 */
export function parseBatteryData(
  text: string,
): { percentage: number; isCharging: boolean } | null {
  try {
    const trimmed = text.trim();

    // Match battery percentage: BAT:72, BAT=72, battery:72, bat:72%, BATT:72, etc.
    const batMatch = trimmed.match(/\b(?:bat(?:t(?:ery)?)?)[=:](\d+)/i);
    if (batMatch) {
      const percentage = Number.parseInt(batMatch[1], 10);
      if (!Number.isNaN(percentage) && percentage >= 0 && percentage <= 100) {
        // Also check for charging status in the same message
        const chgMatch = trimmed.match(/\b(?:charg(?:ing)?|chg)[=:](\d+)/i);
        const isCharging = chgMatch ? chgMatch[1] === "1" : false;
        return { percentage, isCharging };
      }
    }

    // Match standalone charging status without battery percentage
    // e.g., "CHARGING:1", "CHG:1"
    const chgOnlyMatch = trimmed.match(/\b(?:charg(?:ing)?|chg)[=:](\d+)/i);
    if (chgOnlyMatch) {
      // No percentage data, but we have charging info — return null for percentage
      return null;
    }

    return null;
  } catch (err) {
    console.error("Failed to parse battery data:", err);
    return null;
  }
}

/**
 * Parses charging status from decoded UTF-8 text.
 * Recognizes formats like:
 * - "CHARGING:1" / "CHARGING:0"
 * - "CHG:1" / "CHG:0"
 *
 * @param text - The decoded UTF-8 text string
 * @returns true if charging, false if not, or null if no charging data found
 */
export function parseChargingStatus(text: string): boolean | null {
  try {
    const trimmed = text.trim();
    const chgMatch = trimmed.match(/\b(?:charg(?:ing)?|chg)[=:](\d+)/i);
    if (chgMatch) {
      return chgMatch[1] === "1";
    }
    return null;
  } catch (err) {
    console.error("Failed to parse charging status:", err);
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
    console.error("Failed to parse Heart Rate blink rate:", err);
    return null;
  }
}
