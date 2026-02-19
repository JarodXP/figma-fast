# FigmaFast -- Strategic Plan

> **Version:** 1.0.0
> **Last updated:** 2026-02-19
> **CTO audit status:** Initial onboarding complete

---

## Summary

FigmaFast is a high-performance MCP server for Figma that enables AI assistants (Claude) to build entire designs in a single tool call via a declarative scene tree (`build_scene`). The architecture is a three-part monorepo: `shared` types, a Node.js MCP server with embedded WebSocket, and a Figma plugin (main thread + UI iframe bridge). It replaces the "one node per tool call" pattern of ClaudeTalkToFigma with batch operations -- 10-50x fewer tool calls.

---

## Project Baseline

| Attribute | Value |
|-----------|-------|
| Repo | `/Users/jarod/Projects/vortex/figma-fast` |
| Language | TypeScript (strict) |
| Runtime | Node.js >= 18 |
| Package manager | npm workspaces |
| Build tool | tsc (shared, mcp-server), esbuild (plugin) |
| MCP SDK | `@modelcontextprotocol/sdk ^1.12.1` |
| WebSocket | `ws ^8.18.0` |
| Validation | `zod ^3.24.2` |
| Plugin typings | `@figma/plugin-typings ^1.106.0` |
| Total commits | 7 |
| Contributors | 1 (sole developer) |
| Branches | 1 (main only) |
| Tags | None |
| CI/CD | None |
| Test framework | None |
| Test coverage | 0% |
| Linting | None |
| Formatting | None |

---

## Requirements Challenges

| # | Original Requirement (from PROGRESSION.md) | Concern | Recommendation | Impact |
|---|---------------------------------------------|---------|----------------|--------|
| RC-1 | Phase 4: `batch_modify` tool | Partially redundant -- `modify_node` already exists for single nodes; batch can be composed client-side with multiple `modify_node` calls | Deprioritize. Implement only if latency of N sequential `modify_node` calls is measured to be unacceptable. Measure first. | Saves 3-4 days of dev if deferred. |
| RC-2 | Phase 4: `batch_text_replace` with regex | Regex in a design tool is gold-plating. Risk of unexpected replacements. | Replace with simple string find/replace. Drop regex support entirely. | Reduces edge cases, simpler validation. |
| RC-3 | Phase 6: `npx figma-fast` distribution | Requires npm publishing, semver, CI. Premature for a v0.1 private tool. | Defer until the tool is stable and used by more than 1 person. | Significant effort saved. |
| RC-4 | Phase 6: Chunked scene building (>200 nodes) | Complex error recovery. No evidence this limit has been hit. | Defer. Add telemetry to build_scene to log node counts first. If no scene exceeds 100 nodes in practice, this is YAGNI. | Avoids premature optimization. |
| RC-5 | GROUP type implemented as "FRAME with no fills" | Not a real GROUP. figma.group() requires bottom-up creation. Could cause confusion when Claude reads back node types. | Acceptable pragmatic shortcut for now. Document the limitation clearly. | Low risk, acceptable trade-off. |
| RC-6 | Zero test coverage | CRITICAL. No tests at all -- not unit, not integration, not e2e. Every change is unvalidated. | Immediate priority before any new feature work. | Blocks all future reliability. |
| RC-7 | No CI/CD pipeline | No automated build verification. No pre-commit hooks. | Add basic CI (build + type-check + test) before Phase 4+. | Prevents silent regressions. |
| RC-8 | No linting/formatting | Code style drift is inevitable with AI-generated code. | Add eslint + prettier. Quick setup, high value. | Consistency across AI-generated and human code. |

---

## Architecture Decision Records

### ADR-001: Build from scratch, not fork ClaudeTalkToFigma
- **Status:** Accepted (Day 0)
- **Rationale:** Cleaner architecture (no relay server), better Claude tool selection (declarative vs atomic), less refactoring debt
- **Trade-off:** More initial work, but lower maintenance burden

### ADR-002: Embedded WebSocket in MCP server
- **Status:** Accepted (Day 0)
- **Rationale:** Eliminates relay server -- one fewer process boundary, simpler deployment
- **Trade-off:** Tighter coupling between MCP and WS concerns

### ADR-003: Node.js over Bun for MCP server
- **Status:** Accepted (Day 0)
- **Rationale:** Broader compatibility, easier distribution
- **Trade-off:** Slightly slower startup (negligible for a long-running MCP server)

### ADR-004: Zod for MCP schema validation
- **Status:** Accepted (Phase 2)
- **Rationale:** MCP SDK uses Zod natively. Single validation library.
- **Trade-off:** None -- natural fit.

