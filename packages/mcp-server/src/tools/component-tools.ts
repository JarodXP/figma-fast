/**
 * Component lifecycle MCP tools — convert_to_component, combine_as_variants, manage_component_properties.
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

export function registerComponentTools(server: McpServer): void {
  // ─── convert_to_component ───────────────────────────────────

  server.tool(
    'convert_to_component',
    `Convert an existing Figma frame or group into a Component. The node keeps all its properties and children but becomes a reusable component.

Example: { "nodeId": "123:456" }`,
    {
      nodeId: z.string().describe('The Figma node ID of the frame/group to convert'),
    },
    async (params) => {
      if (!isPluginConnected()) return NOT_CONNECTED;

      try {
        const response = await sendToPlugin(
          {
            type: 'convert_to_component',
            nodeId: params.nodeId,
          },
          TIMEOUT,
        );

        if (response.type === 'result' && response.success) {
          const data = response.data as { componentId: string; componentKey: string; name: string };
          return {
            content: [
              {
                type: 'text' as const,
                text: `Converted to Component "${data.name}"\nComponent ID: ${data.componentId}\nComponent key: ${data.componentKey}`,
              },
            ],
          };
        }
        return {
          content: [
            {
              type: 'text' as const,
              text: `Convert failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
            },
          ],
          isError: true,
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `convert_to_component failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ─── combine_as_variants ────────────────────────────────────

  server.tool(
    'combine_as_variants',
    `Combine multiple existing Component nodes into a Component Set (variant group). All provided nodes must already be Components. The resulting Component Set contains them as variants.

Component names should follow the "Property1=Value1, Property2=Value2" naming convention for proper variant properties.

Example: { "nodeIds": ["123:1", "123:2", "123:3"], "name": "Button" }`,
    {
      nodeIds: z.array(z.string()).min(2).describe('Array of Component node IDs to combine as variants'),
      name: z.string().optional().describe('Name for the resulting Component Set'),
    },
    async (params) => {
      if (!isPluginConnected()) return NOT_CONNECTED;

      try {
        const response = await sendToPlugin(
          {
            type: 'combine_as_variants',
            nodeIds: params.nodeIds,
            name: params.name,
          },
          TIMEOUT,
        );

        if (response.type === 'result' && response.success) {
          const data = response.data as {
            componentSetId: string;
            componentSetKey: string;
            name: string;
            variantCount: number;
          };
          return {
            content: [
              {
                type: 'text' as const,
                text: `Created Component Set "${data.name}" with ${data.variantCount} variants\nComponent Set ID: ${data.componentSetId}\nComponent Set key: ${data.componentSetKey}`,
              },
            ],
          };
        }
        return {
          content: [
            {
              type: 'text' as const,
              text: `Combine failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
            },
          ],
          isError: true,
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `combine_as_variants failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ─── manage_component_properties ────────────────────────────

  server.tool(
    'manage_component_properties',
    `Add, update, or delete component property definitions on a Component or Component Set. This manages the property definitions (not values on instances).

Supported property types: BOOLEAN, TEXT, INSTANCE_SWAP, VARIANT.

Example — add a boolean property:
{ "componentId": "123:456", "action": "add", "properties": [{ "name": "Show Icon", "type": "BOOLEAN", "defaultValue": true }] }

Example — delete properties:
{ "componentId": "123:456", "action": "delete", "properties": [{ "name": "Show Icon", "type": "BOOLEAN", "defaultValue": true }] }`,
    {
      componentId: z.string().describe('The Component or Component Set node ID'),
      action: z.enum(['add', 'update', 'delete']).describe('Action to perform on the properties'),
      properties: z
        .array(
          z.object({
            name: z.string().describe('Property name'),
            type: z.enum(['BOOLEAN', 'TEXT', 'INSTANCE_SWAP', 'VARIANT']).describe('Property type'),
            defaultValue: z.union([z.string(), z.boolean()]).describe('Default value for the property'),
            variantOptions: z.array(z.string()).optional().describe('Options for VARIANT type properties'),
          }),
        )
        .min(1)
        .describe('Property definitions to add/update/delete'),
    },
    async (params) => {
      if (!isPluginConnected()) return NOT_CONNECTED;

      try {
        const response = await sendToPlugin(
          {
            type: 'manage_component_properties',
            componentId: params.componentId,
            action: params.action,
            properties: params.properties,
          },
          TIMEOUT,
        );

        if (response.type === 'result' && response.success) {
          const data = response.data as {
            componentId: string;
            name: string;
            action: string;
            propertiesModified: number;
          };
          return {
            content: [
              {
                type: 'text' as const,
                text: `${data.action} ${data.propertiesModified} properties on "${data.name}" (${data.componentId})`,
              },
            ],
          };
        }
        return {
          content: [
            {
              type: 'text' as const,
              text: `Manage properties failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
            },
          ],
          isError: true,
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `manage_component_properties failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
