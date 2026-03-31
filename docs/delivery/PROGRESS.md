# FigmaFast -- Progress Tracker

> **Version:** 4.1.0
> **Last updated:** 2026-02-26

---

## Project Baseline (from onboarding / git archaeology)

- 12 commits, 1 contributor
- 26 MCP tools across 10 tool files
- 6 test files, 74 tests (68 passing, 6 failing -- stale tool count assertions)
- Direct WS connection: server.ts binds port 3056
- No CI/CD
- HEAD: `a2608ce` on main

## Current Sprint: Multi-Client Connection Switching

Source: PRD `docs/prds/multi-client-connection-switching.md`

### Pre-Work

| Task | Type | Status | Iterations Used | Tests Green | Notes |
|------|------|--------|----------------|-------------|-------|
| TASK-000: Fix stale test assertions | BUG_FIX | DONE | 1/3 | 74/74 | Fixed 6 tool count assertions (+1 each for get_image_fill) |

### Phase 1: WS Relay with Multi-Client Registration

| Task | Type | Status | Iterations Used | Tests Green | Notes |
|------|------|--------|----------------|-------------|-------|
| TASK-101: Add relay message types | IMPLEMENTATION | DONE | 1/5 | 74/74 | Added RelayClientInfo, ClientToRelayMessage, RelayToClientMessage, PluginToRelayMessage, RelayToPluginMessage, plugin_connected/disconnected |
| TASK-102: Write relay server tests | TEST_CREATION | DONE | 1/10 | 15 new tests | relay.test.ts -- TEST-R-001 through TEST-R-015 |
| TASK-103: Implement WsRelay class | IMPLEMENTATION | DONE | 1/20 | 15/15 | ws/relay.ts -- broadcasts plugin_connected/disconnected to clients |
| TASK-104: Write server.ts refactored tests | TEST_CREATION | DONE | 1/8 | 9 new tests | ws-server.test.ts extended with TEST-S-001 through TEST-S-007 |
| TASK-105: Refactor ws/server.ts | IMPLEMENTATION | DONE | 1/20 | 9/9 | Relay-based; exports _resetForTesting; startWsServer(port, clientName?) |
| TASK-106: Update index.ts entry point | IMPLEMENTATION | DONE | 1/3 | 96/96 | CLIENT_NAME from env, updated log message |
| TASK-107: Phase 1 regression check | REGRESSION | DONE | 1/10 | 96/96 | All green: build + test + lint (4 pre-existing warnings) |

### Phase 2: Plugin UI Client Picker

| Task | Type | Status | Iterations Used | Tests Green | Notes |
|------|------|--------|----------------|-------------|-------|
| TASK-201: Write broadcast tests | TEST_CREATION | DONE | 1/8 | 7 new tests | relay.test.ts -- TEST-R-020 through TEST-R-026, nextMessageOfType() helper |
| TASK-202: Implement broadcast/switch | IMPLEMENTATION | DONE | 1/15 | 22/22 | broadcastClientList(), handleSetActiveClient(), activated/deactivated msgs |
| TASK-203: Update server.ts for activated/deactivated | IMPLEMENTATION | DONE | 1/5 | 103/103 | Already handled in Phase 1 (TASK-105), verified passing |
| TASK-204: Update plugin UI | IMPLEMENTATION | DONE | 1/10 | N/A (manual) | ui.html client list, renderClientList(), set_active_client dispatch, height 300 |
| TASK-205: Phase 2 regression check | REGRESSION | DONE | 1/10 | 103/103 | Build + test + lint all clean (4 pre-existing warnings) |

### Phase 3: Resilient Relay

| Task | Type | Status | Iterations Used | Tests Green | Notes |
|------|------|--------|----------------|-------------|-------|
| TASK-301: Write detached relay tests | TEST_CREATION | DONE | 1/8 | 7 new tests | relay-detached.test.ts -- TEST-D-001 through TEST-D-007 |
| TASK-302: Create relay-process.ts | IMPLEMENTATION | DONE | 1/10 | N/A | ws/relay-process.ts -- standalone entry, PID file, idle timeout, IPC ready |
| TASK-303: Update server.ts to fork | IMPLEMENTATION | DONE | 3/15 | 110/110 | In-process relay fast path + background fork for persistence |
| TASK-304: Phase 3 regression check | REGRESSION | DONE | 1/10 | 110/110 | Build + test + lint all green (4 pre-existing warnings only) |

## Regression Status

