/**
 * Phase 3 plugin handlers: read tools & atomic edit tools.
 * Each handler is an async function returning data for the result message.
 */

import type { SceneNode as SceneSpec } from '@figma-fast/shared';
import { rgbaToHex } from '@figma-fast/shared';
import { serializeNode } from './serialize-node.js';
import {
  applyFills,
  applyStrokes,
  applyEffects,
  applyCornerRadius,
  applyAutoLayout,
  applyTextProperties,
  applySizing,
} from './scene-builder/build-node.js';

// ─── Base64 Encoder (btoa unavailable in Figma sandbox) ────────

function base64Encode(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i], b2 = bytes[i + 1] ?? 0, b3 = bytes[i + 2] ?? 0;
    result += chars[b1 >> 2] + chars[((b1 & 3) << 4) | (b2 >> 4)];
    result += (i + 1 < bytes.length) ? chars[((b2 & 15) << 2) | (b3 >> 6)] : '=';
    result += (i + 2 < bytes.length) ? chars[b3 & 63] : '=';
  }
  return result;
}

// ─── Read Handlers ─────────────────────────────────────────────

export async function handleGetDocumentInfo(): Promise<unknown> {
  const pages = figma.root.children.map(page => ({
    id: page.id,
    name: page.name,
    childCount: page.children.length,
  }));

  const currentPage = figma.currentPage;
  const topLevelFrames = currentPage.children.map(child => ({
    id: child.id,
    name: child.name,
    type: child.type,
  }));

  return {
    name: figma.root.name,
    currentPageId: currentPage.id,
    currentPageName: currentPage.name,
    pages,
    topLevelFrames,
  };
}

export async function handleGetNodeInfo(nodeId: string, depth?: number): Promise<unknown> {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  return serializeNode(node, depth ?? 1);
}

export async function handleGetSelection(): Promise<unknown> {
  const selection = figma.currentPage.selection;
  return {
    count: selection.length,
    nodes: selection.map(node => serializeNode(node, 0)),
  };
}

export async function handleGetStyles(): Promise<unknown> {
  const [paintStyles, textStyles, effectStyles] = await Promise.all([
    figma.getLocalPaintStylesAsync(),
    figma.getLocalTextStylesAsync(),
    figma.getLocalEffectStylesAsync(),
  ]);

  return {
    paintStyles: paintStyles.map(style => {
      const paints = style.paints.map(paint => {
        if (paint.type === 'SOLID') {
          return {
            type: 'SOLID',
            color: rgbaToHex({ r: paint.color.r, g: paint.color.g, b: paint.color.b, a: 1 }),
            opacity: paint.opacity ?? 1,
          };
        }
        return { type: paint.type };
      });
      return {
        id: style.id,
        name: style.name,
        key: style.key,
        paints,
      };
    }),
    textStyles: textStyles.map(style => ({
      id: style.id,
      name: style.name,
      key: style.key,
      fontFamily: style.fontName.family,
      fontStyle: style.fontName.style,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      textDecoration: style.textDecoration,
      textCase: style.textCase,
    })),
    effectStyles: effectStyles.map(style => ({
      id: style.id,
      name: style.name,
      key: style.key,
      effects: style.effects.map(effect => {
        if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
          const shadow = effect as DropShadowEffect | InnerShadowEffect;
          return {
            type: shadow.type,
            color: rgbaToHex({ r: shadow.color.r, g: shadow.color.g, b: shadow.color.b, a: shadow.color.a }),
            offset: shadow.offset,
            radius: shadow.radius,
            spread: shadow.spread ?? 0,
          };
        }
        return { type: effect.type, radius: (effect as BlurEffect).radius };
      }),
    })),
  };
}

export async function handleGetLocalComponents(): Promise<unknown> {
  const components = figma.root.findAllWithCriteria({ types: ['COMPONENT'] });
  return {
    count: components.length,
    components: components.map(comp => {
      const component = comp as ComponentNode;
      return {
        id: component.id,
        name: component.name,
        key: component.key,
        description: component.description,
      };
    }),
  };
}

export async function handleExportNode(
  nodeId: string,
  format: string,
  scale: number,
): Promise<unknown> {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  if (!('exportAsync' in node)) {
    throw new Error(`Node ${nodeId} does not support export`);
  }

  const exportFormat = (format || 'PNG').toUpperCase() as 'PNG' | 'SVG' | 'JPG' | 'PDF';
  const exportNode = node as SceneNode;

  const bytes = await exportNode.exportAsync({
    format: exportFormat,
    constraint: { type: 'SCALE', value: scale || 1 },
  });

  const base64 = base64Encode(bytes);

  return {
    base64,
    format: exportFormat,
    width: exportNode.width,
    height: exportNode.height,
    byteLength: bytes.length,
  };
}

// ─── Edit Handlers ─────────────────────────────────────────────