### ADR-005: esbuild IIFE bundle for plugin
- **Status:** Accepted (Phase 1)
- **Rationale:** Figma plugins require single-file ES2015 compatible bundle. esbuild is fast and produces correct output.
- **Trade-off:** No source maps in production plugin (acceptable for a plugin).

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Language | TypeScript | ^5.9.3 | Type safety across all packages |
| Runtime | Node.js | >= 18 | MCP server execution |
| MCP SDK | @modelcontextprotocol/sdk | ^1.12.1 | MCP protocol implementation |
| WebSocket | ws | ^8.18.0 | Server-plugin communication |
| Validation | zod | ^3.24.2 | MCP tool input schemas |
| Plugin types | @figma/plugin-typings | ^1.106.0 | Figma API type definitions |
| Bundler | esbuild | ^0.25.0 | Plugin IIFE bundling |
| Dev runner | tsx | ^4.21.0 | MCP server dev mode |
| IDs | uuid | ^11.1.0 | Correlation IDs |

---

## Phases

### Phase 0: Completed -- Reconnaissance
- Cloned and analyzed ClaudeTalkToFigma
- Extracted patterns, property mappings, edge cases into REFERENCE.md
- 1,081 lines of reference documentation

### Phase 1: Completed -- Project Scaffolding
- Monorepo with npm workspaces (shared, mcp-server, figma-plugin)
- TypeScript strict mode across all packages
- Build tooling: tsc for libraries, esbuild IIFE for plugin
- Shared types: SceneNode, WsMessage protocol, color utilities
- Hello-world connectivity (ping/pong) -- partially tested (manual only)

### Phase 2: Completed -- Scene Builder Engine
- `build_scene` MCP tool -- full implementation
- Recursive node builder with 10 node types
- Font preloading with fallback to Inter Regular
- Auto-layout, fills, strokes, effects, corner radius, text properties
- Undo batching, viewport scroll-to-view
- 120s timeout for large scenes
- Declarative scene spec with rich inline examples in tool description

### Phase 3: Completed -- Read Tools & Atomic Edits
- 6 read tools: get_document_info, get_node_info, get_selection, get_styles, get_local_components, export_node_as_image
- 4 edit tools: modify_node, delete_nodes, move_node, clone_node
- Node serializer for read responses (configurable depth)
- Export with base64 encoding (custom implementation for Figma sandbox)

### Phase 4: NOT STARTED -- Batch Modifications
- batch_modify, batch_text_replace
- **CTO recommendation: DEFER pending latency measurement** (see RC-1, RC-2)

### Phase 5: Completed -- Component System
- COMPONENT and COMPONENT_SET creation in build_scene
- ComponentSet uses reversed build order (children first, then combineAsVariants)
- 3 lifecycle tools: convert_to_component, combine_as_variants, manage_component_properties
- get_library_components via Figma REST API (requires FIGMA_API_TOKEN)
- Local component instances via componentId
- Property overrides via setProperties() with name prefix matching
- Component swap via modify_node swapComponent
- All builds clean

### Phase 5.5: NEW -- Test & Quality Infrastructure (CTO MANDATED)
- Add test framework (vitest recommended)
- Write unit tests for shared utilities (colors, font mapping)
- Write unit tests for Zod schemas (validation edge cases)
- Add CI pipeline (GitHub Actions: build + type-check + test)
- Add eslint + prettier

### Phase 6: NOT STARTED -- Polish, Error Handling, DX
- Partial failure reporting
- WS disconnect recovery
- Improved font fallback
- Plugin distribution improvements

---

## Risks & Mitigations

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Zero test coverage allows silent regressions | HIGH | HIGH | Phase 5.5: mandatory test infrastructure before any new features |
| Plugin sandbox limits (no btoa, no fetch) | MEDIUM | REALIZED | Already handled: custom base64 encoder, esbuild bundling |
| Font loading failures during build_scene | LOW | MEDIUM | Fallback to Inter Regular with substitution warnings |
| WebSocket disconnect during long operation | MEDIUM | LOW | 30s timeout with clear error messages; reconnect logic in UI |
| Large scene specs (>1MB) | LOW | LOW | No current limit. Monitor. Defer chunking per RC-4. |
| No CI/CD means build breaks go undetected | HIGH | MEDIUM | Phase 5.5: add GitHub Actions |
| Figma API changes break plugin typings | MEDIUM | LOW | Pin @figma/plugin-typings version. Test before upgrading. |

---

## Out of Scope (Current Planning Horizon)

- Figma plugin Community publishing
- npx distribution (deferred per RC-3)
- Multi-plugin concurrent connections
- Figma variable/design token support
- Style application (applying local styles by ID)
- Image fill support (currently renders as gray placeholder)
- Undo/redo integration beyond commitUndo batching
- REST API write operations (currently read-only via REST)
- Automated e2e testing against live Figma (would require Figma headless, which doesn't exist)
