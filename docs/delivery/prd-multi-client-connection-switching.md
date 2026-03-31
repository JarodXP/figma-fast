# PRD: Multi-Client Connection Switching

**Status:** Draft
**Author:** Product Manager Agent
**Date:** 2026-02-26
**Last updated:** 2026-02-26

---

## 1. Problem Statement

FigmaFast currently supports only one MCP client at a time. Each AI client (Claude Desktop, Claude Code) spawns its own MCP server process, which starts an embedded WebSocket server on port 3056. When a user runs both clients simultaneously, the second MCP server process fails to bind port 3056 and cannot connect to the Figma plugin. The user is forced to close both AI clients and reopen only the one they want to use -- a highly disruptive workflow interruption that breaks concentration and costs several minutes each time.

This is a daily pain point for users who work with both Claude Desktop (for conversational design work) and Claude Code (for code-driven design automation) in the same session.

## 2. Goals & Success Metrics

| Goal | Metric | Target | How Measured |
|------|--------|--------|--------------|
| Multiple MCP clients coexist without port conflicts | Number of concurrent MCP server instances that can run | >= 2 simultaneously | Manual verification: start both Claude Desktop and Claude Code with FigmaFast configured |
| User can switch active client without restarting anything | Switches that require closing/reopening an AI client | 0 | Manual verification: switch in plugin UI, send command from newly active client |
| Non-active clients get clear feedback | Non-active client receives explicit rejection (not hang/timeout) | 100% of commands to non-active clients rejected within 1s with actionable error message | Automated test + manual verification |
| No regression in single-client UX | Latency of ping round-trip | No increase > 5ms vs current baseline | Automated test |

## 3. Target Users

**Primary persona: Multi-tool AI designer.** A developer or designer who uses FigmaFast with multiple Claude-based AI clients simultaneously. They use Claude Desktop for conversational, exploratory design work ("make me a card that looks like...") and Claude Code for programmatic, code-driven design automation (scripted batch operations, design system generation). They switch between these clients throughout the day based on the task at hand.

**Current behavior:** They configure FigmaFast in both Claude Desktop and Claude Code. Whichever client they launch first gets the connection. To switch, they must quit both clients and relaunch only the desired one.

**Desired behavior:** Both clients are available simultaneously. They switch which client controls Figma via a simple UI control in the Figma plugin panel, without restarting anything.

## 4. Non-Goals (Explicit Exclusions)

- **Simultaneous multi-client command execution.** Only one client is "active" at a time. We are not building concurrent multi-tenant access to the same Figma file.
- **Multi-file support.** This PRD does not address connecting to multiple Figma files simultaneously. One plugin instance, one Figma file.
- **Remote/networked connections.** All connections remain localhost. No authentication, no remote client discovery.
- **Backward-compatible protocol.** The WebSocket message protocol may change. Old plugin versions do not need to work with new server versions (the user controls both).
- **Command queuing for inactive clients.** Commands from non-active clients are rejected immediately, not queued for later execution.
- **Auto-switching based on last command.** The user explicitly chooses which client is active. No implicit switching.

## 5. Solution Overview

The core architectural change: **decouple the WebSocket server from the MCP server process.** Instead of each MCP server process embedding its own WebSocket server, introduce a lightweight shared relay that multiple MCP server instances connect to as clients, alongside the Figma plugin.

### Architecture (current)

```
Claude Desktop -> MCP Server (pid 1) -> WS Server (:3056) <- Figma Plugin
Claude Code    -> MCP Server (pid 2) -> WS Server (:3056) FAILS (port conflict)
```

### Architecture (proposed)

```
                                        +------------------+
Claude Desktop -> MCP Server (pid 1) -> |                  |
                                        |  WS Relay (:3056)|<-- Figma Plugin
Claude Code    -> MCP Server (pid 2) -> |                  |
                                        +------------------+
                                               ^
                                               |
                                        Plugin UI shows:
                                        [*] Claude Desktop
                                        [ ] Claude Code
                                        (user picks active)
```

The relay process is started on-demand by the first MCP server that launches. Subsequent MCP server instances detect the relay is already running (port occupied) and connect as clients instead of starting a new server. The relay maintains a registry of connected MCP clients and the single Figma plugin connection. It routes messages between the currently-active MCP client and the plugin.

### Alternative considered and rejected: Dynamic port allocation