export async function handleModifyNode(
  nodeId: string,
  properties: Partial<SceneSpec>,
): Promise<unknown> {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  const errors: string[] = [];
  const sceneNode = node as SceneNode;

  // For TEXT nodes, load the current font first
  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    const fontName = textNode.fontName;
    if (fontName !== figma.mixed) {
      await figma.loadFontAsync(fontName);
    }
    // If a new font is specified, load that too
    if (properties.fontFamily || properties.fontWeight) {
      const family = properties.fontFamily ?? (fontName !== figma.mixed ? fontName.family : 'Inter');
      const style = properties.fontWeight
        ? (typeof properties.fontWeight === 'number' ? getFontStyleFromWeight(properties.fontWeight) : String(properties.fontWeight))
        : (fontName !== figma.mixed ? fontName.style : 'Regular');
      try {
        await figma.loadFontAsync({ family, style });
      } catch {
        errors.push(`Failed to load font: ${family} ${style}`);
      }
    }
  }

  // Apply name
  if (properties.name !== undefined) {
    sceneNode.name = properties.name;
  }

  // Apply geometry
  if (properties.width !== undefined || properties.height !== undefined) {
    const w = properties.width ?? sceneNode.width;
    const h = properties.height ?? sceneNode.height;
    (sceneNode as any).resize(w, h);
  }
  if (properties.x !== undefined) sceneNode.x = properties.x;
  if (properties.y !== undefined) sceneNode.y = properties.y;

  // Apply visual properties using exported helpers
  if (properties.fills && 'fills' in sceneNode) {
    applyFills(sceneNode as GeometryMixin, properties.fills, errors);
  }
  if (properties.strokes && 'strokes' in sceneNode) {
    applyStrokes(sceneNode as GeometryMixin, properties.strokes, errors);
  }
  if (properties.effects && 'effects' in sceneNode) {
    applyEffects(sceneNode as BlendMixin, properties.effects, errors);
  }
  if (properties.cornerRadius !== undefined && 'cornerRadius' in sceneNode) {
    applyCornerRadius(sceneNode as CornerMixin, properties.cornerRadius);
  }
  if (properties.opacity !== undefined && 'opacity' in sceneNode) {
    (sceneNode as BlendMixin).opacity = properties.opacity;
  }
  if (properties.clipsContent !== undefined && 'clipsContent' in sceneNode) {
    (sceneNode as FrameNode).clipsContent = properties.clipsContent;
  }
  if (properties.visible !== undefined) sceneNode.visible = properties.visible;
  if (properties.locked !== undefined) sceneNode.locked = properties.locked;

  // Auto-layout
  if (properties.layoutMode && 'layoutMode' in sceneNode) {
    applyAutoLayout(sceneNode as FrameNode, properties as SceneSpec);
  }

  // Text properties
  if (node.type === 'TEXT') {
    const failedFonts = new Set<string>();
    await applyTextProperties(node as TextNode, properties as SceneSpec, failedFonts, errors);
  }

  // Sizing
  applySizing(sceneNode, properties as SceneSpec);

  // Commit undo
  try {
    if (typeof figma.commitUndo === 'function') {
      figma.commitUndo();
    }
  } catch {
    // commitUndo may not be available
  }

  return {
    nodeId: sceneNode.id,
    name: sceneNode.name,
    type: sceneNode.type,
    errors,
  };
}

export async function handleDeleteNodes(nodeIds: string[]): Promise<unknown> {
  let deleted = 0;
  const errors: string[] = [];

  for (const nodeId of nodeIds) {
    try {
      const node = await figma.getNodeByIdAsync(nodeId);
      if (!node) {
        errors.push(`Node not found: ${nodeId}`);
        continue;
      }
      node.remove();
      deleted++;
    } catch (err) {
      errors.push(`Failed to delete ${nodeId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Commit undo
  try {
    if (typeof figma.commitUndo === 'function') {
      figma.commitUndo();
    }
  } catch {
    // commitUndo may not be available
  }

  return { deleted, requested: nodeIds.length, errors };
}

export async function handleMoveNode(
  nodeId: string,
  x?: number,
  y?: number,
  parentId?: string,
  index?: number,
): Promise<unknown> {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  const sceneNode = node as SceneNode;

  // Reparent if parentId provided
  if (parentId) {
    const newParent = await figma.getNodeByIdAsync(parentId);
    if (!newParent) {
      throw new Error(`Parent node not found: ${parentId}`);
    }
    if (!('children' in newParent)) {
      throw new Error(`Target parent ${parentId} cannot have children`);
    }
    const parentWithChildren = newParent as BaseNode & ChildrenMixin;
    const insertIndex = index ?? parentWithChildren.children.length;
    parentWithChildren.insertChild(insertIndex, sceneNode);
  }

  // Update position
  if (x !== undefined) sceneNode.x = x;
  if (y !== undefined) sceneNode.y = y;

  // Commit undo
  try {
    if (typeof figma.commitUndo === 'function') {
      figma.commitUndo();
    }
  } catch {
    // commitUndo may not be available
  }

  return {
    nodeId: sceneNode.id,
    name: sceneNode.name,
    x: sceneNode.x,
    y: sceneNode.y,
    parentId: sceneNode.parent?.id,
  };
}

export async function handleCloneNode(nodeId: string): Promise<unknown> {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  if (!('clone' in node)) {
    throw new Error(`Node ${nodeId} does not support cloning`);
  }

  const cloned = (node as SceneNode).clone();

  // Commit undo
  try {
    if (typeof figma.commitUndo === 'function') {
      figma.commitUndo();
    }
  } catch {
    // commitUndo may not be available
  }

  return {
    originalId: nodeId,
    newNodeId: cloned.id,
    name: cloned.name,
    type: cloned.type,
  };
}

// ─── Helper ────────────────────────────────────────────────────

function getFontStyleFromWeight(weight: number): string {
  switch (weight) {
    case 100: return 'Thin';
    case 200: return 'Extra Light';
    case 300: return 'Light';
    case 400: return 'Regular';
    case 500: return 'Medium';
    case 600: return 'Semi Bold';
    case 700: return 'Bold';
    case 800: return 'Extra Bold';
    case 900: return 'Black';
    default: return 'Regular';
  }
}
