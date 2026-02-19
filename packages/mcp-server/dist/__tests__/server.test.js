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
const page_tools_js_1 = require("../tools/page-tools.js");
const style_tools_js_1 = require("../tools/style-tools.js");
const image_tools_js_1 = require("../tools/image-tools.js");
const boolean_tools_js_1 = require("../tools/boolean-tools.js");
const batch_tools_js_1 = require("../tools/batch-tools.js");
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
// TEST-P7B-001, TEST-P7B-003, TEST-P7B-005, TEST-P7B-007
// Phase 7B style creation tool tests
(0, vitest_1.describe)('Phase 7B style creation tool registration', () => {
    let server;
    let client;
    (0, vitest_1.afterEach)(async () => {
        try {
            await client?.close();
        }
        catch {
            // Ignore cleanup errors
        }
    });
    async function buildFullServerWithStyles() {
        const s = new mcp_js_1.McpServer({ name: 'figma-fast-test', version: '0.1.0' });
        (0, ping_js_1.registerPingTool)(s);
        (0, build_scene_js_1.registerBuildSceneTool)(s);
        (0, read_tools_js_1.registerReadTools)(s);
        (0, edit_tools_js_1.registerEditTools)(s);
        (0, component_tools_js_1.registerComponentTools)(s);
        (0, page_tools_js_1.registerPageTools)(s);
        (0, style_tools_js_1.registerStyleTools)(s);
        const [clientTransport, serverTransport] = inMemory_js_1.InMemoryTransport.createLinkedPair();
        await s.connect(serverTransport);
        const c = new index_js_1.Client({ name: 'test-client', version: '0.1.0' }, { capabilities: {} });
        await c.connect(clientTransport);
        return { server: s, client: c };
    }
    // TEST-P7B-001: create_paint_style tool registers correctly
    (0, vitest_1.it)('registers create_paint_style tool with name and fills parameters', async () => {
        const { client: c } = await buildFullServerWithStyles();
        client = c;
        const { tools } = await client.listTools();
        const toolNames = tools.map((t) => t.name);
        (0, vitest_1.expect)(toolNames).toContain('create_paint_style');
        const tool = tools.find((t) => t.name === 'create_paint_style');
        (0, vitest_1.expect)(tool?.inputSchema?.properties).toHaveProperty('name');
        (0, vitest_1.expect)(tool?.inputSchema?.properties).toHaveProperty('fills');
    });
    // TEST-P7B-003: create_text_style tool registers correctly
    (0, vitest_1.it)('registers create_text_style tool with name and font parameters', async () => {
        const { client: c } = await buildFullServerWithStyles();
        client = c;
        const { tools } = await client.listTools();
        const toolNames = tools.map((t) => t.name);
        (0, vitest_1.expect)(toolNames).toContain('create_text_style');
        const tool = tools.find((t) => t.name === 'create_text_style');
        (0, vitest_1.expect)(tool?.inputSchema?.properties).toHaveProperty('name');
    });
    // TEST-P7B-005: create_effect_style tool registers correctly
    (0, vitest_1.it)('registers create_effect_style tool with name and effects parameters', async () => {
        const { client: c } = await buildFullServerWithStyles();
        client = c;
        const { tools } = await client.listTools();
        const toolNames = tools.map((t) => t.name);
        (0, vitest_1.expect)(toolNames).toContain('create_effect_style');
        const tool = tools.find((t) => t.name === 'create_effect_style');
        (0, vitest_1.expect)(tool?.inputSchema?.properties).toHaveProperty('name');
        (0, vitest_1.expect)(tool?.inputSchema?.properties).toHaveProperty('effects');
    });
    // TEST-P7B-007: 22 tools total after Phase 7B
    (0, vitest_1.it)('registers exactly 22 tools after Phase 7B', async () => {
        const { client: c } = await buildFullServerWithStyles();
        client = c;
        const { tools } = await client.listTools();
        (0, vitest_1.expect)(tools).toHaveLength(22);
    });
});
// TEST-P6-001, TEST-P6-003, TEST-P6-006, TEST-P6-009, TEST-P6-010
// Phase 6 page tool tests
(0, vitest_1.describe)('Phase 6 page tool registration', () => {
    let server;
    let client;
    (0, vitest_1.afterEach)(async () => {
        try {
            await client?.close();
        }
        catch {
            // Ignore cleanup errors
        }
    });
    async function buildFullServer() {
        const s = new mcp_js_1.McpServer({ name: 'figma-fast-test', version: '0.1.0' });
        (0, ping_js_1.registerPingTool)(s);
        (0, build_scene_js_1.registerBuildSceneTool)(s);
        (0, read_tools_js_1.registerReadTools)(s);
        (0, edit_tools_js_1.registerEditTools)(s);
        (0, component_tools_js_1.registerComponentTools)(s);
        (0, page_tools_js_1.registerPageTools)(s);
        const [clientTransport, serverTransport] = inMemory_js_1.InMemoryTransport.createLinkedPair();
        await s.connect(serverTransport);
        const c = new index_js_1.Client({ name: 'test-client', version: '0.1.0' }, { capabilities: {} });
        await c.connect(clientTransport);
        return { server: s, client: c };
    }
    // TEST-P6-001: create_page tool registers with correct schema
    (0, vitest_1.it)('registers create_page tool with name parameter', async () => {
        const { client: c } = await buildFullServer();
        client = c;
        const { tools } = await client.listTools();
        const toolNames = tools.map((t) => t.name);
        (0, vitest_1.expect)(toolNames).toContain('create_page');
        const tool = tools.find((t) => t.name === 'create_page');
        (0, vitest_1.expect)(tool?.inputSchema?.properties).toHaveProperty('name');
    });
    // TEST-P6-003: rename_page tool registers with correct schema
    (0, vitest_1.it)('registers rename_page tool with pageId and name parameters', async () => {
        const { client: c } = await buildFullServer();
        client = c;
        const { tools } = await client.listTools();
        const toolNames = tools.map((t) => t.name);
        (0, vitest_1.expect)(toolNames).toContain('rename_page');
        const tool = tools.find((t) => t.name === 'rename_page');
        (0, vitest_1.expect)(tool?.inputSchema?.properties).toHaveProperty('pageId');
        (0, vitest_1.expect)(tool?.inputSchema?.properties).toHaveProperty('name');
    });
    // TEST-P6-006: set_current_page tool registers with correct schema
    (0, vitest_1.it)('registers set_current_page tool with pageId parameter', async () => {
        const { client: c } = await buildFullServer();
        client = c;
        const { tools } = await client.listTools();
        const toolNames = tools.map((t) => t.name);
        (0, vitest_1.expect)(toolNames).toContain('set_current_page');
        const tool = tools.find((t) => t.name === 'set_current_page');
        (0, vitest_1.expect)(tool?.inputSchema?.properties).toHaveProperty('pageId');
    });
    // TEST-P6-010: 19 tools total after Phase 6
    (0, vitest_1.it)('registers exactly 19 tools after Phase 6', async () => {
        const { client: c } = await buildFullServer();
        client = c;
        const { tools } = await client.listTools();
        (0, vitest_1.expect)(tools).toHaveLength(19);
    });
});
// TEST-P8-001, TEST-P8-009
// Phase 8 image fill tool tests
(0, vitest_1.describe)('Phase 8 image fill tool registration', () => {
    let server;
    let client;
    (0, vitest_1.afterEach)(async () => {
        try {
            await client?.close();
        }
        catch {
            // Ignore cleanup errors
        }
    });
    async function buildFullServerWithImage() {
        const s = new mcp_js_1.McpServer({ name: 'figma-fast-test', version: '0.1.0' });
        (0, ping_js_1.registerPingTool)(s);
        (0, build_scene_js_1.registerBuildSceneTool)(s);
        (0, read_tools_js_1.registerReadTools)(s);
        (0, edit_tools_js_1.registerEditTools)(s);
        (0, component_tools_js_1.registerComponentTools)(s);
        (0, page_tools_js_1.registerPageTools)(s);
        (0, style_tools_js_1.registerStyleTools)(s);
        (0, image_tools_js_1.registerImageTools)(s);
        const [clientTransport, serverTransport] = inMemory_js_1.InMemoryTransport.createLinkedPair();
        await s.connect(serverTransport);
        const c = new index_js_1.Client({ name: 'test-client', version: '0.1.0' }, { capabilities: {} });
        await c.connect(clientTransport);
        return { server: s, client: c };
    }
    // TEST-P8-001: set_image_fill tool registers correctly
    (0, vitest_1.it)('registers set_image_fill tool with nodeId, imageUrl, and scaleMode parameters', async () => {
        const { client: c } = await buildFullServerWithImage();
        client = c;
        const { tools } = await client.listTools();
        const toolNames = tools.map((t) => t.name);
        (0, vitest_1.expect)(toolNames).toContain('set_image_fill');
        const tool = tools.find((t) => t.name === 'set_image_fill');
        (0, vitest_1.expect)(tool?.inputSchema?.properties).toHaveProperty('nodeId');
        (0, vitest_1.expect)(tool?.inputSchema?.properties).toHaveProperty('imageUrl');
    });
    // TEST-P8-009: 23 tools total after Phase 8
    (0, vitest_1.it)('registers exactly 23 tools after Phase 8', async () => {
        const { client: c } = await buildFullServerWithImage();
        client = c;
        const { tools } = await client.listTools();
        (0, vitest_1.expect)(tools).toHaveLength(23);
    });
});
// TEST-P10C-001, TEST-P10D-001, TEST-P10C-007
// Phase 10 batch tools registration tests
(0, vitest_1.describe)('Phase 10 performance tools registration', () => {
    let client;
    (0, vitest_1.afterEach)(async () => {
        try {
            await client?.close();
        }
        catch {
            // Ignore cleanup errors
        }
    });
    async function buildFullServerWithBatch() {
        const s = new mcp_js_1.McpServer({ name: 'figma-fast-test', version: '0.1.0' });
        (0, ping_js_1.registerPingTool)(s);
        (0, build_scene_js_1.registerBuildSceneTool)(s);
        (0, read_tools_js_1.registerReadTools)(s);
        (0, edit_tools_js_1.registerEditTools)(s);
        (0, component_tools_js_1.registerComponentTools)(s);
        (0, page_tools_js_1.registerPageTools)(s);
        (0, style_tools_js_1.registerStyleTools)(s);
        (0, image_tools_js_1.registerImageTools)(s);
        (0, boolean_tools_js_1.registerBooleanTools)(s);
        (0, batch_tools_js_1.registerBatchTools)(s);
        const [clientTransport, serverTransport] = inMemory_js_1.InMemoryTransport.createLinkedPair();
        await s.connect(serverTransport);
        const c = new index_js_1.Client({ name: 'test-client', version: '0.1.0' }, { capabilities: {} });
        await c.connect(clientTransport);
        return { server: s, client: c };
    }
    // TEST-P10C-001: batch_modify tool registers with modifications parameter
    (0, vitest_1.it)('registers batch_modify tool with modifications array parameter', async () => {
        const { client: c } = await buildFullServerWithBatch();
        client = c;
        const { tools } = await client.listTools();
        const toolNames = tools.map((t) => t.name);
        (0, vitest_1.expect)(toolNames).toContain('batch_modify');
        const tool = tools.find((t) => t.name === 'batch_modify');
        (0, vitest_1.expect)(tool?.inputSchema?.properties).toHaveProperty('modifications');
    });
    // TEST-P10D-001: batch_get_node_info tool registers with nodeIds and depth parameters
    (0, vitest_1.it)('registers batch_get_node_info tool with nodeIds and depth parameters', async () => {
        const { client: c } = await buildFullServerWithBatch();
        client = c;
        const { tools } = await client.listTools();
        const toolNames = tools.map((t) => t.name);
        (0, vitest_1.expect)(toolNames).toContain('batch_get_node_info');
        const tool = tools.find((t) => t.name === 'batch_get_node_info');
        (0, vitest_1.expect)(tool?.inputSchema?.properties).toHaveProperty('nodeIds');
        (0, vitest_1.expect)(tool?.inputSchema?.properties).toHaveProperty('depth');
    });
    // TEST-P10C-007: 26 tools total after Phase 10
    (0, vitest_1.it)('registers exactly 26 tools after Phase 10', async () => {
        const { client: c } = await buildFullServerWithBatch();
        client = c;
        const { tools } = await client.listTools();
        (0, vitest_1.expect)(tools).toHaveLength(26);
    });
});
// TEST-P9-001, TEST-P9-002, TEST-P9-003, TEST-P9-010
// Phase 9 boolean operation tool tests
(0, vitest_1.describe)('Phase 9 boolean operation tool registration', () => {
    let server;
    let client;
    (0, vitest_1.afterEach)(async () => {
        try {
            await client?.close();
        }
        catch {
            // Ignore cleanup errors
        }
    });
    async function buildFullServerWithBoolean() {
        const s = new mcp_js_1.McpServer({ name: 'figma-fast-test', version: '0.1.0' });
        (0, ping_js_1.registerPingTool)(s);
        (0, build_scene_js_1.registerBuildSceneTool)(s);
        (0, read_tools_js_1.registerReadTools)(s);
        (0, edit_tools_js_1.registerEditTools)(s);
        (0, component_tools_js_1.registerComponentTools)(s);
        (0, page_tools_js_1.registerPageTools)(s);
        (0, style_tools_js_1.registerStyleTools)(s);
        (0, image_tools_js_1.registerImageTools)(s);
        (0, boolean_tools_js_1.registerBooleanTools)(s);
        const [clientTransport, serverTransport] = inMemory_js_1.InMemoryTransport.createLinkedPair();
        await s.connect(serverTransport);
        const c = new index_js_1.Client({ name: 'test-client', version: '0.1.0' }, { capabilities: {} });
        await c.connect(clientTransport);
        return { server: s, client: c };
    }
    // TEST-P9-001: boolean_operation tool registers correctly
    (0, vitest_1.it)('registers boolean_operation tool with operation and nodeIds parameters', async () => {
        const { client: c } = await buildFullServerWithBoolean();
        client = c;
        const { tools } = await client.listTools();
        const toolNames = tools.map((t) => t.name);
        (0, vitest_1.expect)(toolNames).toContain('boolean_operation');
        const tool = tools.find((t) => t.name === 'boolean_operation');
        (0, vitest_1.expect)(tool?.inputSchema?.properties).toHaveProperty('operation');
        (0, vitest_1.expect)(tool?.inputSchema?.properties).toHaveProperty('nodeIds');
    });
    // TEST-P9-010: 24 tools total after Phase 9
    (0, vitest_1.it)('registers exactly 24 tools after Phase 9', async () => {
        const { client: c } = await buildFullServerWithBoolean();
        client = c;
        const { tools } = await client.listTools();
        (0, vitest_1.expect)(tools).toHaveLength(24);
    });
});
//# sourceMappingURL=server.test.js.map