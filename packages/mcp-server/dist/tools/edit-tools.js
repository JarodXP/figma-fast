"use strict";
/**
 * Edit MCP tools — modify, delete, move, and clone existing Figma nodes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerEditTools = registerEditTools;
const zod_1 = require("zod");
const server_js_1 = require("../ws/server.js");
const NOT_CONNECTED = {
    content: [{
            type: 'text',
            text: 'Figma plugin is not connected. Open the FigmaFast plugin in Figma.',
        }],
    isError: true,
};
const TIMEOUT = 30_000;
// ─── Shared property schemas (subset of SceneNode for modify) ──
const FillSchema = zod_1.z.object({
    type: zod_1.z.enum(['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND', 'IMAGE']),
    color: zod_1.z.string().optional(),
    opacity: zod_1.z.number().min(0).max(1).optional(),
    visible: zod_1.z.boolean().optional(),
    gradientStops: zod_1.z.array(zod_1.z.object({ position: zod_1.z.number(), color: zod_1.z.string() })).optional(),
    gradientTransform: zod_1.z.tuple([
        zod_1.z.tuple([zod_1.z.number(), zod_1.z.number(), zod_1.z.number()]),
        zod_1.z.tuple([zod_1.z.number(), zod_1.z.number(), zod_1.z.number()]),
    ]).optional(),
    scaleMode: zod_1.z.enum(['FILL', 'FIT', 'CROP', 'TILE']).optional(),
});
const StrokeSchema = zod_1.z.object({
    type: zod_1.z.enum(['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND', 'IMAGE']).optional(),
    color: zod_1.z.string(),
    weight: zod_1.z.number(),
    align: zod_1.z.enum(['INSIDE', 'OUTSIDE', 'CENTER']).optional(),
    opacity: zod_1.z.number().min(0).max(1).optional(),
    dashPattern: zod_1.z.array(zod_1.z.number()).optional(),
});
const EffectSchema = zod_1.z.object({
    type: zod_1.z.enum(['DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR']),
    color: zod_1.z.string().optional(),
    offset: zod_1.z.object({ x: zod_1.z.number(), y: zod_1.z.number() }).optional(),
    radius: zod_1.z.number(),
    spread: zod_1.z.number().optional(),
    visible: zod_1.z.boolean().optional(),
    opacity: zod_1.z.number().min(0).max(1).optional(),
});
const LineHeightSchema = zod_1.z.object({
    value: zod_1.z.number(),
    unit: zod_1.z.enum(['PIXELS', 'PERCENT', 'AUTO']),
});
const ModifyPropertiesSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    x: zod_1.z.number().optional(),
    y: zod_1.z.number().optional(),
    width: zod_1.z.number().optional(),
    height: zod_1.z.number().optional(),
    fills: zod_1.z.array(FillSchema).optional(),
    strokes: zod_1.z.array(StrokeSchema).optional(),
    effects: zod_1.z.array(EffectSchema).optional(),
    opacity: zod_1.z.number().min(0).max(1).optional(),
    cornerRadius: zod_1.z.union([zod_1.z.number(), zod_1.z.tuple([zod_1.z.number(), zod_1.z.number(), zod_1.z.number(), zod_1.z.number()])]).optional(),
    clipsContent: zod_1.z.boolean().optional(),
    visible: zod_1.z.boolean().optional(),
    locked: zod_1.z.boolean().optional(),
    // Auto-layout
    layoutMode: zod_1.z.enum(['HORIZONTAL', 'VERTICAL', 'NONE']).optional(),
    primaryAxisAlignItems: zod_1.z.enum(['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN']).optional(),
    counterAxisAlignItems: zod_1.z.enum(['MIN', 'CENTER', 'MAX']).optional(),
    itemSpacing: zod_1.z.number().optional(),
    padding: zod_1.z.union([zod_1.z.number(), zod_1.z.tuple([zod_1.z.number(), zod_1.z.number(), zod_1.z.number(), zod_1.z.number()])]).optional(),
    layoutSizingHorizontal: zod_1.z.enum(['FIXED', 'HUG', 'FILL']).optional(),
    layoutSizingVertical: zod_1.z.enum(['FIXED', 'HUG', 'FILL']).optional(),
    // Text
    characters: zod_1.z.string().optional(),
    fontSize: zod_1.z.number().optional(),
    fontFamily: zod_1.z.string().optional(),
    fontWeight: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional(),
    textAlignHorizontal: zod_1.z.enum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']).optional(),
    textAlignVertical: zod_1.z.enum(['TOP', 'CENTER', 'BOTTOM']).optional(),
    textAutoResize: zod_1.z.enum(['WIDTH_AND_HEIGHT', 'HEIGHT', 'NONE', 'TRUNCATE']).optional(),
    lineHeight: zod_1.z.union([zod_1.z.number(), LineHeightSchema]).optional(),
    letterSpacing: zod_1.z.number().optional(),
    textDecoration: zod_1.z.enum(['NONE', 'UNDERLINE', 'STRIKETHROUGH']).optional(),
    textCase: zod_1.z.enum(['ORIGINAL', 'UPPER', 'LOWER', 'TITLE']).optional(),
}).describe('Properties to update on the node');
// ─── Tool Registration ─────────────────────────────────────────
function registerEditTools(server) {
    // ─── modify_node ─────────────────────────────────────────────
    server.tool('modify_node', `Modify properties of an existing Figma node. Use this for surgical edits to a single node — changing fills, text, size, position, auto-layout, etc. For creating new UI, prefer build_scene instead.

COLORS: Use hex strings (#RGB, #RRGGBB, or #RRGGBBAA).
TEXT: Font is automatically loaded before changes are applied.

Example — change a rectangle's fill to blue:
{ "nodeId": "123:456", "properties": { "fills": [{"type": "SOLID", "color": "#2563EB"}] } }

Example — update text content and size:
{ "nodeId": "123:789", "properties": { "characters": "New Title", "fontSize": 24, "fontWeight": 700 } }`, {
        nodeId: zod_1.z.string().describe('The Figma node ID to modify'),
        properties: ModifyPropertiesSchema,
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'modify_node',
                nodeId: params.nodeId,
                properties: params.properties,
            }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                const data = response.data;
                let text = `Modified ${data.type} "${data.name}" (${data.nodeId})`;
                if (data.errors.length > 0) {
                    text += `\n\nWarnings:\n${data.errors.map(e => `  - ${e}`).join('\n')}`;
                }
                return { content: [{ type: 'text', text }] };
            }
            return {
                content: [{ type: 'text', text: `Modify failed: ${response.type === 'result' ? response.error : 'Unexpected response'}` }],
                isError: true,
            };
        }
        catch (err) {
            return {
                content: [{ type: 'text', text: `modify_node failed: ${err instanceof Error ? err.message : String(err)}` }],
                isError: true,
            };
        }
    });
    // ─── delete_nodes ────────────────────────────────────────────
    server.tool('delete_nodes', 'Delete one or more Figma nodes by their IDs. Returns the count of successfully deleted nodes.', {
        nodeIds: zod_1.z.array(zod_1.z.string()).min(1).describe('Array of Figma node IDs to delete'),
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'delete_nodes',
                nodeIds: params.nodeIds,
            }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                const data = response.data;
                let text = `Deleted ${data.deleted}/${data.requested} nodes.`;
                if (data.errors.length > 0) {
                    text += `\n\nErrors:\n${data.errors.map(e => `  - ${e}`).join('\n')}`;
                }
                return { content: [{ type: 'text', text }] };
            }
            return {
                content: [{ type: 'text', text: `Delete failed: ${response.type === 'result' ? response.error : 'Unexpected response'}` }],
                isError: true,
            };
        }
        catch (err) {
            return {
                content: [{ type: 'text', text: `delete_nodes failed: ${err instanceof Error ? err.message : String(err)}` }],
                isError: true,
            };
        }
    });
    // ─── move_node ───────────────────────────────────────────────
    server.tool('move_node', 'Move a Figma node to a new position and/or reparent it under a different parent. Provide x/y to reposition, parentId to reparent, and index to control insertion order within the new parent.', {
        nodeId: zod_1.z.string().describe('The Figma node ID to move'),
        x: zod_1.z.number().optional().describe('New x position'),
        y: zod_1.z.number().optional().describe('New y position'),
        parentId: zod_1.z.string().optional().describe('New parent node ID (reparents the node)'),
        index: zod_1.z.number().int().min(0).optional().describe('Insertion index within the new parent (default: append to end)'),
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'move_node',
                nodeId: params.nodeId,
                x: params.x,
                y: params.y,
                parentId: params.parentId,
                index: params.index,
            }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                const data = response.data;
                let text = `Moved "${data.name}" to (${data.x}, ${data.y})`;
                if (data.parentId)
                    text += ` under parent ${data.parentId}`;
                return { content: [{ type: 'text', text }] };
            }
            return {
                content: [{ type: 'text', text: `Move failed: ${response.type === 'result' ? response.error : 'Unexpected response'}` }],
                isError: true,
            };
        }
        catch (err) {
            return {
                content: [{ type: 'text', text: `move_node failed: ${err instanceof Error ? err.message : String(err)}` }],
                isError: true,
            };
        }
    });
    // ─── clone_node ──────────────────────────────────────────────
    server.tool('clone_node', 'Clone (duplicate) a Figma node. Returns the new node\'s ID. The clone is placed next to the original.', {
        nodeId: zod_1.z.string().describe('The Figma node ID to clone'),
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'clone_node',
                nodeId: params.nodeId,
            }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                const data = response.data;
                return {
                    content: [{
                            type: 'text',
                            text: `Cloned ${data.type} "${data.name}"\nOriginal: ${data.originalId}\nClone: ${data.newNodeId}`,
                        }],
                };
            }
            return {
                content: [{ type: 'text', text: `Clone failed: ${response.type === 'result' ? response.error : 'Unexpected response'}` }],
                isError: true,
            };
        }
        catch (err) {
            return {
                content: [{ type: 'text', text: `clone_node failed: ${err instanceof Error ? err.message : String(err)}` }],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=edit-tools.js.map