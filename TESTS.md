# FigmaFast -- Test Specifications

> **Version:** 4.0.0
> **Last updated:** 2026-02-26
> **Framework:** vitest ^4.0.18
> **All tests use Given/When/Then format**
> **Status legend:** SPECIFIED | IMPLEMENTED | PASSING | FAILING | EXISTING

---

## Existing Tests (Baseline)

### `packages/mcp-server/src/__tests__/server.test.ts`
- **Status**: EXISTING (6 FAILING -- stale tool count assertions from get_image_fill addition)
- **Type**: integration
- **Framework**: vitest
- **Count**: 16 tests (10 passing, 6 failing)
- **Notes**: Tests expect 16/19/22/23/24 tools but actual count is +1 each due to get_image_fill tool added later without updating test assertions.

### `packages/mcp-server/src/__tests__/ws-server.test.ts`
- **Status**: EXISTING (PASSING)
- **Type**: unit
- **Framework**: vitest
- **Count**: 2 tests
- **Notes**: Tests sendToPlugin rejection when no plugin connected and timeout behavior.

### `packages/mcp-server/src/__tests__/schemas.test.ts`
- **Status**: EXISTING (PASSING)
- **Type**: unit
- **Framework**: vitest
- **Count**: ~20+ tests (schema validation)

### `packages/shared/src/__tests__/colors.test.ts`
- **Status**: EXISTING (PASSING)
- **Type**: unit

### `packages/shared/src/__tests__/fonts.test.ts`
- **Status**: EXISTING (PASSING)
- **Type**: unit

### `packages/shared/src/__tests__/warnings.test.ts`
- **Status**: EXISTING (PASSING)
- **Type**: unit

---

## Pre-Work: Fix Stale Test Assertions

### TEST-FIX-001: Fix tool count assertions in server.test.ts
- **Status**: SPECIFIED
- **Type**: unit
- **Priority**: critical (blocking -- must pass before new work)
- **File**: `packages/mcp-server/src/__tests__/server.test.ts`

GIVEN the server.test.ts file has hardcoded tool counts (16, 19, 22, 23, 24)
WHEN get_image_fill was added as tool #27 (actually registered as part of read-tools alongside export_node_as_image)
THEN the expected counts are each off by 1 (should be 17, 20, 23, 24, 25, 26 respectively for each phase grouping)
AND after fixing, all 74 tests pass

---

## Phase 1: WS Relay with Multi-Client Registration

### Relay Server Tests

File: `packages/mcp-server/src/__tests__/relay.test.ts`

#### TEST-R-001: Relay server starts and listens on specified port
- **Status**: SPECIFIED
- **Type**: unit
- **Priority**: critical

GIVEN no process is listening on port P (random high port)
WHEN a new WsRelay is created with port P
THEN the relay WebSocketServer is listening on port P
AND a WebSocket client can connect to ws://localhost:P

#### TEST-R-002: Relay identifies plugin connection via hello handshake
- **Status**: SPECIFIED
- **Type**: unit
- **Priority**: critical

GIVEN a relay is running on port P
WHEN a WebSocket client connects and sends `{ type: "hello", ts: <timestamp> }`
THEN the relay identifies this connection as the Figma plugin
AND the relay's internal pluginSocket is set to this connection

#### TEST-R-003: Relay identifies MCP client via register handshake
- **Status**: SPECIFIED
- **Type**: unit
- **Priority**: critical

GIVEN a relay is running on port P
WHEN a WebSocket client connects and sends `{ type: "register", clientId: "uuid-1", clientName: "Claude Desktop" }`
THEN the relay adds this client to its registry with clientId "uuid-1" and clientName "Claude Desktop"
AND the registry has exactly 1 client

#### TEST-R-004: First registered client is designated active
- **Status**: SPECIFIED
- **Type**: unit
- **Priority**: critical

GIVEN a relay is running with no clients registered
WHEN a client registers with clientName "Claude Desktop"
THEN the relay designates this client as active
AND the relay's activeClientId equals the registered clientId

#### TEST-R-005: Second registered client is designated inactive
- **Status**: SPECIFIED
- **Type**: unit
- **Priority**: high

GIVEN a relay is running with one active client "Claude Desktop"
WHEN a second client registers with clientName "Claude Code"
THEN "Claude Code" is added to the registry as inactive
AND the active client remains "Claude Desktop"

#### TEST-R-006: Active client messages forwarded to plugin
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: critical

