"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const zod_1 = require("zod");
const schemas_js_1 = require("../schemas.js");
(0, vitest_1.describe)('SceneNodeSchema', () => {
    // TEST-018: SceneNodeSchema accepts minimal valid FRAME
    (0, vitest_1.it)('accepts minimal valid FRAME with only type field', () => {
        const result = schemas_js_1.SceneNodeSchema.safeParse({ type: 'FRAME' });
        (0, vitest_1.expect)(result.success).toBe(true);
    });
    // TEST-019: SceneNodeSchema rejects missing type
    (0, vitest_1.it)('rejects input with missing type field', () => {
        const result = schemas_js_1.SceneNodeSchema.safeParse({ name: 'Card' });
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    // TEST-020: SceneNodeSchema rejects invalid type
    (0, vitest_1.it)('rejects invalid node type', () => {
        const result = schemas_js_1.SceneNodeSchema.safeParse({ type: 'BUTTON' });
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    // TEST-021: SceneNodeSchema accepts full TEXT node
    (0, vitest_1.it)('accepts full TEXT node with all properties', () => {
        const result = schemas_js_1.SceneNodeSchema.safeParse({
            type: 'TEXT',
            characters: 'Hello',
            fontSize: 16,
            fontFamily: 'Inter',
            fontWeight: 700,
            textAlignHorizontal: 'CENTER',
            textAutoResize: 'WIDTH_AND_HEIGHT',
            fills: [{ type: 'SOLID', color: '#000000' }],
        });
        (0, vitest_1.expect)(result.success).toBe(true);
    });
    // TEST-022: SceneNodeSchema accepts nested children recursively
    (0, vitest_1.it)('accepts deeply nested FRAME > FRAME > TEXT structure', () => {
        const result = schemas_js_1.SceneNodeSchema.safeParse({
            type: 'FRAME',
            children: [
                {
                    type: 'FRAME',
                    children: [{ type: 'TEXT', characters: 'Nested' }],
                },
            ],
        });
        (0, vitest_1.expect)(result.success).toBe(true);
    });
    // TEST-023: SceneNodeSchema validates fill types
    (0, vitest_1.it)('rejects fills with invalid fill type', () => {
        const result = schemas_js_1.SceneNodeSchema.safeParse({
            type: 'FRAME',
            fills: [{ type: 'INVALID_FILL' }],
        });
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    // TEST-024: SceneNodeSchema accepts all 12 node types
    (0, vitest_1.it)('accepts all 12 valid node types', () => {
        const types = [
            'FRAME',
            'TEXT',
            'RECTANGLE',
            'ELLIPSE',
            'GROUP',
            'COMPONENT',
            'COMPONENT_SET',
            'COMPONENT_INSTANCE',
            'POLYGON',
            'STAR',
            'LINE',
            'VECTOR',
        ];
        for (const type of types) {
            const result = schemas_js_1.SceneNodeSchema.safeParse({ type });
            (0, vitest_1.expect)(result.success, `Expected ${type} to pass`).toBe(true);
        }
    });
    // TEST-025: SceneNodeSchema validates cornerRadius as number or 4-tuple
    (0, vitest_1.it)('accepts cornerRadius as a number', () => {
        const result = schemas_js_1.SceneNodeSchema.safeParse({ type: 'FRAME', cornerRadius: 8 });
        (0, vitest_1.expect)(result.success).toBe(true);
    });
    (0, vitest_1.it)('accepts cornerRadius as a 4-tuple', () => {
        const result = schemas_js_1.SceneNodeSchema.safeParse({ type: 'FRAME', cornerRadius: [8, 8, 0, 0] });
        (0, vitest_1.expect)(result.success).toBe(true);
    });
    (0, vitest_1.it)('rejects cornerRadius as a 2-tuple', () => {
        const result = schemas_js_1.SceneNodeSchema.safeParse({ type: 'FRAME', cornerRadius: [8, 8] });
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    (0, vitest_1.it)('rejects cornerRadius as a string', () => {
        const result = schemas_js_1.SceneNodeSchema.safeParse({ type: 'FRAME', cornerRadius: '8px' });
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    // TEST-026: SceneNodeSchema validates padding as number or 4-tuple
    (0, vitest_1.it)('accepts padding as a number', () => {
        const result = schemas_js_1.SceneNodeSchema.safeParse({ type: 'FRAME', padding: 16 });
        (0, vitest_1.expect)(result.success).toBe(true);
    });
    (0, vitest_1.it)('accepts padding as a 4-tuple', () => {
        const result = schemas_js_1.SceneNodeSchema.safeParse({ type: 'FRAME', padding: [16, 24, 16, 24] });
        (0, vitest_1.expect)(result.success).toBe(true);
    });
    (0, vitest_1.it)('rejects padding as a 2-tuple', () => {
        const result = schemas_js_1.SceneNodeSchema.safeParse({ type: 'FRAME', padding: [16, 24] });
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    // TEST-027: SceneNodeSchema validates opacity range
    (0, vitest_1.it)('accepts opacity values 0, 0.5, and 1', () => {
        for (const opacity of [0, 0.5, 1]) {
            const result = schemas_js_1.SceneNodeSchema.safeParse({ type: 'FRAME', opacity });
            (0, vitest_1.expect)(result.success, `Expected opacity ${opacity} to pass`).toBe(true);
        }
    });
    (0, vitest_1.it)('rejects opacity below 0', () => {
        const result = schemas_js_1.SceneNodeSchema.safeParse({ type: 'FRAME', opacity: -0.1 });
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    (0, vitest_1.it)('rejects opacity above 1', () => {
        const result = schemas_js_1.SceneNodeSchema.safeParse({ type: 'FRAME', opacity: 1.5 });
        (0, vitest_1.expect)(result.success).toBe(false);
    });
});
(0, vitest_1.describe)('FillSchema', () => {
    // TEST-028: FillSchema validates gradient stops
    (0, vitest_1.it)('accepts gradient fill with valid gradient stops', () => {
        const result = schemas_js_1.FillSchema.safeParse({
            type: 'GRADIENT_LINEAR',
            gradientStops: [
                { position: 0, color: '#FF0000' },
                { position: 1, color: '#0000FF' },
            ],
        });
        (0, vitest_1.expect)(result.success).toBe(true);
    });
});
(0, vitest_1.describe)('EffectSchema', () => {
    // TEST-029: EffectSchema validates all effect types
    (0, vitest_1.it)('accepts all valid effect types with required radius', () => {
        const effectTypes = ['DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR'];
        for (const type of effectTypes) {
            const result = schemas_js_1.EffectSchema.safeParse({ type, radius: 4 });
            (0, vitest_1.expect)(result.success, `Expected effect type ${type} to pass`).toBe(true);
        }
    });
});
(0, vitest_1.describe)('ModifyPropertiesSchema', () => {
    // TEST-030: ModifyPropertiesSchema accepts all properties that SceneNodeSchema accepts for shared properties
    (0, vitest_1.it)('accepts fills, strokes, effects, cornerRadius, layoutMode, characters, fontSize', () => {
        const result = schemas_js_1.ModifyPropertiesSchema.safeParse({
            fills: [{ type: 'SOLID', color: '#FF0000' }],
            strokes: [{ color: '#000000', weight: 1 }],
            effects: [{ type: 'DROP_SHADOW', radius: 4 }],
            cornerRadius: 8,
            layoutMode: 'VERTICAL',
            characters: 'Hello',
            fontSize: 16,
        });
        (0, vitest_1.expect)(result.success).toBe(true);
    });
});
// Phase 8: Image Fill schema tests (TEST-P8-008, TEST-P8-003)
(0, vitest_1.describe)('Phase 8 image fill schema', () => {
    // TEST-P8-008: FillSchema accepts imageUrl field
    (0, vitest_1.it)('FillSchema accepts IMAGE fill with imageUrl', () => {
        const result = schemas_js_1.FillSchema.safeParse({
            type: 'IMAGE',
            imageUrl: 'https://example.com/photo.png',
            scaleMode: 'FILL',
        });
        (0, vitest_1.expect)(result.success).toBe(true);
    });
    // TEST-P8-003: FillSchema rejects invalid imageUrl
    (0, vitest_1.it)('FillSchema rejects invalid imageUrl (not-a-url)', () => {
        const result = schemas_js_1.FillSchema.safeParse({
            type: 'IMAGE',
            imageUrl: 'not-a-url',
        });
        (0, vitest_1.expect)(result.success).toBe(false);
    });
});
// Phase 10C/D: Batch tool schema tests (TEST-P10C-004, TEST-P10C-006, TEST-P10D-004)
(0, vitest_1.describe)('Phase 10 batch schemas', () => {
    // TEST-P10C-006: BatchModificationSchema validates single modification item
    (0, vitest_1.it)('BatchModificationSchema accepts valid nodeId and properties', () => {
        const result = schemas_js_1.BatchModificationSchema.safeParse({
            nodeId: '1:1',
            properties: { name: 'test' },
        });
        (0, vitest_1.expect)(result.success).toBe(true);
    });
    (0, vitest_1.it)('BatchModificationSchema rejects modification without nodeId', () => {
        const result = schemas_js_1.BatchModificationSchema.safeParse({
            properties: { name: 'test' },
        });
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    // TEST-P10C-004: Empty modifications array is rejected (min 1)
    (0, vitest_1.it)('batch_modify rejects empty modifications array (min 1)', () => {
        const schema = zod_1.z.object({ modifications: zod_1.z.array(schemas_js_1.BatchModificationSchema).min(1) });
        const result = schema.safeParse({ modifications: [] });
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    // TEST-P10D-004: Empty nodeIds array is rejected (min 1)
    (0, vitest_1.it)('batch_get_node_info rejects empty nodeIds array (min 1)', () => {
        const schema = zod_1.z.object({ nodeIds: zod_1.z.array(zod_1.z.string()).min(1) });
        const result = schema.safeParse({ nodeIds: [] });
        (0, vitest_1.expect)(result.success).toBe(false);
    });
});
// Phase 7A: Style Binding schema tests (TEST-P7A-001 through TEST-P7A-004)
(0, vitest_1.describe)('Phase 7A style binding schema', () => {
    // TEST-P7A-001: SceneNodeSchema accepts fillStyleId field
    (0, vitest_1.it)('SceneNodeSchema accepts fillStyleId field', () => {
        const result = schemas_js_1.SceneNodeSchema.safeParse({ type: 'RECTANGLE', fillStyleId: 'S:abc123,1:1' });
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.fillStyleId).toBe('S:abc123,1:1');
        }
    });
    // TEST-P7A-002: SceneNodeSchema accepts textStyleId field
    (0, vitest_1.it)('SceneNodeSchema accepts textStyleId field', () => {
        const result = schemas_js_1.SceneNodeSchema.safeParse({ type: 'TEXT', characters: 'Hello', textStyleId: 'S:def456,2:2' });
        (0, vitest_1.expect)(result.success).toBe(true);
    });
    // TEST-P7A-003: SceneNodeSchema accepts effectStyleId field
    (0, vitest_1.it)('SceneNodeSchema accepts effectStyleId field', () => {
        const result = schemas_js_1.SceneNodeSchema.safeParse({ type: 'FRAME', effectStyleId: 'S:ghi789,3:3' });
        (0, vitest_1.expect)(result.success).toBe(true);
    });
    // TEST-P7A-004: ModifyPropertiesSchema accepts all three style ID fields
    (0, vitest_1.it)('ModifyPropertiesSchema accepts fillStyleId, textStyleId, and effectStyleId', () => {
        const result = schemas_js_1.ModifyPropertiesSchema.safeParse({
            fillStyleId: 'S:abc,1:1',
            textStyleId: 'S:def,2:2',
            effectStyleId: 'S:ghi,3:3',
        });
        (0, vitest_1.expect)(result.success).toBe(true);
    });
});
(0, vitest_1.describe)('FigJam schemas', () => {
    // TEST-FJ-002: JamStickyColorSchema
    (0, vitest_1.it)('JamStickyColorSchema accepts valid color YELLOW', () => {
        const result = schemas_js_1.JamStickyColorSchema.safeParse('YELLOW');
        (0, vitest_1.expect)(result.success).toBe(true);
    });
    (0, vitest_1.it)('JamStickyColorSchema rejects invalid color PURPLE', () => {
        const result = schemas_js_1.JamStickyColorSchema.safeParse('PURPLE');
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    // TEST-FJ-003: JamShapeTypeSchema
    (0, vitest_1.it)('JamShapeTypeSchema accepts valid shape DIAMOND', () => {
        const result = schemas_js_1.JamShapeTypeSchema.safeParse('DIAMOND');
        (0, vitest_1.expect)(result.success).toBe(true);
    });
    (0, vitest_1.it)('JamShapeTypeSchema rejects invalid shape HEXAGON', () => {
        const result = schemas_js_1.JamShapeTypeSchema.safeParse('HEXAGON');
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    (0, vitest_1.it)('JamShapeTypeSchema rejects missing value (required field)', () => {
        const result = schemas_js_1.JamShapeTypeSchema.safeParse(undefined);
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    (0, vitest_1.it)('JamConnectorStrokeCapSchema accepts valid cap ARROW_LINES', () => {
        const result = schemas_js_1.JamConnectorStrokeCapSchema.safeParse('ARROW_LINES');
        (0, vitest_1.expect)(result.success).toBe(true);
    });
    (0, vitest_1.it)('JamConnectorStrokeCapSchema accepts undefined (optional)', () => {
        const result = schemas_js_1.JamConnectorStrokeCapSchema.safeParse(undefined);
        (0, vitest_1.expect)(result.success).toBe(true);
    });
    (0, vitest_1.it)('JamCodeLanguageSchema accepts valid language JAVASCRIPT', () => {
        const result = schemas_js_1.JamCodeLanguageSchema.safeParse('JAVASCRIPT');
        (0, vitest_1.expect)(result.success).toBe(true);
    });
    (0, vitest_1.it)('JamCodeLanguageSchema rejects invalid language INVALID', () => {
        const result = schemas_js_1.JamCodeLanguageSchema.safeParse('INVALID');
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    (0, vitest_1.it)('JamCodeLanguageSchema accepts undefined (optional)', () => {
        const result = schemas_js_1.JamCodeLanguageSchema.safeParse(undefined);
        (0, vitest_1.expect)(result.success).toBe(true);
    });
});
//# sourceMappingURL=schemas.test.js.map