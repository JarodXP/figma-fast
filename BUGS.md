# FigmaFast Bug Log

---

## BUG-001 — ws-server tests fail with ECONNREFUSED in parallel test runs (2026-03-06)

**Phase / Context:** TASK-601 — Fix ws-server.test.ts IPv4 tests
**Severity:** High

**Root cause:** Three distinct issues:
1. `ws://localhost` on Node.js v24 triggers happy-eyeballs IPv6-first resolution; relay binds to `127.0.0.1` (IPv4) causing ECONNREFUSED.
2. When vitest runs TypeScript via tsx, `__dirname` in `server.ts` resolves to `src/ws/`, but `relay-process.js` only exists in `dist/ws/`. Fork of relay process fails silently.
3. After forking a detached relay in a test, `_resetForTesting()` did not kill the process. Subsequent tests on the same port hit EADDRINUSE.
4. Fork takes 150-300ms under system load; tests wait only 100ms — race condition in parallel test runs.

**Fix:**
1. Replaced `ws://localhost` with `ws://127.0.0.1` in ws-server.test.ts.
2. Added fallback path resolution in server.ts: check for `relay-process.js` in `__dirname`; if missing, try `../../dist/ws/relay-process.js`.
3. Added `forkedRelayProcess` tracking to `_resetForTesting()` to kill forked relay on reset.
4. Added `process.env.VITEST` check: in test mode, start in-process WsRelay instead of forking (< 1ms startup vs. 150ms+ fork).

**Files modified:**
- `packages/mcp-server/src/__tests__/ws-server.test.ts` (ws://localhost → ws://127.0.0.1)
- `packages/mcp-server/src/ws/server.ts` (relay path fix, test mode in-process relay, forked relay tracking)

---

## BUG-002 — read_node message type missing from main.ts switch statement (2026-03-06)

**Phase / Context:** TASK-604 — Protocol contract test
**Severity:** Medium

**Root cause:** `read_node` was added to the `ServerToPluginMessage` union type in `messages.ts` but never wired into the switch statement in `main.ts`. Sending a `read_node` message would fall through to the `default` case and return `Unknown command: read_node`.

**Fix:** Added `case 'read_node':` as a fallthrough before `case 'get_node_info':` in `main.ts`. Both message types now use the same `handleGetNodeInfo` handler, preserving backward compatibility.

**Files modified:**
- `packages/figma-plugin/src/main.ts:94` (added read_node case)