GIVEN a relay with active client "Claude Desktop" and plugin connected
WHEN "Claude Desktop" sends `{ type: "ping", id: "abc-123" }`
THEN the plugin receives `{ type: "ping", id: "abc-123" }`

#### TEST-R-007: Plugin responses forwarded back to originating client
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: critical

GIVEN a relay with active client "Claude Desktop" and plugin connected
AND "Claude Desktop" has sent a message with id "abc-123"
WHEN the plugin sends `{ type: "pong", id: "abc-123" }`
THEN "Claude Desktop" receives `{ type: "pong", id: "abc-123" }`

#### TEST-R-008: Inactive client messages rejected immediately
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: critical

GIVEN a relay with active client "Claude Desktop" and inactive client "Claude Code"
WHEN "Claude Code" sends `{ type: "ping", id: "xyz-789" }`
THEN "Claude Code" receives an error response within 100ms
AND the error response has `{ type: "result", id: "xyz-789", success: false }`
AND the error message contains "Another client is currently active"
AND the error message contains "Claude Desktop"

#### TEST-R-009: Client disconnect removes from registry
- **Status**: SPECIFIED
- **Type**: unit
- **Priority**: high

GIVEN a relay with two registered clients "A" and "B"
WHEN client "B" disconnects (WebSocket close)
THEN the registry has exactly 1 client
AND client "A" remains in the registry

#### TEST-R-010: Active client disconnect does not auto-promote in Slice 2 mode
- **Status**: SPECIFIED
- **Type**: unit
- **Priority**: high

GIVEN a relay with active client "A" and inactive client "B"
WHEN active client "A" disconnects
THEN the relay has no active client (activeClientId is null)
AND client "B" remains registered but inactive

NOTE: In Phase 1 (without plugin UI), auto-promotion on next command is acceptable. This test validates the Slice 2 behavior where the user must choose.

#### TEST-R-011: Messages to plugin when plugin not connected return error
- **Status**: SPECIFIED
- **Type**: unit
- **Priority**: high

GIVEN a relay with an active client "Claude Desktop" but no plugin connected
WHEN "Claude Desktop" sends `{ type: "ping", id: "abc-123" }`
THEN "Claude Desktop" receives an error response with "Figma plugin is not connected"

#### TEST-R-012: Plugin disconnect rejects pending requests
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: high

GIVEN a relay with active client and plugin connected
AND a message with id "abc-123" has been forwarded to the plugin
WHEN the plugin disconnects before responding
THEN the active client receives an error for id "abc-123" with "Plugin disconnected"

#### TEST-R-013: Relay handles malformed messages without crashing
- **Status**: SPECIFIED
- **Type**: unit
- **Priority**: medium

GIVEN a relay is running with connections
WHEN a connection sends invalid JSON (e.g., "not json at all")
THEN the relay logs an error
AND the relay continues running
AND other connections remain functional

#### TEST-R-014: Relay graceful shutdown closes all connections
- **Status**: SPECIFIED
- **Type**: unit
- **Priority**: medium

GIVEN a relay with 2 clients and 1 plugin connected
WHEN the relay's close() method is called
THEN all WebSocket connections are closed
AND the WebSocketServer stops listening

#### TEST-R-015: Plugin reconnect after disconnect is seamless
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: medium

GIVEN a relay with active client and plugin connected
WHEN the plugin disconnects and then reconnects (new WebSocket, sends hello)
THEN the relay replaces the plugin socket
AND subsequent messages from the active client are forwarded to the new plugin connection

### Server.ts Refactored Tests

File: `packages/mcp-server/src/__tests__/ws-server.test.ts` (extend existing)

#### TEST-S-001: startWsServer starts relay when no relay exists
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: critical

GIVEN no process is listening on port P
WHEN startWsServer(P) is called with clientName "Test Client"
THEN a WS relay is started on port P
AND the MCP server is connected to the relay as a client
AND the client is registered with clientName "Test Client"

#### TEST-S-002: startWsServer connects to existing relay
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: critical

GIVEN a WS relay is already running on port P
WHEN startWsServer(P) is called with clientName "Second Client"
THEN the MCP server connects to the existing relay
AND the client is registered with clientName "Second Client"
AND no new relay is started (port P is not re-bound)

#### TEST-S-003: sendToPlugin works through relay (end-to-end)
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: critical

