"use strict";
/**
 * Boolean operation MCP tool — combine shapes using boolean set operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBooleanTools = registerBooleanTools;
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
function registerBooleanTools(server) {
    // ─── boolean_operation ───────────────────────────────────────
    server.tool('boolean_operation', `Combine two or more shapes using a boolean operation. All nodes must share the same parent. The original nodes are consumed and replaced by the result.

Operations:
- UNION: Combines all shapes into one (add)
- SUBTRACT: Removes subsequent shapes from the first (cut)
- INTERSECT: Keeps only the overlapping area
- EXCLUDE: Keeps everything except the overlapping area (XOR)

Example — subtract a circle from a rectangle:
{ "operation": "SUBTRACT", "nodeIds": ["rectangle-id", "circle-id"] }`, {
        operation: zod_1.z.enum(['UNION', 'SUBTRACT', 'INTERSECT', 'EXCLUDE']).describe('Boolean operation type'),
        nodeIds: zod_1.z
            .array(zod_1.z.string())
            .min(2)
            .describe('Node IDs to combine. Order matters for SUBTRACT (first node is the base).'),
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'boolean_operation',
                operation: params.operation,
                nodeIds: params.nodeIds,
            }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                const data = response.data;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Boolean ${data.operation}: created ${data.type} ${data.name} (id: ${data.resultNodeId}) from ${data.inputCount} nodes`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `boolean_operation failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
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
                        text: `boolean_operation failed: ${err instanceof Error ? err.message : String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=boolean-tools.js.map