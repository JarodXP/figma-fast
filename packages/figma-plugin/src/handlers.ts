/**
 * Phase 3 plugin handlers: read tools & atomic edit tools.
 * Each handler is an async function returning data for the result message.
 */

import type { SceneNode as SceneSpec, Fill, Effect as EffectSpec } from '@figma-fast/shared';
import { rgbaToHex, hexToRgba } from '@figma-fast/shared';
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

// ─── Base64 Encoder/Decoder (btoa/atob unavailable in Figma sandbox) ─────

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64Encode(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i],
      b2 = bytes[i + 1] ?? 0,
      b3 = bytes[i + 2] ?? 0;
    result += BASE64_CHARS[b1 >> 2] + BASE64_CHARS[((b1 & 3) << 4) | (b2 >> 4)];
    result += i + 1 < bytes.length ? BASE64_CHARS[((b2 & 15) << 2) | (b3 >> 6)] : '=';
    result += i + 2 < bytes.length ? BASE64_CHARS[b3 & 63] : '=';
  }
  return result;
}

function base64Decode(str: string): Uint8Array {
  // Strip whitespace and padding
  const cleaned = str.replace(/[^A-Za-z0-9+/]/g, '');
  const len = cleaned.length;
  const bytes: number[] = [];
  for (let i = 0; i < len; i += 4) {
    const c1 = BASE64_CHARS.indexOf(cleaned[i]);
    const c2 = BASE64_CHARS.indexOf(cleaned[i + 1]);
    const c3 = i + 2 < len ? BASE64_CHARS.indexOf(cleaned[i + 2]) : 0;
    const c4 = i + 3 < len ? BASE64_CHARS.indexOf(cleaned[i + 3]) : 0;
    bytes.push((c1 << 2) | (c2 >> 4));
    if (i + 2 < len) bytes.push(((c2 & 15) << 4) | (c3 >> 2));
    if (i + 3 < len) bytes.push(((c3 & 3) << 6) | c4);
  }
  return new Uint8Array(bytes);
}

// ─── Read Handlers ─────────────────────────────────────────────

