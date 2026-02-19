/**
 * Ping tool — tests end-to-end connectivity with the Figma plugin.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { sendToPlugin, isPluginConnected } from '../ws/server.js';

export function registerPingTool(server: McpServer): void {
  server.tool(
    'ping',
    'Test connectivity with the Figma plugin. Returns pong if the plugin is connected and responsive.',
    {},
    async () => {
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

      const start = Date.now();

      try {
        const response = await sendToPlugin({ type: 'ping' }, 10_000);
        const rtt = Date.now() - start;

        if (response.type === 'pong') {
          return {
            content: [
              {
                type: 'text' as const,
                text: `pong (${rtt}ms round-trip)`,
              },
            ],
          };
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
              text: `Ping failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
