/**
 * Verification tests for build-node bug fixes.
 * Mocks the Figma Plugin API to test property application logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Figma API Mock ─────────────────────────────────────────────

function createMockNode(type: string, overrides: Record<string, any> = {}) {
  return {
    type,
    id: `mock-${type}-${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    fills: [],
    strokes: [],
    effects: [],
    opacity: 1,
    visible: true,
    locked: false,
    children: [] as any[],
    resize(w: number, h: number) {
      this.width = w;
      this.height = h;
    },
    appendChild(child: any) {
      this.children.push(child);
      child._parent = this;
    },
    // Auto-layout properties
    layoutMode: 'NONE',
    layoutSizingHorizontal: 'FIXED' as string,
    layoutSizingVertical: 'FIXED' as string,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    itemSpacing: 0,
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    clipsContent: true,
    // Text properties (for TEXT nodes)
    fontName: { family: 'Inter', style: 'Regular' },
    fontSize: 14,
    characters: '',
    textAutoResize: 'WIDTH_AND_HEIGHT' as string,
    textAlignHorizontal: 'LEFT',
    textAlignVertical: 'TOP',
    lineHeight: { unit: 'AUTO' },
    letterSpacing: { value: 0, unit: 'PIXELS' },
    textDecoration: 'NONE',
    textCase: 'ORIGINAL',
    textStyleId: '',
    fillStyleId: '',
    effectStyleId: '',
    cornerRadius: 0,
    setRangeFontSize: vi.fn(),
    ...overrides,
  };
}

// Install global figma mock
const figmaMock: any = {
  editorType: 'figjam',
  createFrame: () => createMockNode('FRAME'),
  createText: () => createMockNode('TEXT'),
  createRectangle: () => createMockNode('RECTANGLE'),
  loadFontAsync: vi.fn().mockResolvedValue(undefined),
  currentPage: createMockNode('PAGE'),
  createTable: vi.fn(),
  commitUndo: vi.fn(),
};

(globalThis as any).figma = figmaMock;

// ─── Import after global mock is installed ──────────────────────

import { applyTextProperties, applySizing, buildNode } from './build-node.js';
import type { SceneNode as SceneSpec } from '@figma-fast/shared';

// ─── Tests ──────────────────────────────────────────────────────

describe('BUG 1: TEXT with layoutSizingHorizontal FILL', () => {
  it('should set textAutoResize to HEIGHT when applying FILL horizontal sizing', () => {
    const textNode = createMockNode('TEXT', {
      textAutoResize: 'WIDTH_AND_HEIGHT',
    }) as any;

    const spec = {
      type: 'TEXT',
      layoutSizingHorizontal: 'FILL',
    } as SceneSpec;

    applySizing(textNode, spec);

    expect(textNode.textAutoResize).toBe('HEIGHT');
    expect(textNode.layoutSizingHorizontal).toBe('FILL');
  });

  it('should not change textAutoResize when it is already HEIGHT or NONE', () => {
    const textNode = createMockNode('TEXT', {
      textAutoResize: 'NONE',
    }) as any;

    const spec = {
      type: 'TEXT',
      layoutSizingHorizontal: 'FILL',
    } as SceneSpec;

    applySizing(textNode, spec);

    expect(textNode.textAutoResize).toBe('NONE');
    expect(textNode.layoutSizingHorizontal).toBe('FILL');
  });

  it('should not change textAutoResize for non-FILL sizing', () => {
    const textNode = createMockNode('TEXT', {
      textAutoResize: 'WIDTH_AND_HEIGHT',
    }) as any;

    const spec = {
      type: 'TEXT',
      layoutSizingHorizontal: 'HUG',
    } as SceneSpec;

    applySizing(textNode, spec);

    expect(textNode.textAutoResize).toBe('WIDTH_AND_HEIGHT');
  });
});

describe('BUG 3: FigJam TEXT with explicit width', () => {
  beforeEach(() => {
    figmaMock.editorType = 'figjam';
  });

  it('should use HEIGHT textAutoResize when width is explicitly set in FigJam', async () => {
    const textNode = createMockNode('TEXT') as any;
    const spec = {
      type: 'TEXT',
      width: 400,
      characters: 'Hello World',
    } as SceneSpec;

    await applyTextProperties(textNode, spec, new Set(), []);

    expect(textNode.textAutoResize).toBe('HEIGHT');
  });

  it('should use WIDTH_AND_HEIGHT when no explicit width in FigJam', async () => {
    const textNode = createMockNode('TEXT') as any;
    const spec = {
      type: 'TEXT',
      characters: 'Hello World',
    } as SceneSpec;

    await applyTextProperties(textNode, spec, new Set(), []);

    expect(textNode.textAutoResize).toBe('WIDTH_AND_HEIGHT');
  });

  it('should respect explicit textAutoResize even with width set', async () => {
    const textNode = createMockNode('TEXT') as any;
    const spec = {
      type: 'TEXT',
      width: 400,
      characters: 'Hello World',
      textAutoResize: 'NONE',
    } as SceneSpec;

    await applyTextProperties(textNode, spec, new Set(), []);

    expect(textNode.textAutoResize).toBe('NONE');
  });
});

describe('BUG 2: jam_create_table cellData', () => {
  it('createTable is awaited', () => {
    const fs = require('fs');
    const source = fs.readFileSync(
      require('path').resolve(__dirname, '../figjam-handlers.ts'),
      'utf-8',
    );
    expect(source).toContain('await (figma as any).createTable(');
  });

  it('uses cellAt() (not getCellAt()) to access table cells', () => {
    const fs = require('fs');
    const source = fs.readFileSync(
      require('path').resolve(__dirname, '../figjam-handlers.ts'),
      'utf-8',
    );
    // Must use the correct FigJam API method
    expect(source).toContain('.cellAt(r, c)');
    expect(source).not.toContain('.getCellAt(');
  });

  it('loads Inter Regular font for cell text', () => {
    const fs = require('fs');
    const source = fs.readFileSync(
      require('path').resolve(__dirname, '../figjam-handlers.ts'),
      'utf-8',
    );
    expect(source).toContain("family: 'Inter', style: 'Regular'");
  });
});
