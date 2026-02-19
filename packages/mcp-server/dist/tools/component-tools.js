"use strict";
/**
 * Component lifecycle MCP tools — convert_to_component, combine_as_variants, manage_component_properties.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerComponentTools = registerComponentTools;
const zod_1 = require("zod");
const server_js_1 = require("../ws/server.js");
const NOT_CONNECTED = {
    content: [
        {
            type: 'text',
            text: 'Figma plugin is not connected. Open the FigmaFast plugin in Figma.',
        },
    ],
    isError: true,
};
const TIMEOUT = 30_000;
// ─── Tool Registration ─────────────────────────────────────────
function registerComponentTools(server) {
    // ─── convert_to_component ───────────────────────────────────
    server.tool('convert_to_component', `Convert an existing Figma frame or group into a Component. The node keeps all its properties and children but becomes a reusable component.

Example: { "nodeId": "123:456" }`, {
        nodeId: zod_1.z.string().describe('The Figma node ID of the frame/group to convert'),
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'convert_to_component',
                nodeId: params.nodeId,
            }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                const data = response.data;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Converted to Component "${data.name}"\nComponent ID: ${data.componentId}\nComponent key: ${data.componentKey}`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `Convert failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
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
                        text: `convert_to_component failed: ${err instanceof Error ? err.message : String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // ─── combine_as_variants ────────────────────────────────────
    server.tool('combine_as_variants', `Combine multiple existing Component nodes into a Component Set (variant group). All provided nodes must already be Components. The resulting Component Set contains them as variants.

Component names should follow the "Property1=Value1, Property2=Value2" naming convention for proper variant properties.

Example: { "nodeIds": ["123:1", "123:2", "123:3"], "name": "Button" }`, {
        nodeIds: zod_1.z.array(zod_1.z.string()).min(2).describe('Array of Component node IDs to combine as variants'),
        name: zod_1.z.string().optional().describe('Name for the resulting Component Set'),
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'combine_as_variants',
                nodeIds: params.nodeIds,
                name: params.name,
            }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                const data = response.data;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Created Component Set "${data.name}" with ${data.variantCount} variants\nComponent Set ID: ${data.componentSetId}\nComponent Set key: ${data.componentSetKey}`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `Combine failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
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
                        text: `combine_as_variants failed: ${err instanceof Error ? err.message : String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // ─── manage_component_properties ────────────────────────────
    server.tool('manage_component_properties', `Add, update, or delete component property definitions on a Component or Component Set. This manages the property definitions (not values on instances).

Supported property types: BOOLEAN, TEXT, INSTANCE_SWAP, VARIANT.

Example — add a boolean property:
{ "componentId": "123:456", "action": "add", "properties": [{ "name": "Show Icon", "type": "BOOLEAN", "defaultValue": true }] }

Example — delete properties:
{ "componentId": "123:456", "action": "delete", "properties": [{ "name": "Show Icon", "type": "BOOLEAN", "defaultValue": true }] }`, {
        componentId: zod_1.z.string().describe('The Component or Component Set node ID'),
        action: zod_1.z.enum(['add', 'update', 'delete']).describe('Action to perform on the properties'),
        properties: zod_1.z
            .array(zod_1.z.object({
            name: zod_1.z.string().describe('Property name'),
            type: zod_1.z.enum(['BOOLEAN', 'TEXT', 'INSTANCE_SWAP', 'VARIANT']).describe('Property type'),
            defaultValue: zod_1.z.union([zod_1.z.string(), zod_1.z.boolean()]).describe('Default value for the property'),
            variantOptions: zod_1.z.array(zod_1.z.string()).optional().describe('Options for VARIANT type properties'),
        }))
            .min(1)
            .describe('Property definitions to add/update/delete'),
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'manage_component_properties',
                componentId: params.componentId,
                action: params.action,
                properties: params.properties,
            }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                const data = response.data;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `${data.action} ${data.propertiesModified} properties on "${data.name}" (${data.componentId})`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `Manage properties failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
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
                        text: `manage_component_properties failed: ${err instanceof Error ? err.message : String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=component-tools.js.map