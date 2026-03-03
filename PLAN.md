# FigmaFast -- Strategic Plan

> **Version:** 4.0.0
> **Last updated:** 2026-02-26
> **CTO audit status:** Multi-Client Connection Switching planned
> **Source PRD:** `docs/prds/multi-client-connection-switching.md`

---

## Summary

Add WebSocket relay architecture so multiple MCP server processes (Claude Desktop + Claude Code) can coexist on port 3056 without conflicts. First server to start becomes the relay; subsequent servers connect as relay clients. The Figma plugin connects to the relay as before (same URL, same port). A UI picker in the plugin panel lets the user choose which AI client is active. Only the active client's commands are forwarded to the plugin; inactive clients receive immediate rejection with an actionable error message.

## Project Baseline

- **Repo**: figma-fast (monorepo: packages/mcp-server, packages/figma-plugin, packages/shared)
- **Created**: 2025 (initial version)
- **Last active**: 2026-02-26
- **Contributors**: 1 primary
- **Releases**: no tags, HEAD at `a2608ce`
- **CI/CD**: none detected
- **Test framework**: Vitest 4.x, Node environment
- **Test coverage**: 6 test files, 74 total tests (68 passing, 6 failing -- stale tool count assertions)
- **Language**: TypeScript 5.9, ESM modules, Node16 module resolution
- **Runtime**: Node.js (ES2022 target)
- **Build**: tsc for mcp-server/shared, esbuild for figma-plugin
- **Package manager**: npm workspaces
- **WS library**: `ws` 8.18
- **MCP SDK**: `@modelcontextprotocol/sdk` 1.12.1

## Requirements Challenges

| # | Original Requirement | Challenge | Recommendation | Status |
|---|---------------------|-----------|----------------|--------|
| 1 | FR-1.8: Detect relay or start one | Race condition when two processes start simultaneously (EC-1.1). Retry logic needs specification. | 3 retries, 300ms initial delay, 1.5x backoff. Max wait ~1.35s. After 3 failures, fall back to standalone mode. | Accepted |
| 2 | FR-1.11: Relay exits when all disconnect | In Slice 1 (in-process relay), relay IS the host process. Cannot exit independently. | FR-1.11 is a Slice 3 concern only. In Slice 1 relay dies with its host process. | Accepted |
| 3 | FR-2.5: Single client shows no switcher | Premature UI optimization. Adds conditional rendering complexity for no real benefit. | Show client list always, even with one client. One selected radio is self-explanatory. | Accepted |
| 4 | EC-2.1: Defer switch during in-flight command | Adds significant state tracking complexity. In-flight responses can be routed by correlation ID to the original client regardless of active status. | Immediate switching in Slice 2. Relay routes responses by correlation ID, so original client always gets its response. No data loss. Deferred switch is a future optimization. | Accepted |
| 5 | PRD Assumption #3: MCP_CLIENT_NAME env var | Need to verify Claude Desktop/Code set this automatically or can be configured. | Use `MCP_CLIENT_NAME` env var with fallback chain: `MCP_CLIENT_NAME` -> heuristic detection (e.g., `TERM_PROGRAM`, `MCP_CALLER`) -> "MCP Client <short-uuid>". | Accepted |
| 6 | NFR-3.2: Relay works on macOS and Windows | `child_process.fork` with `detached: true` works on both. Signal handling differs. | Test on macOS first. Windows support is best-effort for Slice 3. | Accepted |

## Architecture Decision Records

### ADR-001: Relay-in-Process for Slice 1, Detached for Slice 3
- **Status**: Accepted
- **Context**: The relay needs to run on port 3056. It can either run in-process with the first MCP server, or as a separate detached process from the start.
- **Decision**: Slice 1 runs relay in-process. Validates the architecture with minimal complexity. Slice 3 graduates to detached process.
- **Consequences**: In Slice 1, if the first MCP server exits, all other clients lose connection. Explicitly acceptable per PRD EC-1.2.

### ADR-002: sendToPlugin API Preserved, Implementation Swapped
- **Status**: Accepted
- **Context**: All 10 tool files import `sendToPlugin` and `isPluginConnected` from `ws/server.ts`. This is the single integration point for 26 MCP tools.
- **Decision**: `ws/server.ts` retains its exported API but the implementation changes. `startWsServer` becomes "start-or-connect-to-relay". `sendToPlugin` routes through the relay client connection. Zero tool file changes.
- **Consequences**: All existing imports and tool code remain untouched. New relay logic lives in `ws/relay.ts`.

### ADR-003: Plugin-vs-Client Differentiation via Handshake Message
- **Status**: Accepted
- **Context**: Relay must distinguish Figma plugin WS connections from MCP client connections. Plugin already sends `{ type: 'hello', ts: ... }` on connect (ui.html line 104).
- **Decision**: MCP clients send `{ type: 'register', clientId, clientName }`. Plugin sends `{ type: 'hello' }`. Relay classifies by first message type.
- **Consequences**: Clean separation. No URL/header sniffing. The plugin's existing handshake works without changes in Slice 1.

