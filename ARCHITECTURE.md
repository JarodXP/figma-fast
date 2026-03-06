# FigmaFast -- Technical Architecture

> **Version:** 4.0.0
> **Last updated:** 2026-02-26

---

## System Diagram (Current -- Pre-Relay)

```
+-------------------+         +--------------------+         +-------------------+
| Claude Desktop    |  stdio  | MCP Server (pid 1) |  ws     | Figma Plugin      |
| (AI Client)       | ------> | ws/server.ts       | <-----> | ui.html (WS)      |
+-------------------+         | :3056 BIND         |         | main.ts (sandbox) |
                              +--------------------+         +-------------------+

+-------------------+         +--------------------+
| Claude Code       |  stdio  | MCP Server (pid 2) |
| (AI Client)       | ------> | ws/server.ts       |
+-------------------+         | :3056 FAILS        |  <-- EADDRINUSE
                              +--------------------+
```

## System Diagram (Phase 1 -- In-Process Relay)

```
+-------------------+         +--------------------+     ws client     +-----------------+
| Claude Desktop    |  stdio  | MCP Server (pid 1) | ----------------> |                 |
| (AI Client)       | ------> | ws/server.ts       |                   |  WS Relay       |
+-------------------+         +--------------------+                   |  relay.ts       |
                                                                       |  :3056          |
+-------------------+         +--------------------+     ws client     |                 |
| Claude Code       |  stdio  | MCP Server (pid 2) | ----------------> |                 | <--- Figma Plugin
| (AI Client)       | ------> | ws/server.ts       |                   |  (in pid 1)     |      ui.html
+-------------------+         +--------------------+                   +-----------------+

Relay runs IN-PROCESS with the first MCP server (pid 1).
If pid 1 exits, relay dies, pid 2 loses connection.
```

## System Diagram (Phase 3 -- Detached Relay)

```
+-------------------+         +--------------------+     ws client     +-----------------+
| Claude Desktop    |  stdio  | MCP Server (pid 1) | ----------------> |                 |
| (AI Client)       | ------> | ws/server.ts       |                   |  WS Relay       |
+-------------------+         +--------------------+                   |  relay-process.ts|
                                                                       |  :3056          |
+-------------------+         +--------------------+     ws client     |  (detached)     |
| Claude Code       |  stdio  | MCP Server (pid 2) | ----------------> |  PID file:      | <--- Figma Plugin
| (AI Client)       | ------> | ws/server.ts       |                   |  /tmp/figma-    |      ui.html
+-------------------+         +--------------------+                   |  fast-relay.pid |
                                                                       +-----------------+

Relay runs as DETACHED CHILD PROCESS.
Survives parent exit. Auto-exits after 60s idle.
```

## Directory Structure

```
figma-fast/
  packages/
    mcp-server/
      src/
        index.ts                  # Entry point: starts MCP + WS
        schemas.ts                # Zod schemas for tool parameters
        ws/
          server.ts               # sendToPlugin, isPluginConnected, startWsServer
          relay.ts                # [NEW] WsRelay class -- relay server logic
          relay-process.ts        # [NEW] Standalone relay entry point (Phase 3)
        tools/
          ping.ts                 # 1 tool
          build-scene.ts          # 1 tool
          read-tools.ts           # 6 tools (get_document_info, get_node_info, get_selection, get_styles, get_local_components, get_library_components, export_node_as_image, get_image_fill)
          edit-tools.ts           # 4 tools (modify_node, delete_nodes, move_node, clone_node)
          component-tools.ts      # 3 tools (convert_to_component, combine_as_variants, manage_component_properties)
          page-tools.ts           # 3 tools (create_page, rename_page, set_current_page)
          style-tools.ts          # 3 tools (create_paint_style, create_text_style, create_effect_style)
          image-tools.ts          # 1 tool (set_image_fill)
          boolean-tools.ts        # 1 tool (boolean_operation)
          batch-tools.ts          # 2 tools (batch_modify, batch_get_node_info)
          figjam-tools.ts         # [NEW v5] 6 tools (jam_create_sticky, jam_create_connector, jam_create_shape, jam_create_code_block, jam_create_table, jam_get_timer)
        __tests__/
          server.test.ts          # MCP tool registration tests
          ws-server.test.ts       # WS server unit tests
          schemas.test.ts         # Schema validation tests
          relay.test.ts           # [NEW] Relay server tests
          relay-detached.test.ts  # [NEW] Detached relay tests (Phase 3)
    figma-plugin/
      src/
        main.ts                   # Plugin main thread (Figma sandbox)
        handlers.ts               # Command handlers (1000+ lines) [MODIFIED v5 -- FigJam guards added]
        figjam-handlers.ts        # [NEW v5] FigJam-specific handlers (jam_create_sticky, etc.)
        serialize-node.ts         # Node serialization [MODIFIED v5 -- FigJam node types added]
        ui.html                   # Plugin UI with WS client [MODIFIED in Phase 2]
        scene-builder/
          index.ts                # Scene builder orchestrator
          build-node.ts           # Node creation logic
          fonts.ts                # Font management
      manifest.json               # editorType: ["figma", "figjam"], devAllowedDomains: ws://localhost:3056
    shared/
      src/
        index.ts                  # Public exports
        messages.ts               # WS message types [MODIFIED -- relay types added]
        scene-spec.ts             # Scene node type definitions
        colors.ts                 # Color utilities
        fonts.ts                  # Font utilities
        warnings.ts               # Warning detection
        __tests__/                # Unit tests for utilities
```