Each MCP server could pick a unique port and the plugin could connect to multiple WebSocket servers. Rejected because: (a) the Figma plugin manifest `devAllowedDomains` must list each port explicitly at build time, (b) the plugin UI would need to manage multiple WebSocket connections, (c) this pushes routing complexity into the plugin which has the most constrained environment (Figma sandbox).

### Alternative considered and rejected: Single shared MCP server process

A persistent daemon MCP server that multiple AI clients connect to. Rejected because: (a) the MCP protocol assumes the AI client spawns and owns the server process lifecycle, (b) this would require a fundamentally different client configuration model, (c) it breaks the `"command": "node", "args": [...]` pattern that both Claude Desktop and Claude Code use.

## 6. Design Artifacts

No design phase -- the UI change is a small addition to the existing plugin panel (a client list with radio buttons or similar selector). The plugin UI is a simple HTML iframe (`packages/figma-plugin/src/ui.html`), currently ~160 lines. The design is fully described by the functional requirements below.

## 7. Delivery Slices

### Slice 1: WS Relay with Multi-Client Registration

**What the user can do:** Multiple MCP server instances can run simultaneously without port conflicts. The relay tracks connected clients. The Figma plugin connects to the relay. Commands from the first-registered client are routed to the plugin (auto-active, preserving current single-client behavior). Second client gets clear rejection messages.

**Validates assumption:** The relay architecture works -- multiple MCP processes can coexist, messages route correctly, and there is no meaningful latency increase.

**Estimated size:** M

#### Functional Requirements

- FR-1.1: A standalone WS relay server starts on port 3056 (or `FIGMA_FAST_PORT`). It accepts connections from both MCP server instances and the Figma plugin.
- FR-1.2: Each MCP server instance connects to the relay as a WebSocket client and sends a registration message containing a `clientId` (UUID) and a human-readable `clientName` (e.g., "Claude Desktop", "Claude Code"). The `clientName` should be derived from the `MCP_CLIENT_NAME` environment variable if set, otherwise default to "MCP Client <short-uuid>".
- FR-1.3: The Figma plugin connects to the relay as it does today (same URL, same reconnect logic). The relay distinguishes the plugin connection from MCP client connections via a handshake message type.
- FR-1.4: The relay maintains a registry of connected MCP clients: `Map<clientId, { socket, clientName, connectedAt }>`.
- FR-1.5: The relay designates the first MCP client to register as the "active" client. All subsequent clients are "inactive."
- FR-1.6: Messages from the active client are forwarded to the Figma plugin. Responses from the plugin are forwarded back to the active client. Message correlation IDs are preserved.
- FR-1.7: Messages from inactive clients receive an immediate error response: `{ type: "result", id: "<correlation-id>", success: false, error: "Another client is currently active in the Figma plugin. Client '<active-client-name>' is connected. Switch the active client in the Figma plugin panel to use this client." }`.
- FR-1.8: When the MCP server process starts, it first attempts to connect to an existing relay on the configured port. If the connection succeeds, it registers as a client. If the connection fails (no relay running), it starts the relay itself and then connects to it as the first client.
- FR-1.9: When an MCP client disconnects (process exits), the relay removes it from the registry. If the disconnected client was active and other clients remain, the relay does NOT auto-promote another client -- it waits for user selection (or in Slice 1, the next command from any remaining client triggers an auto-promotion to preserve backward compatibility until the UI picker exists in Slice 2).
- FR-1.10: When the Figma plugin disconnects, all pending requests from the active client are rejected with "Plugin disconnected" (existing behavior). The relay retains the client registry so reconnection is seamless.
- FR-1.11: The relay process exits automatically when all MCP clients and the plugin have disconnected (no orphan processes).

#### Non-Functional Requirements

- NFR-1.1: The relay must add no more than 5ms latency to the ping round-trip compared to the current direct connection.
- NFR-1.2: The relay must handle clean shutdown: SIGTERM/SIGINT cause graceful close of all connections.
- NFR-1.3: The relay must log connection/disconnection events to stderr (consistent with current logging convention).

#### Happy Path

