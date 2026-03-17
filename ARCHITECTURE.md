# FigmaFast -- Technical Architecture

> **Version:** 6.0.0
> **Last updated:** 2026-03-06

---

## Current Architecture

FigmaFast uses a **detached relay** model. Each MCP server process connects as a client to a shared relay process that persists independently on port 3056.

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
```

**Key properties:**
- Relay runs as a **detached child process** — survives any individual MCP server exiting
- Auto-exits after 60s idle (all clients disconnected)
- PID file at `/tmp/figma-fast-relay.pid` for process coordination
- Only **one client is active at a time** — the Figma plugin UI lets the user switch
- Inactive clients receive an immediate error rather than being queued

**Startup sequence (per MCP server process):**
1. Try connecting to an existing relay on `ws://127.0.0.1:3056`
2. If none found: start an in-process relay immediately (~5ms), then fork a detached relay in the background for persistence
3. Register as a client with `{ type: "register", clientId, clientName }`
4. Receive `{ type: "registered", isActive }` — isActive determines whether commands are forwarded

> **Note:** Always use `ws://127.0.0.1` (not `ws://localhost`) — Node.js v24+ resolves `localhost` to `::1` (IPv6) via happy-eyeballs, but the relay binds to `127.0.0.1` (IPv4) only.

---

## Directory Structure

```
figma-fast/
  .github/
    workflows/
      ci.yml                    # CI: install, build, test, lint on push/PR
  packages/
    mcp-server/
      src/
        index.ts                # Entry point: starts MCP + WS relay client
        schemas.ts              # Zod schemas for all tool parameters
        ws/
          server.ts             # sendToPlugin, isPluginConnected, startWsServer
          relay.ts              # WsRelay class -- in-process relay logic
          relay-process.ts      # Standalone relay entry point (detached child)
        tools/
          ping.ts               # 1 tool: ping
          build-scene.ts        # 1 tool: build_scene
          read-tools.ts         # 8 tools: get_document_info, get_node_info,
                                #   get_selection, get_styles, get_local_components,
                                #   get_library_components, export_node_as_image,
                                #   get_image_fill
          edit-tools.ts         # 4 tools: modify_node, delete_nodes, move_node, clone_node
          component-tools.ts    # 3 tools: convert_to_component, combine_as_variants,
                                #   manage_component_properties
          page-tools.ts         # 3 tools: create_page, rename_page, set_current_page
          style-tools.ts        # 3 tools: create_paint_style, create_text_style,
                                #   create_effect_style
          image-tools.ts        # 1 tool: set_image_fill
          boolean-tools.ts      # 1 tool: boolean_operation
          batch-tools.ts        # 2 tools: batch_modify, batch_get_node_info
          figjam-tools.ts       # 6 tools: jam_create_sticky, jam_create_connector,
                                #   jam_create_shape, jam_create_code_block,
                                #   jam_create_table, jam_get_timer
        __tests__/
          server.test.ts        # MCP tool registration integration tests
          ws-server.test.ts     # WS server unit tests
          schemas.test.ts       # Schema validation tests
          relay.test.ts         # WsRelay unit/integration tests
          relay-detached.test.ts# Detached relay process tests
    figma-plugin/
      src/
        main.ts                 # Plugin main thread (Figma sandbox)
        handlers.ts             # Command handlers for all Figma tools
        figjam-handlers.ts      # FigJam-specific handlers (jam_create_*, jam_get_timer)
        handler-utils.ts        # Pure utility functions (base64, mime type, font weight)
        serialize-node.ts       # Node serialization (Figma + FigJam node types)
        ui.html                 # Plugin UI: WS client + client picker
        scene-builder/
          index.ts              # Scene builder orchestrator
          build-node.ts         # Recursive node creation logic
          fonts.ts              # Font collection and preloading
      manifest.json             # editorType: ["figma", "figjam"],
                                # devAllowedDomains: ws://localhost:3056
      __tests__/
        build-node.test.ts      # Scene builder node creation tests
        handler-utils.test.ts   # Pure handler utility function tests
        build-scene.test.ts     # Scene builder orchestrator tests (FigJam pre-flight, etc.)
    shared/
      src/
        index.ts                # Public exports
        messages.ts             # WS message protocol types (Figma + FigJam + Relay)
        scene-spec.ts           # SceneNode type definitions
        colors.ts               # Color utilities (hex parsing, conversion)
        fonts.ts                # Font utilities (weight normalization)
        warnings.ts             # Warning detection for ignored properties
        __tests__/
          colors.test.ts
          fonts.test.ts
          warnings.test.ts
          protocol-contract.test.ts  # Verifies messages.ts types match main.ts switch cases
```

---

## Data Flow

### Command Flow (Active Client)

```
1.  AI Client sends tool call via MCP stdio
2.  MCP Server tool handler calls sendToPlugin(message)
3.  ws/server.ts sends message over WS client connection to relay
4.  WS Relay receives message, checks sender is active client
5.  Relay forwards message to Figma plugin socket
6.  Plugin ui.html receives via ws.onmessage
7.  Plugin ui.html forwards to main.ts via parent.postMessage
8.  Plugin main.ts processes command, calls handler
9.  Handler returns result
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

### Client Switch Flow

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

---

## API Contracts

### ws/server.ts Exported API

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

### WsRelay Class API

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

---

## FigJam Support

FigmaFast supports both Figma design files and FigJam boards. The plugin manifest declares `editorType: ["figma", "figjam"]`.

**Guards:** Tools that only work in Figma (e.g., `create_page`, `boolean_operation`, `build_scene` with component types) call `requireFigmaDesign()` in their plugin-side handler. This returns a clear error when invoked from a FigJam context. The AI can detect the editor type upfront via `get_document_info` (returns `editorType`).

**FigJam-only tools** (`jam_*`) call `requireFigjam()` — they error when invoked in a Figma design file.

**`build_scene` in FigJam:** Supported for basic node types (FRAME, TEXT, RECTANGLE, ELLIPSE, etc.). COMPONENT, COMPONENT_SET, and COMPONENT_INSTANCE are blocked by a pre-flight check.

---

## Conventions

- **Logging**: All log messages go to stderr (`console.error`), prefixed with `[FigmaFast]`
- **Ports**: Default 3056, configurable via `FIGMA_FAST_PORT` env var
- **UUIDs**: Generated with Node.js `crypto.randomUUID()`
- **Error handling**: Never crash on malformed messages. Log and continue.
- **Module pattern**: ES modules throughout, `.js` extension in imports
- **Test ports**: Random high ports (39000+) to avoid conflicts. Each test file uses a unique range.
- **base64**: `btoa`/`atob` unavailable in the Figma plugin sandbox — use `handler-utils.ts` implementations
