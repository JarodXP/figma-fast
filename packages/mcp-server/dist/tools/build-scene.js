"use strict";
/**
 * build_scene MCP tool — creates entire Figma designs in a single call.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBuildSceneTool = registerBuildSceneTool;
const zod_1 = require("zod");
const server_js_1 = require("../ws/server.js");
// ─── Zod Sub-Schemas ────────────────────────────────────────────
const FillSchema = zod_1.z.object({
    type: zod_1.z.enum(['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND', 'IMAGE']),
    color: zod_1.z.string().optional().describe('Hex color: #RGB, #RRGGBB, or #RRGGBBAA'),
    opacity: zod_1.z.number().min(0).max(1).optional(),
    visible: zod_1.z.boolean().optional(),
    gradientStops: zod_1.z.array(zod_1.z.object({
        position: zod_1.z.number(),
        color: zod_1.z.string(),
    })).optional(),
    gradientTransform: zod_1.z.tuple([
        zod_1.z.tuple([zod_1.z.number(), zod_1.z.number(), zod_1.z.number()]),
        zod_1.z.tuple([zod_1.z.number(), zod_1.z.number(), zod_1.z.number()]),
    ]).optional(),
    scaleMode: zod_1.z.enum(['FILL', 'FIT', 'CROP', 'TILE']).optional(),
});
const StrokeSchema = zod_1.z.object({
    type: zod_1.z.enum(['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND', 'IMAGE']).optional(),
    color: zod_1.z.string().describe('Hex color: #RRGGBB or #RRGGBBAA'),
    weight: zod_1.z.number(),
    align: zod_1.z.enum(['INSIDE', 'OUTSIDE', 'CENTER']).optional(),
    opacity: zod_1.z.number().min(0).max(1).optional(),
    dashPattern: zod_1.z.array(zod_1.z.number()).optional(),
});
const EffectSchema = zod_1.z.object({
    type: zod_1.z.enum(['DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR']),
    color: zod_1.z.string().optional().describe('Hex color for shadows'),
    offset: zod_1.z.object({ x: zod_1.z.number(), y: zod_1.z.number() }).optional(),
    radius: zod_1.z.number(),
    spread: zod_1.z.number().optional(),
    visible: zod_1.z.boolean().optional(),
    opacity: zod_1.z.number().min(0).max(1).optional(),
});
const LineHeightSchema = zod_1.z.object({
    value: zod_1.z.number(),
    unit: zod_1.z.enum(['PIXELS', 'PERCENT', 'AUTO']),
});
// ─── Recursive SceneNode Schema ────────────────────────────────
const SceneNodeSchema = zod_1.z.lazy(() => zod_1.z.object({
    id: zod_1.z.string().optional().describe('Client-assigned ID for referencing this node later'),
    type: zod_1.z.enum(['FRAME', 'TEXT', 'RECTANGLE', 'ELLIPSE', 'GROUP', 'COMPONENT', 'COMPONENT_SET', 'COMPONENT_INSTANCE', 'POLYGON', 'STAR', 'LINE', 'VECTOR']),
    name: zod_1.z.string().optional(),
    // Geometry
    x: zod_1.z.number().optional(),
    y: zod_1.z.number().optional(),
    width: zod_1.z.number().optional(),
    height: zod_1.z.number().optional(),
    // Style
    fills: zod_1.z.array(FillSchema).optional(),
    strokes: zod_1.z.array(StrokeSchema).optional(),
    effects: zod_1.z.array(EffectSchema).optional(),
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
    lineHeight: zod_1.z.union([zod_1.z.number(), LineHeightSchema]).optional(),
    letterSpacing: zod_1.z.number().optional(),
    textDecoration: zod_1.z.enum(['NONE', 'UNDERLINE', 'STRIKETHROUGH']).optional(),
    textCase: zod_1.z.enum(['ORIGINAL', 'UPPER', 'LOWER', 'TITLE']).optional(),
    // Component instance
    componentKey: zod_1.z.string().optional(),
    overrides: zod_1.z.record(zod_1.z.any()).optional(),
    // Component / Component Set
    componentDescription: zod_1.z.string().optional().describe('Description for COMPONENT or COMPONENT_SET nodes'),
    // Children
    children: zod_1.z.array(zod_1.z.lazy(() => SceneNodeSchema)).optional(),
    // Visibility
    visible: zod_1.z.boolean().optional(),
    locked: zod_1.z.boolean().optional(),
}));
// ─── Tool Description ──────────────────────────────────────────
const TOOL_DESCRIPTION = `Build an entire Figma design in a single call using a declarative scene specification.

This is the PRIMARY tool for creating designs. Always prefer this over multiple atomic operations.

The spec is a tree of nodes. Each node has a type and properties. All nodes are created in one batch, making this 10-50x faster than creating nodes individually.

COLORS: Use hex strings (#RGB, #RRGGBB, or #RRGGBBAA). Examples: "#FF0000" (red), "#00000080" (50% transparent black).

FONTS: Default is Inter Regular. Set fontFamily and fontWeight (number 100-900 or string like "Bold") to use other fonts.

AUTO-LAYOUT: Set layoutMode on a FRAME to "HORIZONTAL" or "VERTICAL". Use itemSpacing for gaps, padding for inner spacing (number for uniform, or [top, right, bottom, left]). Set layoutSizingHorizontal/Vertical on children: "FILL" to stretch, "HUG" to fit content.

Example 1 — Card with title and description:
{
  "scene": {
    "type": "FRAME", "name": "Card", "width": 320,
    "fills": [{"type": "SOLID", "color": "#FFFFFF"}],
    "cornerRadius": 12,
    "effects": [{"type": "DROP_SHADOW", "color": "#00000026", "offset": {"x": 0, "y": 2}, "radius": 8}],
    "layoutMode": "VERTICAL", "padding": 24, "itemSpacing": 8,
    "layoutSizingVertical": "HUG",
    "children": [
      {"type": "TEXT", "characters": "Card Title", "fontSize": 18, "fontWeight": 700, "fills": [{"type": "SOLID", "color": "#1A1A1A"}], "layoutSizingHorizontal": "FILL"},
      {"type": "TEXT", "characters": "A short description.", "fontSize": 14, "fills": [{"type": "SOLID", "color": "#666666"}], "layoutSizingHorizontal": "FILL"}
    ]
  }
}

Example 2 — Horizontal metrics row:
{
  "scene": {
    "type": "FRAME", "name": "Metrics", "layoutMode": "HORIZONTAL", "itemSpacing": 16, "fills": [],
    "layoutSizingHorizontal": "HUG", "layoutSizingVertical": "HUG",
    "children": [
      {
        "type": "FRAME", "width": 160, "layoutMode": "VERTICAL", "padding": 16, "itemSpacing": 4,
        "fills": [{"type": "SOLID", "color": "#F3F4F6"}], "cornerRadius": 8,
        "children": [
          {"type": "TEXT", "characters": "Revenue", "fontSize": 12, "fills": [{"type": "SOLID", "color": "#6B7280"}]},
          {"type": "TEXT", "characters": "$12,450", "fontSize": 24, "fontWeight": 700, "fills": [{"type": "SOLID", "color": "#111827"}]}
        ]
      },
      {
        "type": "FRAME", "width": 160, "layoutMode": "VERTICAL", "padding": 16, "itemSpacing": 4,
        "fills": [{"type": "SOLID", "color": "#F3F4F6"}], "cornerRadius": 8,
        "children": [
          {"type": "TEXT", "characters": "Users", "fontSize": 12, "fills": [{"type": "SOLID", "color": "#6B7280"}]},
          {"type": "TEXT", "characters": "1,234", "fontSize": 24, "fontWeight": 700, "fills": [{"type": "SOLID", "color": "#111827"}]}
        ]
      }
    ]
  }
}

Example 3 — Button:
{
  "scene": {
    "type": "FRAME", "name": "Button",
    "layoutMode": "HORIZONTAL", "padding": [10, 20, 10, 20],
    "primaryAxisAlignItems": "CENTER", "counterAxisAlignItems": "CENTER",
    "fills": [{"type": "SOLID", "color": "#2563EB"}], "cornerRadius": 8,
    "layoutSizingHorizontal": "HUG", "layoutSizingVertical": "HUG",
    "children": [
      {"type": "TEXT", "characters": "Get Started", "fontSize": 14, "fontWeight": 600, "fills": [{"type": "SOLID", "color": "#FFFFFF"}]}
    ]
  }
}

COMPONENTS: Use type "COMPONENT" to create reusable components (same properties as FRAME). Use type "COMPONENT_SET" to create variant groups — its children MUST all be type "COMPONENT" with variant names like "Property1=Value1, Property2=Value2".

Example 4 — Button component with variants:
{
  "scene": {
    "type": "COMPONENT_SET",
    "name": "Button",
    "componentDescription": "Primary action button",
    "children": [
      {
        "type": "COMPONENT", "name": "Size=Medium, State=Default",
        "layoutMode": "HORIZONTAL", "padding": [10, 20, 10, 20],
        "primaryAxisAlignItems": "CENTER", "counterAxisAlignItems": "CENTER",
        "fills": [{"type": "SOLID", "color": "#2563EB"}], "cornerRadius": 8,
        "layoutSizingHorizontal": "HUG", "layoutSizingVertical": "HUG",
        "children": [
          {"type": "TEXT", "characters": "Button", "fontSize": 14, "fontWeight": 600, "fills": [{"type": "SOLID", "color": "#FFFFFF"}]}
        ]
      },
      {
        "type": "COMPONENT", "name": "Size=Medium, State=Hover",
        "layoutMode": "HORIZONTAL", "padding": [10, 20, 10, 20],
        "primaryAxisAlignItems": "CENTER", "counterAxisAlignItems": "CENTER",
        "fills": [{"type": "SOLID", "color": "#1D4ED8"}], "cornerRadius": 8,
        "layoutSizingHorizontal": "HUG", "layoutSizingVertical": "HUG",
        "children": [
          {"type": "TEXT", "characters": "Button", "fontSize": 14, "fontWeight": 600, "fills": [{"type": "SOLID", "color": "#FFFFFF"}]}
        ]
      }
    ]
  }
}`;
// ─── Tool Registration ─────────────────────────────────────────
function registerBuildSceneTool(server) {
    server.tool('build_scene', TOOL_DESCRIPTION, {
        scene: SceneNodeSchema.describe('The root node of the scene tree to build'),
        parentNodeId: zod_1.z.string().optional().describe('Figma node ID to build into. If omitted, builds on the current page.'),
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)()) {
            return {
                content: [{
                        type: 'text',
                        text: 'Figma plugin is not connected. Open the FigmaFast plugin in Figma.',
                    }],
                isError: true,
            };
        }
        try {
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'build_scene',
                spec: params.scene,
                parentId: params.parentNodeId,
            }, 120_000);
            if (response.type === 'result') {
                if (response.success) {
                    const data = response.data;
                    let text = `Scene built successfully in ${data.durationMs}ms.\n`;
                    text += `Root node ID: ${data.rootNodeId}\n`;
                    text += `Nodes created: ${data.nodeCount}`;
                    if (data.fontSubstitutions.length > 0) {
                        text += `\n\nFont substitutions:\n${data.fontSubstitutions.map(s => `  - ${s}`).join('\n')}`;
                    }
                    if (data.errors.length > 0) {
                        text += `\n\nWarnings:\n${data.errors.map(e => `  - ${e}`).join('\n')}`;
                    }
                    if (Object.keys(data.nodeIdMap).length > 0) {
                        text += `\n\nNode ID map:\n${Object.entries(data.nodeIdMap).map(([k, v]) => `  ${k} → ${v}`).join('\n')}`;
                    }
                    return {
                        content: [{ type: 'text', text }],
                    };
                }
                else {
                    return {
                        content: [{
                                type: 'text',
                                text: `Build failed: ${response.error ?? 'Unknown error'}`,
                            }],
                        isError: true,
                    };
                }
            }
            return {
                content: [{
                        type: 'text',
                        text: `Unexpected response type: ${response.type}`,
                    }],
                isError: true,
            };
        }
        catch (err) {
            return {
                content: [{
                        type: 'text',
                        text: `Build scene failed: ${err instanceof Error ? err.message : String(err)}`,
                    }],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=build-scene.js.map