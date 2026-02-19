/**
 * Image fill MCP tool — set a node's fill to an image from a URL.
 * The image is downloaded by the MCP server and sent as base64 to the plugin.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { sendToPlugin, isPluginConnected } from '../ws/server.js';

const NOT_CONNECTED = {
  content: [
    {
      type: 'text' as const,
      text: 'Figma plugin is not connected. Open the FigmaFast plugin in Figma.',
    },
  ],
  isError: true,
};

const TIMEOUT = 60_000;
const FETCH_TIMEOUT_MS = 30_000;

// ─── Tool Registration ─────────────────────────────────────────

export function registerImageTools(server: McpServer): void {
  // ─── set_image_fill ──────────────────────────────────────────

  server.tool(
    'set_image_fill',
    "Set a node's fill to an image from a URL. The image is downloaded by the server and uploaded to Figma. Supports PNG, JPG, GIF, SVG, and WebP.",
    {
      nodeId: z.string().describe('The Figma node ID to apply the image fill to'),
      imageUrl: z.string().url().describe('URL of the image to download and apply'),
      scaleMode: z
        .enum(['FILL', 'FIT', 'CROP', 'TILE'])
        .optional()
        .default('FILL')
        .describe('How the image is scaled within the node (default: FILL)'),
    },
    async (params) => {
      if (!isPluginConnected()) return NOT_CONNECTED;

      // Download the image with a 30s timeout
      let imageData: string;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        let response: Response;
        try {
          response = await fetch(params.imageUrl, { signal: controller.signal });
        } finally {
          clearTimeout(timeoutId);
        }

        if (!response.ok) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `set_image_fill failed: HTTP ${response.status} ${response.statusText} from ${params.imageUrl}`,
              },
            ],
            isError: true,
          };
        }

        const arrayBuffer = await response.arrayBuffer();
        imageData = Buffer.from(arrayBuffer).toString('base64');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const isTimeout = message.includes('abort') || message.includes('timeout');
        return {
          content: [
            {
              type: 'text' as const,
              text: `set_image_fill failed: ${isTimeout ? 'Request timed out after 30s' : message}`,
            },
          ],
          isError: true,
        };
      }

      // Send to plugin
      try {
        const response = await sendToPlugin(
          {
            type: 'set_image_fill',
            nodeId: params.nodeId,
            imageData,
            scaleMode: params.scaleMode,
          },
          TIMEOUT,
        );

        if (response.type === 'result' && response.success) {
          const data = response.data as { nodeId: string; name: string; imageHash: string };
          return {
            content: [
              {
                type: 'text' as const,
                text: `Set image fill on "${data.name}" (${data.nodeId}) — imageHash: ${data.imageHash}`,
              },
            ],
          };
        }
        return {
          content: [
            {
              type: 'text' as const,
              text: `set_image_fill failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
            },
          ],
          isError: true,
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `set_image_fill failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