| Suite | Status | Count | Last Run |
|-------|--------|-------|----------|
| shared/colors | PASSING | 11 | 2026-03-02 |
| shared/fonts | PASSING | 8 | 2026-03-02 |
| shared/warnings | PASSING | 7 | 2026-03-02 |
| mcp-server/schemas | PASSING | 30 | 2026-03-02 |
| mcp-server/server | PASSING | 16 | 2026-03-02 |
| mcp-server/ws-server | PASSING | 9 | 2026-03-02 |
| mcp-server/relay | PASSING | 22 | 2026-03-02 |
| mcp-server/relay-detached | PASSING | 7 | 2026-03-02 |

## Phase 1 Implementation Notes

### Architecture Changes (vs pre-relay)
- `ws/server.ts` is now a RELAY CLIENT, not a server. It tries to connect to an existing relay; if none, starts one in-process via `WsRelay`.
- `ws/relay.ts` (NEW) -- WsRelay class. Binds the port. Classifies connections via first message: `hello` = plugin, `register` = MCP client.
- Relay broadcasts `plugin_connected`/`plugin_disconnected` to all registered clients when plugin state changes.
- `isPluginConnected()` returns true only when: relay connection open AND isActive AND pluginConnected.
- `sendToPlugin()` rejects immediately if not active (uses "Another client is currently active" message).
- `_resetForTesting()` exported to allow test isolation.

### Key Design Decisions
- Relay uses `result(success:false)` for inactive client rejection (per TEST-R-008 spec).
- Server.ts does pre-flight check for `isActive` flag (tracked from `registered` message) to reject with correct error.
- `plugin_connected`/`plugin_disconnected` messages added to `RelayToClientMessage` type (not in original CTO spec, but required for `isPluginConnected()` to work correctly per TEST-S-005).
- Relay's `broadcastToClients()` helper notifies all registered clients of plugin connection state changes.

### TASK-104 Test Pattern Notes
- ws-server.test.ts uses `_resetForTesting()` in beforeEach/afterEach for isolation.
- Port range: 39100-39199 for original tests, 39300-39399 for new relay tests.
- TEST-NF-003 (timeout test) updated: mock plugin must send `hello` to be classified before ping is sent.

## Historical Sprints

### Sprint 1 (2025): Initial version through Phase 5
- Built all 26 MCP tools
- Direct WS connection architecture
- Figma plugin with scene builder
- Shared type system

### Sprint 2 (2026-02-17 to 2026-02-19): Performance + Design System (v2-v3)
- Added batch operations
- Added warning system
- Added design system tools (pages, styles, images, boolean ops)
- Added test infrastructure
- Last commit: `a2608ce` (fix: tsconfig)

### Sprint 3 (2026-02-26): Multi-Client Connection Switching Phase 1 (v4.0)
- Added relay message types to shared package
- Implemented WsRelay class (ws/relay.ts)
- Refactored ws/server.ts from direct server to relay client
- 7 test files, 96 tests (all passing)

### Sprint 4 (2026-02-26): Multi-Client Connection Switching Phase 2 (v4.1)
- Added Phase 2 relay tests: TEST-R-020 through TEST-R-026 (7 tests)
- Extended WsRelay with broadcastClientList() and handleSetActiveClient()
- Plugin UI updated with client list section, renderClientList(), set_active_client dispatch
- Plugin UI height increased to 300px
- 7 test files, 103 tests (all passing)
- Build clean, lint: 4 pre-existing warnings only

### Sprint 5 (2026-03-02): Multi-Client Connection Switching Phase 3 -- Resilient Relay (v4.2)
- Added relay-detached.test.ts with TEST-D-001 through TEST-D-007 (7 tests)
- Created ws/relay-process.ts: standalone relay entry point with PID file management, idle timeout (auto-exit), SIGTERM/SIGINT handlers, IPC 'ready' signal to parent
- Refactored server.ts startWsServerAsync: in-process relay fast path (ready ~5ms) + background fork for persistence
- Key fix: Node.js v24 happy-eyeballs AggregateError -- switched ws://localhost to ws://127.0.0.1 in tryConnectToRelay
- Key fix: Fork-first strategy abandoned (fork takes ~60ms, exceeds 100ms test budget) -- in-process relay starts immediately, fork detached relay in background
- Removed unused pollConnectToRelay function
- 8 test files, 110 tests (all passing)
- Build clean, lint: 4 pre-existing warnings only (0 new)
