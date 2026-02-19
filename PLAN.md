# FigmaFast -- Strategic Plan

> **Version:** 2.0.0
> **Last updated:** 2026-02-19
> **CTO audit status:** Design System Feature Pack planned

---

## Summary

FigmaFast is a high-performance MCP server for Figma that enables AI assistants (Claude) to build entire designs in a single tool call via a declarative scene tree (`build_scene`). The architecture is a three-part monorepo: `shared` types, a Node.js MCP server with embedded WebSocket, and a Figma plugin (main thread + UI iframe bridge). It replaces the "one node per tool call" pattern of ClaudeTalkToFigma with batch operations -- 10-50x fewer tool calls.

**v2.0 scope:** Extend FigmaFast with design system primitives: styles, page management, boolean operations, and image fills. Variable support deferred to v3.0.

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
| Test framework | vitest ^4.0.18 |
| Total commits | ~13 |
| Contributors | 1 (sole developer) |
| Branches | 1 (main only) |
| Tags | None |
| CI/CD | None (gap) |
| Test coverage | 42 tests, all passing |
| Linting | ESLint (flat config) |
| Formatting | Prettier |
| MCP tools | 16 |

---

## Requirements Challenges

### Previous (v1.0 -- retained)

| # | Original Requirement | Concern | Recommendation | Impact |
|---|----------------------|---------|----------------|--------|
| RC-1 | `batch_modify` tool | Redundant -- compose with multiple `modify_node` calls | DEFER pending latency measurement | Saves 3-4 days |
| RC-2 | `batch_text_replace` with regex | Gold-plating. Risk of unexpected replacements | Drop regex, use simple find/replace if needed | Simpler validation |
| RC-3 | `npx figma-fast` distribution | Premature for private tool | DEFER until stable | Significant effort saved |
| RC-4 | Chunked scene building (>200 nodes) | No evidence of hitting limit | DEFER. Add telemetry first | Avoids premature optimization |
| RC-5 | GROUP as "FRAME with no fills" | Not a real GROUP | Acceptable shortcut, documented | Low risk |
| RC-6 | Zero test coverage | CRITICAL gap | Phase 5.5 COMPLETED -- 42 tests | RESOLVED |
| RC-7 | No CI/CD pipeline | No automated verification | Still a gap. Add before v2.0 features ship | Prevents regressions |
| RC-8 | No linting/formatting | Style drift | Phase 5.5 COMPLETED -- eslint + prettier | RESOLVED |

### New (v2.0 -- Design System Feature Pack)

| # | Original Requirement | Concern | Recommendation | Impact |
|---|----------------------|---------|----------------|--------|
| RC-9 | Create Components & Component Sets in build_scene | **ALREADY FULLY IMPLEMENTED** in Phase 5. COMPONENT and COMPONENT_SET are node types in SceneNodeSchema. build-node.ts handles both including reversed build order for COMPONENT_SET. | **CUT ENTIRELY.** Zero work needed. | Saves entire feature scope. |
| RC-10 | Component Instance Overrides in build_scene | **ALREADY FULLY IMPLEMENTED** in Phase 5. `overrides: Record<string, boolean \| string>` exists on SceneNode. build-node.ts lines 466-485 handle overrides via setProperties() with name prefix matching. variantProperties is a subset of this. `swapComponent` also works. | **CUT ENTIRELY.** Zero work needed. | Saves entire feature scope. |
| RC-11 | Create & Bind Styles | Genuinely missing. get_styles exists (read-only) but no creation or binding. Style binding is high value + trivial. Style creation is medium value + moderate effort. | **SPLIT:** Phase 7A = binding (fillStyleId/textStyleId/effectStyleId on modify_node + build_scene). Phase 7B = creation tools. | Delivers value incrementally. |
| RC-12 | Create & Bind Variables | Most complex feature. Variable creation + collections + modes + binding touches every property type. Variable BINDING alone (applying existing vars) would unblock 80% of use cases. | **DESCOPE creation to v3.0.** v2.0 gets binding only (Phase 10). Defer entirely if Phases 6-9 are not stable. | Massive risk reduction. |
| RC-13 | Page Management | Low risk, straightforward. figma.createPage(), page.name, figma.setCurrentPageAsync(). REFERENCE.md already documents patterns. | **ACCEPT AS-IS.** Ship first -- quick win. | Unblocks multi-page workflows. |
| RC-14 | Boolean Operations | figma.union/subtract/intersect/exclude are well-established. However, BOOLEAN_OPERATION as a build_scene node type is problematic -- requires child nodes to exist first (same problem as GROUP). | **ACCEPT tool only. REJECT node type.** Ship `boolean_operation` tool. Do NOT add to build_scene. | Avoids GROUP-like hack. |
| RC-15 | Image Fills from URL | Plugin sandbox CANNOT fetch(). Image download MUST happen in MCP server (Node.js), then base64 bytes sent via WS. Fundamentally different data flow than other tools. build_scene IMAGE support needs server-side fetch during build OR a two-pass approach (upload first, reference by hash). | **ACCEPT with architecture caveat.** Server-side download, plugin-side createImage(). | New WS message shape with large payloads. |

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

### ADR-006: Image download on MCP server, not plugin
- **Status:** Accepted (v2.0)
- **Rationale:** Figma plugin sandbox has no fetch(). The plugin UI iframe CAN fetch but has CORS restrictions and adds complexity to the bridge. MCP server (Node.js) has unrestricted network access and can handle any URL/auth scheme.
- **Trade-off:** Larger WS messages (base64 image bytes). May need to chunk for images > 1MB. Adds async fetch dependency to MCP tool handler (currently all tool handlers just relay to plugin).
- **Alternative rejected:** UI iframe fetch -- adds CORS complexity, requires proxy for non-CORS URLs, fragments the download logic across two processes.