GIVEN startWsServer(P) has been called and a mock plugin is connected to the relay
WHEN sendToPlugin({ type: "ping" }) is called
THEN the mock plugin receives the ping message
AND when the mock plugin responds with pong, sendToPlugin resolves with the pong

#### TEST-S-004: sendToPlugin rejects when client is inactive
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: critical

GIVEN relay is running with a first active client
AND startWsServer(P) is called for a second client (now inactive)
WHEN sendToPlugin({ type: "ping" }) is called from the second client
THEN sendToPlugin rejects with an error containing "Another client is currently active"

#### TEST-S-005: isPluginConnected reflects relay state
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: high

GIVEN startWsServer(P) has been called and the relay is running
WHEN no plugin has connected to the relay
THEN isPluginConnected() returns false
AND when a mock plugin connects and sends hello
THEN isPluginConnected() returns true

#### TEST-S-006: Race condition -- two processes start simultaneously
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: high

GIVEN no process is listening on port P
WHEN two startWsServer(P) calls are initiated concurrently (simulated with Promises)
THEN one succeeds as relay host and the other connects as client
AND both are registered in the relay
AND no unhandled errors are thrown

#### TEST-S-007: sendToPlugin latency through relay is under 5ms overhead
- **Status**: SPECIFIED
- **Type**: performance
- **Priority**: high

GIVEN relay is running with active client and mock plugin that immediately responds to ping
WHEN sendToPlugin({ type: "ping" }) is called 10 times
THEN the average additional latency (vs direct WS connection baseline) is under 5ms

### Relay Message Type Tests

File: `packages/shared/src/__tests__/messages.test.ts` (new)

#### TEST-M-001: Relay message types are correctly defined
- **Status**: SPECIFIED
- **Type**: unit
- **Priority**: medium

GIVEN the shared messages module
WHEN imported
THEN RelayToClientMessage, ClientToRelayMessage, and PluginToRelayMessage types exist
AND they include: register, client_list, set_active_client, activated, deactivated, relay_error

---

## Phase 2: Plugin UI Client Picker

### Relay Broadcast Tests

File: `packages/mcp-server/src/__tests__/relay.test.ts` (extend)

#### TEST-R-020: Relay broadcasts client_list to plugin on client connect
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: critical

GIVEN a relay with plugin connected and one active client "Claude Desktop"
WHEN a second client "Claude Code" registers
THEN the plugin receives a `client_list` message with 2 clients
AND "Claude Desktop" has isActive: true
AND "Claude Code" has isActive: false

#### TEST-R-021: Relay broadcasts client_list on client disconnect
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: high

GIVEN a relay with plugin connected and two clients
WHEN the inactive client disconnects
THEN the plugin receives an updated `client_list` with 1 client

#### TEST-R-022: set_active_client switches the active client
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: critical

GIVEN a relay with active client "A" (clientId: id-A) and inactive client "B" (clientId: id-B) and plugin connected
WHEN the plugin sends `{ type: "set_active_client", clientId: "id-B" }`
THEN the relay sets client "B" as active and client "A" as inactive
AND the plugin receives an updated client_list with "B" active
AND client "B" receives `{ type: "activated" }`
AND client "A" receives `{ type: "deactivated", reason: "User switched to 'B-name'" }`

#### TEST-R-023: set_active_client with invalid clientId is ignored
- **Status**: SPECIFIED
- **Type**: unit
- **Priority**: medium

GIVEN a relay with active client "A" and plugin connected
WHEN the plugin sends `{ type: "set_active_client", clientId: "nonexistent" }`
THEN the active client remains "A"
AND no error is thrown

#### TEST-R-024: Commands route to newly active client after switch
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: critical

GIVEN relay with clients "A" (active) and "B" (inactive) and plugin connected
AND active client is switched to "B"
WHEN "B" sends a ping message
THEN the plugin receives the ping
AND when "A" sends a ping message, "A" receives rejection error

#### TEST-R-025: Active client disconnect shows no active client in client_list
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: high

GIVEN relay with clients "A" (active) and "B" (inactive) and plugin connected
WHEN "A" disconnects
THEN the plugin receives client_list with 1 client "B" with isActive: false
AND no client is auto-promoted

#### TEST-R-026: Response routing uses correlation ID (not active status)
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: high

GIVEN relay with active client "A" and plugin connected
AND "A" sends message with id "msg-1" which is forwarded to plugin
WHEN active client is switched to "B" BEFORE plugin responds
AND plugin then responds with `{ type: "result", id: "msg-1", success: true }`
THEN client "A" receives the response (not "B")

