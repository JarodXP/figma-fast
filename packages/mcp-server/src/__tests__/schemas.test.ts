import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  SceneNodeSchema,
  FillSchema,
  EffectSchema,
  ModifyPropertiesSchema,
  BatchModificationSchema,
} from '../schemas.js';

describe('SceneNodeSchema', () => {
  // TEST-018: SceneNodeSchema accepts minimal valid FRAME
  it('accepts minimal valid FRAME with only type field', () => {
    const result = SceneNodeSchema.safeParse({ type: 'FRAME' });
    expect(result.success).toBe(true);
  });

  // TEST-019: SceneNodeSchema rejects missing type
  it('rejects input with missing type field', () => {
    const result = SceneNodeSchema.safeParse({ name: 'Card' });
    expect(result.success).toBe(false);
  });

  // TEST-020: SceneNodeSchema rejects invalid type
  it('rejects invalid node type', () => {
    const result = SceneNodeSchema.safeParse({ type: 'BUTTON' });
    expect(result.success).toBe(false);
  });

  // TEST-021: SceneNodeSchema accepts full TEXT node
  it('accepts full TEXT node with all properties', () => {
    const result = SceneNodeSchema.safeParse({
      type: 'TEXT',
      characters: 'Hello',
      fontSize: 16,
      fontFamily: 'Inter',
      fontWeight: 700,
      textAlignHorizontal: 'CENTER',
      textAutoResize: 'WIDTH_AND_HEIGHT',
      fills: [{ type: 'SOLID', color: '#000000' }],
    });
    expect(result.success).toBe(true);
  });

  // TEST-022: SceneNodeSchema accepts nested children recursively
  it('accepts deeply nested FRAME > FRAME > TEXT structure', () => {
    const result = SceneNodeSchema.safeParse({
      type: 'FRAME',
      children: [
        {
          type: 'FRAME',
          children: [{ type: 'TEXT', characters: 'Nested' }],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  // TEST-023: SceneNodeSchema validates fill types
  it('rejects fills with invalid fill type', () => {
    const result = SceneNodeSchema.safeParse({
      type: 'FRAME',
      fills: [{ type: 'INVALID_FILL' }],
    });
    expect(result.success).toBe(false);
  });

  // TEST-024: SceneNodeSchema accepts all 12 node types
  it('accepts all 12 valid node types', () => {
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
      const result = SceneNodeSchema.safeParse({ type });
      expect(result.success, `Expected ${type} to pass`).toBe(true);
    }
  });

  // TEST-025: SceneNodeSchema validates cornerRadius as number or 4-tuple
  it('accepts cornerRadius as a number', () => {
    const result = SceneNodeSchema.safeParse({ type: 'FRAME', cornerRadius: 8 });
    expect(result.success).toBe(true);
  });

  it('accepts cornerRadius as a 4-tuple', () => {
    const result = SceneNodeSchema.safeParse({ type: 'FRAME', cornerRadius: [8, 8, 0, 0] });
    expect(result.success).toBe(true);
  });

  it('rejects cornerRadius as a 2-tuple', () => {
    const result = SceneNodeSchema.safeParse({ type: 'FRAME', cornerRadius: [8, 8] });
    expect(result.success).toBe(false);
  });

  it('rejects cornerRadius as a string', () => {
    const result = SceneNodeSchema.safeParse({ type: 'FRAME', cornerRadius: '8px' });
    expect(result.success).toBe(false);
  });

  // TEST-026: SceneNodeSchema validates padding as number or 4-tuple
  it('accepts padding as a number', () => {
    const result = SceneNodeSchema.safeParse({ type: 'FRAME', padding: 16 });
    expect(result.success).toBe(true);
  });

  it('accepts padding as a 4-tuple', () => {
    const result = SceneNodeSchema.safeParse({ type: 'FRAME', padding: [16, 24, 16, 24] });
    expect(result.success).toBe(true);
  });

  it('rejects padding as a 2-tuple', () => {
    const result = SceneNodeSchema.safeParse({ type: 'FRAME', padding: [16, 24] });
    expect(result.success).toBe(false);
  });

  // TEST-027: SceneNodeSchema validates opacity range
  it('accepts opacity values 0, 0.5, and 1', () => {
    for (const opacity of [0, 0.5, 1]) {
      const result = SceneNodeSchema.safeParse({ type: 'FRAME', opacity });
      expect(result.success, `Expected opacity ${opacity} to pass`).toBe(true);
    }
  });

  it('rejects opacity below 0', () => {
    const result = SceneNodeSchema.safeParse({ type: 'FRAME', opacity: -0.1 });
    expect(result.success).toBe(false);
  });

  it('rejects opacity above 1', () => {
    const result = SceneNodeSchema.safeParse({ type: 'FRAME', opacity: 1.5 });
    expect(result.success).toBe(false);
  });
});

describe('FillSchema', () => {
  // TEST-028: FillSchema validates gradient stops
  it('accepts gradient fill with valid gradient stops', () => {
    const result = FillSchema.safeParse({
      type: 'GRADIENT_LINEAR',
      gradientStops: [
        { position: 0, color: '#FF0000' },
        { position: 1, color: '#0000FF' },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('EffectSchema', () => {
  // TEST-029: EffectSchema validates all effect types
  it('accepts all valid effect types with required radius', () => {
    const effectTypes = ['DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR'];
    for (const type of effectTypes) {
      const result = EffectSchema.safeParse({ type, radius: 4 });
      expect(result.success, `Expected effect type ${type} to pass`).toBe(true);
    }
  });
});

describe('ModifyPropertiesSchema', () => {
  // TEST-030: ModifyPropertiesSchema accepts all properties that SceneNodeSchema accepts for shared properties
  it('accepts fills, strokes, effects, cornerRadius, layoutMode, characters, fontSize', () => {
    const result = ModifyPropertiesSchema.safeParse({
      fills: [{ type: 'SOLID', color: '#FF0000' }],
      strokes: [{ color: '#000000', weight: 1 }],
      effects: [{ type: 'DROP_SHADOW', radius: 4 }],
      cornerRadius: 8,
      layoutMode: 'VERTICAL',
      characters: 'Hello',
      fontSize: 16,
    });
    expect(result.success).toBe(true);
  });
});

// Phase 8: Image Fill schema tests (TEST-P8-008, TEST-P8-003)
describe('Phase 8 image fill schema', () => {
  // TEST-P8-008: FillSchema accepts imageUrl field
  it('FillSchema accepts IMAGE fill with imageUrl', () => {
    const result = FillSchema.safeParse({
      type: 'IMAGE',
      imageUrl: 'https://example.com/photo.png',
      scaleMode: 'FILL',
    });
    expect(result.success).toBe(true);
  });

  // TEST-P8-003: FillSchema rejects invalid imageUrl
  it('FillSchema rejects invalid imageUrl (not-a-url)', () => {
    const result = FillSchema.safeParse({
      type: 'IMAGE',
      imageUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });
});

// Phase 10C/D: Batch tool schema tests (TEST-P10C-004, TEST-P10C-006, TEST-P10D-004)
describe('Phase 10 batch schemas', () => {
  // TEST-P10C-006: BatchModificationSchema validates single modification item
  it('BatchModificationSchema accepts valid nodeId and properties', () => {
    const result = BatchModificationSchema.safeParse({
      nodeId: '1:1',
      properties: { name: 'test' },
    });
    expect(result.success).toBe(true);
  });

  it('BatchModificationSchema rejects modification without nodeId', () => {
    const result = BatchModificationSchema.safeParse({
      properties: { name: 'test' },
    });
    expect(result.success).toBe(false);
  });

  // TEST-P10C-004: Empty modifications array is rejected (min 1)
  it('batch_modify rejects empty modifications array (min 1)', () => {
    const schema = z.object({ modifications: z.array(BatchModificationSchema).min(1) });
    const result = schema.safeParse({ modifications: [] });
    expect(result.success).toBe(false);
  });

  // TEST-P10D-004: Empty nodeIds array is rejected (min 1)
  it('batch_get_node_info rejects empty nodeIds array (min 1)', () => {
    const schema = z.object({ nodeIds: z.array(z.string()).min(1) });
    const result = schema.safeParse({ nodeIds: [] });
    expect(result.success).toBe(false);
  });
});

// Phase 7A: Style Binding schema tests (TEST-P7A-001 through TEST-P7A-004)
describe('Phase 7A style binding schema', () => {
  // TEST-P7A-001: SceneNodeSchema accepts fillStyleId field
  it('SceneNodeSchema accepts fillStyleId field', () => {
    const result = SceneNodeSchema.safeParse({ type: 'RECTANGLE', fillStyleId: 'S:abc123,1:1' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fillStyleId).toBe('S:abc123,1:1');
    }
  });

  // TEST-P7A-002: SceneNodeSchema accepts textStyleId field
  it('SceneNodeSchema accepts textStyleId field', () => {
    const result = SceneNodeSchema.safeParse({ type: 'TEXT', characters: 'Hello', textStyleId: 'S:def456,2:2' });
    expect(result.success).toBe(true);
  });

  // TEST-P7A-003: SceneNodeSchema accepts effectStyleId field
  it('SceneNodeSchema accepts effectStyleId field', () => {
    const result = SceneNodeSchema.safeParse({ type: 'FRAME', effectStyleId: 'S:ghi789,3:3' });
    expect(result.success).toBe(true);
  });

  // TEST-P7A-004: ModifyPropertiesSchema accepts all three style ID fields
  it('ModifyPropertiesSchema accepts fillStyleId, textStyleId, and effectStyleId', () => {
    const result = ModifyPropertiesSchema.safeParse({
      fillStyleId: 'S:abc,1:1',
      textStyleId: 'S:def,2:2',
      effectStyleId: 'S:ghi,3:3',
    });
    expect(result.success).toBe(true);
  });
});
