# FigmaFast -- Task Breakdown

> **Version:** 4.0.0
> **Last updated:** 2026-02-26
> **Mandatory sequence:** Tests -> Implementation -> Validation -> Regression -> Fix (if needed)
> **Source PRD:** `docs/prds/multi-client-connection-switching.md`

---

## Pre-Work: Fix Stale Test Assertions

### TASK-000: Fix tool count assertions in server.test.ts
- **Status**: DONE
- **Depends on**: none
- **Type**: BUG_FIX
- **Ralph prompt**: |
    Read `packages/mcp-server/src/__tests__/server.test.ts`. There are 6 failing tests due to stale
    tool count assertions. The `get_image_fill` tool was added to read-tools.ts (registered inside
    `registerReadTools`), incrementing the tool count by 1 for every test group that includes
    `registerReadTools`. Fix each `toHaveLength(N)` assertion to N+1:
    - "registers exactly 16 tools" -> 17 (line ~70)
    - "registers exactly 19 tools after Phase 6" -> 20 (line ~223)
    - "registers exactly 22 tools after Phase 7B" -> 23 (line ~151)
    - "registers exactly 23 tools after Phase 8" -> 24 (line ~276)
    - "registers exactly 24 tools after Phase 9" -> 25 (line ~395)
    - "registers exactly 26 tools after Phase 10" -> 27 (line ~342)
    Run `npm test` and confirm all 74 tests pass.
- **Max iterations**: 3
- **Files affected**: `packages/mcp-server/src/__tests__/server.test.ts`
- **Verification**: `npm test` -- all 74 tests pass, 0 failures

---

## Phase 1: WS Relay with Multi-Client Registration

### TASK-101: Add relay message types to shared package
- **Status**: DONE
- **Depends on**: TASK-000
- **Type**: IMPLEMENTATION
- **Ralph prompt**: |
    Read `packages/shared/src/messages.ts` and `packages/shared/src/index.ts`.

    Add the following new types to `packages/shared/src/messages.ts`:

    1. `RelayClientInfo` interface:
       ```typescript
       export interface RelayClientInfo {
         clientId: string;
         clientName: string;
         isActive: boolean;
         connectedAt: number;
       }
       ```

    2. `ClientToRelayMessage` type -- messages MCP clients send TO the relay:
       ```typescript
       export type ClientToRelayMessage =
         | { type: 'register'; clientId: string; clientName: string }
         | ServerToPluginMessage;  // forwarded commands
       ```

    3. `RelayToClientMessage` type -- messages relay sends TO MCP clients:
       ```typescript
       export type RelayToClientMessage =
         | { type: 'registered'; clientId: string; isActive: boolean }
         | { type: 'activated' }
         | { type: 'deactivated'; reason: string }
         | { type: 'relay_error'; id: string; error: string }
         | PluginToServerMessage;  // forwarded responses
       ```

    4. `PluginToRelayMessage` type -- messages plugin sends TO relay:
       ```typescript
       export type PluginToRelayMessage =
         | { type: 'hello'; ts: number }
         | { type: 'set_active_client'; clientId: string }
         | PluginToServerMessage;  // forwarded responses (pong, result)
       ```

    5. `RelayToPluginMessage` type -- messages relay sends TO plugin:
       ```typescript
       export type RelayToPluginMessage =
         | { type: 'client_list'; clients: RelayClientInfo[] }
         | ServerToPluginMessage;  // forwarded commands
       ```

    Also export these new types from `packages/shared/src/index.ts`.

    Run `npm run build --workspace=packages/shared` to verify compilation.
    Run `npm test` to verify no regressions.
- **Max iterations**: 5
- **Files affected**: `packages/shared/src/messages.ts`, `packages/shared/src/index.ts`
- **Verification**: `npm run build --workspace=packages/shared && npm test`

