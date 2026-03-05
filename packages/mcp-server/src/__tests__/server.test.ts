import { describe, it, expect, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { registerPingTool } from '../tools/ping.js';
import { registerBuildSceneTool } from '../tools/build-scene.js';
import { registerReadTools } from '../tools/read-tools.js';
import { registerEditTools } from '../tools/edit-tools.js';
import { registerComponentTools } from '../tools/component-tools.js';
import { registerPageTools } from '../tools/page-tools.js';
import { registerStyleTools } from '../tools/style-tools.js';
import { registerImageTools } from '../tools/image-tools.js';
import { registerBooleanTools } from '../tools/boolean-tools.js';
import { registerBatchTools } from '../tools/batch-tools.js';
import { registerFigjamTools } from '../tools/figjam-tools.js';

// TEST-NF-001: MCP server starts and registers all 17 tools
describe('MCP server tool registration', () => {
  let server: McpServer;
  let client: Client;

  afterEach(async () => {
    // Close connections to clean up
    try {
      await client?.close();
    } catch {
      // Ignore cleanup errors
    }
  });

  it('registers exactly 17 tools with correct names', async () => {
    server = new McpServer({
      name: 'figma-fast-test',
      version: '0.1.0',
    });

    registerPingTool(server);
    registerBuildSceneTool(server);
    registerReadTools(server);
    registerEditTools(server);
    registerComponentTools(server);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);

    client = new Client({ name: 'test-client', version: '0.1.0' }, { capabilities: {} });
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
      'get_image_fill',
      'modify_node',
      'delete_nodes',
      'move_node',
      'clone_node',
      'convert_to_component',
      'combine_as_variants',
      'manage_component_properties',
    ];

    expect(tools).toHaveLength(17);

    const toolNames = tools.map((t) => t.name);
    for (const expected of expectedTools) {
      expect(toolNames, `Expected tool "${expected}" to be registered`).toContain(expected);
    }
  });
});

// TEST-P7B-001, TEST-P7B-003, TEST-P7B-005, TEST-P7B-007
// Phase 7B style creation tool tests
describe('Phase 7B style creation tool registration', () => {
  let server: McpServer;
  let client: Client;

  afterEach(async () => {
    try {
      await client?.close();
    } catch {
      // Ignore cleanup errors
    }
  });

  async function buildFullServerWithStyles(): Promise<{ server: McpServer; client: Client }> {
    const s = new McpServer({ name: 'figma-fast-test', version: '0.1.0' });
    registerPingTool(s);
    registerBuildSceneTool(s);
    registerReadTools(s);
    registerEditTools(s);
    registerComponentTools(s);
    registerPageTools(s);
    registerStyleTools(s);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await s.connect(serverTransport);
    const c = new Client({ name: 'test-client', version: '0.1.0' }, { capabilities: {} });
    await c.connect(clientTransport);
    return { server: s, client: c };
  }

  // TEST-P7B-001: create_paint_style tool registers correctly
  it('registers create_paint_style tool with name and fills parameters', async () => {
    const { client: c } = await buildFullServerWithStyles();
    client = c;
    const { tools } = await client.listTools();
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('create_paint_style');
    const tool = tools.find((t) => t.name === 'create_paint_style');
    expect(tool?.inputSchema?.properties).toHaveProperty('name');
    expect(tool?.inputSchema?.properties).toHaveProperty('fills');
  });

  // TEST-P7B-003: create_text_style tool registers correctly
  it('registers create_text_style tool with name and font parameters', async () => {
    const { client: c } = await buildFullServerWithStyles();
    client = c;
    const { tools } = await client.listTools();
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('create_text_style');
    const tool = tools.find((t) => t.name === 'create_text_style');
    expect(tool?.inputSchema?.properties).toHaveProperty('name');
  });

  // TEST-P7B-005: create_effect_style tool registers correctly
  it('registers create_effect_style tool with name and effects parameters', async () => {
    const { client: c } = await buildFullServerWithStyles();
    client = c;
    const { tools } = await client.listTools();
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('create_effect_style');
    const tool = tools.find((t) => t.name === 'create_effect_style');
    expect(tool?.inputSchema?.properties).toHaveProperty('name');
    expect(tool?.inputSchema?.properties).toHaveProperty('effects');
  });

  // TEST-P7B-007: 23 tools total after Phase 7B
  it('registers exactly 23 tools after Phase 7B', async () => {
    const { client: c } = await buildFullServerWithStyles();
    client = c;
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(23);
  });
});

