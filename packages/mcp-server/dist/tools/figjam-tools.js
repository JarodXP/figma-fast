"use strict";
/**
 * FigJam MCP tools — create FigJam-specific nodes and read timer state.
 * These tools only work when the plugin is running in a FigJam file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFigjamTools = registerFigjamTools;
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
function registerFigjamTools(server) {
    // ─── jam_create_sticky ───────────────────────────────────────
    server.tool('jam_create_sticky', 'Create a sticky note in FigJam.', {
        text: zod_1.z.string().describe('Text content for the sticky note'),
        color: schemas_js_1.JamStickyColorSchema,
        width: zod_1.z.number().positive().optional().describe('Width of the sticky note in pixels'),
        height: zod_1.z.number().positive().optional().describe('Height of the sticky note in pixels'),
        x: zod_1.z.number().optional().describe('X position on the canvas'),
        y: zod_1.z.number().optional().describe('Y position on the canvas'),
        parentId: zod_1.z.string().optional().describe('Parent node ID to append to'),
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'jam_create_sticky',
                text: params.text,
                color: params.color,
                width: params.width,
                height: params.height,
                x: params.x,
                y: params.y,
                parentId: params.parentId,
            }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                const data = response.data;
                return {
                    content: [{ type: 'text', text: `Created sticky "${data.name}" (${data.nodeId})` }],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `jam_create_sticky failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
                    },
                ],
                isError: true,
            };
        }
        catch (err) {
            return {
                content: [
                    { type: 'text', text: `jam_create_sticky failed: ${err instanceof Error ? err.message : String(err)}` },
                ],
                isError: true,
            };
        }
    });
    // ─── jam_create_connector ────────────────────────────────────
    server.tool('jam_create_connector', 'Create a connector between nodes in FigJam.', {
        startNodeId: zod_1.z.string().optional().describe('Node ID for the connector start endpoint'),
        endNodeId: zod_1.z.string().optional().describe('Node ID for the connector end endpoint'),
        startPosition: zod_1.z
            .object({ x: zod_1.z.number(), y: zod_1.z.number() })
            .optional()
            .describe('Canvas position for the start endpoint (used when startNodeId is not set)'),
        endPosition: zod_1.z
            .object({ x: zod_1.z.number(), y: zod_1.z.number() })
            .optional()
            .describe('Canvas position for the end endpoint (used when endNodeId is not set)'),
        startStrokeCap: schemas_js_1.JamConnectorStrokeCapSchema,
        endStrokeCap: schemas_js_1.JamConnectorStrokeCapSchema,
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'jam_create_connector',
                startNodeId: params.startNodeId,
                endNodeId: params.endNodeId,
                startPosition: params.startPosition,
                endPosition: params.endPosition,
                startStrokeCap: params.startStrokeCap,
                endStrokeCap: params.endStrokeCap,
            }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                const data = response.data;
                return {
                    content: [{ type: 'text', text: `Created connector "${data.name}" (${data.nodeId})` }],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `jam_create_connector failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
                    },
                ],
                isError: true,
            };
        }
        catch (err) {
            return {
                content: [
                    { type: 'text', text: `jam_create_connector failed: ${err instanceof Error ? err.message : String(err)}` },
                ],
                isError: true,
            };
        }
    });
    // ─── jam_create_shape ────────────────────────────────────────
    server.tool('jam_create_shape', 'Create a shape with text in FigJam.', {
        shapeType: schemas_js_1.JamShapeTypeSchema,
        text: zod_1.z.string().optional().describe('Text content inside the shape'),
        x: zod_1.z.number().optional().describe('X position on the canvas'),
        y: zod_1.z.number().optional().describe('Y position on the canvas'),
        parentId: zod_1.z.string().optional().describe('Parent node ID to append to'),
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'jam_create_shape',
                shapeType: params.shapeType,
                text: params.text,
                x: params.x,
                y: params.y,
                parentId: params.parentId,
            }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                const data = response.data;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Created ${data.shapeType} shape "${data.name}" (${data.nodeId})`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `jam_create_shape failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
                    },
                ],
                isError: true,
            };
        }
        catch (err) {
            return {
                content: [
                    { type: 'text', text: `jam_create_shape failed: ${err instanceof Error ? err.message : String(err)}` },
                ],
                isError: true,
            };
        }
    });
    // ─── jam_create_code_block ───────────────────────────────────
    server.tool('jam_create_code_block', 'Create a code block in FigJam.', {
        code: zod_1.z.string().describe('Code content for the code block'),
        language: schemas_js_1.JamCodeLanguageSchema,
        x: zod_1.z.number().optional().describe('X position on the canvas'),
        y: zod_1.z.number().optional().describe('Y position on the canvas'),
        parentId: zod_1.z.string().optional().describe('Parent node ID to append to'),
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'jam_create_code_block',
                code: params.code,
                language: params.language,
                x: params.x,
                y: params.y,
                parentId: params.parentId,
            }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                const data = response.data;
                return {
                    content: [{ type: 'text', text: `Created code block "${data.name}" (${data.nodeId})` }],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `jam_create_code_block failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
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
                        text: `jam_create_code_block failed: ${err instanceof Error ? err.message : String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // ─── jam_create_table ────────────────────────────────────────
    server.tool('jam_create_table', 'Create a table in FigJam.', {
        numRows: zod_1.z.number().int().min(1).max(100).describe('Number of rows'),
        numCols: zod_1.z.number().int().min(1).max(100).describe('Number of columns'),
        cellData: zod_1.z
            .array(zod_1.z.array(zod_1.z.string()))
            .optional()
            .describe('2D array of cell text content (row-major order)'),
        columnWidth: zod_1.z.number().positive().optional().describe('Width in pixels applied to every column via table.setColumnWidth()'),
        rowHeight: zod_1.z.number().positive().optional().describe('Height in pixels applied to every row via table.setRowHeight()'),
        fontSize: zod_1.z.number().positive().optional().describe('Font size for all cell text in pixels'),
        x: zod_1.z.number().optional().describe('X position on the canvas'),
        y: zod_1.z.number().optional().describe('Y position on the canvas'),
        parentId: zod_1.z.string().optional().describe('Parent node ID to append to'),
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'jam_create_table',
                numRows: params.numRows,
                numCols: params.numCols,
                cellData: params.cellData,
                columnWidth: params.columnWidth,
                rowHeight: params.rowHeight,
                fontSize: params.fontSize,
                x: params.x,
                y: params.y,
                parentId: params.parentId,
            }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                const data = response.data;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Created table "${data.name}" (${data.nodeId}) with ${data.numRows} rows and ${data.numColumns} columns`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `jam_create_table failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
                    },
                ],
                isError: true,
            };
        }
        catch (err) {
            return {
                content: [
                    { type: 'text', text: `jam_create_table failed: ${err instanceof Error ? err.message : String(err)}` },
                ],
                isError: true,
            };
        }
    });
    // ─── jam_get_timer ───────────────────────────────────────────
    server.tool('jam_get_timer', 'Get the FigJam timer state (read-only).', {}, async () => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({ type: 'jam_get_timer' }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                const data = response.data;
                return {
                    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `jam_get_timer failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
                    },
                ],
                isError: true,
            };
        }
        catch (err) {
            return {
                content: [
                    { type: 'text', text: `jam_get_timer failed: ${err instanceof Error ? err.message : String(err)}` },
                ],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=figjam-tools.js.map