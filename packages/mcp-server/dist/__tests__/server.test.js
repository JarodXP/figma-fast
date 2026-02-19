"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const inMemory_js_1 = require("@modelcontextprotocol/sdk/inMemory.js");
const ping_js_1 = require("../tools/ping.js");
const build_scene_js_1 = require("../tools/build-scene.js");
const read_tools_js_1 = require("../tools/read-tools.js");
const edit_tools_js_1 = require("../tools/edit-tools.js");
const component_tools_js_1 = require("../tools/component-tools.js");
// TEST-NF-001: MCP server starts and registers all 16 tools
(0, vitest_1.describe)('MCP server tool registration', () => {
    let server;
    let client;
    (0, vitest_1.afterEach)(async () => {
        // Close connections to clean up
        try {
            await client?.close();
        }
        catch {
            // Ignore cleanup errors
        }
    });
    (0, vitest_1.it)('registers exactly 16 tools with correct names', async () => {
        server = new mcp_js_1.McpServer({
            name: 'figma-fast-test',
            version: '0.1.0',
        });
        (0, ping_js_1.registerPingTool)(server);
        (0, build_scene_js_1.registerBuildSceneTool)(server);
        (0, read_tools_js_1.registerReadTools)(server);
        (0, edit_tools_js_1.registerEditTools)(server);
        (0, component_tools_js_1.registerComponentTools)(server);
        const [clientTransport, serverTransport] = inMemory_js_1.InMemoryTransport.createLinkedPair();
        await server.connect(serverTransport);
        client = new index_js_1.Client({ name: 'test-client', version: '0.1.0' }, { capabilities: {} });
        await client.connect(clientTransport);
        const { tools } = await client.listTools();
        const expectedTools = [
            'ping',
            'build_scene',
            'get_document_info',
            'get_node_info',
            'get_selection',
            'get_styles',
            'get_local_components',
            'get_library_components',
            'export_node_as_image',
            'modify_node',
            'delete_nodes',
            'move_node',
            'clone_node',
            'convert_to_component',
            'combine_as_variants',
            'manage_component_properties',
        ];
        (0, vitest_1.expect)(tools).toHaveLength(16);
        const toolNames = tools.map((t) => t.name);
        for (const expected of expectedTools) {
            (0, vitest_1.expect)(toolNames, `Expected tool "${expected}" to be registered`).toContain(expected);
        }
    });
});
//# sourceMappingURL=server.test.js.map