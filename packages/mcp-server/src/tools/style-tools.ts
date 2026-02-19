/**
 * Style creation MCP tools — create local paint, text, and effect styles in Figma.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { sendToPlugin, isPluginConnected } from '../ws/server.js';
import { FillSchema, EffectSchema, LineHeightSchema } from '../schemas.js';

const NOT_CONNECTED = {
  content: [
    {
      type: 'text' as const,
      text: 'Figma plugin is not connected. Open the FigmaFast plugin in Figma.',
    },
  ],
  isError: true,
};

const TIMEOUT = 30_000;

// ─── Tool Registration ─────────────────────────────────────────

export function registerStyleTools(server: McpServer): void {
  // ─── create_paint_style ──────────────────────────────────────

  server.tool(
    'create_paint_style',
    'Create a local paint style (color/gradient) in the Figma file. Returns the style ID which can be used with fillStyleId on any node. Use get_styles to see existing styles.',
    {
      name: z.string().describe('Name for the new paint style'),
      fills: z.array(FillSchema).min(1).describe('Fill definitions for the paint style'),
    },
    async (params) => {
      if (!isPluginConnected()) return NOT_CONNECTED;

      try {
        const response = await sendToPlugin(
          {
            type: 'create_paint_style',
            name: params.name,
            fills: params.fills,
          },
          TIMEOUT,
        );

        if (response.type === 'result' && response.success) {
          const data = response.data as { id: string; name: string; key: string };
          return {
            content: [
              {
                type: 'text' as const,
                text: `Created paint style ${data.name} (id: ${data.id}, key: ${data.key})`,
              },
            ],
          };
        }
        return {
          content: [
            {
              type: 'text' as const,
              text: `create_paint_style failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
            },
          ],
          isError: true,
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `create_paint_style failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ─── create_text_style ───────────────────────────────────────

  server.tool(
    'create_text_style',
    'Create a local text style in the Figma file. Returns the style ID for use with textStyleId.',
    {
      name: z.string().describe('Name for the new text style'),
      fontFamily: z.string().optional().describe('Font family name (default: Inter)'),
      fontSize: z.number().optional().describe('Font size in pixels'),
      fontWeight: z
        .union([z.number(), z.string()])
        .optional()
        .describe('Font weight as number (400, 700) or string ("Bold", "Regular")'),
      lineHeight: z
        .union([z.number(), LineHeightSchema])
        .optional()
        .describe('Line height in pixels (number) or as LineHeight object'),
      letterSpacing: z.number().optional().describe('Letter spacing in pixels'),
      textDecoration: z.enum(['NONE', 'UNDERLINE', 'STRIKETHROUGH']).optional().describe('Text decoration'),
      textCase: z.enum(['ORIGINAL', 'UPPER', 'LOWER', 'TITLE']).optional().describe('Text case transformation'),
    },
    async (params) => {
      if (!isPluginConnected()) return NOT_CONNECTED;

      try {
        const response = await sendToPlugin(
          {
            type: 'create_text_style',
            name: params.name,
            fontFamily: params.fontFamily,
            fontSize: params.fontSize,
            fontWeight: params.fontWeight,
            lineHeight: params.lineHeight,
            letterSpacing: params.letterSpacing,
            textDecoration: params.textDecoration,
            textCase: params.textCase,
          },
          TIMEOUT,
        );

        if (response.type === 'result' && response.success) {
          const data = response.data as { id: string; name: string; key: string };
          return {
            content: [
              {
                type: 'text' as const,
                text: `Created text style ${data.name} (id: ${data.id}, key: ${data.key})`,
              },
            ],
          };
        }
        return {
          content: [
            {
              type: 'text' as const,
              text: `create_text_style failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
            },
          ],
          isError: true,
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `create_text_style failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ─── create_effect_style ─────────────────────────────────────

  server.tool(
    'create_effect_style',
    'Create a local effect style in the Figma file. Returns the style ID for use with effectStyleId.',
    {
      name: z.string().describe('Name for the new effect style'),
      effects: z.array(EffectSchema).min(1).describe('Effect definitions for the style'),
    },
    async (params) => {
      if (!isPluginConnected()) return NOT_CONNECTED;

      try {
        const response = await sendToPlugin(
          {
            type: 'create_effect_style',
            name: params.name,
            effects: params.effects,
          },
          TIMEOUT,
        );

        if (response.type === 'result' && response.success) {
          const data = response.data as { id: string; name: string; key: string };
          return {
            content: [
              {
                type: 'text' as const,
                text: `Created effect style ${data.name} (id: ${data.id}, key: ${data.key})`,
              },
            ],
          };
        }
        return {
          content: [
            {
              type: 'text' as const,
              text: `create_effect_style failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
            },
          ],
          isError: true,
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `create_effect_style failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
