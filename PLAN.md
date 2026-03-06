# FigmaFast -- Strategic Plan

> **Version:** 6.0.0
> **Last updated:** 2026-03-06
> **CTO audit status:** Testing Infrastructure Phase planned
> **Source:** Direct user request (no PRD)

---

## Summary

Add full FigJam support to FigmaFast. The plugin manifest gains `"figjam"` editor type. Six new `jam_*` MCP tools enable creating FigJam-native elements (stickies, connectors, shapes-with-text, code blocks, tables). The node serializer gains FigJam-specific property extraction. Existing Figma-only tools gain plugin-side guards that return clear errors when invoked in FigJam. The scene builder gains a pre-flight check to reject unsupported node types in FigJam context.

## Project Baseline

- **Repo**: figma-fast (monorepo: packages/mcp-server, packages/figma-plugin, packages/shared)
- **Created**: 2025 (initial version)
- **Last active**: 2026-03-02
- **Contributors**: 1 primary
- **Releases**: no tags, HEAD at `9effd7d`
- **CI/CD**: none detected
- **Test framework**: Vitest 4.x, Node environment
- **Test coverage**: 8 test files, 110 total tests (all passing)
- **Language**: TypeScript 5.9, ESM modules, Node16 module resolution
- **Runtime**: Node.js (ES2022 target)
- **Build**: tsc for mcp-server/shared, esbuild for figma-plugin
- **Package manager**: npm workspaces
- **MCP tools**: 26 across 10 tool files + 1 ping

## Requirements Challenges

| # | Original Requirement | Challenge | Recommendation | Status |
|---|---------------------|-----------|----------------|--------|
| 1 | `jam_create_stamp` | `figma.createStamp()` creates a blank stamp with no useful programmable content. Stamps are primarily emoji/reaction objects. No meaningful text/shape property to set. | **Cut from scope.** Add later only if a real use case emerges. | Accepted |
| 2 | `jam_get_timer` | Reading timer state is fine but controlling it (start/stop/pause) from AI is dangerous in shared FigJam sessions. | Read-only `jam_get_timer` only. No `jam_set_timer` in this phase. | Accepted |
| 3 | `jam_create_table` | `figma.createTable(rows, cols)` creates empty tables. An empty table is useless -- the value is populating cells. | Scope includes optional `cellData` parameter: a 2D array of strings to populate cells. Requires font loading per cell. | Accepted |
| 4 | Guards: plugin-side vs MCP-side | MCP server has no knowledge of editor type. Guards must live in the plugin. | Plugin-side guards via `figma.editorType` check. Also enhance `get_document_info` to return `editorType` so AI knows context upfront. | Accepted |
| 5 | `build_scene` compatibility | Rewriting scene builder is massive. Most node types work fine in FigJam (FRAME, TEXT, RECTANGLE, etc.) but COMPONENT/COMPONENT_SET/COMPONENT_INSTANCE do not. | Pre-flight check: scan spec tree for unsupported types, reject entire build with clear error listing them. Not a partial build. | Accepted |
| 6 | Connector endpoints | `connectorStart`/`connectorEnd` can reference specific nodes by `endpointNodeId` + `magnet`. This is the main value of connectors. | Support both node-attached endpoints (with endpointNodeId) and absolute position endpoints. | Accepted |

## Architecture Decision Records

### ADR-006: Plugin-Side Editor Guards
- **Status**: Accepted
- **Context**: Tools like `create_page`, `create_component`, `boolean_operation` do not exist in FigJam's API. We need to prevent them from being called.
- **Decision**: Add a `figjamGuard()` helper in `handlers.ts` that checks `figma.editorType === 'figjam'` and throws a descriptive error. Applied at the handler level, not the MCP server level.
- **Consequences**: Error surfaces after a WS round-trip, but this is the only correct approach since the MCP server has no editor context. The `get_document_info` enhancement mitigates this by letting the AI know the editor type upfront.

