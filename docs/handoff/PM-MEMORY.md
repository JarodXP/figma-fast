# PM Memory -- FigmaFast

**Created:** 2026-02-26
**Last updated:** 2026-02-26

---

## Product Overview

**What:** A high-performance MCP server for Figma that lets AI assistants (Claude) build entire designs declaratively in a single tool call, instead of dozens of individual operations.
**Stage:** MVP (v3.0 -- 27 tools shipped, core functionality complete)
**Tech stack (high-level):** TypeScript monorepo (npm workspaces). MCP server (Node.js, @modelcontextprotocol/sdk) communicates with a Figma plugin via WebSocket. Plugin has UI iframe (WS client) bridging to main thread (Figma API access) via postMessage.
**Target users:** AI assistants (primarily Claude via Claude Desktop or Claude Code) that need to create, read, and edit Figma designs programmatically.

## Architecture Summary

- **Connection model:** 1:1 point-to-point. Single MCP server instance, single WebSocket connection to a single Figma plugin instance.
- **WS server:** Embedded in MCP server, listens on port 3056. Tracks ONE `pluginSocket`. New connections silently replace old ones.
- **Plugin UI:** iframe in Figma plugin, acts as WebSocket client. Bridges WS messages to plugin main thread via postMessage.
- **Correlation:** All messages carry UUID `id`. Pending requests stored in Map with timeout-based auto-rejection.
- **Key limitation:** Only one Figma file can be connected at a time. Only one MCP client can use the server at a time.
- **Key integration point:** All 27 tools call `sendToPlugin()` from `ws/server.ts`. This is the ONLY function that touches the WS layer. Refactoring this function is how multi-client support gets wired in with zero changes to tool files.

## User Preferences & Communication Style

- Style: Provides clear, structured answers. Responds to all questions directly.
- Technical depth: High -- understands the MCP architecture, process lifecycle, port binding.
- Preference for scope: Pragmatic -- asked for "many-to-1" (simplest useful slice), not "many-to-many."
- Communication: Answers via intermediary (system prompt relays user answers). Direct quotes are reliable.

## PRD Registry

| # | PRD | File | Status | Date | Summary |
|---|-----|------|--------|------|---------|
| 1 | Multi-Client Connection Switching | `docs/prds/multi-client-connection-switching.md` | Draft | 2026-02-26 | Allow multiple MCP clients (e.g., Claude Desktop + Claude Code) to coexist via a WS relay. Plugin UI lets user pick active client. 3 slices: relay, UI picker, resilient relay. |

## Key Product Decisions

| Date | Decision | Context | PRD |
|------|----------|---------|-----|
| 2026-02-26 | Relay architecture over dynamic ports | Dynamic ports rejected: Figma manifest requires ports at build time, pushes complexity into most constrained env (plugin sandbox). | PRD #1 |
| 2026-02-26 | Reject-not-queue for inactive clients | Commands from non-active clients get immediate error, not queued. Queuing creates stale state risk. | PRD #1 |
| 2026-02-26 | Explicit user switching, not auto-switch | User clicks in plugin UI to switch. No last-write-wins auto-switching. Prevents two clients fighting for control. | PRD #1 |
| 2026-02-26 | Shared daemon server rejected | MCP protocol assumes client owns server process lifecycle. Daemon model breaks config pattern. | PRD #1 |

## Validated Assumptions

| Assumption | Status | Evidence | Date |
|------------|--------|----------|------|
| Each AI client spawns its own MCP server process | Validated | MCP SDK uses stdio transport; config `"command": "node"` spawns process. Confirmed by codebase. | 2026-02-26 |
| The root cause is port conflict, not routing | Validated | `startWsServer()` calls `new WebSocketServer({ port })` which binds exclusively. Second process fails with EADDRINUSE. | 2026-02-26 |
| `sendToPlugin()` is the only WS integration point for tools | Validated | All 27 tools import `sendToPlugin` from `ws/server.ts`. No tool touches WS directly. | 2026-02-26 |
| Plugin manifest only needs one port in devAllowedDomains | Validated | manifest.json: `"devAllowedDomains": ["ws://localhost:3056"]`. Relay on same port = no manifest change. | 2026-02-26 |

## Domain Knowledge

- Figma plugin architecture: UI iframe has network access but no Figma API. Main thread has Figma API but no network. Communication via postMessage.
- Figma plugin manifest restricts network to `devAllowedDomains` only (`ws://localhost:3056`).
- MCP server uses stdio transport (JSON-RPC) for Claude communication.
- Current WS server explicitly says "Direct point-to-point connection -- no relay, no channels" in code comments.
- handlers.ts is already 1000+ lines and growing (noted as tech debt).
- `startWsServer()` is idempotent (skips if `wss` already exists) -- module-level singleton pattern.
- WS server test file uses random high ports to avoid conflicts -- good test pattern to follow for relay tests.
- The real user pain: running Claude Desktop + Claude Code simultaneously. Second one fails silently (port bind error). Only workaround is closing both and reopening one.

## Active Work

- PRD #1 (Multi-Client Connection Switching) is in Draft status. Ready for user review and then handoff to CTO Planner.

## Backlog & Parking Lot

- Multi-file support (one AI client controlling multiple Figma files) -- came up during analysis but explicitly deferred. Could extend relay architecture with file-keyed channels.
- Client auto-naming (detect "Claude Desktop" vs "Claude Code" automatically from environment) -- open question in PRD.

## Notes for Next Invocation

- PRD #1 is complete and saved. User has not yet reviewed it. Next step is user feedback, then handoff to `cto-planner`.
- Key open question: Can `MCP_CLIENT_NAME` be passed via the MCP config `env` field? Needs CTO investigation during planning.
- The relay architecture keeps the same port (3056) and same plugin manifest. This is a deliberate design choice to minimize blast radius.