### ADR-007: Style binding via ID properties, not inline style references
- **Status:** Accepted (v2.0)
- **Rationale:** Figma's native API uses `node.fillStyleId = styleId`, not style names. The existing `get_styles` tool already returns style IDs. Binding by ID is the fastest path. Name-based lookup adds overhead and ambiguity.
- **Trade-off:** Claude must call `get_styles` first to discover IDs. This is acceptable -- it's one extra tool call per session, not per node.

### ADR-008: Boolean operations as standalone tool, not build_scene node type
- **Status:** Accepted (v2.0)
- **Rationale:** Boolean operations require child nodes to already exist, then they get combined. This is fundamentally a post-hoc operation, not a declarative one. Same architectural problem as GROUP (see RC-5). Adding BOOLEAN_OPERATION to build_scene would require a reversed build order hack similar to COMPONENT_SET but more fragile.
- **Trade-off:** Two-step workflow: build_scene to create shapes, then boolean_operation to combine them.
- **Alternative rejected:** BOOLEAN_OPERATION in build_scene with reversed build.

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
| Testing | vitest | ^4.0.18 | Unit and integration tests |
| Linting | eslint | ^10.x | Code quality |
| Formatting | prettier | ^3.x | Code style consistency |

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
- Hello-world connectivity (ping/pong) -- manually tested

### Phase 2: Completed -- Scene Builder Engine
- `build_scene` MCP tool -- full implementation
- Recursive node builder with 12 node types (FRAME, TEXT, RECTANGLE, ELLIPSE, GROUP, COMPONENT, COMPONENT_SET, COMPONENT_INSTANCE, POLYGON, STAR, LINE, VECTOR)
- Font preloading with fallback to Inter Regular
- Auto-layout, fills, strokes, effects, corner radius, text properties
- Undo batching, viewport scroll-to-view
- 120s timeout for large scenes

### Phase 3: Completed -- Read Tools & Atomic Edits
- 7 read tools: get_document_info, get_node_info, get_selection, get_styles, get_local_components, get_library_components, export_node_as_image
- 4 edit tools: modify_node, delete_nodes, move_node, clone_node
- Node serializer for read responses (configurable depth)
- Export with base64 encoding (custom implementation for Figma sandbox)

### Phase 4: DEFERRED -- Batch Modifications
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

### Phase 5.5: Completed -- Test & Quality Infrastructure
- vitest installed and configured (42 tests, all passing)
- Unit tests: colors (11), fonts (8), schemas (20), server integration (1), WS server (2)
- ESLint + Prettier configured and passing
- Schemas extracted to shared schemas.ts (eliminated duplication)

### Phase 6: NEW -- Page Management
- 3 new MCP tools: create_page, rename_page, set_current_page
- 3 new plugin handlers
- 3 new WS message types
- Tests before implementation

### Phase 7: NEW -- Style System
- **Phase 7A:** Style binding -- add fillStyleId, textStyleId, effectStyleId to modify_node and build_scene
- **Phase 7B:** Style creation -- 3 new MCP tools (create_paint_style, create_text_style, create_effect_style)
- Tests before implementation

### Phase 8: NEW -- Image Fills
- `set_image_fill` MCP tool with server-side image download
- IMAGE fill type functional in build_scene (currently placeholder gray)
- New WS message shape for image data transfer
- Tests before implementation

### Phase 9: NEW -- Boolean Operations
- `boolean_operation` MCP tool (union, subtract, intersect, exclude)
- NOT a build_scene node type (see ADR-008)
- Tests before implementation

### Phase 10: DEFERRED -- Variable Binding
- Bind existing Figma variables to node properties
- Only after Phases 6-9 are stable
- Variable CREATION deferred to v3.0 (see RC-12)

---

## Risks & Mitigations

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Image download adds latency to build_scene | MEDIUM | HIGH | Parallel fetch + cache. Set reasonable timeout (30s per image). Document that large images slow builds. |
| WS messages with base64 images may be very large | MEDIUM | MEDIUM | Warn if image > 2MB. Consider chunking in v3.0 if needed. |
| Style IDs are file-local, not portable | LOW | HIGH | Document that styles must be created in the same file first. get_styles returns IDs for current file. |
| Boolean operations on complex paths may be slow | LOW | LOW | 30s timeout should suffice. Document limitation for very complex vector paths. |
| No CI/CD means build breaks go undetected | HIGH | MEDIUM | Add GitHub Actions before Phase 7 (high-impact phases). |
| Plugin sandbox limits (no fetch) | MEDIUM | REALIZED | Handled: image fetch on MCP server, custom base64 in plugin. |
| Figma API changes break plugin typings | MEDIUM | LOW | Pin @figma/plugin-typings version. |
| Tool count growing (16 -> 23+) may confuse Claude | LOW | MEDIUM | Clear tool descriptions with examples. Group related tools logically. |

---

## Out of Scope (v2.0 Planning Horizon)

- Figma plugin Community publishing
- npx distribution (deferred per RC-3)
- Multi-plugin concurrent connections
- Variable CREATION (collections, modes) -- deferred to v3.0
- Chunked scene building (deferred per RC-4)
- Batch operations (deferred per RC-1, RC-2)
- BOOLEAN_OPERATION as a build_scene node type (see ADR-008)
- REST API write operations (currently read-only via REST)
- Automated e2e testing against live Figma
- Grid styles (low demand, trivial to add later)
- Undo/redo integration beyond commitUndo batching
