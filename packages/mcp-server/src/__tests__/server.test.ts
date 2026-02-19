import { describe, it, expect, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { registerPingTool } from '../tools/ping.js';
import { registerBuildSceneTool } from '../tools/build-scene.js';
import { registerReadTools } from '../tools/read-tools.js';
import { registerEditTools } from '../tools/edit-tools.js';
import { registerComponentTools } from '../tools/component-tools.js';

// TEST-NF-001: MCP server starts and registers all 16 tools
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

  it('registers exactly 16 tools with correct names', async () => {
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
      'modify_node',
      'delete_nodes',
      'move_node',
      'clone_node',
      'convert_to_component',
      'combine_as_variants',
      'manage_component_properties',
    ];

    expect(tools).toHaveLength(16);

    const toolNames = tools.map((t) => t.name);
    for (const expected of expectedTools) {
      expect(toolNames, `Expected tool "${expected}" to be registered`).toContain(expected);
    }
  });
});
