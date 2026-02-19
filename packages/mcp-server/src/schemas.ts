/**
 * Shared Zod schemas for FigmaFast MCP tools.
 * Extracted from build-scene.ts and edit-tools.ts to eliminate duplication.
 */

import { z } from 'zod';

// ─── Sub-Schemas ────────────────────────────────────────────────

export const FillSchema = z.object({
  type: z.enum(['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND', 'IMAGE']),
  color: z.string().optional().describe('Hex color: #RGB, #RRGGBB, or #RRGGBBAA'),
  opacity: z.number().min(0).max(1).optional(),
  visible: z.boolean().optional(),
  gradientStops: z
    .array(
      z.object({
        position: z.number(),
        color: z.string(),
      }),
    )
    .optional(),
  gradientTransform: z
    .tuple([z.tuple([z.number(), z.number(), z.number()]), z.tuple([z.number(), z.number(), z.number()])])
    .optional(),
  imageUrl: z
    .string()
    .url()
    .optional()
    .describe('URL of image for IMAGE fill type. Server downloads and uploads to Figma.'),
  scaleMode: z.enum(['FILL', 'FIT', 'CROP', 'TILE']).optional(),
});

export const StrokeSchema = z.object({
  type: z
    .enum(['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND', 'IMAGE'])
    .optional(),
  color: z.string().describe('Hex color: #RRGGBB or #RRGGBBAA'),
  weight: z.number(),
  align: z.enum(['INSIDE', 'OUTSIDE', 'CENTER']).optional(),
  opacity: z.number().min(0).max(1).optional(),
  dashPattern: z.array(z.number()).optional(),
});

export const EffectSchema = z.object({
  type: z.enum(['DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR']),
  color: z.string().optional().describe('Hex color for shadows'),
  offset: z.object({ x: z.number(), y: z.number() }).optional(),
  radius: z.number(),
  spread: z.number().optional(),
  visible: z.boolean().optional(),
  opacity: z.number().min(0).max(1).optional(),
});

export const LineHeightSchema = z.object({
  value: z.number(),
  unit: z.enum(['PIXELS', 'PERCENT', 'AUTO']),
});

// ─── Recursive SceneNode Schema ────────────────────────────────

export const SceneNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string().optional().describe('Client-assigned ID for referencing this node later'),
    type: z.enum([
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
    ]),
    name: z.string().optional(),

    // Geometry
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),

    // Style
    fills: z.array(FillSchema).optional(),
    strokes: z.array(StrokeSchema).optional(),
    effects: z.array(EffectSchema).optional(),
    opacity: z.number().min(0).max(1).optional(),
    cornerRadius: z.union([z.number(), z.tuple([z.number(), z.number(), z.number(), z.number()])]).optional(),
    clipsContent: z.boolean().optional(),

    // Auto-layout
    layoutMode: z.enum(['HORIZONTAL', 'VERTICAL', 'NONE']).optional(),
    primaryAxisAlignItems: z.enum(['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN']).optional(),
    counterAxisAlignItems: z.enum(['MIN', 'CENTER', 'MAX']).optional(),
    itemSpacing: z.number().optional(),
    padding: z.union([z.number(), z.tuple([z.number(), z.number(), z.number(), z.number()])]).optional(),

    // Sizing (auto-layout children)
    layoutSizingHorizontal: z.enum(['FIXED', 'HUG', 'FILL']).optional(),
    layoutSizingVertical: z.enum(['FIXED', 'HUG', 'FILL']).optional(),

    // Text
    characters: z.string().optional(),
    fontSize: z.number().optional(),
    fontFamily: z.string().optional(),
    fontWeight: z.union([z.number(), z.string()]).optional(),
    fontStyle: z.string().optional(),
    textAlignHorizontal: z.enum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']).optional(),
    textAlignVertical: z.enum(['TOP', 'CENTER', 'BOTTOM']).optional(),
    textAutoResize: z.enum(['WIDTH_AND_HEIGHT', 'HEIGHT', 'NONE', 'TRUNCATE']).optional(),
    lineHeight: z.union([z.number(), LineHeightSchema]).optional(),
    letterSpacing: z.number().optional(),
    textDecoration: z.enum(['NONE', 'UNDERLINE', 'STRIKETHROUGH']).optional(),
    textCase: z.enum(['ORIGINAL', 'UPPER', 'LOWER', 'TITLE']).optional(),

    // Component instance
    componentKey: z.string().optional().describe('Component key for published library components'),
    componentId: z.string().optional().describe('Node ID for local components (e.g. "121:317")'),
    overrides: z
      .record(z.union([z.string(), z.boolean()]))
      .optional()
      .describe('Property overrides for COMPONENT_INSTANCE — keys are property names, values are strings or booleans'),

    // Component / Component Set
    componentDescription: z.string().optional().describe('Description for COMPONENT or COMPONENT_SET nodes'),

    // Style binding — apply Figma style IDs (from get_styles)
    fillStyleId: z
      .string()
      .optional()
      .describe('Figma paint style ID to bind (from get_styles). Overrides fills array if set.'),
    textStyleId: z.string().optional().describe('Figma text style ID to bind (from get_styles). Sets font, size, etc.'),
    effectStyleId: z
      .string()
      .optional()
      .describe('Figma effect style ID to bind (from get_styles). Overrides effects array if set.'),

    // Children
    children: z.array(z.lazy(() => SceneNodeSchema)).optional(),

    // Visibility
    visible: z.boolean().optional(),
    locked: z.boolean().optional(),
  }),
);