1. User launches Claude Desktop. Its MCP server starts, finds no relay on port 3056, starts the relay, connects as client "Claude Desktop", and is auto-designated active.
2. User launches Claude Code. Its MCP server starts, finds the relay on port 3056, connects as client "Claude Code", and is registered as inactive.
3. User opens FigmaFast plugin in Figma. Plugin connects to the relay on port 3056.
4. User asks Claude Desktop to ping Figma. The relay forwards the ping to the plugin, plugin responds with pong, relay forwards pong back to Claude Desktop. User sees `pong (Xms round-trip)`.
5. User asks Claude Code to ping Figma. The relay immediately responds with an error: "Another client is currently active. Client 'Claude Desktop' is connected."

#### Edge Cases

- EC-1.1: Both MCP servers start at exactly the same time and both try to start the relay. --> The second process's `listen()` call fails with EADDRINUSE. It retries connection to the relay after a short delay (e.g., 500ms, up to 3 retries).
- EC-1.2: The MCP process that started the relay exits (e.g., Claude Desktop quits). The relay is an in-process server, so it dies with the process. --> All other clients lose connection. The next MCP server to start will start a new relay. (This is acceptable for Slice 1; Slice 3 addresses this with a persistent relay option.)
- EC-1.3: The Figma plugin connects before any MCP client. --> The relay accepts and holds the plugin connection. When an MCP client registers and sends a command, it is routed normally.
- EC-1.4: An MCP client sends a command but the Figma plugin is not connected. --> The relay returns the existing "Figma plugin is not connected" error to the client.
- EC-1.5: The relay receives a malformed message. --> Log the error, drop the message, do not crash.

#### Acceptance Tests (GWT)

```gherkin
Feature: WS Relay Multi-Client Registration

  Scenario: First MCP client starts relay and connects
    Given no process is listening on port 3056
    When an MCP server process starts with FigmaFast configured
    Then the process starts a WS relay on port 3056
    And the process connects to the relay as a client
    And the client is designated as "active"

  Scenario: Second MCP client connects to existing relay
    Given the WS relay is running on port 3056 with one active client "Claude Desktop"
    When a second MCP server process starts with FigmaFast configured
    Then the second process connects to the relay as a client "Claude Code"
    And "Claude Code" is registered as "inactive"
    And "Claude Desktop" remains "active"

  Scenario: Active client commands are routed to plugin
    Given the relay has active client "Claude Desktop" and the Figma plugin connected
    When "Claude Desktop" sends a ping message
    Then the relay forwards the ping to the Figma plugin
    And the plugin's pong response is forwarded back to "Claude Desktop"
    And the round-trip completes in under 50ms

  Scenario: Inactive client commands are rejected immediately
    Given the relay has active client "Claude Desktop" and inactive client "Claude Code"
    When "Claude Code" sends a ping message
    Then "Claude Code" receives an error response within 1 second
    And the error message contains "Another client is currently active"
    And the error message contains the name "Claude Desktop"

  Scenario: Race condition on relay startup
    Given no process is listening on port 3056
    When two MCP server processes start simultaneously
    Then one process successfully starts the relay
    And the other process retries and connects as a client
    And both processes are registered in the relay

  Scenario: Relay host process exits
    Given the relay was started by MCP process A and MCP process B is also connected
    When MCP process A exits
    Then the relay shuts down
    And MCP process B loses its connection
    And MCP process B can start a new relay on the next command attempt
```

---

### Slice 2: Plugin UI Client Picker

**What the user can do:** The Figma plugin panel shows a list of connected AI clients. The user can select which client is active by clicking on it. Switching is instant and does not require restarting anything.

**Validates assumption:** Users can successfully discover and switch between clients without confusion. The mental model of "pick which AI controls Figma" is intuitive.

**Estimated size:** S

#### Functional Requirements

- FR-2.1: The relay broadcasts a `client_list` message to the Figma plugin whenever the client registry changes (client connects, disconnects, or active client changes). The message contains: `{ type: "client_list", clients: [{ clientId, clientName, isActive, connectedAt }] }`.
- FR-2.2: The Figma plugin UI displays the list of connected clients below the existing connection status indicator. Each client shows its name and an indicator of whether it is active.
- FR-2.3: The user can click on an inactive client to make it active. This sends a `set_active_client` message to the relay: `{ type: "set_active_client", clientId: "<id>" }`.
- FR-2.4: The relay processes `set_active_client` by updating the active designation and broadcasting an updated `client_list` to the plugin.
- FR-2.5: When only one client is connected, the UI shows it as active with no switcher affordance (no unnecessary UI complexity).
- FR-2.6: When no MCP clients are connected, the UI shows "No AI clients connected" in the client list area.
- FR-2.7: The relay notifies the newly-active client with a `{ type: "activated" }` message and the newly-deactivated client with a `{ type: "deactivated", reason: "User switched to '<new-client-name>'" }` message. (These are informational -- clients do not need to act on them, but they enable better error messages.)

