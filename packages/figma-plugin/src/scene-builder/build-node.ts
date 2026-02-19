/**
 * Recursive node builder and property helpers for the Scene Builder.
 * Creates Figma nodes from declarative SceneSpec trees.
 */

import type { SceneNode as SceneSpec, Fill, Stroke, Effect } from '@figma-fast/shared';
import { hexToRgba, detectIgnoredProperties } from '@figma-fast/shared';
import { getFontStyle } from './fonts.js';

/** Maps client-assigned spec IDs to Figma node IDs */
export type IdMap = Record<string, string>;

/** Map of imageUrl -> base64 image data, pre-downloaded by the MCP server */
export type ImagePayloads = Record<string, string>;

/** Result of building a single node */
export interface BuildResult {
  node: SceneNode;
  errors: string[];
}

// ─── Base64 Decoder (for IMAGE fills with imagePayloads) ────────

const _BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function _base64Decode(str: string): Uint8Array {
  const cleaned = str.replace(/[^A-Za-z0-9+/]/g, '');
  const len = cleaned.length;
  const bytes: number[] = [];
  for (let i = 0; i < len; i += 4) {
    const c1 = _BASE64_CHARS.indexOf(cleaned[i]);
    const c2 = _BASE64_CHARS.indexOf(cleaned[i + 1]);
    const c3 = i + 2 < len ? _BASE64_CHARS.indexOf(cleaned[i + 2]) : 0;
    const c4 = i + 3 < len ? _BASE64_CHARS.indexOf(cleaned[i + 3]) : 0;
    bytes.push((c1 << 2) | (c2 >> 4));
    if (i + 2 < len) bytes.push(((c2 & 15) << 4) | (c3 >> 2));
    if (i + 3 < len) bytes.push(((c3 & 3) << 6) | c4);
  }
  return new Uint8Array(bytes);
}

// ─── Node Creation ──────────────────────────────────────────────

async function createNode(spec: SceneSpec): Promise<SceneNode> {
  switch (spec.type) {
    case 'FRAME':
      return figma.createFrame();
    case 'RECTANGLE':
      return figma.createRectangle();
    case 'ELLIPSE':
      return figma.createEllipse();
    case 'TEXT':
      return figma.createText();
    case 'POLYGON':
      return figma.createPolygon();
    case 'STAR':
      return figma.createStar();
    case 'LINE':
      return figma.createLine();
    case 'VECTOR':
      return figma.createVector();
    case 'COMPONENT':
      return figma.createComponent();
    case 'COMPONENT_INSTANCE': {
      if (spec.componentId) {
        // Local component — resolve by node ID
        const localComp = await figma.getNodeByIdAsync(spec.componentId);
        if (!localComp || localComp.type !== 'COMPONENT') {
          throw new Error(`Local component not found: ${spec.componentId}`);
        }
        return (localComp as ComponentNode).createInstance();
      } else if (spec.componentKey) {
        // Published library component
        const imported = await figma.importComponentByKeyAsync(spec.componentKey);
        return imported.createInstance();
      }
      throw new Error('COMPONENT_INSTANCE requires componentId or componentKey');
    }
    case 'GROUP': {
      // Pragmatic approach: FRAME with no fills and clipsContent=false
      // True GROUP support requires bottom-up creation (deferred)
      const frame = figma.createFrame();
      frame.fills = [];
      frame.clipsContent = false;
      return frame;
    }
    default:
      throw new Error(`Unknown node type: ${spec.type}`);
  }
}

// ─── Property Helpers ───────────────────────────────────────────