// ─── ModifyProperties Schema ────────────────────────────────────

export const ModifyPropertiesSchema = z
  .object({
    name: z.string().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    fills: z.array(FillSchema).optional(),
    strokes: z.array(StrokeSchema).optional(),
    effects: z.array(EffectSchema).optional(),
    opacity: z.number().min(0).max(1).optional(),
    cornerRadius: z.union([z.number(), z.tuple([z.number(), z.number(), z.number(), z.number()])]).optional(),
    clipsContent: z.boolean().optional(),
    visible: z.boolean().optional(),
    locked: z.boolean().optional(),
    // Auto-layout
    layoutMode: z.enum(['HORIZONTAL', 'VERTICAL', 'NONE']).optional(),
    primaryAxisAlignItems: z.enum(['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN']).optional(),
    counterAxisAlignItems: z.enum(['MIN', 'CENTER', 'MAX']).optional(),
    itemSpacing: z.number().optional(),
    padding: z.union([z.number(), z.tuple([z.number(), z.number(), z.number(), z.number()])]).optional(),
    layoutSizingHorizontal: z.enum(['FIXED', 'HUG', 'FILL']).optional(),
    layoutSizingVertical: z.enum(['FIXED', 'HUG', 'FILL']).optional(),
    // Text
    characters: z.string().optional(),
    fontSize: z.number().optional(),
    fontFamily: z.string().optional(),
    fontWeight: z.union([z.number(), z.string()]).optional(),
    textAlignHorizontal: z.enum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']).optional(),
    textAlignVertical: z.enum(['TOP', 'CENTER', 'BOTTOM']).optional(),
    textAutoResize: z.enum(['WIDTH_AND_HEIGHT', 'HEIGHT', 'NONE', 'TRUNCATE']).optional(),
    lineHeight: z.union([z.number(), LineHeightSchema]).optional(),
    letterSpacing: z.number().optional(),
    textDecoration: z.enum(['NONE', 'UNDERLINE', 'STRIKETHROUGH']).optional(),
    textCase: z.enum(['ORIGINAL', 'UPPER', 'LOWER', 'TITLE']).optional(),
    // Component instance
    swapComponent: z.string().optional().describe('Component node ID to swap an INSTANCE node to (e.g. swap an icon)'),
    // Style binding
    fillStyleId: z
      .string()
      .optional()
      .describe('Figma paint style ID to bind (from get_styles). Overrides fills array if set.'),
    textStyleId: z.string().optional().describe('Figma text style ID to bind (from get_styles). Sets font, size, etc.'),
    effectStyleId: z
      .string()
      .optional()
      .describe('Figma effect style ID to bind (from get_styles). Overrides effects array if set.'),
  })
  .describe('Properties to update on the node');

// ─── Batch Schema ────────────────────────────────────────────────

/** A single item in a batch_modify modifications array */
export const BatchModificationSchema = z.object({
  nodeId: z.string().describe('The Figma node ID to modify'),
  properties: ModifyPropertiesSchema,
});