#### Non-Functional Requirements

- NFR-2.1: The client list UI must update within 500ms of a client connecting, disconnecting, or being switched.
- NFR-2.2: The plugin UI must remain functional and not break if the relay sends unexpected or malformed `client_list` data (defensive rendering).

#### Happy Path

1. User has Claude Desktop and Claude Code connected. The plugin UI shows:
   ```
   Connected to relay
   AI Clients:
   (*) Claude Desktop    [connected 2m ago]
   ( ) Claude Code       [connected 30s ago]
   ```
2. User clicks on "Claude Code" in the plugin UI.
3. The plugin sends `set_active_client` to the relay.
4. The relay updates the active client and broadcasts the new `client_list`.
5. The plugin UI updates immediately:
   ```
   AI Clients:
   ( ) Claude Desktop    [connected 2m ago]
   (*) Claude Code       [connected 30s ago]
   ```
6. User asks Claude Code to build a scene. It works.
7. User asks Claude Desktop to build a scene. It gets the rejection error: "Another client is currently active."

#### Edge Cases

- EC-2.1: User clicks to switch client while a command from the current active client is in-flight (pending response from plugin). --> The switch is deferred until the in-flight command completes or times out. The relay sends a "Switch pending -- waiting for in-flight command to complete" status to the plugin UI.
- EC-2.2: The active client disconnects while the plugin UI is open. --> The client disappears from the list. If other clients remain, no client is auto-promoted (the user must click to activate one). The UI shows a notice: "Active client disconnected. Select a client."
- EC-2.3: A client connects while the user is looking at the plugin UI. --> The list updates live (within 500ms) without requiring any user action.

#### Acceptance Tests (GWT)

```gherkin
Feature: Plugin UI Client Picker

  Scenario: Plugin UI shows connected clients
    Given the relay has two connected clients "Claude Desktop" (active) and "Claude Code" (inactive)
    And the Figma plugin is connected to the relay
    Then the plugin UI displays both clients in a list
    And "Claude Desktop" is shown as active
    And "Claude Code" is shown as inactive

  Scenario: User switches active client via plugin UI
    Given the plugin UI shows "Claude Desktop" as active and "Claude Code" as inactive
    When the user clicks on "Claude Code"
    Then the plugin sends a set_active_client message to the relay
    And the relay updates "Claude Code" to active
    And the relay updates "Claude Desktop" to inactive
    And the plugin UI reflects the change within 500ms
    And commands from "Claude Code" are now routed to the plugin
    And commands from "Claude Desktop" are now rejected

  Scenario: Client list updates when client connects
    Given the plugin UI shows one client "Claude Desktop" as active
    When a new MCP server process connects as "Claude Code"
    Then the plugin UI updates within 500ms to show both clients
    And "Claude Desktop" remains active

  Scenario: Client list updates when active client disconnects
    Given the plugin UI shows "Claude Desktop" (active) and "Claude Code" (inactive)
    When "Claude Desktop" disconnects
    Then the plugin UI removes "Claude Desktop" from the list
    And the plugin UI shows a notice prompting the user to select a client
    And "Claude Code" is shown but not automatically activated

  Scenario: Switch deferred during in-flight command
    Given "Claude Desktop" is active and has a build_scene command in-flight
    When the user clicks to switch to "Claude Code"
    Then the plugin UI shows "Switch pending" status
    And the switch completes after the in-flight command finishes
    And "Claude Code" becomes active

  Scenario: Single client shows no switcher
    Given only one client "Claude Desktop" is connected
    Then the plugin UI shows "Claude Desktop" as active
    And no switch affordance is visible

  Scenario: No clients connected
    Given no MCP clients are connected to the relay
    Then the plugin UI shows "No AI clients connected"
```

---

### Slice 3: Resilient Relay (Relay Survives Host Process Exit)

**What the user can do:** When the AI client that originally started the relay exits, the relay continues running for remaining clients. No disruption, no reconnection needed.