### ADR-007: FigJam Handlers in Separate File
- **Status**: Accepted
- **Context**: FigJam handlers are logically distinct from Figma handlers. Mixing them increases file complexity.
- **Decision**: New file `packages/figma-plugin/src/figjam-handlers.ts` for all `jam_*` handler implementations. New file `packages/mcp-server/src/tools/figjam-tools.ts` for all `jam_*` MCP tool registrations.
- **Consequences**: Clean separation. `main.ts` gains a new import and new switch cases for FigJam message types. Shared message types grow in `messages.ts`.

### ADR-008: editorType in get_document_info Response
- **Status**: Accepted
- **Context**: AI needs to know if it is in Figma or FigJam to choose the right tools.
- **Decision**: Add `editorType: figma.editorType` to the `handleGetDocumentInfo` response. This is a non-breaking additive change.
- **Consequences**: AI can inspect the response once and branch its tool usage. Zero cost, high value.

## Technology Stack

No new dependencies. All FigJam APIs are part of the Figma Plugin API already available in the sandbox.

| Layer | Choice | Version | Rationale |
|-------|--------|---------|----------|
| FigJam Plugin API | Figma Plugin API | 1.0.0 | Already available. `createSticky()`, `createConnector()`, etc. |
| Test | vitest | 4.x | Already in use. |
| Schemas | zod | existing | Already in use for all tool parameter validation. |

## Phases

### Phase 0: Completed (Baseline)
FigmaFast has 26+ MCP tools, WS relay architecture with multi-client support (3 phases complete), 110 passing tests across 8 test files. Direct WS connection replaced by relay. Plugin UI has client picker. Resilient detached relay with PID file management.

### Phase 1: FigJam Foundation -- Estimated: 25-35 iterations

1. Add `"figjam"` to manifest `editorType`
2. Add `editorType` to `get_document_info` response
3. Add FigJam guard helper and apply to 9 guarded handlers
4. Add FigJam message types to shared messages
5. Add FigJam node serialization (StickyNode, ConnectorNode, ShapeWithTextNode, CodeBlockNode, TableNode)
6. Add `build_scene` pre-flight check for FigJam unsupported types

### Phase 2: FigJam Tools -- Estimated: 30-40 iterations

1. Implement `figjam-handlers.ts` (5 handlers)
2. Add `figjam-tools.ts` (5 MCP tools + `jam_get_timer`)
3. Wire handlers into `main.ts` message router
4. Register tools in `index.ts`
5. Comprehensive unit tests for MCP tool registration

### Phase 3: Regression & Validation -- Estimated: 5-10 iterations

1. Full test suite run
2. Build verification
3. Lint check

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| FigJam API differences from docs | Medium | Medium | Test in actual FigJam file. Plugin-side error handling catches unexpected API failures gracefully. |
| Connector endpoint API is complex | Medium | Low | Start with simple absolute position endpoints. Node-attached endpoints as enhancement. |
| Table cell population requires font loading | Low | Low | Reuse existing font loading pattern from text nodes. Load Inter as default. |
| Existing tools break in FigJam | Low | High | Guards on all 9 Figma-only tools. Pre-flight check on build_scene. editorType in document info. |
| Test count assertions in server.test.ts break again | High | Low | Update expected counts after adding new tools. |

## Out of Scope

- `jam_create_stamp` (no useful programmable content)
- Timer control (start/stop/pause/resume) -- read-only only
- FigJam widgets (WidgetNode) -- these are custom-coded
- FigJam-specific scene builder types (stickies/connectors in build_scene spec) -- use jam_* tools instead
- MediaNode creation (requires external media upload)
- Connector line style customization (stroke, color) -- use modify_node after creation

---

## Phase 4: Testing Infrastructure

> **Added:** v6.0.0 -- 2026-03-06
> **Source:** CTO audit of test health

### Summary

Fix 5 failing tests, add coverage reporting, establish CI/CD via GitHub Actions, add protocol contract tests, extract testable pure logic from plugin handlers, add tool execution integration tests, and add scene builder orchestrator tests. This phase hardens the project against regressions and enables confident iteration.

