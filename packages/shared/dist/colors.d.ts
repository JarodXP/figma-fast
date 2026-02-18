/**
 * Color conversion utilities for FigmaFast.
 * Figma uses {r, g, b, a} with 0–1 range. We use hex strings externally.
 */
export interface RgbaColor {
    r: number;
    g: number;
    b: number;
    a: number;
}
/**
 * Parse a hex color string to RGBA (0–1 range).
 * Supports #RGB, #RRGGBB, and #RRGGBBAA formats.
 */
export declare function hexToRgba(hex: string): RgbaColor;
/**
 * Convert RGBA (0–1 range) to hex string.
 * Omits alpha channel if fully opaque.
 */
export declare function rgbaToHex(color: RgbaColor): string;
//# sourceMappingURL=colors.d.ts.map