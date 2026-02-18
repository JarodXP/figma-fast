/**
 * build_scene MCP tool — creates entire Figma designs in a single call.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { sendToPlugin, isPluginConnected } from '../ws/server.js';

// ─── Zod Sub-Schemas ────────────────────────────────────────────

const FillSchema = z.object({
  type: z.enum(['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND', 'IMAGE']),
  color: z.string().optional().describe('Hex color: #RGB, #RRGGBB, or #RRGGBBAA'),
  opacity: z.number().min(0).max(1).optional(),
  visible: z.boolean().optional(),
  gradientStops: z.array(z.object({
    position: z.number(),
    color: z.string(),
  })).optional(),
  gradientTransform: z.tuple([
    z.tuple([z.number(), z.number(), z.number()]),
    z.tuple([z.number(), z.number(), z.number()]),
  ]).optional(),
  scaleMode: z.enum(['FILL', 'FIT', 'CROP', 'TILE']).optional(),
});

const StrokeSchema = z.object({
  type: z.enum(['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND', 'IMAGE']).optional(),
  color: z.string().describe('Hex color: #RRGGBB or #RRGGBBAA'),
  weight: z.number(),
  align: z.enum(['INSIDE', 'OUTSIDE', 'CENTER']).optional(),
  opacity: z.number().min(0).max(1).optional(),
  dashPattern: z.array(z.number()).optional(),
});

const EffectSchema = z.object({
  type: z.enum(['DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR']),
  color: z.string().optional().describe('Hex color for shadows'),
  offset: z.object({ x: z.number(), y: z.number() }).optional(),
  radius: z.number(),
  spread: z.number().optional(),
  visible: z.boolean().optional(),
  opacity: z.number().min(0).max(1).optional(),
});

const LineHeightSchema = z.object({
  value: z.number(),
  unit: z.enum(['PIXELS', 'PERCENT', 'AUTO']),
});

// ─── Recursive SceneNode Schema ────────────────────────────────

const SceneNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string().optional().describe('Client-assigned ID for referencing this node later'),
    type: z.enum(['FRAME', 'TEXT', 'RECTANGLE', 'ELLIPSE', 'GROUP', 'COMPONENT', 'COMPONENT_SET', 'COMPONENT_INSTANCE', 'POLYGON', 'STAR', 'LINE', 'VECTOR']),
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
    overrides: z.record(z.union([z.string(), z.boolean()])).optional().describe('Property overrides for COMPONENT_INSTANCE — keys are property names, values are strings or booleans'),

    // Component / Component Set
    componentDescription: z.string().optional().describe('Description for COMPONENT or COMPONENT_SET nodes'),

    // Children
    children: z.array(z.lazy(() => SceneNodeSchema)).optional(),

    // Visibility
    visible: z.boolean().optional(),
    locked: z.boolean().optional(),
  })
);

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

export function registerBuildSceneTool(server: McpServer): void {
  server.tool(
    'build_scene',
    TOOL_DESCRIPTION,
    {
      scene: SceneNodeSchema.describe('The root node of the scene tree to build'),
      parentNodeId: z.string().optional().describe('Figma node ID to build into. If omitted, builds on the current page.'),
    },
    async (params) => {
      if (!isPluginConnected()) {
        return {
          content: [{
            type: 'text' as const,
            text: 'Figma plugin is not connected. Open the FigmaFast plugin in Figma.',
          }],
          isError: true,
        };
      }

      try {
        const response = await sendToPlugin(
          {
            type: 'build_scene',
            spec: params.scene,
            parentId: params.parentNodeId,
          },
          120_000,
        );

        if (response.type === 'result') {
          if (response.success) {
            const data = response.data as {
              rootNodeId: string;
              nodeIdMap: Record<string, string>;
              nodeCount: number;
              errors: string[];
              fontSubstitutions: string[];
              durationMs: number;
            };

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
              content: [{ type: 'text' as const, text }],
            };
          } else {
            return {
              content: [{
                type: 'text' as const,
                text: `Build failed: ${response.error ?? 'Unknown error'}`,
              }],
              isError: true,
            };
          }
        }

        return {
          content: [{
            type: 'text' as const,
            text: `Unexpected response type: ${response.type}`,
          }],
          isError: true,
        };
      } catch (err) {
        return {
          content: [{
            type: 'text' as const,
            text: `Build scene failed: ${err instanceof Error ? err.message : String(err)}`,
          }],
          isError: true,
        };
      }
    }
  );
}
