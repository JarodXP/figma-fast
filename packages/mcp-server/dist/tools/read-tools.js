"use strict";
/**
 * Read MCP tools — inspect the Figma canvas, styles, components, and export images.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerReadTools = registerReadTools;
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
function registerReadTools(server) {
    // ─── get_document_info ───────────────────────────────────────
    server.tool('get_document_info', 'Get an overview of the current Figma document: page list, current page, and top-level frames. Call this first to orient yourself in the document.', {}, async () => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({ type: 'get_document_info' }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                return {
                    content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
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
                        text: `get_document_info failed: ${err instanceof Error ? err.message : String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // ─── get_node_info ───────────────────────────────────────────
    server.tool('get_node_info', 'Get detailed properties of a Figma node by ID. Returns fills, strokes, effects, text properties, auto-layout settings, and children. Use depth to control how many levels of children to include (default 1). Use depth=0 for just the node with child summaries.', {
        nodeId: zod_1.z.string().describe('The Figma node ID (e.g. "123:456")'),
        depth: zod_1.z
            .number()
            .int()
            .min(0)
            .max(10)
            .optional()
            .describe('How many levels of children to include with full properties (default 1). 0 = child summaries only.'),
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'get_node_info',
                nodeId: params.nodeId,
                depth: params.depth,
            }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                return {
                    content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
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
                        text: `get_node_info failed: ${err instanceof Error ? err.message : String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // ─── get_selection ───────────────────────────────────────────
    server.tool('get_selection', 'Get the currently selected nodes in Figma. Returns a list of selected nodes with their basic properties. Useful for understanding what the user is looking at.', {}, async () => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({ type: 'get_selection' }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                return {
                    content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
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
                        text: `get_selection failed: ${err instanceof Error ? err.message : String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // ─── get_styles ──────────────────────────────────────────────
    server.tool('get_styles', 'Get all local paint styles, text styles, and effect styles defined in this Figma file. Useful for applying consistent design tokens.', {}, async () => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({ type: 'get_styles' }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                return {
                    content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
                    },
                ],
                isError: true,
            };
        }
        catch (err) {
            return {
                content: [
                    { type: 'text', text: `get_styles failed: ${err instanceof Error ? err.message : String(err)}` },
                ],
                isError: true,
            };
        }
    });
    // ─── get_local_components ────────────────────────────────────
    server.tool('get_local_components', 'Get all local components defined in this Figma file. Returns component IDs, names, keys, and descriptions. Use the component key with COMPONENT_INSTANCE in build_scene to create instances.', {}, async () => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({ type: 'get_local_components' }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                return {
                    content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
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
                        text: `get_local_components failed: ${err instanceof Error ? err.message : String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // ─── get_library_components ──────────────────────────────────
    server.tool('get_library_components', `Search for published components in a Figma library file via the REST API. Returns component names, keys, and descriptions. Use the returned key with COMPONENT_INSTANCE's componentKey in build_scene to create instances.

Requires FIGMA_API_TOKEN environment variable to be set.

Provide the fileKey of the library file (from its URL: figma.com/design/<fileKey>/...). Use query to filter results by component name.

Example: { "fileKey": "abc123XYZ", "query": "pencil" }`, {
        fileKey: zod_1.z.string().describe('The Figma file key of the library (from the file URL)'),
        query: zod_1.z.string().optional().describe('Filter component names (case-insensitive substring match)'),
    }, async (params) => {
        const token = process.env.FIGMA_API_TOKEN;
        if (!token) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'FIGMA_API_TOKEN environment variable is not set. Set it to a Figma personal access token.',
                    },
                ],
                isError: true,
            };
        }
        try {
            const url = `https://api.figma.com/v1/files/${params.fileKey}/components`;
            const resp = await fetch(url, {
                headers: { 'X-Figma-Token': token },
            });
            if (!resp.ok) {
                const body = await resp.text();
                return {
                    content: [{ type: 'text', text: `Figma API error (${resp.status}): ${body}` }],
                    isError: true,
                };
            }
            const data = (await resp.json());
            let components = data.meta.components;
            if (params.query) {
                const lower = params.query.toLowerCase();
                components = components.filter((c) => c.name.toLowerCase().includes(lower));
            }
            const result = {
                count: components.length,
                components: components.map((c) => ({
                    name: c.name,
                    key: c.key,
                    description: c.description,
                    containingFrame: c.containing_frame?.name,
                })),
            };
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
        }
        catch (err) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `get_library_components failed: ${err instanceof Error ? err.message : String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // ─── export_node_as_image ────────────────────────────────────
    server.tool('export_node_as_image', 'Export a Figma node as an image (PNG, SVG, JPG, or PDF). For PNG/JPG, returns the image as a viewable image. For SVG, returns the SVG source as text. Use this to visually inspect designs.', {
        nodeId: zod_1.z.string().describe('The Figma node ID to export'),
        format: zod_1.z.enum(['PNG', 'SVG', 'JPG', 'PDF']).optional().describe('Export format (default PNG)'),
        scale: zod_1.z.number().min(0.01).max(4).optional().describe('Export scale multiplier (default 1). Use 2 for retina.'),
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const format = params.format ?? 'PNG';
            const scale = params.scale ?? 1;
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'export_node',
                nodeId: params.nodeId,
                format,
                scale,
            }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                const data = response.data;
                // SVG: return as text content
                if (format === 'SVG') {
                    // Decode base64 SVG to text
                    const svgText = Buffer.from(data.base64, 'base64').toString('utf-8');
                    return {
                        content: [{ type: 'text', text: svgText }],
                    };
                }
                // PNG/JPG: return as MCP image content
                const mimeType = format === 'JPG' ? 'image/jpeg' : format === 'PDF' ? 'application/pdf' : 'image/png';
                return {
                    content: [
                        {
                            type: 'image',
                            data: data.base64,
                            mimeType,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `Export failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
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
                        text: `export_node_as_image failed: ${err instanceof Error ? err.message : String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=read-tools.js.map