**Validates assumption:** Long-running sessions with intermittent client restarts are common enough to warrant relay resilience.

**Estimated size:** S

#### Functional Requirements

- FR-3.1: The relay runs as a separate child process (forked/detached) rather than in-process with the first MCP server. This allows it to survive the parent process exiting.
- FR-3.2: The detached relay process writes its PID to a well-known location (e.g., `/tmp/figma-fast-relay.pid` or OS-appropriate temp directory) so subsequent MCP server instances can verify the relay is alive (not just that the port is occupied by something else).
- FR-3.3: The relay auto-exits after a configurable idle timeout (default: 60 seconds) when all clients and the plugin have disconnected. This prevents orphan processes.
- FR-3.4: If a stale PID file exists but the process is dead, the new MCP server cleans up the PID file and starts a fresh relay.

#### Non-Functional Requirements

- NFR-3.1: The relay child process must not keep the parent's stdio streams open (fully detached, no stdout/stderr inheritance that would block parent exit).
- NFR-3.2: The relay must work on macOS and Windows (the two platforms Figma Desktop runs on).

#### Happy Path

1. User launches Claude Desktop. Its MCP server forks a detached relay process and connects.
2. User launches Claude Code. Its MCP server finds the relay, connects.
3. User quits Claude Desktop. The relay continues running. Claude Code remains connected and functional.
4. User relaunches Claude Desktop. Its MCP server finds the relay, connects as a new client.
5. User quits both clients. Relay detects no connections, waits 60 seconds, exits.

#### Edge Cases

- EC-3.1: Relay process is killed (e.g., `kill -9`). --> MCP server detects disconnection, starts new relay on next command attempt.
- EC-3.2: PID file exists but relay is actually dead (stale). --> MCP server checks if PID is alive (e.g., `process.kill(pid, 0)`), finds it dead, removes PID file, starts new relay.
- EC-3.3: Multiple processes race to start a detached relay. --> Same EADDRINUSE retry logic from Slice 1 applies.

#### Acceptance Tests (GWT)

```gherkin
Feature: Resilient Relay

  Scenario: Relay survives host process exit
    Given MCP process A started the relay and MCP process B is connected
    When MCP process A exits
    Then the relay continues running
    And MCP process B remains connected and can send commands

  Scenario: Relay auto-exits after idle timeout
    Given the relay is running with no connected clients or plugin
    When 60 seconds pass with no new connections
    Then the relay process exits
    And the PID file is cleaned up

  Scenario: New MCP process connects after host exits
    Given MCP process A started the relay and then exited
    And the relay is still running
    When MCP process C starts
    Then MCP process C connects to the existing relay
    And MCP process C can register and send commands

  Scenario: Stale PID file cleanup
    Given a PID file exists at the well-known location
    And the PID in the file does not correspond to a running process
    When a new MCP server process starts
    Then it removes the stale PID file
    And starts a new relay process
```

---

## 8. Assumptions & Open Questions

| # | Assumption / Question | Status | Owner |
|---|----------------------|--------|-------|
| 1 | Each AI client spawns its own MCP server process (confirmed by MCP SDK architecture) | Validated | PM |
| 2 | The MCP protocol does not support a shared/daemon server model -- clients expect to own the process lifecycle | Assumed -- needs verification | CTO |
| 3 | Claude Desktop and Claude Code both set an environment variable or can be configured to set `MCP_CLIENT_NAME` for human-readable client identification | Open -- needs investigation | CTO |
| 4 | The Figma plugin manifest `devAllowedDomains` only needs `ws://localhost:3056` (single port, relay on same port) | Validated | PM |
| 5 | Users typically have at most 2-3 MCP clients running simultaneously (not 10+) | Assumed | PM |
| 6 | The relay can detect "plugin" vs "MCP client" connections via a handshake message (not port or header sniffing) | Assumed -- straightforward to implement | CTO |
| 7 | Forking a detached child process works reliably on both macOS and Windows for Node.js | Assumed -- Node.js `child_process.fork` with `detached: true` is well-documented for both platforms | CTO |

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Relay adds latency to all commands (extra WS hop) | M | L | Benchmark in Slice 1. The relay is localhost-only, so the extra hop should add <1ms. Acceptance criteria: <5ms added. |
| Relay process becomes an orphan (never exits) | M | M | Idle timeout auto-exit (Slice 3, FR-3.3). PID file for diagnostics. Clear shutdown on SIGTERM. |
| Race conditions during startup when both clients launch simultaneously | L | M | EADDRINUSE detection + retry with backoff (EC-1.1). Well-tested in acceptance tests. |
| MCP client identification is not human-readable (no way to distinguish "Claude Desktop" from "Claude Code") | M | M | Use `MCP_CLIENT_NAME` env var with fallback to "MCP Client <short-id>". Users can set this in their Claude config if auto-detection fails. |
| Switching active client during in-flight commands causes dropped responses | M | H | Defer switch until in-flight commands complete (EC-2.1). Clear UI feedback. |
| The relay architecture is a significant refactor of ws/server.ts | L | M | Slice 1 can be implemented as a new module (e.g., `ws/relay.ts`) alongside the existing `ws/server.ts`. The existing `sendToPlugin` API can be adapted to route through the relay, minimizing changes to tool files. |

