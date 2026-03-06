/**
 * Pure utility functions extracted from handlers.ts.
 * These functions have no side effects and do not depend on Figma globals.
 * They can be tested without a Figma environment.
 */

// ─── Base64 Encoder/Decoder ────────────────────────────────────────────────
// btoa/atob are unavailable in the Figma sandbox, so we implement our own.

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Encode a Uint8Array to a base64 string.
 */
export function base64Encode(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i],
      b2 = bytes[i + 1] ?? 0,
      b3 = bytes[i + 2] ?? 0;
    result += BASE64_CHARS[b1 >> 2] + BASE64_CHARS[((b1 & 3) << 4) | (b2 >> 4)];
    result += i + 1 < bytes.length ? BASE64_CHARS[((b2 & 15) << 2) | (b3 >> 6)] : '=';
    result += i + 2 < bytes.length ? BASE64_CHARS[b3 & 63] : '=';
  }
  return result;
}

/**
 * Decode a base64 string to a Uint8Array.
 */
export function base64Decode(str: string): Uint8Array {
  // Strip whitespace and padding
  const cleaned = str.replace(/[^A-Za-z0-9+/]/g, '');
  const len = cleaned.length;
  const bytes: number[] = [];
  for (let i = 0; i < len; i += 4) {
    const c1 = BASE64_CHARS.indexOf(cleaned[i]);
    const c2 = BASE64_CHARS.indexOf(cleaned[i + 1]);
    const c3 = i + 2 < len ? BASE64_CHARS.indexOf(cleaned[i + 2]) : 0;
    const c4 = i + 3 < len ? BASE64_CHARS.indexOf(cleaned[i + 3]) : 0;
    bytes.push((c1 << 2) | (c2 >> 4));
    if (i + 2 < len) bytes.push(((c2 & 15) << 4) | (c3 >> 2));
    if (i + 3 < len) bytes.push(((c3 & 3) << 6) | c4);
  }
  return new Uint8Array(bytes);
}

// ─── Image MIME Type Detection ─────────────────────────────────────────────

/**
 * Detect the MIME type of image bytes by inspecting the file magic bytes.
 * Returns 'image/png' as fallback if the format is unknown.
 */
export function detectImageMimeType(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return 'image/webp';
  return 'image/png';
}

// ─── Font Weight Helper ────────────────────────────────────────────────────

/**
 * Map a numeric font weight to a Figma font style string.
 * Returns 'Regular' for unknown weights.
 */
export function getFontStyleFromWeight(weight: number): string {
  switch (weight) {
    case 100:
      return 'Thin';
    case 200:
      return 'Extra Light';
    case 300:
      return 'Light';
    case 400:
      return 'Regular';
    case 500:
      return 'Medium';
    case 600:
      return 'Semi Bold';
    case 700:
      return 'Bold';
    case 800:
      return 'Extra Bold';
    case 900:
      return 'Black';
    default:
      return 'Regular';
  }
}
