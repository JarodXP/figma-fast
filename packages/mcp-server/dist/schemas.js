"use strict";
/**
 * Shared Zod schemas for FigmaFast MCP tools.
 * Extracted from build-scene.ts and edit-tools.ts to eliminate duplication.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchModificationSchema = exports.ModifyPropertiesSchema = exports.SceneNodeSchema = exports.LineHeightSchema = exports.EffectSchema = exports.StrokeSchema = exports.FillSchema = void 0;
const zod_1 = require("zod");
// ─── Sub-Schemas ────────────────────────────────────────────────
exports.FillSchema = zod_1.z.object({
    type: zod_1.z.enum(['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND', 'IMAGE']),
    color: zod_1.z.string().optional().describe('Hex color: #RGB, #RRGGBB, or #RRGGBBAA'),
    opacity: zod_1.z.number().min(0).max(1).optional(),
    visible: zod_1.z.boolean().optional(),
    gradientStops: zod_1.z
        .array(zod_1.z.object({
        position: zod_1.z.number(),
        color: zod_1.z.string(),
    }))
        .optional(),
    gradientTransform: zod_1.z
        .tuple([zod_1.z.tuple([zod_1.z.number(), zod_1.z.number(), zod_1.z.number()]), zod_1.z.tuple([zod_1.z.number(), zod_1.z.number(), zod_1.z.number()])])
        .optional(),
    imageUrl: zod_1.z
        .string()
        .url()
        .optional()
        .describe('URL of image for IMAGE fill type. Server downloads and uploads to Figma.'),
    scaleMode: zod_1.z.enum(['FILL', 'FIT', 'CROP', 'TILE']).optional(),
});
exports.StrokeSchema = zod_1.z.object({
    type: zod_1.z
        .enum(['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND', 'IMAGE'])
        .optional(),
    color: zod_1.z.string().describe('Hex color: #RRGGBB or #RRGGBBAA'),
    weight: zod_1.z.number(),
    align: zod_1.z.enum(['INSIDE', 'OUTSIDE', 'CENTER']).optional(),
    opacity: zod_1.z.number().min(0).max(1).optional(),
    dashPattern: zod_1.z.array(zod_1.z.number()).optional(),
});
exports.EffectSchema = zod_1.z.object({
    type: zod_1.z.enum(['DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR']),
    color: zod_1.z.string().optional().describe('Hex color for shadows'),
    offset: zod_1.z.object({ x: zod_1.z.number(), y: zod_1.z.number() }).optional(),
    radius: zod_1.z.number(),
    spread: zod_1.z.number().optional(),
    visible: zod_1.z.boolean().optional(),
    opacity: zod_1.z.number().min(0).max(1).optional(),
});
exports.LineHeightSchema = zod_1.z.object({
    value: zod_1.z.number(),
    unit: zod_1.z.enum(['PIXELS', 'PERCENT', 'AUTO']),
});
// ─── Recursive SceneNode Schema ────────────────────────────────
exports.SceneNodeSchema = zod_1.z.lazy(() => zod_1.z.object({
    id: zod_1.z.string().optional().describe('Client-assigned ID for referencing this node later'),
    type: zod_1.z.enum([
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
    name: zod_1.z.string().optional(),
    // Geometry
    x: zod_1.z.number().optional(),
    y: zod_1.z.number().optional(),
    width: zod_1.z.number().optional(),
    height: zod_1.z.number().optional(),
    // Style
    fills: zod_1.z.array(exports.FillSchema).optional(),
    strokes: zod_1.z.array(exports.StrokeSchema).optional(),
    effects: zod_1.z.array(exports.EffectSchema).optional(),
    opacity: zod_1.z.number().min(0).max(1).optional(),
    cornerRadius: zod_1.z.union([zod_1.z.number(), zod_1.z.tuple([zod_1.z.number(), zod_1.z.number(), zod_1.z.number(), zod_1.z.number()])]).optional(),
    clipsContent: zod_1.z.boolean().optional(),
    // Auto-layout
    layoutMode: zod_1.z.enum(['HORIZONTAL', 'VERTICAL', 'NONE']).optional(),
    primaryAxisAlignItems: zod_1.z.enum(['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN']).optional(),
    counterAxisAlignItems: zod_1.z.enum(['MIN', 'CENTER', 'MAX']).optional(),
    itemSpacing: zod_1.z.number().optional(),
    padding: zod_1.z.union([zod_1.z.number(), zod_1.z.tuple([zod_1.z.number(), zod_1.z.number(), zod_1.z.number(), zod_1.z.number()])]).optional(),
    // Sizing (auto-layout children)
    layoutSizingHorizontal: zod_1.z.enum(['FIXED', 'HUG', 'FILL']).optional(),
    layoutSizingVertical: zod_1.z.enum(['FIXED', 'HUG', 'FILL']).optional(),
    // Text
    characters: zod_1.z.string().optional(),
    fontSize: zod_1.z.number().optional(),
    fontFamily: zod_1.z.string().optional(),
    fontWeight: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional(),
    fontStyle: zod_1.z.string().optional(),
    textAlignHorizontal: zod_1.z.enum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']).optional(),
    textAlignVertical: zod_1.z.enum(['TOP', 'CENTER', 'BOTTOM']).optional(),
    textAutoResize: zod_1.z.enum(['WIDTH_AND_HEIGHT', 'HEIGHT', 'NONE', 'TRUNCATE']).optional(),
    lineHeight: zod_1.z.union([zod_1.z.number(), exports.LineHeightSchema]).optional(),
    letterSpacing: zod_1.z.number().optional(),
    textDecoration: zod_1.z.enum(['NONE', 'UNDERLINE', 'STRIKETHROUGH']).optional(),
    textCase: zod_1.z.enum(['ORIGINAL', 'UPPER', 'LOWER', 'TITLE']).optional(),
    // Component instance
    componentKey: zod_1.z.string().optional().describe('Component key for published library components'),
    componentId: zod_1.z.string().optional().describe('Node ID for local components (e.g. "121:317")'),
    overrides: zod_1.z
        .record(zod_1.z.union([zod_1.z.string(), zod_1.z.boolean()]))
        .optional()
        .describe('Property overrides for COMPONENT_INSTANCE — keys are property names, values are strings or booleans'),
    // Component / Component Set
    componentDescription: zod_1.z.string().optional().describe('Description for COMPONENT or COMPONENT_SET nodes'),
    // Style binding — apply Figma style IDs (from get_styles)
    fillStyleId: zod_1.z
        .string()
        .optional()
        .describe('Figma paint style ID to bind (from get_styles). Overrides fills array if set.'),
    textStyleId: zod_1.z.string().optional().describe('Figma text style ID to bind (from get_styles). Sets font, size, etc.'),
    effectStyleId: zod_1.z
        .string()
        .optional()
        .describe('Figma effect style ID to bind (from get_styles). Overrides effects array if set.'),
    // Children
    children: zod_1.z.array(zod_1.z.lazy(() => exports.SceneNodeSchema)).optional(),
    // Visibility
    visible: zod_1.z.boolean().optional(),
    locked: zod_1.z.boolean().optional(),
}));
// ─── ModifyProperties Schema ────────────────────────────────────
exports.ModifyPropertiesSchema = zod_1.z
    .object({
    name: zod_1.z.string().optional(),
    x: zod_1.z.number().optional(),
    y: zod_1.z.number().optional(),
    width: zod_1.z.number().optional(),
    height: zod_1.z.number().optional(),
    fills: zod_1.z.array(exports.FillSchema).optional(),
    strokes: zod_1.z.array(exports.StrokeSchema).optional(),
    effects: zod_1.z.array(exports.EffectSchema).optional(),
    opacity: zod_1.z.number().min(0).max(1).optional(),
    cornerRadius: zod_1.z.union([zod_1.z.number(), zod_1.z.tuple([zod_1.z.number(), zod_1.z.number(), zod_1.z.number(), zod_1.z.number()])]).optional(),
    clipsContent: zod_1.z.boolean().optional(),
    visible: zod_1.z.boolean().optional(),
    locked: zod_1.z.boolean().optional(),
    // Auto-layout
    layoutMode: zod_1.z.enum(['HORIZONTAL', 'VERTICAL', 'NONE']).optional(),
    primaryAxisAlignItems: zod_1.z.enum(['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN']).optional(),
    counterAxisAlignItems: zod_1.z.enum(['MIN', 'CENTER', 'MAX']).optional(),
    itemSpacing: zod_1.z.number().optional(),
    padding: zod_1.z.union([zod_1.z.number(), zod_1.z.tuple([zod_1.z.number(), zod_1.z.number(), zod_1.z.number(), zod_1.z.number()])]).optional(),
    layoutSizingHorizontal: zod_1.z.enum(['FIXED', 'HUG', 'FILL']).optional(),
    layoutSizingVertical: zod_1.z.enum(['FIXED', 'HUG', 'FILL']).optional(),
    // Text
    characters: zod_1.z.string().optional(),
    fontSize: zod_1.z.number().optional(),
    fontFamily: zod_1.z.string().optional(),
    fontWeight: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional(),
    textAlignHorizontal: zod_1.z.enum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']).optional(),
    textAlignVertical: zod_1.z.enum(['TOP', 'CENTER', 'BOTTOM']).optional(),
    textAutoResize: zod_1.z.enum(['WIDTH_AND_HEIGHT', 'HEIGHT', 'NONE', 'TRUNCATE']).optional(),
    lineHeight: zod_1.z.union([zod_1.z.number(), exports.LineHeightSchema]).optional(),
    letterSpacing: zod_1.z.number().optional(),
    textDecoration: zod_1.z.enum(['NONE', 'UNDERLINE', 'STRIKETHROUGH']).optional(),
    textCase: zod_1.z.enum(['ORIGINAL', 'UPPER', 'LOWER', 'TITLE']).optional(),
    // Component instance
    swapComponent: zod_1.z.string().optional().describe('Component node ID to swap an INSTANCE node to (e.g. swap an icon)'),
    // Style binding
    fillStyleId: zod_1.z
        .string()
        .optional()
        .describe('Figma paint style ID to bind (from get_styles). Overrides fills array if set.'),
    textStyleId: zod_1.z.string().optional().describe('Figma text style ID to bind (from get_styles). Sets font, size, etc.'),
    effectStyleId: zod_1.z
        .string()
        .optional()
        .describe('Figma effect style ID to bind (from get_styles). Overrides effects array if set.'),
})
    .describe('Properties to update on the node');
// ─── Batch Schema ────────────────────────────────────────────────
/** A single item in a batch_modify modifications array */
exports.BatchModificationSchema = zod_1.z.object({
    nodeId: zod_1.z.string().describe('The Figma node ID to modify'),
    properties: exports.ModifyPropertiesSchema,
});
//# sourceMappingURL=schemas.js.map