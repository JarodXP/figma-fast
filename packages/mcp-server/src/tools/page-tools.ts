/**
 * Page management MCP tools — create, rename, and switch pages in Figma.
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

const TIMEOUT = 30_000;

// ─── Tool Registration ─────────────────────────────────────────

export function registerPageTools(server: McpServer): void {
  // ─── create_page ─────────────────────────────────────────────

  server.tool(
    'create_page',
    "Create a new page in the Figma document. Returns the new page's ID and name.",
    {
      name: z.string().describe('Name for the new page'),
    },
    async (params) => {
      if (!isPluginConnected()) return NOT_CONNECTED;

      try {
        const response = await sendToPlugin(
          {
            type: 'create_page',
            name: params.name,
          },
          TIMEOUT,
        );

        if (response.type === 'result' && response.success) {
          const data = response.data as { id: string; name: string };
          return {
            content: [{ type: 'text' as const, text: `Created page ${data.name} (id: ${data.id})` }],
          };
        }
        return {
          content: [
            {
              type: 'text' as const,
              text: `create_page failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
            },
          ],
          isError: true,
        };
      } catch (err) {
        return {
          content: [
            { type: 'text' as const, text: `create_page failed: ${err instanceof Error ? err.message : String(err)}` },
          ],
          isError: true,
        };
      }
    },
  );

  // ─── rename_page ─────────────────────────────────────────────

  server.tool(
    'rename_page',
    'Rename an existing page. Get page IDs from get_document_info.',
    {
      pageId: z.string().describe('The ID of the page to rename'),
      name: z.string().describe('New name for the page'),
    },
    async (params) => {
      if (!isPluginConnected()) return NOT_CONNECTED;

      try {
        const response = await sendToPlugin(
          {
            type: 'rename_page',
            pageId: params.pageId,
            name: params.name,
          },
          TIMEOUT,
        );

        if (response.type === 'result' && response.success) {
          const data = response.data as { id: string; name: string; oldName: string };
          return {
            content: [
              {
                type: 'text' as const,
                text: `Renamed page from ${data.oldName} to ${data.name} (id: ${data.id})`,
              },
            ],
          };
        }
        return {
          content: [
            {
              type: 'text' as const,
              text: `rename_page failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
            },
          ],
          isError: true,
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `rename_page failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ─── set_current_page ────────────────────────────────────────

  server.tool(
    'set_current_page',
    'Switch to a different page. All subsequent build_scene and read operations will target this page. Get page IDs from get_document_info.',
    {
      pageId: z.string().describe('The ID of the page to switch to'),
    },
    async (params) => {
      if (!isPluginConnected()) return NOT_CONNECTED;

      try {
        const response = await sendToPlugin(
          {
            type: 'set_current_page',
            pageId: params.pageId,
          },
          TIMEOUT,
        );

        if (response.type === 'result' && response.success) {
          const data = response.data as { id: string; name: string };
          return {
            content: [{ type: 'text' as const, text: `Switched to page ${data.name} (id: ${data.id})` }],
          };
        }
        return {
          content: [
            {
              type: 'text' as const,
              text: `set_current_page failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
            },
          ],
          isError: true,
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `set_current_page failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