### TASK-102: Write relay server tests (TEST-R-001 through TEST-R-015)
- **Status**: DONE
- **Depends on**: TASK-101
- **Type**: TEST_CREATION
- **Ralph prompt**: |
    Create `packages/mcp-server/src/__tests__/relay.test.ts`.

    Read `TESTS.md` for the full Given/When/Then specifications for TEST-R-001 through TEST-R-015.
    Read `packages/mcp-server/src/__tests__/ws-server.test.ts` for the project's test style conventions.

    Write vitest tests implementing the specifications. Key patterns:
    - Use `WebSocket` and `WebSocketServer` from 'ws' for mock connections
    - Each test should use a random high port (39200 + Math.floor(Math.random() * 100)) to avoid conflicts
    - Clean up all sockets and servers in afterEach
    - Use `new Promise` with `setTimeout` for async timing (20-50ms waits for connection events)
    - The relay module will be at `../ws/relay.js` and export: `WsRelay` class with constructor(port),
      properties: `clientRegistry`, `activeClientId`, `pluginSocket`, and methods: `close()`

    Helper pattern for each test:
    ```typescript
    // Create relay
    const relay = new WsRelay(port);
    await relay.start();

    // Create mock client (MCP server)
    const client = new WebSocket(`ws://localhost:${port}`);
    await new Promise(resolve => client.on('open', resolve));
    client.send(JSON.stringify({ type: 'register', clientId: 'id-1', clientName: 'Claude Desktop' }));
    await new Promise(resolve => setTimeout(resolve, 50));

    // Create mock plugin
    const plugin = new WebSocket(`ws://localhost:${port}`);
    await new Promise(resolve => plugin.on('open', resolve));
    plugin.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
    await new Promise(resolve => setTimeout(resolve, 50));
    ```

    Write ALL 15 tests. They will all fail initially since the relay module does not exist yet.
    Verify the test file compiles: `npx tsc --noEmit -p packages/mcp-server/tsconfig.json` (expected:
    errors about missing relay module -- that is fine for now).

    Do NOT create the relay implementation. Only write the tests.
- **Max iterations**: 10
- **Files affected**: `packages/mcp-server/src/__tests__/relay.test.ts`
- **Verification**: File exists, TypeScript syntax is valid (aside from missing relay import)

### TASK-103: Implement WsRelay class (ws/relay.ts)
- **Status**: DONE
- **Depends on**: TASK-102
- **Type**: IMPLEMENTATION
- **Ralph prompt**: |
    Create `packages/mcp-server/src/ws/relay.ts`.

    Read `TESTS.md` TEST-R-001 through TEST-R-015 for the behavioral contract.
    Read `packages/mcp-server/src/__tests__/relay.test.ts` for the test expectations.
    Read `packages/shared/src/messages.ts` for the relay message types.
    Read `packages/mcp-server/src/ws/server.ts` for the current WS server pattern.

    Implement the `WsRelay` class:

    ```typescript
    export class WsRelay {
      private wss: WebSocketServer | null = null;
      private pluginSocket: WebSocket | null = null;
      private clients: Map<string, { socket: WebSocket; clientName: string; connectedAt: number }> = new Map();
      private activeClientId: string | null = null;
      // Map from message correlation ID to the clientId that sent it
      private pendingMessageSources: Map<string, string> = new Map();

      constructor(private port: number) {}

      async start(): Promise<void> { /* ... */ }
      close(): Promise<void> { /* ... */ }

      // Expose for testing
      get clientRegistry() { return this.clients; }
      get currentActiveClientId() { return this.activeClientId; }
      get currentPluginSocket() { return this.pluginSocket; }
    }
    ```

    Key behaviors:
    1. On new WS connection, wait for first message to classify:
       - `{ type: 'hello' }` -> plugin connection. Store as pluginSocket. If old plugin exists, replace it.
       - `{ type: 'register', clientId, clientName }` -> MCP client. Add to clients map. If first client,
         set as active. Send back `{ type: 'registered', clientId, isActive }`.
    2. On message from classified MCP client:
       - If client is active AND plugin is connected: forward message to plugin, record correlation ID mapping.
       - If client is active AND plugin NOT connected: send back error `{ type: 'relay_error', id, error: "Figma plugin is not connected..." }`.
       - If client is inactive: send back error `{ type: 'relay_error', id, error: "Another client is currently active..." }`.
    3. On message from plugin (after hello):
       - If message has an `id` field, look up pendingMessageSources to find originating client.
       - Forward the message to that client.
    4. On client disconnect: remove from clients map. If was active, set activeClientId to null.
    5. On plugin disconnect: set pluginSocket to null. For all pending messages, send error to originating clients.
    6. Malformed messages: log to stderr, do not crash.
    7. close(): close all sockets, close WebSocketServer.

    Run `npm test -- relay` to run just the relay tests. Fix until all 15 pass.
- **Max iterations**: 20
- **Files affected**: `packages/mcp-server/src/ws/relay.ts`
- **Verification**: `npm test -- relay` -- all TEST-R-001 through TEST-R-015 pass

### TASK-104: Write server.ts refactored tests (TEST-S-001 through TEST-S-007)
- **Status**: DONE
- **Depends on**: TASK-103
- **Type**: TEST_CREATION
- **Ralph prompt**: |
    Read `TESTS.md` TEST-S-001 through TEST-S-007 for the behavioral contract.
    Read `packages/mcp-server/src/__tests__/ws-server.test.ts` for existing test patterns.
    Read `packages/mcp-server/src/ws/server.ts` for the current API.

    Extend `packages/mcp-server/src/__tests__/ws-server.test.ts` with new test suites for the
    relay-integrated behavior. The existing 2 tests should be preserved but may need adjustment
    since the module behavior is changing.

    Key patterns:
    - startWsServer now takes an optional clientName parameter: `startWsServer(port, clientName?)`
    - sendToPlugin still has the same signature but routes through the relay
    - Tests need a mock plugin that connects to the relay and responds

    Write the 7 new tests. They will fail initially since server.ts has not been refactored yet.

    IMPORTANT: Each test must use a unique random high port to avoid conflicts with the relay tests.
    Use ports in the range 39300-39399.
- **Max iterations**: 8
- **Files affected**: `packages/mcp-server/src/__tests__/ws-server.test.ts`
- **Verification**: File compiles, new tests exist alongside existing tests

### TASK-105: Refactor ws/server.ts to use relay
- **Status**: DONE
- **Depends on**: TASK-104
- **Type**: IMPLEMENTATION
- **Ralph prompt**: |
    Read `packages/mcp-server/src/ws/server.ts` (current implementation -- 128 lines).
    Read `packages/mcp-server/src/ws/relay.ts` (new relay module from TASK-103).
    Read `packages/shared/src/messages.ts` for relay message types.
    Read `TESTS.md` TEST-S-001 through TEST-S-007 for the behavioral contract.
    Read `packages/mcp-server/src/__tests__/ws-server.test.ts` for what the tests expect.

    Refactor `ws/server.ts`. The exported API MUST remain identical:
    - `startWsServer(port: number, clientName?: string): void`  (clientName is new optional param)
    - `sendToPlugin(message, timeoutMs?): Promise<PluginToServerMessage>`
    - `isPluginConnected(): boolean`

    New behavior of startWsServer:
    1. Try to connect to ws://localhost:{port} as a WebSocket client
    2. If connection succeeds: relay is already running. Send register message. Done.
    3. If connection fails (ECONNREFUSED): no relay running. Create a WsRelay(port), start it,
       then connect to it as a client. Send register message.
    4. Race condition handling: if step 3 fails with EADDRINUSE, retry step 1 (up to 3 times,
       300ms delay, 1.5x backoff).

    Client registration:
    - Generate clientId with `randomUUID()` from crypto
    - clientName from parameter, or `process.env.MCP_CLIENT_NAME`, or "MCP Client <short-uuid>"
    - Send `{ type: 'register', clientId, clientName }` after connecting

    sendToPlugin implementation:
    - Same signature as before
    - Instead of sending directly to pluginSocket, send through the relay client connection
    - Pending request tracking (resolve/reject/timeout) remains the same
    - Handle `relay_error` type messages from the relay (inactive client rejection, plugin not connected)

    isPluginConnected:
    - Returns true if relay client connection is open (the relay handles plugin tracking)
    - Note: In the refactored version, we cannot know if the plugin is truly connected from the
      client side. We optimistically return true if the relay connection is active. The relay will
      return an error if the plugin is not connected.
    - Actually: the relay sends `registered` with isActive. Track active status. isPluginConnected
      returns true if we are connected AND active. This preserves the existing behavior where tools
      check isPluginConnected before calling sendToPlugin.

    Handle relay messages:
    - `registered`: store isActive status
    - `activated`: set isActive = true
    - `deactivated`: set isActive = false
    - `relay_error`: resolve/reject the corresponding pending request
    - `pong` / `result`: resolve the corresponding pending request (same as current)

    IMPORTANT: Do NOT change any tool files. They all import from './ws/server.js' and must work unchanged.

    Run `npm test -- ws-server` to run the server tests. Fix until all pass (existing + new).
    Then run `npm test` to verify full regression.
- **Max iterations**: 20
- **Files affected**: `packages/mcp-server/src/ws/server.ts`
- **Verification**: `npm test` -- all tests pass (existing + new relay + new server)

### TASK-106: Update index.ts entry point
- **Status**: DONE
- **Depends on**: TASK-105
- **Type**: IMPLEMENTATION
- **Ralph prompt**: |
    Read `packages/mcp-server/src/index.ts` (54 lines).

    Make a small update: pass the client name to startWsServer.

    Change line 41 from:
    ```typescript
    startWsServer(WS_PORT);
    ```
    to:
    ```typescript
    const CLIENT_NAME = process.env.MCP_CLIENT_NAME || undefined;
    startWsServer(WS_PORT, CLIENT_NAME);
    ```

    Update the log message on line 48 to include the client name if set:
    ```typescript
    const nameInfo = CLIENT_NAME ? ` as "${CLIENT_NAME}"` : '';
    console.error(`[FigmaFast] MCP server running (stdio), relay on port ${WS_PORT}${nameInfo}`);
    ```

    Run `npm test` to verify no regressions.
    Run `npm run build` to verify TypeScript compilation.
- **Max iterations**: 3
- **Files affected**: `packages/mcp-server/src/index.ts`
- **Verification**: `npm run build && npm test`

### TASK-107: Phase 1 full regression check
- **Status**: DONE
- **Depends on**: TASK-106
- **Type**: REGRESSION
- **Ralph prompt**: |
    Run the full test suite and build:
    ```
    npm run build
    npm test
    npm run lint
    ```

    All tests must pass. All builds must succeed. All lint must pass.

    If any failures, diagnose and fix. Common issues:
    - Port conflicts between test suites (use different port ranges)
    - Module-level singleton state in ws/server.ts leaking between tests
    - TypeScript compilation errors from new types

    If tests fail, read the error output, identify the root cause, fix it, and re-run.
    Repeat until everything is green.
- **Max iterations**: 10
- **Files affected**: any files that need fixes
- **Verification**: `npm run build && npm test && npm run lint` -- all green

---

## Phase 2: Plugin UI Client Picker

### TASK-201: Write relay broadcast tests (TEST-R-020 through TEST-R-026)
- **Status**: DONE
- **Depends on**: TASK-107
- **Type**: TEST_CREATION
- **Ralph prompt**: |
    Read `TESTS.md` TEST-R-020 through TEST-R-026 for specifications.
    Read `packages/mcp-server/src/__tests__/relay.test.ts` for existing test patterns.

    Add new test suites to `packages/mcp-server/src/__tests__/relay.test.ts` for:
    - client_list broadcast on connect/disconnect
    - set_active_client handling
    - activated/deactivated notifications
    - Response routing by correlation ID across switches
    - Active client disconnect leaves no auto-promotion

    Use the same port range conventions and cleanup patterns.
    These tests will initially fail since the broadcast logic has not been added yet.
- **Max iterations**: 8
- **Files affected**: `packages/mcp-server/src/__tests__/relay.test.ts`
- **Verification**: Tests compile and exist

### TASK-202: Implement relay broadcast and switch logic
- **Status**: DONE
- **Depends on**: TASK-201
- **Type**: IMPLEMENTATION
- **Ralph prompt**: |
    Read `packages/mcp-server/src/ws/relay.ts` (current relay implementation).
    Read `packages/shared/src/messages.ts` for message types.
    Read `TESTS.md` TEST-R-020 through TEST-R-026 for behavioral contract.
    Read `packages/mcp-server/src/__tests__/relay.test.ts` for test expectations.

    Extend the WsRelay class with:

    1. `broadcastClientList()` method: sends `{ type: 'client_list', clients: [...] }` to pluginSocket
       whenever client registry changes (connect, disconnect, active switch).

    2. Handle `set_active_client` from plugin: when plugin sends `{ type: 'set_active_client', clientId }`:
       - Validate clientId exists in registry
       - Update activeClientId
       - Send `{ type: 'activated' }` to newly active client
       - Send `{ type: 'deactivated', reason: "User switched to '<name>'" }` to old active client
       - Broadcast updated client_list to plugin

    3. On client connect: after registration, call broadcastClientList()
    4. On client disconnect: after removal, call broadcastClientList()

    5. Response routing by correlation ID: when a plugin response comes in with an `id`,
       route it to the client that originally sent the message (from pendingMessageSources map),
       NOT to the currently active client. This ensures in-flight responses are not lost on switch.

    Run `npm test -- relay` until all tests pass (old + new).
- **Max iterations**: 15
- **Files affected**: `packages/mcp-server/src/ws/relay.ts`
- **Verification**: `npm test -- relay` -- all relay tests pass

### TASK-203: Update server.ts to handle activated/deactivated messages
- **Status**: DONE
- **Depends on**: TASK-202
- **Type**: IMPLEMENTATION
- **Ralph prompt**: |
    Read `packages/mcp-server/src/ws/server.ts`.

    Ensure the relay client message handler in server.ts handles:
    - `{ type: 'activated' }` -- set internal isActive flag to true, log to stderr
    - `{ type: 'deactivated', reason }` -- set isActive flag to false, log reason to stderr

    These should already be partially handled from TASK-105. Verify and add logging if missing.

    Run `npm test` to verify no regressions.
- **Max iterations**: 5
- **Files affected**: `packages/mcp-server/src/ws/server.ts`
- **Verification**: `npm test`

### TASK-204: Update plugin UI (ui.html) with client list
- **Status**: DONE
- **Depends on**: TASK-202
- **Type**: IMPLEMENTATION
- **Ralph prompt**: |
    Read `packages/figma-plugin/src/ui.html` (158 lines).
    Read `TESTS.md` TEST-UI-001 through TEST-UI-005 for UI specifications.
    Read the PRD section 7, Slice 2 for the UI design description.

    Update `ui.html` to:

    1. Add a client list section below the connection status:
       ```html
       <div id="clientList" class="client-list">
         <div class="client-list-header">AI Clients</div>
         <div id="clientListItems"></div>
       </div>
       ```

    2. Add CSS for the client list:
       - `.client-list`: margin-top 12px, container styling
       - `.client-list-header`: font-weight 600, font-size 12px, margin-bottom 8px
       - `.client-item`: display flex, align-items center, gap 8px, padding 6px 8px, border-radius 4px, cursor pointer
       - `.client-item:hover`: background #f5f5f5
       - `.client-item.active`: background #e8f4fd
       - `.client-radio`: 12x12 circle, border 2px solid #ccc
       - `.client-radio.active`: border-color #2563eb, filled center
       - `.client-name`: flex 1, font-size 12px
       - `.no-clients`: color #999, font-size 11px, font-style italic

    3. Add JavaScript to handle client_list messages:
       ```javascript
       // In ws.onmessage handler, BEFORE forwarding to plugin main thread:
       if (msg.type === 'client_list') {
         renderClientList(msg.clients);
         return; // Do NOT forward to plugin main thread
       }
       ```

    4. `renderClientList(clients)` function:
       - If no clients: show "No AI clients connected"
       - For each client: render a clickable row with radio button, name, and connected time
       - Active client has filled radio
       - Clicking an inactive client sends `{ type: 'set_active_client', clientId }` to WS

    5. Increase the plugin UI height from 200 to 300 to accommodate the client list:
       In `packages/figma-plugin/src/main.ts` line 36:
       `figma.showUI(__html__, { visible: true, width: 300, height: 300 });`

    Build the plugin: `npm run build --workspace=packages/figma-plugin`
    This is manual-test territory -- no automated tests for the UI.
- **Max iterations**: 10
- **Files affected**: `packages/figma-plugin/src/ui.html`, `packages/figma-plugin/src/main.ts`
- **Verification**: `npm run build --workspace=packages/figma-plugin` succeeds

### TASK-205: Phase 2 full regression check
- **Status**: DONE
- **Depends on**: TASK-203, TASK-204
- **Type**: REGRESSION
- **Ralph prompt**: |
    Run the full test suite and build:
    ```
    npm run build
    npm test
    npm run lint
    ```

    All tests must pass. All builds must succeed. Lint must pass.
    If failures, diagnose and fix.
- **Max iterations**: 10
- **Files affected**: any files that need fixes
- **Verification**: `npm run build && npm test && npm run lint` -- all green

---

## Phase 3: Resilient Relay (Detached Process)

### TASK-301: Write detached relay tests (TEST-D-001 through TEST-D-007)
- **Status**: DONE
- **Depends on**: TASK-205
- **Type**: TEST_CREATION
- **Ralph prompt**: |
    Create `packages/mcp-server/src/__tests__/relay-detached.test.ts`.

    Read `TESTS.md` TEST-D-001 through TEST-D-007 for specifications.

    Write vitest tests for the detached relay behavior:
    - Use `child_process.fork` or `child_process.spawn` in tests to simulate the detached relay
    - Use `os.tmpdir()` for PID file location
    - Use short idle timeout (2s) for the auto-exit test
    - Clean up PID files and kill processes in afterEach
    - Use random ports in the 39400-39499 range

    The detached relay entry point will be at `../ws/relay-process.js` (a standalone script
    that creates a WsRelay and listens for shutdown signals).

    These tests will fail initially since the detached process module does not exist.
- **Max iterations**: 8
- **Files affected**: `packages/mcp-server/src/__tests__/relay-detached.test.ts`
- **Verification**: Test file compiles (aside from missing module import errors)

### TASK-302: Create relay-process.ts (standalone relay entry point)
- **Status**: DONE
- **Depends on**: TASK-301
- **Type**: IMPLEMENTATION
- **Ralph prompt**: |
    Create `packages/mcp-server/src/ws/relay-process.ts`.

    This is a standalone Node.js script that:
    1. Reads port from process.argv[2] or FIGMA_FAST_PORT env var (default 3056)
    2. Reads idle timeout from process.argv[3] or FIGMA_FAST_RELAY_IDLE_TIMEOUT env var (default 60000ms)
    3. Reads PID file path from process.argv[4] or constructs from os.tmpdir() + '/figma-fast-relay.pid'
    4. Creates a WsRelay instance and starts it
    5. Writes own PID to PID file
    6. Sets up idle timeout: when all connections drop, start a timer. If no new connections
       within timeout, clean up PID file and exit.
    7. Handles SIGTERM and SIGINT: graceful shutdown, clean up PID file, exit.
    8. Sends 'ready' message to parent process (if parent exists) via process.send()

    Run `npm run build --workspace=packages/mcp-server` to verify compilation.
- **Max iterations**: 10
- **Files affected**: `packages/mcp-server/src/ws/relay-process.ts`
- **Verification**: `npm run build --workspace=packages/mcp-server`

### TASK-303: Update server.ts to fork detached relay
- **Status**: DONE
- **Depends on**: TASK-302
- **Type**: IMPLEMENTATION
- **Ralph prompt**: |
    Read `packages/mcp-server/src/ws/server.ts`.
    Read `packages/mcp-server/src/ws/relay-process.ts`.

    Update the startWsServer function in server.ts:

    When no relay is found (connection to port fails), instead of creating a WsRelay in-process:
    1. Check for existing PID file at `os.tmpdir() + '/figma-fast-relay.pid'`
    2. If PID file exists, check if process is alive: `process.kill(pid, 0)`
       - If alive, retry connecting (relay may be starting up)
       - If dead, remove stale PID file, proceed to step 3
    3. Fork the relay-process.ts as a detached child:
       ```typescript
       const child = fork(relayProcessPath, [String(port)], {
         detached: true,
         stdio: ['ignore', 'ignore', 'ignore', 'ipc']
       });
       child.unref();
       ```
    4. Wait for 'ready' message from child process (with timeout)
    5. Connect to the relay as a client

    Handle edge cases:
    - EADDRINUSE on port: retry connecting (another process may have started relay first)
    - Fork failure: fall back to in-process relay (WsRelay) as degraded mode

    Run `npm test -- relay-detached` to run detached tests. Fix until passing.
    Then run `npm test` for full regression.
- **Max iterations**: 15
- **Files affected**: `packages/mcp-server/src/ws/server.ts`
- **Verification**: `npm test` -- all tests pass

### TASK-304: Phase 3 full regression check
- **Status**: DONE
- **Depends on**: TASK-303
- **Type**: REGRESSION
- **Ralph prompt**: |
    Run the full test suite and build:
    ```
    npm run build
    npm test
    npm run lint
    ```

    All tests must pass. All builds must succeed. Lint must pass.
    Pay special attention to:
    - Detached process cleanup (no orphan processes left by tests)
    - PID file cleanup (no stale PID files left by tests)
    - Port conflicts between test suites

    If failures, diagnose and fix.
- **Max iterations**: 10
- **Files affected**: any files that need fixes
- **Verification**: `npm run build && npm test && npm run lint` -- all green