### Plugin UI Tests

These are behavioral specifications for manual verification. The plugin UI runs in Figma's sandbox and cannot be unit tested with vitest. Test specifications are written for manual acceptance testing.

#### TEST-UI-001: Plugin UI displays connected clients
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: critical

GIVEN two MCP clients are connected to the relay
AND the Figma plugin is open and connected
THEN the plugin UI shows both clients in a list below the connection status
AND each client shows its name and a selection indicator
AND the active client has a filled radio button

#### TEST-UI-002: Plugin UI updates when client connects
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: high

GIVEN the plugin UI shows one active client
WHEN a second MCP server starts and connects
THEN the client list updates within 500ms to show both clients
AND no page refresh or reconnect is needed

#### TEST-UI-003: Plugin UI allows switching active client
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: critical

GIVEN the plugin UI shows two clients with "Claude Desktop" active
WHEN the user clicks on "Claude Code"
THEN "Claude Code" becomes the active client (filled radio)
AND "Claude Desktop" becomes inactive (empty radio)
AND commands from Claude Code now reach the plugin

#### TEST-UI-004: Plugin UI handles no clients state
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: medium

GIVEN the relay is running but no MCP clients are connected
THEN the plugin UI shows "No AI clients connected" in the client area

#### TEST-UI-005: Plugin UI handles active client disconnection
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: high

GIVEN two clients are shown, "Claude Desktop" is active
WHEN "Claude Desktop" disconnects (process exits)
THEN "Claude Desktop" disappears from the list
AND "Claude Code" is shown but NOT auto-activated
AND a notice prompts the user to select a client

---

## Phase 3: Resilient Relay

File: `packages/mcp-server/src/__tests__/relay-detached.test.ts` (new)

#### TEST-D-001: Relay starts as detached child process
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: critical

GIVEN no relay is running
WHEN the MCP server starts and triggers relay creation
THEN a separate child process is forked with detached: true
AND the child process is running and listening on port P
AND the parent process can exit without killing the child

#### TEST-D-002: PID file is created on relay startup
- **Status**: SPECIFIED
- **Type**: unit
- **Priority**: high

GIVEN no relay is running and no PID file exists
WHEN a detached relay process starts
THEN a PID file is written to `<tmpdir>/figma-fast-relay.pid`
AND the file contains the relay process PID as a decimal string

#### TEST-D-003: Relay auto-exits after idle timeout
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: critical

GIVEN a detached relay is running with no connections
WHEN the idle timeout (configurable, default 60s, set to 2s for test) elapses
THEN the relay process exits
AND the PID file is removed

#### TEST-D-004: Relay survives parent process exit
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: critical

GIVEN MCP process A started the detached relay and MCP process B is connected
WHEN MCP process A exits (simulated by disconnecting from relay)
THEN the relay continues running
AND MCP process B remains connected and can send/receive messages

#### TEST-D-005: Stale PID file is detected and cleaned up
- **Status**: SPECIFIED
- **Type**: unit
- **Priority**: high

GIVEN a PID file exists containing PID 99999 (not a running process)
AND no relay is listening on the port
WHEN a new MCP server starts
THEN it detects the stale PID file
AND removes the stale PID file
AND starts a new detached relay

#### TEST-D-006: New MCP process connects to existing detached relay
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: high

GIVEN a detached relay is running (started by a previous MCP process)
WHEN a new MCP process starts
THEN it detects the relay is running (port is occupied)
AND connects as a client without starting a new relay

#### TEST-D-007: PID file is cleaned up on graceful relay shutdown
- **Status**: SPECIFIED
- **Type**: unit
- **Priority**: medium

GIVEN a detached relay is running with a PID file
WHEN the relay receives SIGTERM
THEN it closes all connections gracefully
AND removes the PID file
AND exits

---

## Regression Scope

After each phase, the full test suite must pass:

1. All existing tests in `packages/shared/src/__tests__/` (colors, fonts, warnings)
2. All existing tests in `packages/mcp-server/src/__tests__/schemas.test.ts`
3. All existing tests in `packages/mcp-server/src/__tests__/server.test.ts` (after fixing tool counts)
4. The existing `ws-server.test.ts` tests (may need port adjustment to avoid relay conflicts)
5. All new relay tests
6. `npm run build` succeeds (TypeScript compilation)
7. `npm run lint` passes
