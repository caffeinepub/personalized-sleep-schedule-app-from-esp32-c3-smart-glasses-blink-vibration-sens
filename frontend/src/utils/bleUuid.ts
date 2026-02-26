/**
 * UUID normalization utilities for Web Bluetooth API.
 * Converts various UUID formats to Web Bluetooth compatible types.
 */

/**
 * Normalizes a UUID string to a Web Bluetooth compatible format.
 * - 16-bit hex strings (e.g., "0x180d", "180d") → number
 * - 128-bit UUID strings → string (unchanged)
 * 
 * @param uuid - The UUID to normalize (string or number)
 * @returns Normalized UUID (number for 16-bit, string for 128-bit)
 */
export function normalizeUUID(uuid: string | number): string | number {
  if (typeof uuid === 'number') {
    return uuid;
  }

  const trimmed = uuid.trim();
  
  // Check if it's a 128-bit UUID (contains hyphens or is long)
  if (trimmed.includes('-') || trimmed.length > 8) {
    return trimmed.toLowerCase();
  }

  // Try to parse as 16-bit or 32-bit hex
  const hexMatch = trimmed.match(/^(?:0x)?([0-9a-fA-F]{1,8})$/);
  if (hexMatch) {
    return parseInt(hexMatch[1], 16);
  }

  // If it doesn't match expected patterns, return as-is (let Web Bluetooth handle it)
  return trimmed;
}

/**
 * Formats a normalized UUID for display in UI/error messages.
 * 
 * @param uuid - The normalized UUID
 * @returns Human-readable UUID string
 */
export function formatUUID(uuid: string | number): string {
  if (typeof uuid === 'number') {
    return `0x${uuid.toString(16).padStart(4, '0')}`;
  }
  return uuid;
}
