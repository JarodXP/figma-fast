"use strict";
/**
 * Batch MCP tools — modify and read multiple Figma nodes in a single round-trip.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBatchTools = registerBatchTools;
const zod_1 = require("zod");
const server_js_1 = require("../ws/server.js");
const schemas_js_1 = require("../schemas.js");
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
function registerBatchTools(server) {
    // ─── batch_modify ──────────────────────────────────────────────
    server.tool('batch_modify', `Modify properties of multiple Figma nodes in a single round-trip. Each modification applies to one node. All changes are batched into a single undo step.

Use this instead of calling modify_node multiple times -- it is significantly more efficient for bulk edits (e.g., updating colors across many elements, repositioning multiple nodes, changing text in several labels).

Individual failures do not abort the batch -- the response shows which succeeded and which failed.

Example -- change fills on 3 nodes:
{ "modifications": [
  { "nodeId": "1:1", "properties": { "fills": [{"type": "SOLID", "color": "#FF0000"}] } },
  { "nodeId": "1:2", "properties": { "fills": [{"type": "SOLID", "color": "#00FF00"}] } },
  { "nodeId": "1:3", "properties": { "name": "Updated", "opacity": 0.8 } }
] }`, {
        modifications: zod_1.z
            .array(schemas_js_1.BatchModificationSchema)
            .min(1)
            .describe('Array of modifications to apply. Each targets a single node.'),
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'batch_modify',
                modifications: params.modifications,
            }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                const data = response.data;
                let text = `Batch modify: ${data.succeeded}/${data.total} succeeded`;
                if (data.failed > 0)
                    text += `, ${data.failed} failed`;
                // Collect all warnings and errors from results
                const allIssues = [];
                for (const r of data.results) {
                    if (r.errors.length > 0) {
                        allIssues.push(...r.errors.map((e) => `  ${r.nodeId}: ${e}`));
                    }
                }
                if (allIssues.length > 0)
                    text += `\n\nDetails:\n${allIssues.join('\n')}`;
                return { content: [{ type: 'text', text }] };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `batch_modify failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
                    },
                ],
                isError: true,
            };
        }
        catch (err) {
            return {
                content: [
                    { type: 'text', text: `batch_modify failed: ${err instanceof Error ? err.message : String(err)}` },
                ],
                isError: true,
            };
        }
    });
    // ─── batch_get_node_info ────────────────────────────────────────
    server.tool('batch_get_node_info', `Get detailed properties of multiple Figma nodes in a single round-trip. Returns the same data as get_node_info but for multiple nodes at once.

Use this instead of calling get_node_info multiple times -- especially after build_scene to verify results, or before batch_modify to inspect current state.

Individual failures (node not found) do not abort the batch.

Example: { "nodeIds": ["1:1", "1:2", "1:3"], "depth": 1 }`, {
        nodeIds: zod_1.z.array(zod_1.z.string()).min(1).describe('Array of Figma node IDs to inspect'),
        depth: zod_1.z.number().int().min(0).max(10).optional().describe('How many levels of children to include (default 1)'),
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'batch_get_node_info',
                nodeIds: params.nodeIds,
                depth: params.depth,
            }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                const data = response.data;
                const text = JSON.stringify(data, null, 2);
                return { content: [{ type: 'text', text }] };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `batch_get_node_info failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
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
                        text: `batch_get_node_info failed: ${err instanceof Error ? err.message : String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=batch-tools.js.map