## 10. Dependencies

- **MCP SDK behavior:** Need to confirm that `@modelcontextprotocol/sdk` does not impose restrictions on the server process connecting to external WebSocket servers (it should not -- the SDK only cares about the stdio transport).
- **Claude Desktop / Claude Code configuration:** Need to confirm that environment variables (like `MCP_CLIENT_NAME`) can be passed through the MCP server config's `env` field.
- **Figma plugin manifest:** The `devAllowedDomains` already allows `ws://localhost:3056`. No manifest changes needed as long as the relay runs on the same port.

## 11. Future Considerations

- **Multi-file support:** The channel/relay architecture could be extended to support multiple Figma plugin instances (multiple files), each identified by a file key. Deferred -- the current request is explicitly single-file.
- **Authentication/authorization:** If FigmaFast is ever used in a team setting over a network, the relay would need auth. Deferred -- all connections are localhost for now.
- **Client auto-naming:** If Claude Desktop and Claude Code expose their identity through environment variables or MCP handshake metadata, the relay could auto-detect client names without requiring manual `MCP_CLIENT_NAME` configuration.
- **Command history per client:** The relay could log which client sent which commands, enabling an audit trail. Deferred.

## 12. CTO Advisor Feasibility Input

### Feasibility Assessment

The proposed relay architecture is **feasible and relatively low-risk.** Key technical findings:

**1. Port conflict is the root cause, not routing.**
The current architecture has each MCP server process call `startWsServer(port)` in-process. Since `WebSocketServer` binds exclusively to the port, the second process fails. The relay pattern (first process starts relay, subsequent processes connect as clients) is a well-established pattern for this class of problem.

**2. The `sendToPlugin` abstraction makes this tractable.**
All 27 MCP tools call `sendToPlugin()` from `ws/server.ts`. This is the only integration point. If `sendToPlugin` is refactored to route through a relay client connection instead of a direct plugin socket, **zero tool files need to change.** The same `isPluginConnected()` check can be updated to query relay state. This is the 80/20 path.

**3. The relay is a thin message forwarder.**
It does not need to understand the message protocol beyond: (a) distinguishing plugin from MCP client connections (handshake), (b) tracking which client is active, (c) forwarding messages bidirectionally between active client and plugin. No message parsing, no validation, no transformation. Estimated at ~200-300 lines of code.

**4. Risk: relay-in-process vs detached process.**
Slice 1 runs the relay in-process with the first MCP server (simpler). Slice 3 makes it a detached child process (resilient). The in-process approach is simpler and validates the architecture. The detached approach adds OS-level complexity (PID files, process management, platform differences). Slicing this way is correct.

**5. Effort characterization:**
- Slice 1 (relay + multi-client registration): **M** -- New module `ws/relay.ts`, refactor `ws/server.ts` to become a relay client, update `sendToPlugin`/`isPluginConnected`, startup logic for detect-or-start relay. ~400-500 lines of new code + tests.
- Slice 2 (plugin UI picker): **S** -- New message types (`client_list`, `set_active_client`), ~50-80 lines of HTML/JS additions to `ui.html`, relay-side broadcast logic. Mostly UI work.
- Slice 3 (resilient relay): **S** -- Fork relay to detached process, PID file management, idle timeout. Well-contained changes to the relay startup path.

**6. No off-the-shelf solution exists.**
This is a custom MCP-to-Figma bridge. The relay must be custom code. No library or framework solves this specific problem.