### ADR-009: IPv4 Explicit Binding for Tests
- **Status**: Accepted
- **Context**: Node.js v24+ resolves `localhost` to `::1` (IPv6) via happy-eyeballs. The WS relay binds to `127.0.0.1` (IPv4 only). Tests using `ws://localhost:${port}` fail with `ECONNREFUSED ::1`.
- **Decision**: Replace all `ws://localhost` with `ws://127.0.0.1` in ws-server.test.ts. Same fix already applied to server.ts in Sprint 5.
- **Consequences**: Tests explicitly use IPv4. If we ever need IPv6 support, we'll need dual-stack binding.

### ADR-010: V8 Coverage Provider
- **Status**: Accepted
- **Context**: No coverage reporting exists. Need baseline visibility into what code is tested.
- **Decision**: Use Vitest's built-in V8 coverage provider. Output text (for terminal) and lcov (for CI integration). Exclude node_modules and test files from coverage metrics.
- **Consequences**: Adds `@vitest/coverage-v8` devDependency. No runtime cost -- only runs when `test:coverage` is invoked.

### ADR-011: GitHub Actions CI
- **Status**: Accepted
- **Context**: No CI/CD exists. All quality gates are manual.
- **Decision**: Single workflow file `.github/workflows/ci.yml` triggered on push and PR to main. Steps: install, build, test, lint. Node 24.x.
- **Consequences**: PRs get automated checks. Failures block merge (once branch protection is enabled).

### ADR-012: Protocol Contract Testing via Source Analysis
- **Status**: Accepted
- **Context**: `ServerToPluginMessage` union in messages.ts defines all message types the plugin must handle. The switch in main.ts must have a case for each. Drift between these is a silent bug.
- **Decision**: Write a test that reads both source files, extracts message types from the union and case labels from the switch, and asserts they match.
- **Consequences**: Static source analysis (regex/string matching). Brittle if code style changes drastically, but catches the most common failure mode (adding a message type without a handler).

### ADR-013: Pure Function Extraction for Plugin Handlers
- **Status**: Accepted
- **Context**: handlers.ts (1050 lines) and figjam-handlers.ts (227 lines) depend on Figma globals, making them untestable with vitest. But they contain validation and transformation logic that is pure.
- **Decision**: Extract pure validation/transformation functions into a separate module that can be tested without Figma mocks. Follow the pattern established in build-node.test.ts for anything that needs the mock.
- **Consequences**: Incremental refactor. Does not change handler behavior. Unlocks unit testing of core logic.

### Phase 4 Sub-Phases

#### 4A: Fix + Infrastructure (P1-P3) -- Estimated: 10-15 iterations
- Fix 5 failing ws-server tests (IPv4)
- Add V8 coverage reporting
- Add GitHub Actions CI workflow

#### 4B: Contract + Logic Tests (P4-P5) -- Estimated: 20-30 iterations
- Protocol contract test (messages.ts vs main.ts)
- Extract pure handler logic into testable module + tests

#### 4C: Integration + Orchestrator Tests (P6-P7) -- Estimated: 25-35 iterations
- Tool execution integration tests (MCP client -> sendToPlugin mock)
- Scene builder orchestrator tests (Figma global mocking)

### Risks & Mitigations (Phase 4)

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| V8 coverage provider incompatible with Vitest 4.x | Low | Low | `@vitest/coverage-v8` is the official provider. Fall back to `istanbul` if needed. |
| Protocol contract test is brittle | Medium | Low | Test uses simple regex patterns. If it breaks, the fix is updating the regex, not the approach. |
| Pure function extraction changes handler behavior | Low | High | Extract-only refactor. No logic changes. All existing tests must still pass. |
| Figma mock diverges from real API | Medium | Medium | Mocks are minimal -- only the properties actually used by tested code. Document what's mocked vs real. |