export async function handleGetDocumentInfo(): Promise<unknown> {
  const pages = figma.root.children.map((page) => ({
    id: page.id,
    name: page.name,
    childCount: page.children.length,
  }));

  const currentPage = figma.currentPage;
  const topLevelFrames = currentPage.children.map((child) => ({
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
    nodes: selection.map((node) => serializeNode(node, 0)),
  };
}

export async function handleGetStyles(): Promise<unknown> {
  const [paintStyles, textStyles, effectStyles] = await Promise.all([
    figma.getLocalPaintStylesAsync(),
    figma.getLocalTextStylesAsync(),
    figma.getLocalEffectStylesAsync(),
  ]);

  return {
    paintStyles: paintStyles.map((style) => {
      const paints = style.paints.map((paint) => {
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
    textStyles: textStyles.map((style) => ({
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
    effectStyles: effectStyles.map((style) => ({
      id: style.id,
      name: style.name,
      key: style.key,
      effects: style.effects.map((effect) => {
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
    components: components.map((comp) => {
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

export async function handleExportNode(nodeId: string, format: string, scale: number): Promise<unknown> {
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

export async function handleModifyNode(nodeId: string, properties: Partial<SceneSpec>): Promise<unknown> {
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
        ? typeof properties.fontWeight === 'number'
          ? getFontStyleFromWeight(properties.fontWeight)
          : String(properties.fontWeight)
        : fontName !== figma.mixed
          ? fontName.style
          : 'Regular';
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

  // Style binding
  if (properties.fillStyleId && 'fillStyleId' in sceneNode) {
    try {
      (sceneNode as any).fillStyleId = properties.fillStyleId;
    } catch (err) {
      errors.push(`fillStyleId: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (properties.effectStyleId && 'effectStyleId' in sceneNode) {
    try {
      (sceneNode as any).effectStyleId = properties.effectStyleId;
    } catch (err) {
      errors.push(`effectStyleId: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (properties.textStyleId && node.type === 'TEXT') {
    try {
      (node as TextNode).textStyleId = properties.textStyleId;
    } catch (err) {
      errors.push(`textStyleId: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Text properties
  if (node.type === 'TEXT') {
    const failedFonts = new Set<string>();
    await applyTextProperties(node as TextNode, properties as SceneSpec, failedFonts, errors);
  }

  // Sizing
  applySizing(sceneNode, properties as SceneSpec);

  // Swap component (for INSTANCE nodes)
  if (properties.swapComponent && node.type === 'INSTANCE') {
    const targetComp = await figma.getNodeByIdAsync(properties.swapComponent);
    if (targetComp && targetComp.type === 'COMPONENT') {
      (node as InstanceNode).swapComponent(targetComp as ComponentNode);
    } else {
      errors.push(`swapComponent: component not found or not a COMPONENT: ${properties.swapComponent}`);
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

// ─── Component Handlers ─────────────────────────────────────────

export async function handleConvertToComponent(nodeId: string): Promise<unknown> {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  if (node.type !== 'FRAME' && node.type !== 'GROUP' && node.type !== 'RECTANGLE' && node.type !== 'COMPONENT') {
    throw new Error(`Cannot convert ${node.type} to component. Must be a FRAME, GROUP, or RECTANGLE.`);
  }

  // If already a component, return it as-is
  if (node.type === 'COMPONENT') {
    const comp = node as ComponentNode;
    return {
      componentId: comp.id,
      componentKey: comp.key,
      name: comp.name,
    };
  }

  const component = figma.createComponent();
  component.name = node.name;

  // Copy size
  const sceneNode = node as SceneNode;
  component.resize(sceneNode.width, sceneNode.height);
  component.x = sceneNode.x;
  component.y = sceneNode.y;

  // Copy fills, strokes, effects if available
  if ('fills' in node) {
    const fills = (node as GeometryMixin).fills;
    if (fills !== figma.mixed) component.fills = fills;
  }
  if ('strokes' in node) {
    component.strokes = (node as GeometryMixin).strokes;
  }
  if ('effects' in node) {
    component.effects = (node as BlendMixin).effects;
  }
  if ('cornerRadius' in node) {
    const cr = (node as CornerMixin).cornerRadius;
    if (cr !== figma.mixed) component.cornerRadius = cr;
  }
  if ('opacity' in node) {
    component.opacity = (node as BlendMixin).opacity;
  }
  if ('clipsContent' in node) {
    component.clipsContent = (node as FrameNode).clipsContent;
  }

  // Copy auto-layout
  if ('layoutMode' in node) {
    const frame = node as FrameNode;
    if (frame.layoutMode !== 'NONE') {
      component.layoutMode = frame.layoutMode;
      component.paddingTop = frame.paddingTop;
      component.paddingRight = frame.paddingRight;
      component.paddingBottom = frame.paddingBottom;
      component.paddingLeft = frame.paddingLeft;
      component.itemSpacing = frame.itemSpacing;
      component.primaryAxisAlignItems = frame.primaryAxisAlignItems;
      component.counterAxisAlignItems = frame.counterAxisAlignItems;
    }
  }

  // Move children
  if ('children' in node) {
    const parent = node as BaseNode & ChildrenMixin;
    while (parent.children.length > 0) {
      component.appendChild(parent.children[0]);
    }
  }

  // Insert component where the original was
  if (node.parent && 'children' in node.parent) {
    const parentNode = node.parent as BaseNode & ChildrenMixin;
    const index = parentNode.children.indexOf(sceneNode);
    parentNode.insertChild(index >= 0 ? index : parentNode.children.length, component);
  }

  // Remove original
  node.remove();

  return {
    componentId: component.id,
    componentKey: component.key,
    name: component.name,
  };
}

export async function handleCombineAsVariants(nodeIds: string[], name?: string): Promise<unknown> {
  const components: ComponentNode[] = [];
  for (const nodeId of nodeIds) {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    if (node.type !== 'COMPONENT') {
      throw new Error(`Node ${nodeId} is ${node.type}, not a COMPONENT. Convert it to a component first.`);
    }
    components.push(node as ComponentNode);
  }

  // All components must share a parent
  const parent = components[0].parent;
  if (!parent || !('children' in parent)) {
    throw new Error('Components must have a valid parent');
  }

  const componentSet = figma.combineAsVariants(components, parent as BaseNode & ChildrenMixin);
  if (name) {
    componentSet.name = name;
  }

  return {
    componentSetId: componentSet.id,
    componentSetKey: componentSet.key,
    name: componentSet.name,
    variantCount: componentSet.children.length,
  };
}

export async function handleManageComponentProperties(
  componentId: string,
  action: 'add' | 'update' | 'delete',
  properties: Array<{ name: string; type: string; defaultValue: string | boolean; variantOptions?: string[] }>,
): Promise<unknown> {
  const node = await figma.getNodeByIdAsync(componentId);
  if (!node) {
    throw new Error(`Node not found: ${componentId}`);
  }
  if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') {
    throw new Error(`Node ${componentId} is ${node.type}, must be COMPONENT or COMPONENT_SET`);
  }

  const comp = node as ComponentNode | ComponentSetNode;
  let modified = 0;

  for (const prop of properties) {
    try {
      if (action === 'add') {
        comp.addComponentProperty(prop.name, prop.type as ComponentPropertyType, prop.defaultValue);
        modified++;
      } else if (action === 'delete') {
        // Find the property key by name
        const defs = comp.componentPropertyDefinitions;
        for (const [key, def] of Object.entries(defs)) {
          if (def.type === prop.type && key.startsWith(prop.name)) {
            comp.deleteComponentProperty(key);
            modified++;
            break;
          }
        }
      } else if (action === 'update') {
        // Find the property key by name and update
        const defs = comp.componentPropertyDefinitions;
        for (const [key, def] of Object.entries(defs)) {
          if (key.startsWith(prop.name) && def.type === prop.type) {
            comp.editComponentProperty(key, { defaultValue: prop.defaultValue });
            modified++;
            break;
          }
        }
      }
    } catch (err) {
      throw new Error(
        `Failed to ${action} property "${prop.name}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return {
    componentId: comp.id,
    name: comp.name,
    action,
    propertiesModified: modified,
  };
}

// ─── Boolean Operation Handler ────────────────────────────────

export async function handleBooleanOperation(operation: string, nodeIds: string[]): Promise<unknown> {
  if (nodeIds.length < 2) {
    throw new Error(`Boolean operation requires at least 2 nodes, got ${nodeIds.length}`);
  }

  // Resolve all nodes
  const nodes: SceneNode[] = [];
  for (const nodeId of nodeIds) {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    nodes.push(node as SceneNode);
  }

  // Verify all nodes share the same parent
  const parent = nodes[0].parent;
  if (!parent || !('children' in parent)) {
    throw new Error('Nodes must have a valid parent to perform boolean operations');
  }
  for (const node of nodes.slice(1)) {
    if (node.parent !== parent) {
      throw new Error('All nodes must share the same parent for boolean operations');
    }
  }

  const parentWithChildren = parent as BaseNode & ChildrenMixin;
  let result: BooleanOperationNode;

  switch (operation) {
    case 'UNION':
      result = figma.union(nodes, parentWithChildren);
      break;
    case 'SUBTRACT':
      result = figma.subtract(nodes, parentWithChildren);
      break;
    case 'INTERSECT':
      result = figma.intersect(nodes, parentWithChildren);
      break;
    case 'EXCLUDE':
      result = figma.exclude(nodes, parentWithChildren);
      break;
    default:
      throw new Error(`Unknown boolean operation: ${operation}`);
  }

  // Commit undo
  try {
    if (typeof figma.commitUndo === 'function') {
      figma.commitUndo();
    }
  } catch {
    // commitUndo may not be available
  }

  return {
    resultNodeId: result.id,
    name: result.name,
    type: result.type,
    operation,
    inputCount: nodeIds.length,
  };
}

// ─── Image Fill Handler ────────────────────────────────────────

export async function handleSetImageFill(nodeId: string, imageData: string, scaleMode?: string): Promise<unknown> {
  const bytes = base64Decode(imageData);
  const image = figma.createImage(bytes);

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  if (!('fills' in node)) {
    throw new Error(`Node ${nodeId} does not support fills`);
  }

  const resolvedScaleMode = (scaleMode ?? 'FILL') as ImagePaint['scaleMode'];
  (node as GeometryMixin).fills = [
    {
      type: 'IMAGE',
      imageHash: image.hash,
      scaleMode: resolvedScaleMode,
    } as ImagePaint,
  ];

  return {
    nodeId: node.id,
    name: (node as SceneNode).name,
    imageHash: image.hash,
  };
}

// ─── Style Creation Handlers ───────────────────────────────────

export async function handleCreatePaintStyle(name: string, fills: Fill[]): Promise<unknown> {
  const style = figma.createPaintStyle();
  style.name = name;

  const errors: string[] = [];
  const figmaPaints: Paint[] = [];

  for (const fill of fills) {
    if (fill.type === 'SOLID') {
      const rgba = fill.color ? hexToRgba(fill.color) : { r: 0, g: 0, b: 0, a: 1 };
      figmaPaints.push({
        type: 'SOLID' as const,
        color: { r: rgba.r, g: rgba.g, b: rgba.b },
        opacity: fill.opacity ?? rgba.a,
      });
    } else if (
      fill.type === 'GRADIENT_LINEAR' ||
      fill.type === 'GRADIENT_RADIAL' ||
      fill.type === 'GRADIENT_ANGULAR' ||
      fill.type === 'GRADIENT_DIAMOND'
    ) {
      const stops: ColorStop[] = (fill.gradientStops ?? []).map((stop) => {
        const c = hexToRgba(stop.color);
        return { position: stop.position, color: { r: c.r, g: c.g, b: c.b, a: c.a } };
      });
      figmaPaints.push({
        type: fill.type,
        gradientStops: stops,
        gradientTransform:
          fill.gradientTransform ??
          ([
            [1, 0, 0],
            [0, 1, 0],
          ] as Transform),
        opacity: fill.opacity ?? 1,
      } as GradientPaint);
    } else {
      errors.push(`Unsupported fill type for style: ${fill.type}`);
    }
  }

  style.paints = figmaPaints;

  return { id: style.id, name: style.name, key: style.key, errors };
}

export async function handleCreateTextStyle(
  name: string,
  props: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number | string;
    lineHeight?: number | { value: number; unit: 'PIXELS' | 'PERCENT' | 'AUTO' };
    letterSpacing?: number;
    textDecoration?: string;
    textCase?: string;
  },
): Promise<unknown> {
  const style = figma.createTextStyle();
  style.name = name;

  const family = props.fontFamily ?? 'Inter';
  const fontStyle =
    props.fontWeight !== undefined
      ? typeof props.fontWeight === 'number'
        ? getFontStyleFromWeight(props.fontWeight)
        : String(props.fontWeight)
      : 'Regular';

  await figma.loadFontAsync({ family, style: fontStyle });
  style.fontName = { family, style: fontStyle };

  if (props.fontSize !== undefined) {
    style.fontSize = props.fontSize;
  }
  if (props.lineHeight !== undefined) {
    if (typeof props.lineHeight === 'number') {
      style.lineHeight = { value: props.lineHeight, unit: 'PIXELS' };
    } else {
      style.lineHeight = props.lineHeight;
    }
  }
  if (props.letterSpacing !== undefined) {
    style.letterSpacing = { value: props.letterSpacing, unit: 'PIXELS' };
  }
  if (props.textDecoration !== undefined) {
    style.textDecoration = props.textDecoration as TextDecoration;
  }
  if (props.textCase !== undefined) {
    style.textCase = props.textCase as TextCase;
  }

  return { id: style.id, name: style.name, key: style.key };
}

export async function handleCreateEffectStyle(name: string, effects: EffectSpec[]): Promise<unknown> {
  const style = figma.createEffectStyle();
  style.name = name;

  const figmaEffects: Effect[] = effects.map((effect) => {
    if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
      const rgba = effect.color ? hexToRgba(effect.color) : { r: 0, g: 0, b: 0, a: 0.5 };
      const alpha = effect.opacity ?? rgba.a;
      return {
        type: effect.type,
        color: { r: rgba.r, g: rgba.g, b: rgba.b, a: alpha },
        offset: effect.offset ?? { x: 0, y: 4 },
        radius: effect.radius,
        spread: effect.spread ?? 0,
        visible: effect.visible ?? true,
        blendMode: 'NORMAL' as BlendMode,
      } as DropShadowEffect | InnerShadowEffect;
    }
    // LAYER_BLUR, BACKGROUND_BLUR
    return {
      type: effect.type,
      radius: effect.radius,
      visible: effect.visible ?? true,
    } as BlurEffect;
  });

  style.effects = figmaEffects;

  return { id: style.id, name: style.name, key: style.key };
}

// ─── Page Management Handlers ──────────────────────────────────

export async function handleCreatePage(name: string): Promise<unknown> {
  const page = figma.createPage();
  page.name = name;
  return { id: page.id, name: page.name };
}

export async function handleRenamePage(pageId: string, name: string): Promise<unknown> {
  const node = await figma.getNodeByIdAsync(pageId);
  if (!node) {
    throw new Error(`Page not found: ${pageId}`);
  }
  if (node.type !== 'PAGE') {
    throw new Error(`Node ${pageId} is not a PAGE (got ${node.type})`);
  }
  const page = node as PageNode;
  const oldName = page.name;
  page.name = name;
  return { id: page.id, name, oldName };
}

export async function handleSetCurrentPage(pageId: string): Promise<unknown> {
  const node = await figma.getNodeByIdAsync(pageId);
  if (!node) {
    throw new Error(`Page not found: ${pageId}`);
  }
  if (node.type !== 'PAGE') {
    throw new Error(`Node ${pageId} is not a PAGE (got ${node.type})`);
  }
  const page = node as PageNode;
  await figma.setCurrentPageAsync(page);
  return { id: page.id, name: page.name };
}

// ─── Helper ────────────────────────────────────────────────────

function getFontStyleFromWeight(weight: number): string {
  switch (weight) {
    case 100:
      return 'Thin';
    case 200:
      return 'Extra Light';
    case 300:
      return 'Light';
    case 400:
      return 'Regular';
    case 500:
      return 'Medium';
    case 600:
      return 'Semi Bold';
    case 700:
      return 'Bold';
    case 800:
      return 'Extra Bold';
    case 900:
      return 'Black';
    default:
      return 'Regular';
  }
}
