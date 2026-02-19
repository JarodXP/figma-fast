"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const colors_js_1 = require("../colors.js");
(0, vitest_1.describe)('hexToRgba', () => {
    // TEST-001: hexToRgba parses 6-digit hex correctly
    (0, vitest_1.it)('parses 6-digit hex correctly', () => {
        const result = (0, colors_js_1.hexToRgba)('#FF8800');
        (0, vitest_1.expect)(result.r).toBeCloseTo(1, 2);
        (0, vitest_1.expect)(result.g).toBeCloseTo(136 / 255, 2);
        (0, vitest_1.expect)(result.b).toBeCloseTo(0, 2);
        (0, vitest_1.expect)(result.a).toBeCloseTo(1, 2);
    });
    // TEST-002: hexToRgba parses 3-digit shorthand hex
    (0, vitest_1.it)('parses 3-digit shorthand hex the same as the equivalent 6-digit hex', () => {
        const short = (0, colors_js_1.hexToRgba)('#F80');
        const full = (0, colors_js_1.hexToRgba)('#FF8800');
        (0, vitest_1.expect)(short.r).toBeCloseTo(full.r, 2);
        (0, vitest_1.expect)(short.g).toBeCloseTo(full.g, 2);
        (0, vitest_1.expect)(short.b).toBeCloseTo(full.b, 2);
        (0, vitest_1.expect)(short.a).toBeCloseTo(full.a, 2);
    });
    // TEST-003: hexToRgba parses 8-digit hex with alpha
    (0, vitest_1.it)('parses 8-digit hex with alpha', () => {
        const result = (0, colors_js_1.hexToRgba)('#FF000080');
        (0, vitest_1.expect)(result.r).toBeCloseTo(1, 2);
        (0, vitest_1.expect)(result.g).toBeCloseTo(0, 2);
        (0, vitest_1.expect)(result.b).toBeCloseTo(0, 2);
        (0, vitest_1.expect)(result.a).toBeCloseTo(128 / 255, 2);
    });
    // TEST-004: hexToRgba handles # prefix presence/absence
    (0, vitest_1.it)('handles hex with and without # prefix identically', () => {
        const withHash = (0, colors_js_1.hexToRgba)('#FF0000');
        const withoutHash = (0, colors_js_1.hexToRgba)('FF0000');
        (0, vitest_1.expect)(withHash.r).toBeCloseTo(withoutHash.r, 2);
        (0, vitest_1.expect)(withHash.g).toBeCloseTo(withoutHash.g, 2);
        (0, vitest_1.expect)(withHash.b).toBeCloseTo(withoutHash.b, 2);
        (0, vitest_1.expect)(withHash.a).toBeCloseTo(withoutHash.a, 2);
    });
    // TEST-005: hexToRgba handles black and white
    (0, vitest_1.it)('handles black correctly', () => {
        const result = (0, colors_js_1.hexToRgba)('#000000');
        (0, vitest_1.expect)(result.r).toBeCloseTo(0, 2);
        (0, vitest_1.expect)(result.g).toBeCloseTo(0, 2);
        (0, vitest_1.expect)(result.b).toBeCloseTo(0, 2);
        (0, vitest_1.expect)(result.a).toBeCloseTo(1, 2);
    });
    (0, vitest_1.it)('handles white correctly', () => {
        const result = (0, colors_js_1.hexToRgba)('#FFFFFF');
        (0, vitest_1.expect)(result.r).toBeCloseTo(1, 2);
        (0, vitest_1.expect)(result.g).toBeCloseTo(1, 2);
        (0, vitest_1.expect)(result.b).toBeCloseTo(1, 2);
        (0, vitest_1.expect)(result.a).toBeCloseTo(1, 2);
    });
    // TEST-006: hexToRgba handles full transparency
    (0, vitest_1.it)('handles full transparency (#00000000)', () => {
        const result = (0, colors_js_1.hexToRgba)('#00000000');
        (0, vitest_1.expect)(result.r).toBeCloseTo(0, 2);
        (0, vitest_1.expect)(result.g).toBeCloseTo(0, 2);
        (0, vitest_1.expect)(result.b).toBeCloseTo(0, 2);
        (0, vitest_1.expect)(result.a).toBeCloseTo(0, 2);
    });
    // TEST-010: hexToRgba boundary values
    (0, vitest_1.it)('produces values within [0,1] range for boundary hex values', () => {
        const cases = ['#000', '#FFF', '#00000000', '#FFFFFFFF'];
        for (const hex of cases) {
            const result = (0, colors_js_1.hexToRgba)(hex);
            (0, vitest_1.expect)(result.r).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(result.r).toBeLessThanOrEqual(1);
            (0, vitest_1.expect)(result.g).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(result.g).toBeLessThanOrEqual(1);
            (0, vitest_1.expect)(result.b).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(result.b).toBeLessThanOrEqual(1);
            (0, vitest_1.expect)(result.a).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(result.a).toBeLessThanOrEqual(1);
        }
    });
});
(0, vitest_1.describe)('rgbaToHex', () => {
    // TEST-007: rgbaToHex converts opaque color correctly
    (0, vitest_1.it)('converts opaque color to hex without alpha suffix', () => {
        const result = (0, colors_js_1.rgbaToHex)({ r: 1, g: 0, b: 0, a: 1 });
        (0, vitest_1.expect)(result).toBe('#ff0000');
    });
    // TEST-008: rgbaToHex includes alpha when not fully opaque
    (0, vitest_1.it)('includes alpha suffix when color is not fully opaque', () => {
        const result = (0, colors_js_1.rgbaToHex)({ r: 0, g: 0, b: 0, a: 0.5 });
        // alpha = round(0.5 * 255) = 128 = 0x80
        (0, vitest_1.expect)(result).toBe('#00000080');
    });
    // TEST-009: hexToRgba and rgbaToHex roundtrip
    (0, vitest_1.it)('roundtrips hex -> rgba -> hex correctly', () => {
        const original = '#3a7bf2';
        const rgba = (0, colors_js_1.hexToRgba)(original);
        const result = (0, colors_js_1.rgbaToHex)(rgba);
        (0, vitest_1.expect)(result.toLowerCase()).toBe(original.toLowerCase());
    });
});
//# sourceMappingURL=colors.test.js.map