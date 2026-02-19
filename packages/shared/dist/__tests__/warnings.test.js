"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const warnings_js_1 = require("../warnings.js");
// Phase 10A: Warning System Tests
// TEST-P10A-001 through TEST-P10A-007
(0, vitest_1.describe)('detectIgnoredProperties', () => {
    // TEST-P10A-001: warns on x/y for COMPONENT children in COMPONENT_SET
    (0, vitest_1.it)('warns on x and y for COMPONENT node with COMPONENT_SET parent', () => {
        const warnings = (0, warnings_js_1.detectIgnoredProperties)('COMPONENT', 'COMPONENT_SET', { x: 100, y: 200 });
        (0, vitest_1.expect)(warnings.length).toBeGreaterThanOrEqual(2);
        const warningText = warnings.join(' ');
        (0, vitest_1.expect)(warningText).toMatch(/x/);
        (0, vitest_1.expect)(warningText).toMatch(/y/);
    });
    // TEST-P10A-002: warns on layout properties for TEXT nodes
    (0, vitest_1.it)('warns on layoutMode, itemSpacing, and padding for TEXT nodes', () => {
        const warnings = (0, warnings_js_1.detectIgnoredProperties)('TEXT', undefined, {
            layoutMode: 'VERTICAL',
            itemSpacing: 8,
            padding: 16,
        });
        (0, vitest_1.expect)(warnings.length).toBeGreaterThanOrEqual(3);
        const warningText = warnings.join(' ');
        (0, vitest_1.expect)(warningText).toMatch(/layoutMode/);
        (0, vitest_1.expect)(warningText).toMatch(/itemSpacing/);
        (0, vitest_1.expect)(warningText).toMatch(/padding/);
    });
    // TEST-P10A-003: warns on text properties for non-TEXT nodes
    (0, vitest_1.it)('warns on characters, fontSize, fontFamily for RECTANGLE nodes', () => {
        const warnings = (0, warnings_js_1.detectIgnoredProperties)('RECTANGLE', undefined, {
            characters: 'Hello',
            fontSize: 16,
            fontFamily: 'Inter',
        });
        (0, vitest_1.expect)(warnings.length).toBeGreaterThanOrEqual(3);
        const warningText = warnings.join(' ');
        (0, vitest_1.expect)(warningText).toMatch(/characters/);
        (0, vitest_1.expect)(warningText).toMatch(/fontSize/);
        (0, vitest_1.expect)(warningText).toMatch(/fontFamily/);
    });
    // TEST-P10A-004: warns on structural changes to INSTANCE nodes
    (0, vitest_1.it)('warns on layoutMode and children for INSTANCE nodes', () => {
        const warnings = (0, warnings_js_1.detectIgnoredProperties)('INSTANCE', undefined, {
            layoutMode: 'HORIZONTAL',
            children: [],
        });
        (0, vitest_1.expect)(warnings.length).toBeGreaterThanOrEqual(2);
        const warningText = warnings.join(' ');
        (0, vitest_1.expect)(warningText).toMatch(/layoutMode/);
        (0, vitest_1.expect)(warningText).toMatch(/children/);
    });
    // TEST-P10A-005: returns empty array for valid FRAME properties
    (0, vitest_1.it)('returns empty array for valid FRAME properties (x, y, fills, layoutMode)', () => {
        const warnings = (0, warnings_js_1.detectIgnoredProperties)('FRAME', undefined, {
            x: 100,
            fills: [{ type: 'SOLID', color: '#FF0000' }],
            layoutMode: 'VERTICAL',
        });
        (0, vitest_1.expect)(warnings).toHaveLength(0);
    });
    // TEST-P10A-006: returns empty array for valid TEXT properties
    (0, vitest_1.it)('returns empty array for valid TEXT properties (characters, fontSize, fontFamily, x)', () => {
        const warnings = (0, warnings_js_1.detectIgnoredProperties)('TEXT', undefined, {
            characters: 'Hello',
            fontSize: 16,
            fontFamily: 'Inter',
            x: 50,
        });
        (0, vitest_1.expect)(warnings).toHaveLength(0);
    });
    // TEST-P10A-007: all warning strings start with "[warning]"
    (0, vitest_1.it)('all warning strings start with "[warning]" prefix', () => {
        const warnings = (0, warnings_js_1.detectIgnoredProperties)('TEXT', undefined, {
            layoutMode: 'VERTICAL',
        });
        (0, vitest_1.expect)(warnings.length).toBeGreaterThan(0);
        for (const warning of warnings) {
            (0, vitest_1.expect)(warning).toMatch(/^\[warning\]/);
        }
    });
});
//# sourceMappingURL=warnings.test.js.map