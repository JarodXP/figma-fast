"use strict";
/**
 * Page management MCP tools — create, rename, and switch pages in Figma.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPageTools = registerPageTools;
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
function registerPageTools(server) {
    // ─── create_page ─────────────────────────────────────────────
    server.tool('create_page', "Create a new page in the Figma document. Returns the new page's ID and name.", {
        name: zod_1.z.string().describe('Name for the new page'),
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'create_page',
                name: params.name,
            }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                const data = response.data;
                return {
                    content: [{ type: 'text', text: `Created page ${data.name} (id: ${data.id})` }],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `create_page failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
                    },
                ],
                isError: true,
            };
        }
        catch (err) {
            return {
                content: [
                    { type: 'text', text: `create_page failed: ${err instanceof Error ? err.message : String(err)}` },
                ],
                isError: true,
            };
        }
    });
    // ─── rename_page ─────────────────────────────────────────────
    server.tool('rename_page', 'Rename an existing page. Get page IDs from get_document_info.', {
        pageId: zod_1.z.string().describe('The ID of the page to rename'),
        name: zod_1.z.string().describe('New name for the page'),
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'rename_page',
                pageId: params.pageId,
                name: params.name,
            }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                const data = response.data;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Renamed page from ${data.oldName} to ${data.name} (id: ${data.id})`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `rename_page failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
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
                        text: `rename_page failed: ${err instanceof Error ? err.message : String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // ─── set_current_page ────────────────────────────────────────
    server.tool('set_current_page', 'Switch to a different page. All subsequent build_scene and read operations will target this page. Get page IDs from get_document_info.', {
        pageId: zod_1.z.string().describe('The ID of the page to switch to'),
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'set_current_page',
                pageId: params.pageId,
            }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                const data = response.data;
                return {
                    content: [{ type: 'text', text: `Switched to page ${data.name} (id: ${data.id})` }],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `set_current_page failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
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
                        text: `set_current_page failed: ${err instanceof Error ? err.message : String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=page-tools.js.map