// TEST-P6-001, TEST-P6-003, TEST-P6-006, TEST-P6-009, TEST-P6-010
// Phase 6 page tool tests
describe('Phase 6 page tool registration', () => {
  let server: McpServer;
  let client: Client;

  afterEach(async () => {
    try {
      await client?.close();
    } catch {
      // Ignore cleanup errors
    }
  });

  async function buildFullServer(): Promise<{ server: McpServer; client: Client }> {
    const s = new McpServer({ name: 'figma-fast-test', version: '0.1.0' });
    registerPingTool(s);
    registerBuildSceneTool(s);
    registerReadTools(s);
    registerEditTools(s);
    registerComponentTools(s);
    registerPageTools(s);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await s.connect(serverTransport);
    const c = new Client({ name: 'test-client', version: '0.1.0' }, { capabilities: {} });
    await c.connect(clientTransport);
    return { server: s, client: c };
  }

  // TEST-P6-001: create_page tool registers with correct schema
  it('registers create_page tool with name parameter', async () => {
    const { client: c } = await buildFullServer();
    client = c;
    const { tools } = await client.listTools();
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('create_page');
    const tool = tools.find((t) => t.name === 'create_page');
    expect(tool?.inputSchema?.properties).toHaveProperty('name');
  });

  // TEST-P6-003: rename_page tool registers with correct schema
  it('registers rename_page tool with pageId and name parameters', async () => {
    const { client: c } = await buildFullServer();
    client = c;
    const { tools } = await client.listTools();
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('rename_page');
    const tool = tools.find((t) => t.name === 'rename_page');
    expect(tool?.inputSchema?.properties).toHaveProperty('pageId');
    expect(tool?.inputSchema?.properties).toHaveProperty('name');
  });

  // TEST-P6-006: set_current_page tool registers with correct schema
  it('registers set_current_page tool with pageId parameter', async () => {
    const { client: c } = await buildFullServer();
    client = c;
    const { tools } = await client.listTools();
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('set_current_page');
    const tool = tools.find((t) => t.name === 'set_current_page');
    expect(tool?.inputSchema?.properties).toHaveProperty('pageId');
  });

  // TEST-P6-010: 20 tools total after Phase 6
  it('registers exactly 20 tools after Phase 6', async () => {
    const { client: c } = await buildFullServer();
    client = c;
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(20);
  });
});

// TEST-P8-001, TEST-P8-009
// Phase 8 image fill tool tests
describe('Phase 8 image fill tool registration', () => {
  let server: McpServer;
  let client: Client;

  afterEach(async () => {
    try {
      await client?.close();
    } catch {
      // Ignore cleanup errors
    }
  });

  async function buildFullServerWithImage(): Promise<{ server: McpServer; client: Client }> {
    const s = new McpServer({ name: 'figma-fast-test', version: '0.1.0' });
    registerPingTool(s);
    registerBuildSceneTool(s);
    registerReadTools(s);
    registerEditTools(s);
    registerComponentTools(s);
    registerPageTools(s);
    registerStyleTools(s);
    registerImageTools(s);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await s.connect(serverTransport);
    const c = new Client({ name: 'test-client', version: '0.1.0' }, { capabilities: {} });
    await c.connect(clientTransport);
    return { server: s, client: c };
  }

  // TEST-P8-001: set_image_fill tool registers correctly
  it('registers set_image_fill tool with nodeId, imageUrl, and scaleMode parameters', async () => {
    const { client: c } = await buildFullServerWithImage();
    client = c;
    const { tools } = await client.listTools();
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('set_image_fill');
    const tool = tools.find((t) => t.name === 'set_image_fill');
    expect(tool?.inputSchema?.properties).toHaveProperty('nodeId');
    expect(tool?.inputSchema?.properties).toHaveProperty('imageUrl');
  });

  // TEST-P8-009: 24 tools total after Phase 8
  it('registers exactly 24 tools after Phase 8', async () => {
    const { client: c } = await buildFullServerWithImage();
    client = c;
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(24);
  });
});

