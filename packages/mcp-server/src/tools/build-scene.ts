/**
 * build_scene MCP tool — creates entire Figma designs in a single call.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { sendToPlugin, isPluginConnected } from '../ws/server.js';
import { SceneNodeSchema } from '../schemas.js';
import type { SceneNode as SceneSpec } from '@figma-fast/shared';

// ─── Image Pre-Download ────────────────────────────────────────

const IMAGE_FETCH_TIMEOUT_MS = 30_000;

/** Walk the scene tree and collect all distinct imageUrls from IMAGE fills */
function collectImageUrls(spec: SceneSpec): Set<string> {
  const urls = new Set<string>();
  if (spec.fills) {
    for (const fill of spec.fills) {
      if (fill.type === 'IMAGE' && fill.imageUrl) {
        urls.add(fill.imageUrl);
      }
    }
  }
  if (spec.children) {
    for (const child of spec.children) {
      for (const url of collectImageUrls(child)) {
        urls.add(url);
      }
    }
  }
  return urls;
}

/** Download image URLs in parallel, returning base64-encoded payloads */
async function downloadImages(urls: Set<string>): Promise<Record<string, string>> {
  const payloads: Record<string, string> = {};
  await Promise.all(
    Array.from(urls).map(async (url) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);
        try {
          const response = await fetch(url, { signal: controller.signal });
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            payloads[url] = Buffer.from(arrayBuffer).toString('base64');
          } else {
            console.error(`[FigmaFast] Failed to download image ${url}: HTTP ${response.status}`);
          }
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (err) {
        console.error(
          `[FigmaFast] Failed to download image ${url}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }),
  );
  return payloads;
}

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

STYLE BINDING: Use get_styles first to discover style IDs, then bind them to nodes. Style IDs override individual fill/effect properties.

Example 5 — Rectangle with bound paint style:
{
  "scene": {
    "type": "RECTANGLE", "name": "Styled Box", "width": 200, "height": 100,
    "fillStyleId": "S:abc123,1:1",
    "effectStyleId": "S:def456,2:2",
    "cornerRadius": 8
  }
}

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
      parentNodeId: z
        .string()
        .optional()
        .describe('Figma node ID to build into. If omitted, builds on the current page.'),
    },
    async (params) => {
      if (!isPluginConnected()) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Figma plugin is not connected. Open the FigmaFast plugin in Figma.',
            },
          ],
          isError: true,
        };
      }

      try {
        // Pre-download all IMAGE fills with imageUrls
        const imageUrls = collectImageUrls(params.scene as SceneSpec);
        const imagePayloads = imageUrls.size > 0 ? await downloadImages(imageUrls) : undefined;

        const response = await sendToPlugin(
          {
            type: 'build_scene',
            spec: params.scene,
            parentId: params.parentNodeId,
            ...(imagePayloads && Object.keys(imagePayloads).length > 0 ? { imagePayloads } : {}),
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
              content: [{ type: 'text' as const, text }],
            };
          } else {
            return {
              content: [
                {
                  type: 'text' as const,
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
              type: 'text' as const,
              text: `Unexpected response type: ${response.type}`,
            },
          ],
          isError: true,
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Build scene failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