### ADR-004: Immediate Switch, No Deferred Switch in Slice 2
- **Status**: Accepted
- **Context**: PRD EC-2.1 specifies deferring client switch during in-flight commands.
- **Decision**: Immediate switching. Relay tracks correlation ID source, routes responses to originating client regardless of active status.
- **Consequences**: Simpler implementation. Original client always gets its response. Edge case is handled correctly without complexity.

### ADR-005: New Relay Message Types in Shared Package
- **Status**: Accepted
- **Context**: Need new message types for relay protocol (register, client_list, set_active_client, activated, deactivated, relay_error). These are relay-internal and do not flow to the Figma plugin main thread.
- **Decision**: Add relay message types to `packages/shared/src/messages.ts`. This keeps the single source of truth for all WS message types.
- **Consequences**: Shared package grows slightly. Plugin main thread does not need to handle these types -- they are consumed by `ui.html` JavaScript and the relay.

## Technology Stack

| Layer | Choice | Version | Rationale |
|-------|--------|---------|----------|
| WS Server (relay) | `ws` | 8.18 | Already in use. Relay is just another WebSocketServer instance. |
| WS Client (mcp-to-relay) | `ws` | 8.18 | MCP server becomes a WS client. Same library, no new dependency. |
| UUID | `uuid` | 11.1 | Already in use. Used for clientId generation. |
| Test | `vitest` | 4.x | Already in use. All new tests use vitest. |
| Process mgmt (Slice 3) | `child_process` (Node built-in) | N/A | Fork with detached: true. No new dependency. |

## Phases

### Phase 0: Completed (Baseline)
FigmaFast has 26 MCP tools across 10 tool files, a direct WS connection architecture (`ws/server.ts` binds port 3056, plugin connects to it), a shared message protocol (`packages/shared/src/messages.ts`), and 74 tests (68 passing, 6 failing due to stale tool count assertions from `get_image_fill` addition). The codebase is clean, well-structured TypeScript.

**Key file inventory:**
- `packages/mcp-server/src/ws/server.ts` -- WS server, `sendToPlugin`, `isPluginConnected`, `startWsServer` (128 lines)
- `packages/mcp-server/src/index.ts` -- entry point, starts WS and MCP servers (54 lines)
- `packages/figma-plugin/src/ui.html` -- plugin UI with WS client, reconnect logic (158 lines)
- `packages/shared/src/messages.ts` -- all WS message types (98 lines)
- 10 tool files in `packages/mcp-server/src/tools/` -- all import from `ws/server.ts`

### Phase 1: WS Relay with Multi-Client Registration (Slice 1) -- Estimated: 40-55 iterations

1. Add relay message types to shared package
2. Create `ws/relay.ts` -- the relay server (~250-300 lines)
3. Refactor `ws/server.ts` -- detect-or-start relay, connect as client (~200 lines rewrite)
4. Update `index.ts` entry point -- pass `MCP_CLIENT_NAME` env var
5. Comprehensive unit and integration tests

**Success criteria:**
- Two MCP server processes can run simultaneously
- First is auto-active, second gets clear rejection
- Ping round-trip adds <5ms latency vs baseline
- Plugin connects to relay identically to current direct connection
- All existing 68 passing tests continue to pass

### Phase 2: Plugin UI Client Picker (Slice 2) -- Estimated: 25-35 iterations

1. Add `client_list` broadcast logic to relay
2. Add `set_active_client` handling to relay
3. Add `activated`/`deactivated` notifications
4. Update `ui.html` -- client list UI, switch interaction
5. Tests for new relay message flows and UI behavior

**Success criteria:**
- Plugin UI shows connected clients with selection indicator
- User can switch active client by clicking
- Switch takes effect within 500ms
- Commands route to newly active client immediately

### Phase 3: Resilient Relay (Slice 3) -- Estimated: 20-30 iterations

1. Fork relay to detached child process
2. PID file management (`os.tmpdir()/figma-fast-relay.pid`)
3. Idle timeout auto-exit (60s default)
4. Stale PID cleanup
5. Tests for process lifecycle

**Success criteria:**
- Relay survives parent process exit
- Other clients remain connected after parent exits
- New MCP processes connect to existing detached relay
- Relay auto-exits after 60s with no connections
- Stale PID files are detected and cleaned up

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Relay adds latency | Low | Low | Localhost WS hop is <1ms. Benchmark in Phase 1 tests. Acceptance: <5ms added. |
| sendToPlugin API contract breaks | Low | High | ADR-002: Preserve exact function signatures. Full regression suite. |
| Race condition on relay startup | Medium | Medium | Retry with backoff (3x, 300ms+). Integration test covers this. |
| Plugin WS reconnect loop | Low | Medium | Plugin already has reconnect with backoff. Relay accepts identically. |
| 6 pre-existing failing tests | Medium | Low | Fix tool count assertions in a pre-work task before starting relay work. |
| Vitest module-level singleton in ws/server.ts | Medium | Medium | Tests may share state. Use unique ports per test. Reset module state between tests. |

## Out of Scope

- Simultaneous multi-client command execution (one active client at a time)
- Multi-file / multi-plugin-instance support
- Remote/networked connections (localhost only)
- Authentication or authorization
- Command queuing for inactive clients
- Auto-switching based on last command
- Backward compatibility with old plugin versions
- Deferred switching during in-flight commands (future optimization)