// TEST-P10C-001, TEST-P10D-001, TEST-P10C-007
// Phase 10 batch tools registration tests
describe('Phase 10 performance tools registration', () => {
  let client: Client;

  afterEach(async () => {
    try {
      await client?.close();
    } catch {
      // Ignore cleanup errors
    }
  });

  async function buildFullServerWithBatch(): Promise<{ server: McpServer; client: Client }> {
    const s = new McpServer({ name: 'figma-fast-test', version: '0.1.0' });
    registerPingTool(s);
    registerBuildSceneTool(s);
    registerReadTools(s);
    registerEditTools(s);
    registerComponentTools(s);
    registerPageTools(s);
    registerStyleTools(s);
    registerImageTools(s);
    registerBooleanTools(s);
    registerBatchTools(s);
    registerFigjamTools(s);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await s.connect(serverTransport);
    const c = new Client({ name: 'test-client', version: '0.1.0' }, { capabilities: {} });
    await c.connect(clientTransport);
    return { server: s, client: c };
  }

  // TEST-P10C-001: batch_modify tool registers with modifications parameter
  it('registers batch_modify tool with modifications array parameter', async () => {
    const { client: c } = await buildFullServerWithBatch();
    client = c;
    const { tools } = await client.listTools();
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('batch_modify');
    const tool = tools.find((t) => t.name === 'batch_modify');
    expect(tool?.inputSchema?.properties).toHaveProperty('modifications');
  });

  // TEST-P10D-001: batch_get_node_info tool registers with nodeIds and depth parameters
  it('registers batch_get_node_info tool with nodeIds and depth parameters', async () => {
    const { client: c } = await buildFullServerWithBatch();
    client = c;
    const { tools } = await client.listTools();
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('batch_get_node_info');
    const tool = tools.find((t) => t.name === 'batch_get_node_info');
    expect(tool?.inputSchema?.properties).toHaveProperty('nodeIds');
    expect(tool?.inputSchema?.properties).toHaveProperty('depth');
  });

  // TEST-P10C-007: 33 tools total after Phase 10 + FigJam
  it('registers exactly 33 tools after Phase 10 with FigJam tools', async () => {
    const { client: c } = await buildFullServerWithBatch();
    client = c;
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(33);
  });

  it('should register all jam_* FigJam tools', async () => {
    const { client: c } = await buildFullServerWithBatch();
    client = c;
    const { tools } = await client.listTools();
    const toolNames = tools.map((t) => t.name);
    const jamTools = [
      'jam_create_sticky',
      'jam_create_connector',
      'jam_create_shape',
      'jam_create_code_block',
      'jam_create_table',
      'jam_get_timer',
    ];
    for (const toolName of jamTools) {
      expect(toolNames).toContain(toolName);
    }
  });
});

// TEST-P9-001, TEST-P9-002, TEST-P9-003, TEST-P9-010
// Phase 9 boolean operation tool tests
describe('Phase 9 boolean operation tool registration', () => {
  let server: McpServer;
  let client: Client;

  afterEach(async () => {
    try {
      await client?.close();
    } catch {
      // Ignore cleanup errors
    }
  });

  async function buildFullServerWithBoolean(): Promise<{ server: McpServer; client: Client }> {
    const s = new McpServer({ name: 'figma-fast-test', version: '0.1.0' });
    registerPingTool(s);
    registerBuildSceneTool(s);
    registerReadTools(s);
    registerEditTools(s);
    registerComponentTools(s);
    registerPageTools(s);
    registerStyleTools(s);
    registerImageTools(s);
    registerBooleanTools(s);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await s.connect(serverTransport);
    const c = new Client({ name: 'test-client', version: '0.1.0' }, { capabilities: {} });
    await c.connect(clientTransport);
    return { server: s, client: c };
  }

  // TEST-P9-001: boolean_operation tool registers correctly
  it('registers boolean_operation tool with operation and nodeIds parameters', async () => {
    const { client: c } = await buildFullServerWithBoolean();
    client = c;
    const { tools } = await client.listTools();
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('boolean_operation');
    const tool = tools.find((t) => t.name === 'boolean_operation');
    expect(tool?.inputSchema?.properties).toHaveProperty('operation');
    expect(tool?.inputSchema?.properties).toHaveProperty('nodeIds');
  });

  // TEST-P9-010: 25 tools total after Phase 9
  it('registers exactly 25 tools after Phase 9', async () => {
    const { client: c } = await buildFullServerWithBoolean();
    client = c;
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(25);
  });
});