## Data Flow (Phase 1+2)

### Command Flow (Active Client)

```
1. AI Client sends tool call via MCP stdio
2. MCP Server tool handler calls sendToPlugin(message)
3. ws/server.ts sends message over WS client connection to relay
4. WS Relay receives message, checks sender is active client
5. Relay forwards message to Figma plugin socket
6. Plugin ui.html receives via ws.onmessage
7. Plugin ui.html forwards to main.ts via parent.postMessage
8. Plugin main.ts processes command, calls handler
9. Handler returns result
10. Plugin main.ts sends result via figma.ui.postMessage
11. Plugin ui.html receives via window.onmessage
12. Plugin ui.html sends result over WS to relay
13. Relay receives result, looks up correlation ID in pendingMessageSources
14. Relay forwards result to originating MCP client socket
15. ws/server.ts receives result, resolves pending Promise
16. Tool handler formats and returns result to AI client
```

### Command Flow (Inactive Client)

```
1. AI Client sends tool call via MCP stdio
2. MCP Server tool handler calls sendToPlugin(message)
3. ws/server.ts sends message over WS client connection to relay
4. WS Relay receives message, checks sender is INACTIVE
5. Relay sends immediate error: { type: "relay_error", id, error: "Another client is currently active..." }
6. ws/server.ts receives relay_error, rejects pending Promise
7. Tool handler returns error to AI client
```

### Client Switch Flow (Phase 2)

```
1. Relay broadcasts { type: "client_list", clients: [...] } to plugin on any registry change
2. Plugin ui.html renders client list with radio buttons
3. User clicks inactive client
4. Plugin ui.html sends { type: "set_active_client", clientId } to relay via WS
5. Relay updates activeClientId
6. Relay sends { type: "activated" } to new active client
7. Relay sends { type: "deactivated", reason } to old active client
8. Relay broadcasts updated client_list to plugin
9. Plugin ui.html re-renders client list
```

## API Contracts

### ws/server.ts Exported API (UNCHANGED)

```typescript
// Start the relay (or connect to existing) and register as a client
export function startWsServer(port?: number, clientName?: string): void;

// Send a message to the Figma plugin via the relay. Rejects if inactive or plugin not connected.
export function sendToPlugin(
  message: DistributiveOmit<ServerToPluginMessage, 'id'>,
  timeoutMs?: number,
): Promise<PluginToServerMessage>;

// Check if this client can send to the plugin (connected to relay and active)
export function isPluginConnected(): boolean;
```

### WsRelay Class API (NEW)

```typescript
export class WsRelay {
  constructor(port: number);
  start(): Promise<void>;
  close(): Promise<void>;

  // Read-only accessors for testing
  get clientRegistry(): Map<string, { socket: WebSocket; clientName: string; connectedAt: number }>;
  get currentActiveClientId(): string | null;
  get currentPluginSocket(): WebSocket | null;
}
```

### Relay Message Protocol

```
MCP Client -> Relay:
  { type: "register", clientId: string, clientName: string }
  { type: "ping"|"build_scene"|..., id: string, ... }  (any ServerToPluginMessage)

Relay -> MCP Client:
  { type: "registered", clientId: string, isActive: boolean }
  { type: "activated" }
  { type: "deactivated", reason: string }
  { type: "relay_error", id: string, error: string }
  { type: "pong"|"result", id: string, ... }  (any PluginToServerMessage)

Plugin -> Relay:
  { type: "hello", ts: number }
  { type: "set_active_client", clientId: string }
  { type: "pong"|"result", id: string, ... }  (any PluginToServerMessage)

Relay -> Plugin:
  { type: "client_list", clients: RelayClientInfo[] }
  { type: "ping"|"build_scene"|..., id: string, ... }  (any ServerToPluginMessage, forwarded from active client)
```

## Conventions

- **Logging**: All log messages go to stderr (`console.error`), prefixed with `[FigmaFast]`
- **Ports**: Default 3056, configurable via `FIGMA_FAST_PORT` env var
- **UUIDs**: Generated with Node.js `crypto.randomUUID()`
- **Error handling**: Never crash on malformed messages. Log and continue.
- **Module pattern**: ES modules throughout, `.js` extension in imports
- **Test ports**: Random high ports (39000+) to avoid conflicts. Each test file uses a unique range.
