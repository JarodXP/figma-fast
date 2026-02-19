"use strict";
/**
 * FigmaFast MCP Server entry point.
 * Starts a stdio MCP server with an embedded WebSocket server.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const server_js_1 = require("./ws/server.js");
const ping_js_1 = require("./tools/ping.js");
const build_scene_js_1 = require("./tools/build-scene.js");
const read_tools_js_1 = require("./tools/read-tools.js");
const edit_tools_js_1 = require("./tools/edit-tools.js");
const component_tools_js_1 = require("./tools/component-tools.js");
const page_tools_js_1 = require("./tools/page-tools.js");
const style_tools_js_1 = require("./tools/style-tools.js");
const image_tools_js_1 = require("./tools/image-tools.js");
const boolean_tools_js_1 = require("./tools/boolean-tools.js");
const WS_PORT = parseInt(process.env.FIGMA_FAST_PORT || '3056', 10);
// Create MCP server
const server = new mcp_js_1.McpServer({
    name: 'figma-fast',
    version: '0.1.0',
});
// Register tools
(0, ping_js_1.registerPingTool)(server);
(0, build_scene_js_1.registerBuildSceneTool)(server);
(0, read_tools_js_1.registerReadTools)(server);
(0, edit_tools_js_1.registerEditTools)(server);
(0, component_tools_js_1.registerComponentTools)(server);
(0, page_tools_js_1.registerPageTools)(server);
(0, style_tools_js_1.registerStyleTools)(server);
(0, image_tools_js_1.registerImageTools)(server);
(0, boolean_tools_js_1.registerBooleanTools)(server);
// Start embedded WebSocket server
(0, server_js_1.startWsServer)(WS_PORT);
// Connect via stdio transport
const transport = new stdio_js_1.StdioServerTransport();
server
    .connect(transport)
    .then(() => {
    console.error(`[FigmaFast] MCP server running (stdio), WebSocket on port ${WS_PORT}`);
})
    .catch((err) => {
    console.error('[FigmaFast] Failed to start MCP server:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map