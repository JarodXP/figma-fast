/**
 * Tests for the buildScene orchestrator (scene-builder/index.ts).
 * Mocks the Figma Plugin API following the same pattern as build-node.test.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SceneNode as SceneSpec } from '@figma-fast/shared';

// ─── Figma API Mock ─────────────────────────────────────────────

function createMockNode(type: string, id?: string) {
  const node: any = {
    type,
    id: id ?? `mock-${type}-${Math.random().toString(36).slice(2, 6)}`,
    name: type,
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
    parent: null as any,
    resize(w: number, h: number) {
      this.width = w;
      this.height = h;
    },
    appendChild(child: any) {
      this.children.push(child);
      child.parent = this;
    },
    remove: vi.fn(),
    layoutMode: 'NONE',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'FIXED',
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    itemSpacing: 0,
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    clipsContent: true,
    fontName: { family: 'Inter', style: 'Regular' },
    fontSize: 14,
    characters: '',
    textAutoResize: 'WIDTH_AND_HEIGHT',
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
  };
  return node;
}

// Build a fresh mock page for each test
function createMockPage() {
  return createMockNode('PAGE', 'page-1');
}

// Install global figma mock BEFORE importing the module
const mockPage = createMockPage();
const figmaMock: any = {
  editorType: 'figma',
  currentPage: mockPage,
  getNodeByIdAsync: vi.fn(),
  loadFontAsync: vi.fn().mockResolvedValue(undefined),
  createFrame: () => createMockNode('FRAME'),
  createText: () => createMockNode('TEXT'),
  createRectangle: () => createMockNode('RECTANGLE'),
  createEllipse: () => createMockNode('ELLIPSE'),
  createLine: () => createMockNode('LINE'),
  createComponent: () => createMockNode('COMPONENT'),
  viewport: {
    scrollAndZoomIntoView: vi.fn(),
  },
  commitUndo: vi.fn(),
  mixed: Symbol('mixed'),
};

(globalThis as any).figma = figmaMock;

// ─── Import AFTER global mock is installed ─────────────────────

import { buildScene } from './index.js';

// ─── Tests ─────────────────────────────────────────────────────

beforeEach(() => {
  // Reset mock page children before each test
  figmaMock.currentPage = createMockPage();
  figmaMock.editorType = 'figma';
  vi.clearAllMocks();
  figmaMock.loadFontAsync.mockResolvedValue(undefined);
  figmaMock.getNodeByIdAsync.mockResolvedValue(null);
  figmaMock.viewport.scrollAndZoomIntoView.mockReturnValue(undefined);
});

// ─── FigJam pre-flight check ───────────────────────────────────

describe('buildScene FigJam pre-flight check', () => {
  beforeEach(() => {
    figmaMock.editorType = 'figjam';
  });

  it('rejects COMPONENT nodes in FigJam with a clear error', async () => {
    const spec: SceneSpec = {
      type: 'COMPONENT',
      name: 'MyComponent',
    } as SceneSpec;

    const result = await buildScene(spec);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('FigJam');
    expect(result.errors[0]).toContain('COMPONENT');
  });

  it('rejects COMPONENT_SET nodes in FigJam', async () => {
    const spec = {
      type: 'COMPONENT_SET',
      name: 'Variants',
    } as SceneSpec;

    const result = await buildScene(spec);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('COMPONENT_SET');
  });

  it('rejects nested unsupported types even if parent type is allowed', async () => {
    const spec: SceneSpec = {
      type: 'FRAME',
      name: 'Container',
      children: [
        {
          type: 'COMPONENT',
          name: 'Inner',
        } as SceneSpec,
      ],
    };

    const result = await buildScene(spec);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('COMPONENT');
  });

  it('allows FRAME nodes in FigJam (not blocked)', async () => {
    const spec: SceneSpec = {
      type: 'FRAME',
      name: 'FigJam Frame',
      width: 200,
      height: 100,
    };

    figmaMock.getNodeByIdAsync.mockImplementation((id: string) => {
      const node = figmaMock.currentPage.children.find((c: any) => c.id === id);
      return Promise.resolve(node ?? null);
    });

    const result = await buildScene(spec);

    // FRAME should not be blocked by FigJam check
    expect(result.errors).not.toContain(
      expect.stringContaining('FigJam does not support'),
    );
  });
});

// ─── Happy-path build scenarios ────────────────────────────────

describe('buildScene happy-path scenarios', () => {
  beforeEach(() => {
    figmaMock.editorType = 'figma';
  });

  it('builds a single FRAME and returns success with rootNodeId', async () => {
    const spec: SceneSpec = {
      type: 'FRAME',
      name: 'My Frame',
      id: 'frame-spec-1',
      width: 400,
      height: 300,
    };

    const result = await buildScene(spec);

    expect(result.success).toBe(true);
    expect(result.rootNodeId).toBeTruthy();
    // nodeIdMap keys are spec.id values
    expect(result.nodeIdMap['frame-spec-1']).toBeDefined();
    expect(result.errors).toHaveLength(0);
  });

  it('returns failure when parentId is specified but parent not found', async () => {
    figmaMock.getNodeByIdAsync.mockResolvedValue(null);

    const spec: SceneSpec = { type: 'FRAME', name: 'Child' } as SceneSpec;
    const result = await buildScene(spec, 'nonexistent-parent-id');

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('Parent node not found');
  });

  it('returns failure when parent node cannot have children', async () => {
    const leafNode = createMockNode('RECTANGLE', 'leaf-1');
    // No 'children' property on a leaf node (simulate by removing it)
    delete (leafNode as any).children;
    figmaMock.getNodeByIdAsync.mockResolvedValue(leafNode);

    const spec: SceneSpec = { type: 'FRAME', name: 'Child' } as SceneSpec;
    const result = await buildScene(spec, 'leaf-1');

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('cannot have children');
  });

  it('builds FRAME as child of existing parent', async () => {
    const parentFrame = createMockNode('FRAME', 'parent-1');
    figmaMock.getNodeByIdAsync.mockImplementation((id: string) => {
      if (id === 'parent-1') return Promise.resolve(parentFrame);
      return Promise.resolve(null);
    });

    const spec: SceneSpec = {
      type: 'FRAME',
      name: 'Child Frame',
      width: 100,
      height: 100,
    };

    const result = await buildScene(spec, 'parent-1');

    expect(result.success).toBe(true);
    expect(parentFrame.children).toHaveLength(1);
    expect(parentFrame.children[0].name).toBe('Child Frame');
  });

  it('records font substitutions for unavailable fonts', async () => {
    figmaMock.loadFontAsync.mockRejectedValue(new Error('Font not found'));

    const spec: SceneSpec = {
      type: 'TEXT',
      name: 'Text Node',
      fontFamily: 'NonExistentFont',
      fontWeight: 400,
      characters: 'Hello',
    };

    const result = await buildScene(spec);

    // Font substitutions should be recorded
    expect(result.fontSubstitutions.length).toBeGreaterThan(0);
  });
});
