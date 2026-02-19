"use strict";
/**
 * build_scene MCP tool — creates entire Figma designs in a single call.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBuildSceneTool = registerBuildSceneTool;
const zod_1 = require("zod");
const server_js_1 = require("../ws/server.js");
const schemas_js_1 = require("../schemas.js");
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
        scene: schemas_js_1.SceneNodeSchema.describe('The root node of the scene tree to build'),
        parentNodeId: zod_1.z
            .string()
            .optional()
            .describe('Figma node ID to build into. If omitted, builds on the current page.'),
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)()) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Figma plugin is not connected. Open the FigmaFast plugin in Figma.',
                    },
                ],
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
                        text += `\n\nFont substitutions:\n${data.fontSubstitutions.map((s) => `  - ${s}`).join('\n')}`;
                    }
                    if (data.errors.length > 0) {
                        text += `\n\nWarnings:\n${data.errors.map((e) => `  - ${e}`).join('\n')}`;
                    }
                    if (Object.keys(data.nodeIdMap).length > 0) {
                        text += `\n\nNode ID map:\n${Object.entries(data.nodeIdMap)
                            .map(([k, v]) => `  ${k} → ${v}`)
                            .join('\n')}`;
                    }
                    return {
                        content: [{ type: 'text', text }],
                    };
                }
                else {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Build failed: ${response.error ?? 'Unknown error'}`,
                            },
                        ],
                        isError: true,
                    };
                }
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `Unexpected response type: ${response.type}`,
                    },
                ],
                isError: true,
            };
        }
        catch (err) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Build scene failed: ${err instanceof Error ? err.message : String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=build-scene.js.map