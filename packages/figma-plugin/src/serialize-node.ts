/**
 * Node-to-JSON serializer for read tools.
 * Converts Figma nodes to plain objects for transmission to the MCP server.
 */

import { rgbaToHex } from '@figma-fast/shared';

export interface SerializedNode {
  id: string;
  name: string;
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fills?: unknown[];
  strokes?: unknown[];
  effects?: unknown[];
  cornerRadius?: number | [number, number, number, number];
  opacity?: number;
  visible?: boolean;
  locked?: boolean;
  // Auto-layout
  layoutMode?: string;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  itemSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  layoutSizingHorizontal?: string;
  layoutSizingVertical?: string;
  clipsContent?: boolean;
  // Text
  characters?: string;
  fontSize?: number | typeof figma.mixed;
  fontFamily?: string;
  fontWeight?: string;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  textAutoResize?: string;
  // Children
  children?: SerializedNode[];
}

function serializePaint(paint: Paint): unknown {
  if (paint.type === 'SOLID') {
    return {
      type: 'SOLID',
      color: rgbaToHex({ r: paint.color.r, g: paint.color.g, b: paint.color.b, a: 1 }),
      opacity: paint.opacity ?? 1,
      visible: paint.visible ?? true,
    };
  }
  if (paint.type === 'GRADIENT_LINEAR' || paint.type === 'GRADIENT_RADIAL' ||
      paint.type === 'GRADIENT_ANGULAR' || paint.type === 'GRADIENT_DIAMOND') {
    return {
      type: paint.type,
      gradientStops: (paint as GradientPaint).gradientStops.map(stop => ({
        position: stop.position,
        color: rgbaToHex({ r: stop.color.r, g: stop.color.g, b: stop.color.b, a: stop.color.a }),
      })),
      opacity: paint.opacity ?? 1,
      visible: paint.visible ?? true,
    };
  }
  if (paint.type === 'IMAGE') {
    return {
      type: 'IMAGE',
      scaleMode: (paint as ImagePaint).scaleMode,
      opacity: paint.opacity ?? 1,
      visible: paint.visible ?? true,
    };
  }
  return { type: paint.type };
}

function serializeEffect(effect: Effect): unknown {
  if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
    const shadow = effect as DropShadowEffect | InnerShadowEffect;
    return {
      type: shadow.type,
      color: rgbaToHex({ r: shadow.color.r, g: shadow.color.g, b: shadow.color.b, a: shadow.color.a }),
      offset: shadow.offset,
      radius: shadow.radius,
      spread: shadow.spread ?? 0,
      visible: shadow.visible,
    };
  }
  // Blur effects
  return {
    type: effect.type,
    radius: (effect as BlurEffect).radius,
    visible: effect.visible,
  };
}

/**
 * Serialize a Figma node to a plain JSON object.
 * @param node The Figma node to serialize
 * @param depth How many levels of children to include with full props.
 *              depth=0 → children are summaries only (id, name, type).
 *              depth=1 → one level of children with full props.
 */
export function serializeNode(node: BaseNode, depth: number): SerializedNode {
  const result: SerializedNode = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  // Position — available on SceneNode
  if ('x' in node) result.x = (node as SceneNode).x;
  if ('y' in node) result.y = (node as SceneNode).y;

  // Size
  if ('width' in node) result.width = (node as SceneNode).width;
  if ('height' in node) result.height = (node as SceneNode).height;

  // Fills
  if ('fills' in node) {
    const fills = (node as GeometryMixin).fills;
    if (fills !== figma.mixed && Array.isArray(fills)) {
      result.fills = fills.map(serializePaint);
    }
  }

  // Strokes
  if ('strokes' in node) {
    const strokes = (node as GeometryMixin).strokes;
    if (Array.isArray(strokes) && strokes.length > 0) {
      result.strokes = strokes.map(serializePaint);
      if ('strokeWeight' in node) {
        const weight = (node as any).strokeWeight;
        if (weight !== figma.mixed) {
          (result as any).strokeWeight = weight;
        }
      }
      if ('strokeAlign' in node) {
        (result as any).strokeAlign = (node as any).strokeAlign;
      }
    }
  }

  // Effects
  if ('effects' in node) {
    const effects = (node as BlendMixin).effects;
    if (Array.isArray(effects) && effects.length > 0) {
      result.effects = effects.map(serializeEffect);
    }
  }

  // Corner radius
  if ('cornerRadius' in node) {
    const cr = (node as CornerMixin).cornerRadius;
    if (cr !== figma.mixed) {
      result.cornerRadius = cr;
    } else if ('topLeftRadius' in node) {
      const rcm = node as RectangleCornerMixin;
      result.cornerRadius = [rcm.topLeftRadius, rcm.topRightRadius, rcm.bottomRightRadius, rcm.bottomLeftRadius];
    }
  }

  // Opacity
  if ('opacity' in node) result.opacity = (node as BlendMixin).opacity;

  // Visibility & locking
  if ('visible' in node) result.visible = (node as SceneNode).visible;
  if ('locked' in node) result.locked = (node as SceneNode).locked;

  // Auto-layout
  if ('layoutMode' in node) {
    const frame = node as FrameNode;
    if (frame.layoutMode !== 'NONE') {
      result.layoutMode = frame.layoutMode;
      result.primaryAxisAlignItems = frame.primaryAxisAlignItems;
      result.counterAxisAlignItems = frame.counterAxisAlignItems;
      result.itemSpacing = frame.itemSpacing;
      result.paddingTop = frame.paddingTop;
      result.paddingRight = frame.paddingRight;
      result.paddingBottom = frame.paddingBottom;
      result.paddingLeft = frame.paddingLeft;
    }
  }

  if ('layoutSizingHorizontal' in node) {
    result.layoutSizingHorizontal = (node as FrameNode).layoutSizingHorizontal;
  }
  if ('layoutSizingVertical' in node) {
    result.layoutSizingVertical = (node as FrameNode).layoutSizingVertical;
  }

  if ('clipsContent' in node) {
    result.clipsContent = (node as FrameNode).clipsContent;
  }

  // Text properties
  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    result.characters = textNode.characters;
    result.fontSize = textNode.fontSize;
    result.textAlignHorizontal = textNode.textAlignHorizontal;
    result.textAlignVertical = textNode.textAlignVertical;
    result.textAutoResize = textNode.textAutoResize;

    const fontName = textNode.fontName;
    if (fontName !== figma.mixed) {
      result.fontFamily = fontName.family;
      result.fontWeight = fontName.style;
    }
  }

  // Children
  if ('children' in node) {
    const parent = node as BaseNode & ChildrenMixin;
    if (depth > 0) {
      result.children = parent.children.map(child => serializeNode(child, depth - 1));
    } else {
      // Summary only at depth 0
      result.children = parent.children.map(child => ({
        id: child.id,
        name: child.name,
        type: child.type,
      }));
    }
  }

  return result;
}
