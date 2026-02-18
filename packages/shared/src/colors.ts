/**
 * Color conversion utilities for FigmaFast.
 * Figma uses {r, g, b, a} with 0–1 range. We use hex strings externally.
 */

export interface RgbaColor {
  r: number; // 0–1
  g: number; // 0–1
  b: number; // 0–1
  a: number; // 0–1
}

/**
 * Parse a hex color string to RGBA (0–1 range).
 * Supports #RGB, #RRGGBB, and #RRGGBBAA formats.
 */
export function hexToRgba(hex: string): RgbaColor {
  let h = hex.replace('#', '');

  // Expand shorthand (#RGB → #RRGGBB)
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }

  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;

  return { r, g, b, a };
}

/**
 * Convert RGBA (0–1 range) to hex string.
 * Omits alpha channel if fully opaque.
 */
export function rgbaToHex(color: RgbaColor): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = Math.round(color.a * 255);

  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

  return a === 255 ? hex : hex + a.toString(16).padStart(2, '0');
}