export function applyFills(node: GeometryMixin, fills: Fill[], errors: string[], imagePayloads?: ImagePayloads): void {
  try {
    const figmaFills: Paint[] = fills
      .filter((f) => f.visible !== false)
      .map((fill) => {
        if (fill.type === 'SOLID') {
          const rgba = fill.color ? hexToRgba(fill.color) : { r: 0, g: 0, b: 0, a: 1 };
          return {
            type: 'SOLID' as const,
            color: { r: rgba.r, g: rgba.g, b: rgba.b },
            opacity: fill.opacity ?? rgba.a,
          };
        }
        if (
          fill.type === 'GRADIENT_LINEAR' ||
          fill.type === 'GRADIENT_RADIAL' ||
          fill.type === 'GRADIENT_ANGULAR' ||
          fill.type === 'GRADIENT_DIAMOND'
        ) {
          const stops: ColorStop[] = (fill.gradientStops ?? []).map((stop) => {
            const c = hexToRgba(stop.color);
            return { position: stop.position, color: { r: c.r, g: c.g, b: c.b, a: c.a } };
          });
          return {
            type: fill.type,
            gradientStops: stops,
            gradientTransform:
              fill.gradientTransform ??
              ([
                [1, 0, 0],
                [0, 1, 0],
              ] as Transform),
            opacity: fill.opacity ?? 1,
          } as GradientPaint;
        }
        if (fill.type === 'IMAGE') {
          // Use pre-downloaded image data if available
          if (fill.imageUrl && imagePayloads && imagePayloads[fill.imageUrl]) {
            try {
              const bytes = _base64Decode(imagePayloads[fill.imageUrl]);
              const image = figma.createImage(bytes);
              return {
                type: 'IMAGE' as const,
                imageHash: image.hash,
                scaleMode: (fill.scaleMode ?? 'FILL') as ImagePaint['scaleMode'],
              } as ImagePaint;
            } catch (imgErr) {
              errors.push(
                `IMAGE fill (${fill.imageUrl}): ${imgErr instanceof Error ? imgErr.message : String(imgErr)}`,
              );
            }
          } else if (fill.imageUrl) {
            errors.push(`IMAGE fill: no data for URL ${fill.imageUrl} (download may have failed)`);
          }
          // Fallback to gray placeholder
          return {
            type: 'SOLID' as const,
            color: { r: 0.8, g: 0.8, b: 0.8 },
            opacity: 1,
          };
        }
        // Unsupported: placeholder gray
        return {
          type: 'SOLID' as const,
          color: { r: 0.8, g: 0.8, b: 0.8 },
          opacity: 1,
        };
      });
    node.fills = figmaFills;
  } catch (err) {
    errors.push(`applyFills: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function applyStrokes(node: GeometryMixin, strokes: Stroke[], errors: string[]): void {
  try {
    const figmaStrokes: Paint[] = strokes.map((stroke) => {
      const rgba = hexToRgba(stroke.color);
      return {
        type: 'SOLID' as const,
        color: { r: rgba.r, g: rgba.g, b: rgba.b },
        opacity: stroke.opacity ?? rgba.a,
      };
    });
    node.strokes = figmaStrokes;

    if (strokes.length > 0) {
      if (strokes[0].weight !== undefined) {
        (node as any).strokeWeight = strokes[0].weight;
      }
      if (strokes[0].align) {
        (node as any).strokeAlign = strokes[0].align;
      }
      if (strokes[0].dashPattern) {
        (node as any).dashPattern = strokes[0].dashPattern;
      }
    }
  } catch (err) {
    errors.push(`applyStrokes: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function applyEffects(node: BlendMixin, effects: Effect[], errors: string[]): void {
  try {
    const figmaEffects: Effect[] = effects.map((effect) => {
      if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
        // Shadow alpha IS part of the color object (different from fills!)
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
    node.effects = figmaEffects;
  } catch (err) {
    errors.push(`applyEffects: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function applyCornerRadius(node: CornerMixin, radius: number | [number, number, number, number]): void {
  if (typeof radius === 'number') {
    node.cornerRadius = radius;
  } else {
    // [topLeft, topRight, bottomRight, bottomLeft]
    if ('topLeftRadius' in node) {
      (node as RectangleCornerMixin).topLeftRadius = radius[0];
      (node as RectangleCornerMixin).topRightRadius = radius[1];
      (node as RectangleCornerMixin).bottomRightRadius = radius[2];
      (node as RectangleCornerMixin).bottomLeftRadius = radius[3];
    } else {
      node.cornerRadius = radius[0]; // Fallback to uniform
    }
  }
}

export function applyAutoLayout(node: FrameNode, spec: SceneSpec): void {
  if (!spec.layoutMode || spec.layoutMode === 'NONE') return;

  node.layoutMode = spec.layoutMode;

  // Padding
  if (spec.padding !== undefined) {
    if (typeof spec.padding === 'number') {
      node.paddingTop = spec.padding;
      node.paddingRight = spec.padding;
      node.paddingBottom = spec.padding;
      node.paddingLeft = spec.padding;
    } else {
      // [top, right, bottom, left] — CSS order
      node.paddingTop = spec.padding[0];
      node.paddingRight = spec.padding[1];
      node.paddingBottom = spec.padding[2];
      node.paddingLeft = spec.padding[3];
    }
  }

  if (spec.itemSpacing !== undefined) {
    node.itemSpacing = spec.itemSpacing;
  }
  if (spec.primaryAxisAlignItems) {
    node.primaryAxisAlignItems = spec.primaryAxisAlignItems;
  }
  if (spec.counterAxisAlignItems) {
    node.counterAxisAlignItems = spec.counterAxisAlignItems;
  }
}

export async function applyTextProperties(
  node: TextNode,
  spec: SceneSpec,
  failedFonts: Set<string>,
  errors: string[],
): Promise<void> {
  try {
    const family = spec.fontFamily ?? 'Inter';
    const style = getFontStyle(spec.fontWeight);
    const fontKey = `${family}::${style}`;

    // Use fallback if this font failed to preload
    if (failedFonts.has(fontKey)) {
      node.fontName = { family: 'Inter', style: 'Regular' };
      errors.push(`Font "${family} ${style}" not available, using Inter Regular`);
    } else {
      node.fontName = { family, style };
    }

    if (spec.fontSize !== undefined) {
      node.fontSize = spec.fontSize;
    }

    // Set textAutoResize BEFORE characters to avoid layout thrashing
    if (spec.textAutoResize) {
      node.textAutoResize = spec.textAutoResize;
    }

    if (spec.characters !== undefined) {
      node.characters = spec.characters;
    }

    if (spec.textAlignHorizontal) {
      node.textAlignHorizontal = spec.textAlignHorizontal;
    }
    if (spec.textAlignVertical) {
      node.textAlignVertical = spec.textAlignVertical;
    }

    if (spec.lineHeight !== undefined) {
      if (typeof spec.lineHeight === 'number') {
        node.lineHeight = { value: spec.lineHeight, unit: 'PIXELS' };
      } else {
        node.lineHeight = spec.lineHeight;
      }
    }

    if (spec.letterSpacing !== undefined) {
      node.letterSpacing = { value: spec.letterSpacing, unit: 'PIXELS' };
    }

    if (spec.textDecoration) {
      node.textDecoration = spec.textDecoration;
    }

    if (spec.textCase) {
      node.textCase = spec.textCase;
    }
  } catch (err) {
    errors.push(
      `applyTextProperties "${spec.name ?? '(unnamed)'}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function applySizing(node: SceneNode, spec: SceneSpec): void {
  // layoutSizing only works on children of auto-layout frames
  if (spec.layoutSizingHorizontal && 'layoutSizingHorizontal' in node) {
    (node as FrameNode).layoutSizingHorizontal = spec.layoutSizingHorizontal;
  }
  if (spec.layoutSizingVertical && 'layoutSizingVertical' in node) {
    (node as FrameNode).layoutSizingVertical = spec.layoutSizingVertical;
  }
}

// ─── Component Set Builder (reversed build order) ─────────────

async function buildComponentSet(
  spec: SceneSpec,
  parent: BaseNode & ChildrenMixin,
  idMap: IdMap,
  failedFonts: Set<string>,
  imagePayloads?: ImagePayloads,
): Promise<BuildResult> {
  const errors: string[] = [];

  if (!spec.children || spec.children.length === 0) {
    errors.push('COMPONENT_SET requires at least one COMPONENT child');
    const placeholder = figma.createFrame();
    placeholder.name = `[ERROR] ${spec.name ?? 'ComponentSet'}`;
    placeholder.resize(spec.width ?? 100, spec.height ?? 100);
    parent.appendChild(placeholder);
    return { node: placeholder, errors };
  }

  // 1. Build all COMPONENT children onto the parent first
  const componentNodes: ComponentNode[] = [];
  for (const childSpec of spec.children) {
    if (childSpec.type !== 'COMPONENT') {
      errors.push(`COMPONENT_SET children must be COMPONENT type, got ${childSpec.type} — wrapping as COMPONENT`);
      childSpec.type = 'COMPONENT';
    }
    const childResult = await buildNode(childSpec, parent, idMap, failedFonts, imagePayloads);
    errors.push(...childResult.errors);
    if (childResult.node.type === 'COMPONENT') {
      componentNodes.push(childResult.node as ComponentNode);
    }
  }

  if (componentNodes.length === 0) {
    errors.push('No valid COMPONENT children built for COMPONENT_SET');
    const placeholder = figma.createFrame();
    placeholder.name = `[ERROR] ${spec.name ?? 'ComponentSet'}`;
    parent.appendChild(placeholder);
    return { node: placeholder, errors };
  }

  // 2. Combine as variants — this creates the ComponentSetNode
  const componentSet = figma.combineAsVariants(componentNodes, parent);

  // 3. Apply properties to the resulting component set
  if (spec.name) componentSet.name = spec.name;
  if (spec.componentDescription) componentSet.description = spec.componentDescription;

  if (spec.width !== undefined && spec.height !== undefined) {
    componentSet.resize(spec.width, spec.height);
  }
  if (spec.x !== undefined) componentSet.x = spec.x;
  if (spec.y !== undefined) componentSet.y = spec.y;

  if (spec.fills && 'fills' in componentSet) {
    applyFills(componentSet as GeometryMixin, spec.fills, errors, imagePayloads);
  }
  if (spec.effects && 'effects' in componentSet) {
    applyEffects(componentSet as BlendMixin, spec.effects, errors);
  }
  if (spec.cornerRadius !== undefined && 'cornerRadius' in componentSet) {
    applyCornerRadius(componentSet as CornerMixin, spec.cornerRadius);
  }
  if (spec.opacity !== undefined) componentSet.opacity = spec.opacity;
  if (spec.clipsContent !== undefined) componentSet.clipsContent = spec.clipsContent;
  if (spec.visible !== undefined) componentSet.visible = spec.visible;
  if (spec.locked !== undefined) componentSet.locked = spec.locked;

  if (spec.layoutMode && spec.layoutMode !== 'NONE') {
    applyAutoLayout(componentSet as unknown as FrameNode, spec);
  }

  if (spec.id) {
    idMap[spec.id] = componentSet.id;
  }

  return { node: componentSet, errors };
}

// ─── Recursive Node Builder ────────────────────────────────────

export async function buildNode(
  spec: SceneSpec,
  parent: BaseNode & ChildrenMixin,
  idMap: IdMap,
  failedFonts: Set<string>,
  imagePayloads?: ImagePayloads,
): Promise<BuildResult> {
  // COMPONENT_SET uses reversed build order — delegate entirely
  if (spec.type === 'COMPONENT_SET') {
    return buildComponentSet(spec, parent, idMap, failedFonts, imagePayloads);
  }

  const errors: string[] = [];
  let node: SceneNode;

  // 1. CREATE NODE
  try {
    node = await createNode(spec);
  } catch (err) {
    const msg = `Failed to create ${spec.type} "${spec.name ?? '(unnamed)'}": ${err instanceof Error ? err.message : String(err)}`;
    errors.push(msg);
    // Create placeholder so children can still be built
    const placeholder = figma.createFrame();
    placeholder.name = `[ERROR] ${spec.name ?? spec.type}`;
    placeholder.resize(spec.width ?? 100, spec.height ?? 100);
    parent.appendChild(placeholder);
    return { node: placeholder, errors };
  }

  // 2. NAME & DESCRIPTION
  if (spec.name) node.name = spec.name;
  if (spec.componentDescription && node.type === 'COMPONENT') {
    (node as ComponentNode).description = spec.componentDescription;
  }

  // 3. GEOMETRY — use resize(), not direct assignment
  if (spec.width !== undefined && spec.height !== undefined) {
    (node as any).resize(spec.width, spec.height);
  } else if (spec.width !== undefined) {
    (node as any).resize(spec.width, (node as any).height || 100);
  } else if (spec.height !== undefined) {
    (node as any).resize((node as any).width || 100, spec.height);
  }

  if (spec.x !== undefined) node.x = spec.x;
  if (spec.y !== undefined) node.y = spec.y;

  // 3b. WARNINGS — detect silently-ignored properties
  const parentType = parent?.type;
  const propertyWarnings = detectIgnoredProperties(spec.type, parentType, spec as Record<string, unknown>);
  errors.push(...propertyWarnings);

  // 4. VISUAL PROPERTIES
  if (spec.fills && 'fills' in node) {
    applyFills(node as GeometryMixin, spec.fills, errors, imagePayloads);
  }
  if (spec.strokes && 'strokes' in node) {
    applyStrokes(node as GeometryMixin, spec.strokes, errors);
  }
  if (spec.effects && 'effects' in node) {
    applyEffects(node as BlendMixin, spec.effects, errors);
  }
  if (spec.cornerRadius !== undefined && 'cornerRadius' in node) {
    applyCornerRadius(node as CornerMixin, spec.cornerRadius);
  }
  if (spec.opacity !== undefined && 'opacity' in node) {
    (node as BlendMixin).opacity = spec.opacity;
  }
  if (spec.clipsContent !== undefined && 'clipsContent' in node) {
    (node as FrameNode).clipsContent = spec.clipsContent;
  }
  if (spec.visible !== undefined) node.visible = spec.visible;
  if (spec.locked !== undefined) node.locked = spec.locked;

  // 4b. STYLE BINDING — apply style IDs (overrides individual properties)
  if (spec.fillStyleId && 'fillStyleId' in node) {
    try {
      (node as any).fillStyleId = spec.fillStyleId;
    } catch (err) {
      errors.push(`fillStyleId: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (spec.effectStyleId && 'effectStyleId' in node) {
    try {
      (node as any).effectStyleId = spec.effectStyleId;
    } catch (err) {
      errors.push(`effectStyleId: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (spec.textStyleId && node.type === 'TEXT') {
    try {
      (node as TextNode).textStyleId = spec.textStyleId;
    } catch (err) {
      errors.push(`textStyleId: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 5. AUTO-LAYOUT — before children, affects child positioning
  if (spec.layoutMode && spec.layoutMode !== 'NONE' && 'layoutMode' in node) {
    applyAutoLayout(node as FrameNode, spec);
  }

  // 6. APPEND TO PARENT
  parent.appendChild(node);

  // 7. TEXT PROPERTIES — after appending
  if (spec.type === 'TEXT' && node.type === 'TEXT') {
    await applyTextProperties(node, spec, failedFonts, errors);
  }

  // 8. SIZING — after appending to parent (layoutSizing needs auto-layout parent)
  applySizing(node, spec);

  // 8b. COMPONENT INSTANCE OVERRIDES
  if (spec.type === 'COMPONENT_INSTANCE' && spec.overrides && node.type === 'INSTANCE') {
    try {
      const instance = node as InstanceNode;
      const propsToSet: Record<string, string | boolean> = {};
      for (const [overrideName, value] of Object.entries(spec.overrides)) {
        for (const key of Object.keys(instance.componentProperties)) {
          const baseName = key.split('#')[0];
          if (baseName === overrideName) {
            propsToSet[key] = value;
            break;
          }
        }
      }
      if (Object.keys(propsToSet).length > 0) {
        instance.setProperties(propsToSet);
      }
    } catch (err) {
      errors.push(`applyOverrides: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 9. RECORD ID MAPPING
  if (spec.id) {
    idMap[spec.id] = node.id;
  }

  // 10. RECURSE INTO CHILDREN
  if (spec.children && 'children' in node) {
    for (const childSpec of spec.children) {
      const childResult = await buildNode(
        childSpec,
        node as BaseNode & ChildrenMixin,
        idMap,
        failedFonts,
        imagePayloads,
      );
      errors.push(...childResult.errors);
    }
  }

  return { node, errors };
}
