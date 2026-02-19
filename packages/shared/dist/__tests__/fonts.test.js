"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fonts_js_1 = require("../fonts.js");
(0, vitest_1.describe)('getFontStyle', () => {
    // TEST-011: getFontStyle maps numeric weights to style names
    (0, vitest_1.it)('maps all numeric weights to correct style names', () => {
        (0, vitest_1.expect)((0, fonts_js_1.getFontStyle)(100)).toBe('Thin');
        (0, vitest_1.expect)((0, fonts_js_1.getFontStyle)(200)).toBe('Extra Light');
        (0, vitest_1.expect)((0, fonts_js_1.getFontStyle)(300)).toBe('Light');
        (0, vitest_1.expect)((0, fonts_js_1.getFontStyle)(400)).toBe('Regular');
        (0, vitest_1.expect)((0, fonts_js_1.getFontStyle)(500)).toBe('Medium');
        (0, vitest_1.expect)((0, fonts_js_1.getFontStyle)(600)).toBe('Semi Bold');
        (0, vitest_1.expect)((0, fonts_js_1.getFontStyle)(700)).toBe('Bold');
        (0, vitest_1.expect)((0, fonts_js_1.getFontStyle)(800)).toBe('Extra Bold');
        (0, vitest_1.expect)((0, fonts_js_1.getFontStyle)(900)).toBe('Black');
    });
    // TEST-012: getFontStyle returns Regular for undefined/unknown weight
    (0, vitest_1.it)('returns Regular for undefined', () => {
        (0, vitest_1.expect)((0, fonts_js_1.getFontStyle)(undefined)).toBe('Regular');
    });
    (0, vitest_1.it)('returns Regular for unmapped numeric weights', () => {
        (0, vitest_1.expect)((0, fonts_js_1.getFontStyle)(450)).toBe('Regular');
        (0, vitest_1.expect)((0, fonts_js_1.getFontStyle)(0)).toBe('Regular');
        (0, vitest_1.expect)((0, fonts_js_1.getFontStyle)(-1)).toBe('Regular');
    });
    // TEST-013: getFontStyle passes through string values
    (0, vitest_1.it)('passes through string weight values as-is', () => {
        (0, vitest_1.expect)((0, fonts_js_1.getFontStyle)('Bold Italic')).toBe('Bold Italic');
        (0, vitest_1.expect)((0, fonts_js_1.getFontStyle)('Light')).toBe('Light');
    });
});
(0, vitest_1.describe)('collectFonts', () => {
    // TEST-014: collectFonts returns unique font refs from TEXT nodes
    (0, vitest_1.it)('deduplicates repeated font refs and returns unique entries', () => {
        const spec = {
            type: 'FRAME',
            children: [
                { type: 'TEXT', fontFamily: 'Roboto', fontWeight: 700 },
                { type: 'TEXT', fontFamily: 'Inter' },
                { type: 'TEXT', fontFamily: 'Roboto', fontWeight: 700 },
            ],
        };
        const fonts = (0, fonts_js_1.collectFonts)(spec);
        // Roboto Bold, Inter Regular (fallback coincides with second TEXT), so 2 unique + fallback already present
        const keys = fonts.map((f) => `${f.family}::${f.style}`);
        const unique = new Set(keys);
        (0, vitest_1.expect)(unique.size).toBe(keys.length); // no duplicates
        (0, vitest_1.expect)(keys).toContain('Roboto::Bold');
        (0, vitest_1.expect)(keys).toContain('Inter::Regular');
    });
    // TEST-015: collectFonts always includes Inter Regular fallback
    (0, vitest_1.it)('always includes Inter Regular fallback even when not explicitly used', () => {
        const spec = {
            type: 'FRAME',
            children: [{ type: 'TEXT', fontFamily: 'Roboto', fontWeight: 400 }],
        };
        const fonts = (0, fonts_js_1.collectFonts)(spec);
        const keys = fonts.map((f) => `${f.family}::${f.style}`);
        (0, vitest_1.expect)(keys).toContain('Inter::Regular');
        (0, vitest_1.expect)(keys).toContain('Roboto::Regular');
    });
    // TEST-016: collectFonts handles spec with no TEXT nodes
    (0, vitest_1.it)('returns at least Inter Regular when there are no TEXT nodes', () => {
        const spec = {
            type: 'FRAME',
            children: [{ type: 'RECTANGLE' }, { type: 'ELLIPSE' }],
        };
        const fonts = (0, fonts_js_1.collectFonts)(spec);
        (0, vitest_1.expect)(fonts.length).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(fonts.some((f) => f.family === 'Inter' && f.style === 'Regular')).toBe(true);
    });
    // TEST-017: collectFonts walks nested children
    (0, vitest_1.it)('walks deeply nested children to find TEXT nodes', () => {
        const spec = {
            type: 'FRAME',
            children: [
                {
                    type: 'FRAME',
                    children: [{ type: 'TEXT', fontFamily: 'Mono', fontWeight: 300 }],
                },
            ],
        };
        const fonts = (0, fonts_js_1.collectFonts)(spec);
        (0, vitest_1.expect)(fonts.some((f) => f.family === 'Mono' && f.style === 'Light')).toBe(true);
    });
});
//# sourceMappingURL=fonts.test.js.map