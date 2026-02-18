/**
 * FigmaFast MCP Server entry point.
 * Starts a stdio MCP server with an embedded WebSocket server.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { startWsServer } from './ws/server.js';
import { registerPingTool } from './tools/ping.js';
import { registerBuildSceneTool } from './tools/build-scene.js';
import { registerReadTools } from './tools/read-tools.js';
import { registerEditTools } from './tools/edit-tools.js';
import { registerComponentTools } from './tools/component-tools.js';

const WS_PORT = parseInt(process.env.FIGMA_FAST_PORT || '3056', 10);

// Create MCP server
const server = new McpServer({
  name: 'figma-fast',
  version: '0.1.0',
});

// Register tools
registerPingTool(server);
registerBuildSceneTool(server);
registerReadTools(server);
registerEditTools(server);
registerComponentTools(server);

// Start embedded WebSocket server
startWsServer(WS_PORT);

// Connect via stdio transport
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error(`[FigmaFast] MCP server running (stdio), WebSocket on port ${WS_PORT}`);
}).catch((err) => {
  console.error('[FigmaFast] Failed to start MCP server:', err);
  process.exit(1);
});
