/**
 * Boolean operation MCP tool — combine shapes using boolean set operations.
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

export function registerBooleanTools(server: McpServer): void {
  // ─── boolean_operation ───────────────────────────────────────

  server.tool(
    'boolean_operation',
    `Combine two or more shapes using a boolean operation. All nodes must share the same parent. The original nodes are consumed and replaced by the result.

Operations:
- UNION: Combines all shapes into one (add)
- SUBTRACT: Removes subsequent shapes from the first (cut)
- INTERSECT: Keeps only the overlapping area
- EXCLUDE: Keeps everything except the overlapping area (XOR)

Example — subtract a circle from a rectangle:
{ "operation": "SUBTRACT", "nodeIds": ["rectangle-id", "circle-id"] }`,
    {
      operation: z.enum(['UNION', 'SUBTRACT', 'INTERSECT', 'EXCLUDE']).describe('Boolean operation type'),
      nodeIds: z
        .array(z.string())
        .min(2)
        .describe('Node IDs to combine. Order matters for SUBTRACT (first node is the base).'),
    },
    async (params) => {
      if (!isPluginConnected()) return NOT_CONNECTED;

      try {
        const response = await sendToPlugin(
          {
            type: 'boolean_operation',
            operation: params.operation,
            nodeIds: params.nodeIds,
          },
          TIMEOUT,
        );

        if (response.type === 'result' && response.success) {
          const data = response.data as {
            resultNodeId: string;
            name: string;
            type: string;
            operation: string;
            inputCount: number;
          };
          return {
            content: [
              {
                type: 'text' as const,
                text: `Boolean ${data.operation}: created ${data.type} ${data.name} (id: ${data.resultNodeId}) from ${data.inputCount} nodes`,
              },
            ],
          };
        }
        return {
          content: [
            {
              type: 'text' as const,
              text: `boolean_operation failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
            },
          ],
          isError: true,
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `boolean_operation failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
