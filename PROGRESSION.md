# FigmaFast: Build Plan & Progression Tracker

> **Goal:** Build a declarative Figma MCP server from scratch that is 10–50x faster than ClaudeTalkToFigma.
> **Method:** Claude Code + Ralph Widgum loop extension
> **Architecture:** `Claude ←stdio→ MCP Server (TS, embedded WS) ←WebSocket→ Figma Plugin (Scene Builder)`

---

## How To Use This

You have **3 files** that work together:

| File | What it is | When to use it |
|------|-----------|----------------|
| **`PROGRESSION.md`** (this file) | Step-by-step checklist with all tasks | Open in your editor. Check boxes as you go. Feed current phase to Claude Code. |
| **`REFERENCE.md`** | Empty template → fills up during Phase 0 | Phase 0: Claude Code fills it in by reading ClaudeTalkToFigma. Phases 1–6: consult it for Figma API patterns. |
| **Analysis docs** (in project) | `figma-mcp-analysis.md` + `fork-vs-scratch-analysis.md` | Background reading. Already digested into this plan. |

### Workflow with Claude Code + Ralph Widgum Loop

**Each session, give Claude Code this prompt:**

```
Read these files:
- PROGRESSION.md (find the current phase and next unchecked task)
- REFERENCE.md (Figma API patterns to use)

Project: FigmaFast — a high-performance declarative Figma MCP server.
Architecture:
  packages/mcp-server/  → TypeScript MCP server with embedded WebSocket
  packages/figma-plugin/ → Figma plugin with Scene Builder engine
  packages/shared/       → Shared types (SceneSpec, WS message protocol)

Core principle: MINIMIZE TOOL CALLS. build_scene is the primary tool.

Current phase: [PHASE NUMBER]
Do the next unchecked tasks. Check them off when done.
```

**The loop works like this:**

```
1. Claude Code reads PROGRESSION.md → finds next unchecked task
2. Claude Code does the work (writes code, creates files)
3. Claude Code checks the box ✅
4. Ralph Widgum loops back → Claude Code picks up next task
5. Repeat until phase is complete
```

**Phase 0 is special** — it's a research phase. The prompt is:

```
Clone https://github.com/ArinspunkMCP/ClaudeTalkToFigma.git into ~/Projects/rekord/

Read the codebase and fill in REFERENCE.md section by section.
Start with section [N] — [section name].
Extract actual code, actual patterns, actual property mappings.
Don't summarize — paste the real implementations.
```

Run this once per section of REFERENCE.md (there are 10 sections). Each loop iteration fills in one section.

### When You Finish a Phase

1. Update the "Last updated" line at the bottom of this file
2. Update the "Current phase" in the Decision Log
3. Read through the next phase's tasks to spot any dependencies
4. Start the next loop

---

## Phase 0: Reconnaissance — Analyze ClaudeTalkToFigma

**Duration:** 1–2 days
**Purpose:** Extract every reusable pattern WITHOUT forking. We're mining, not inheriting.

### 0.1 — Clone & Map the Codebase

```bash
git clone https://github.com/ArinspunkMCP/ClaudeTalkToFigma.git ~/Projects/rekord/claude-talk-to-figma
```

- [x] **0.1.1** Map the directory structure — identify MCP server, relay server, plugin (main + UI)
- [x] **0.1.2** List every MCP tool (name, params, return type) — build a spreadsheet/table
- [x] **0.1.3** List every postMessage type between UI iframe ↔ plugin main thread
- [x] **0.1.4** Identify the WS relay protocol — message format, channel routing, handshake

### 0.2 — Extract Figma API Patterns (the gold)

- [x] **0.2.1** **Property mappings:** How each MCP param maps to Figma API calls:
  - Color: hex string → `{r, g, b, a}` (0–1 range)
  - Fills: `[{type: "SOLID", color: ...}]` → `Paint[]`
  - Auto-layout: `layoutMode`, `primaryAxisAlignItems`, `counterAxisAlignItems`, padding, spacing
  - Corner radius: uniform vs per-corner (`cornerRadius` vs `topLeftRadius`, etc.)
  - Strokes: weight, color, alignment (INSIDE, OUTSIDE, CENTER)
  - Effects: drop shadow, inner shadow, blur → `Effect[]`
  - Text: font loading, fontSize, fontName, textAlignHorizontal, textAutoResize
  - Constraints: horizontal/vertical constraints for responsive behavior
- [x] **0.2.2** **Font loading patterns:** How they handle `loadFontAsync`, which fonts are pre-loaded, error handling for missing fonts
- [x] **0.2.3** **Component instantiation:** How `importComponentByKeyAsync` is used, override patterns
- [x] **0.2.4** **Node type creation:** Complete list of `figma.create*()` methods used and their params
- [x] **0.2.5** **Export patterns:** How `exportAsync` is called (format, scale, settings)

### 0.3 — Extract Edge Cases & Gotchas

- [x] **0.3.1** Read all closed issues + open issues — catalog real-world failures
- [x] **0.3.2** Read commit history for bug fixes — identify non-obvious Figma API quirks
- [x] **0.3.3** Document:
  - Font loading race conditions
  - Stroke weight = 0 edge case
  - Opacity vs fill alpha
  - Plugin timeout thresholds
  - Maximum node counts per operation
  - Text node resize behavior quirks
  - Auto-layout constraint conflicts

### 0.4 — Extract Build & Packaging Patterns

- [x] **0.4.1** DXT packaging: manifest format, build steps, GitHub Actions config
- [x] **0.4.2** Plugin manifest: `manifest.json` fields, permissions, network access declaration
- [x] **0.4.3** Dev workflow: How to run plugin in dev mode, hot reload, console access

### Deliverable for Phase 0
→ A single file: `REFERENCE.md` containing all extracted patterns, property mappings, edge cases, and gotchas. This is our reference manual for the build.

---

## Phase 1: Project Scaffolding

**Duration:** 1 day
**Purpose:** Set up the monorepo, toolchain, and hello-world connectivity.

### 1.1 — Monorepo Structure

- [x] **1.1.1** Create project root: `figma-fast/`
- [x] **1.1.2** Initialize monorepo structure:

```
figma-fast/
├── packages/
│   ├── mcp-server/          # MCP server + embedded WS
│   │   ├── src/
│   │   │   ├── index.ts     # Entry point (stdio MCP + WS server)
│   │   │   ├── tools/       # MCP tool definitions
│   │   │   ├── ws/          # WebSocket server logic
│   │   │   └── types/       # Shared types (scene spec, messages)
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── figma-plugin/        # Figma plugin (main + UI)
│   │   ├── src/
│   │   │   ├── main.ts      # Plugin main thread (Figma API)
│   │   │   ├── ui.html      # Plugin UI (iframe, WS client)
│   │   │   └── scene-builder/ # Scene builder engine
│   │   ├── manifest.json
│   │   └── tsconfig.json
│   └── shared/              # Shared types & utilities
│       ├── src/
│       │   ├── scene-spec.ts # Declarative scene spec types
│       │   ├── messages.ts   # WS message protocol types
│       │   └── colors.ts     # Color conversion utilities
│       ├── package.json
│       └── tsconfig.json
├── package.json             # Workspace root
├── tsconfig.base.json
├── PROGRESSION.md           # This file
└── REFERENCE.md             # Phase 0 output
```

- [x] **1.1.3** Set up TypeScript configs (strict, shared base)
- [x] **1.1.4** Set up build tooling: `esbuild` for plugin bundling, `tsx` for MCP server dev
- [x] **1.1.5** Set up `package.json` scripts: `dev`, `build`, `test`

### 1.2 — Shared Types (the contract)

- [x] **1.2.1** Define `SceneSpec` — the declarative scene-graph type:

```typescript
// This is THE core type. Everything revolves around this.
interface SceneNode {
  id?: string              // Client-assigned ID for follow-up references
  type: NodeType           // FRAME | TEXT | RECTANGLE | ELLIPSE | COMPONENT_INSTANCE | ...
  name?: string
  // Geometry
  x?: number
  y?: number
  width?: number
  height?: number
  // Style
  fills?: Fill[]
  strokes?: Stroke[]
  effects?: Effect[]
  opacity?: number
  cornerRadius?: number | [number, number, number, number]
  // Auto-layout
  layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE'
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX'
  itemSpacing?: number
  padding?: number | [number, number, number, number] // [top, right, bottom, left]
  // Sizing (for auto-layout children)
  layoutSizingHorizontal?: 'FIXED' | 'HUG' | 'FILL'
  layoutSizingVertical?: 'FIXED' | 'HUG' | 'FILL'
  // Text-specific
  characters?: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: number | string
  fontStyle?: string       // 'italic'
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED'
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM'
  textAutoResize?: 'WIDTH_AND_HEIGHT' | 'HEIGHT' | 'NONE' | 'TRUNCATE'
  lineHeight?: number | { value: number; unit: 'PIXELS' | 'PERCENT' | 'AUTO' }
  letterSpacing?: number
  textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH'
  textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE'
  // Component instance
  componentKey?: string    // For instantiating library components
  overrides?: Record<string, Partial<SceneNode>>
  // Children
  children?: SceneNode[]
  // Visibility & locking
  visible?: boolean
  locked?: boolean
}
```

- [x] **1.2.2** Define `WsMessage` protocol types:

```typescript
type WsMessage =
  | { type: 'build_scene'; id: string; spec: SceneNode; parentId?: string }
  | { type: 'batch_modify'; id: string; modifications: Modification[] }
  | { type: 'read_node'; id: string; nodeId: string; depth?: number }
  | { type: 'result'; id: string; success: boolean; data?: any; error?: string }
  | { type: 'ping' }
  | { type: 'pong' }
```

- [x] **1.2.3** Define helper types: `Fill`, `Stroke`, `Effect`, `Color`, `Modification`

### 1.3 — Hello World Connectivity

- [x] **1.3.1** MCP server: minimal stdio server that registers one tool (`ping`) and starts WS on port 3055
- [x] **1.3.2** Figma plugin: minimal `manifest.json` + `main.ts` + `ui.html` that connects to WS and responds to ping
- [ ] **1.3.3** Test: Run MCP server → open Figma → run plugin → call `ping` tool → get `pong` back
- [ ] **1.3.4** Verify the full path: `Claude Desktop → stdio → MCP → WS → Plugin UI → postMessage → Plugin Main → response back`

### Deliverable for Phase 1
→ Working end-to-end ping/pong between Claude Desktop and Figma plugin. Zero design features, full connectivity proven.

---

## Phase 2: Scene Builder Engine (The Core)

**Duration:** 1.5 weeks
**Purpose:** Build the `build_scene` tool — one call creates an entire UI.

### 2.1 — Plugin Scene Builder (main thread)

- [x] **2.1.1** Implement `collectFonts(spec)` — walk the spec tree, collect all unique `{family, style}` pairs
- [x] **2.1.2** Implement `preloadFonts(fonts)` — `Promise.all(fonts.map(f => figma.loadFontAsync(f)))` with fallback handling
- [x] **2.1.3** Implement `buildNode(spec, parent, idMap)` — recursive node builder:
  - Switch on `spec.type`:
    - `FRAME` → `figma.createFrame()`
    - `RECTANGLE` → `figma.createRectangle()`
    - `ELLIPSE` → `figma.createEllipse()`
    - `TEXT` → `figma.createText()`
    - `COMPONENT_INSTANCE` → `figma.importComponentByKeyAsync(key).createInstance()`
    - `GROUP` → create children, then `figma.group()`
    - `POLYGON` → `figma.createPolygon()`
    - `STAR` → `figma.createStar()`
    - `LINE` → `figma.createLine()`
    - `VECTOR` → `figma.createVector()`
  - Apply properties: size, position, fills, strokes, effects, corner radius
  - Apply auto-layout: layoutMode, alignment, spacing, padding
  - Apply text properties: characters, font, size, alignment
  - Recurse into `children`
  - Store `spec.id → node.id` in idMap
- [x] **2.1.4** Implement `buildScene(spec, parentId?)` — orchestrator:
  1. Collect fonts
  2. Pre-load fonts
  3. `commitUndo()` — start undo batch
  4. Build node tree
  5. `commitUndo()` — end undo batch (single Ctrl+Z)
  6. Return idMap
- [x] **2.1.5** Implement property application helpers:
  - `applyFills(node, fills)` — handle SOLID, GRADIENT_LINEAR, IMAGE
  - `applyStrokes(node, strokes)` — color, weight, alignment
  - `applyEffects(node, effects)` — drop shadow, inner shadow, blur
  - `applyAutoLayout(node, spec)` — full auto-layout setup
  - `applyTextProperties(node, spec)` — all text styling
  - `applyCornerRadius(node, spec)` — uniform vs per-corner
  - `applySizing(node, spec)` — layoutSizingHorizontal/Vertical

### 2.2 — Plugin UI (iframe, WS client)

- [x] **2.2.1** WS connection manager: connect to `ws://localhost:3055`, auto-reconnect, heartbeat
- [x] **2.2.2** Message routing: receive WS message → postMessage to main thread → receive response → send back via WS
- [x] **2.2.3** Minimal status UI: connection status, last operation, error display
- [x] **2.2.4** Large payload handling: ensure WS messages up to 1MB work (scene specs can be big)

### 2.3 — MCP Server: `build_scene` Tool

- [x] **2.3.1** WS server embedded in MCP process (port 3055)
- [x] **2.3.2** Connection management: track connected plugin, handle reconnect
- [x] **2.3.3** Request/response correlation: use `id` field to match responses to tool calls
- [x] **2.3.4** Timeout handling: 30s default, configurable
- [x] **2.3.5** Implement `build_scene` MCP tool:
  - **Name:** `build_scene`
  - **Description:** (Critical — this is what Claude reads to decide how to use it)
  ```
  Build an entire Figma design in a single call using a declarative scene specification.
  This is the PRIMARY tool for creating designs — always prefer this over atomic operations.

  The spec is a tree of nodes. Each node has a type and properties.
  All nodes in the tree are created in one batch — this is 10-50x faster than creating nodes individually.

  [Include 2-3 concrete examples in the description]
  ```
  - **Input schema:** `{ scene: SceneNode, parentNodeId?: string }`
  - **Output:** `{ nodeIdMap: Record<string, string>, rootNodeId: string }`

### 2.4 — Testing & Validation

- [ ] **2.4.1** Test: Simple card (frame + 2 text nodes) — verify it creates correctly in 1 call
- [ ] **2.4.2** Test: Nested auto-layout (horizontal inside vertical) — verify spacing/padding
- [ ] **2.4.3** Test: Text with custom font — verify font loading works
- [ ] **2.4.4** Test: 50+ node tree — verify performance (should be <5s)
- [ ] **2.4.5** Test: Error handling — invalid spec, missing font, disconnected plugin
- [ ] **2.4.6** Benchmark: Compare 1 `build_scene` call vs equivalent N atomic calls

### Deliverable for Phase 2
→ `build_scene` works end-to-end. Claude can say "create a card with title, subtitle, and a row of metrics" and it appears in Figma in 1–5 seconds via a single tool call.

---

## Phase 3: Read Tools & Atomic Fallbacks

**Duration:** 3–4 days
**Purpose:** Claude needs to READ the canvas and make surgical edits.

### 3.1 — Read Tools (Tier 4)

- [x] **3.1.1** `get_document_info` — pages, current page, top-level frames
- [x] **3.1.2** `get_node_info` — full property dump of a node (by ID), configurable depth for children
- [x] **3.1.3** `get_selection` — what's currently selected in Figma
- [x] **3.1.4** `get_styles` — local styles (color, text, effect)
- [x] **3.1.5** `get_local_components` — local components list with keys
- [x] **3.1.6** `export_node_as_image` — export to PNG/SVG/JPG/PDF, return as base64

### 3.2 — Atomic Edit Tools (Tier 3)

- [x] **3.2.1** `modify_node` — update any property of an existing node by ID
- [x] **3.2.2** `delete_nodes` — delete one or more nodes by ID
- [x] **3.2.3** `move_node` — reposition or reparent a node
- [x] **3.2.4** `clone_node` — duplicate a node

### Deliverable for Phase 3
→ Claude can inspect the canvas, read properties, and make targeted edits. The read→think→edit loop works.

---

## Phase 4: Batch Modifications

**Duration:** 3–4 days
**Purpose:** Bulk edits in one call — the second major speedup.

### 4.1 — Batch Modify Tool (Tier 2)

- [ ] **4.1.1** `batch_modify` — apply N property changes to N nodes in one call:
  ```typescript
  {
    modifications: [
      { nodeId: "123", properties: { fills: [...], opacity: 0.8 } },
      { nodeId: "456", properties: { characters: "New text", fontSize: 18 } },
      // ... up to 100 modifications
    ]
  }
  ```
- [ ] **4.1.2** Font pre-loading for batch text edits (same pattern as build_scene)
- [ ] **4.1.3** Undo batching: all modifications in one Ctrl+Z

### 4.2 — Batch Text Replace

- [ ] **4.2.1** `batch_text_replace` — find-and-replace across text nodes:
  ```typescript
  {
    scope: "page" | "selection" | nodeId,
    replacements: [
      { find: "Lorem ipsum", replace: "Real copy" },
      { find: /\$\d+/, replace: "$99.99" }
    ]
  }
  ```

### Deliverable for Phase 4
→ Claude can update 20 text nodes or restyle 10 frames in a single tool call.

---

## Phase 5: Component System

**Duration:** 3–4 days
**Purpose:** Full component creation, variant management, and component properties — enabling design system workflows.

### 5.1 — Shared Types: Component & ComponentSet

- [x] **5.1.1** Add `'COMPONENT'` and `'COMPONENT_SET'` to `NodeType` union in `packages/shared/src/scene-spec.ts`
- [x] **5.1.2** Add `ComponentPropertyDefinition` interface to `packages/shared/src/messages.ts`
- [x] **5.1.3** Add component-specific fields to `SceneNode` interface:
  - `componentDescription?: string` — description for COMPONENT/COMPONENT_SET
  - `componentId?: string` — node ID for local component instances
  - `overrides?: Record<string, string | boolean>` — property overrides for COMPONENT_INSTANCE
- [x] **5.1.4** Add 4 new message types to `ServerToPluginMessage` in `packages/shared/src/messages.ts`:
  - `get_library_components` (libraryName?, query?)
  - `convert_to_component` (nodeId)
  - `combine_as_variants` (nodeIds[], name?)
  - `manage_component_properties` (componentId, action, properties[])
- [x] **5.1.5** Export `ComponentPropertyDefinition` from `packages/shared/src/index.ts`

### 5.2 — Plugin: COMPONENT Node Creation

- [x] **5.2.1** Add `COMPONENT` case to `createNode()` — `figma.createComponent()`. Inherits all frame property application via duck-typing.
- [x] **5.2.2** Set `componentDescription` on COMPONENT nodes after name assignment
- [x] **5.2.3** Update `COMPONENT_INSTANCE` creation to support both `componentId` (local, via `getNodeByIdAsync`) and `componentKey` (published, via `importComponentByKeyAsync`)
- [x] **5.2.4** Add override application for COMPONENT_INSTANCE via `setProperties()` with prefix matching for Figma's `"Name#hash"` property keys

### 5.3 — Plugin: COMPONENT_SET Creation (Reversed Build Order)

- [x] **5.3.1** Implement `buildComponentSet()` function in `build-node.ts` with reversed build order: build COMPONENT children first, then `figma.combineAsVariants()`, then apply visual properties and record ID mapping
- [x] **5.3.2** Add early return in `buildNode()` delegating COMPONENT_SET to `buildComponentSet()`
  > **Key insight:** Variant naming is convention-based. Each child COMPONENT's `name` must follow `"Property=Value, Property=Value"` format. Figma's `combineAsVariants()` parses these names automatically.

### 5.4 — MCP Server: Update build_scene Schema

- [x] **5.4.1** Add `'COMPONENT'` and `'COMPONENT_SET'` to the `type` enum in `SceneNodeSchema` Zod definition
- [x] **5.4.2** Add `componentDescription`, `componentId`, and updated `overrides` schema to `SceneNodeSchema`
- [x] **5.4.3** Add variant component set example to `TOOL_DESCRIPTION`

### 5.5 — Serialization: Component-Specific Data

- [x] **5.5.1** Add component fields to `SerializedNode`: `componentKey`, `componentDescription`, `componentPropertyDefinitions`, `mainComponentId`, `mainComponentKey`
- [x] **5.5.2** Add serialization logic for COMPONENT, COMPONENT_SET, and INSTANCE node types

### 5.6 — New MCP Tools: Component Lifecycle Operations

Created `packages/mcp-server/src/tools/component-tools.ts` with 3 dedicated tools:

- [x] **5.6.1** `convert_to_component` — Convert existing FRAME/GROUP into a Component. Copies all properties and children, returns componentId/key/name.
- [x] **5.6.2** `combine_as_variants` — Combine existing Component nodes into a Component Set. Validates all nodes are COMPONENT type.
- [x] **5.6.3** `manage_component_properties` — Add/update/delete properties on Components or Component Sets. Supports BOOLEAN, TEXT, INSTANCE_SWAP, VARIANT types.
- [x] **5.6.4** `get_library_components` — Search team library components by libraryName and/or query. Returns name, key, libraryName, description for use with componentKey.

### 5.7 — Wiring: Plugin & Server Integration

- [x] **5.7.1** Add handler functions in `handlers.ts`: `handleConvertToComponent`, `handleCombineAsVariants`, `handleManageComponentProperties`, `handleGetLibraryComponents`
- [x] **5.7.2** Add message routing for 4 new types in `main.ts`
- [x] **5.7.3** Register component tools and library search tool in MCP server `index.ts` and `read-tools.ts`

### 5.8 — Testing & Validation

- [x] **5.8.1** Build all packages: `npm run build` — clean compilation across shared, mcp-server, figma-plugin
- [ ] **5.8.2** Test `build_scene` with `type: "COMPONENT"` — verify purple component border, correct properties, can be instantiated
- [ ] **5.8.3** Test `build_scene` with `type: "COMPONENT_SET"` + variant children — verify variant panel, variant properties derived from names
- [ ] **5.8.4** Test `convert_to_component` on existing frame — verify children preserved, key returned
- [ ] **5.8.5** Test `combine_as_variants` on standalone components — verify component set created
- [ ] **5.8.6** Test `manage_component_properties` — add/edit/delete a boolean property
- [ ] **5.8.7** Test `get_node_info` on components — verify component-specific fields in output
- [ ] **5.8.8** Test `get_library_components` — verify library search returns keys usable with componentKey
- [ ] **5.8.9** Test `build_scene` with `COMPONENT_INSTANCE` + `componentId` — verify local component instantiation
- [ ] **5.8.10** Test `COMPONENT_INSTANCE` with `overrides` — verify property overrides applied via setProperties()

### Deliverable for Phase 5
→ Claude can create components and component sets with variants from scratch via `build_scene`, convert existing frames into components, combine components into variant groups, and manage component properties. Full design system authoring workflow unlocked.

---

## Phase 6: Polish, Error Handling, DX

**Duration:** 3–4 days
**Purpose:** Production-ready quality.

### 6.1 — Error Handling & Recovery

- [ ] **6.1.1** Chunked scene building: if spec > 200 nodes, split into sub-trees
- [ ] **6.1.2** Partial failure reporting: "Created 45/50 nodes, failed on node X because..."
- [ ] **6.1.3** WS disconnect recovery: reconnect + resume, or clear error to user
- [ ] **6.1.4** Font fallback: if font not available, use Inter/Roboto, report which fonts were substituted

### 6.2 — Developer Experience

- [ ] **6.2.1** npm package for MCP server: `npx figma-fast` to run
- [ ] **6.2.2** Plugin installation instructions: manual install or Figma Community
- [ ] **6.2.3** Claude Desktop config snippet:
  ```json
  {
    "mcpServers": {
      "figma-fast": {
        "command": "npx",
        "args": ["figma-fast"]
      }
    }
  }
  ```
- [ ] **6.2.4** Tool descriptions with rich examples (2–3 per tool)
- [ ] **6.2.5** README with architecture diagram, quick start, performance benchmarks

### 6.3 — Testing & Benchmarks

- [ ] **6.3.1** Benchmark suite: card, dashboard, design system — automated timing comparison
- [ ] **6.3.2** Edge case tests: empty scene, deeply nested (10+ levels), all node types, Unicode text
- [ ] **6.3.3** Integration test: full Claude conversation → Figma output

### Deliverable for Phase 6
→ Publishable, documented, benchmarked MCP server + Figma plugin.

---

## Quick Reference: Tool Inventory

| Tool | Tier | Priority | Description |
|------|------|----------|-------------|
| `build_scene` | 1 | P0 | Create entire UI from declarative spec (supports COMPONENT & COMPONENT_SET) |
| `batch_modify` | 2 | P1 | Modify multiple nodes in one call |
| `batch_text_replace` | 2 | P1 | Find/replace text across nodes |
| `convert_to_component` | 1 | P1 | Convert existing frame/node into a Component |
| `combine_as_variants` | 1 | P1 | Combine Components into a Component Set (variants) |
| `manage_component_properties` | 1 | P1 | Add/edit/delete component properties (BOOLEAN, TEXT, INSTANCE_SWAP) |
| `get_document_info` | 4 | P0 | Read document structure |
| `get_node_info` | 4 | P0 | Read node properties (incl. component data) |
| `get_selection` | 4 | P1 | Read current selection |
| `get_styles` | 4 | P2 | Read local styles |
| `get_local_components` | 4 | P2 | Read local components & component sets |
| `get_library_components` | 4 | P1 | Search team library components by name/library |
| `export_node_as_image` | 4 | P2 | Export node to image |
| `modify_node` | 3 | P1 | Edit single node properties |
| `delete_nodes` | 3 | P1 | Delete nodes |
| `move_node` | 3 | P2 | Move/reparent node |
| `clone_node` | 3 | P2 | Duplicate node |

---

## Claude Code Loop Instructions

When using Claude Code with the Ralph Widgum loop, provide this context at the start of each session:

```
You are building FigmaFast — a high-performance MCP server + Figma plugin.
Read PROGRESSION.md for current status. Check boxes as you complete items.
Read REFERENCE.md for Figma API patterns extracted from ClaudeTalkToFigma.

Architecture:
- packages/mcp-server: TypeScript MCP server with embedded WebSocket
- packages/figma-plugin: Figma plugin with Scene Builder Engine
- packages/shared: Shared types (SceneSpec, WS message protocol)

Key principle: MINIMIZE TOOL CALLS. Every design operation should collapse
into the fewest possible MCP tool calls. build_scene is the primary tool.

Current phase: [UPDATE THIS]
Current task: [UPDATE THIS]
```

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Day 0 | Build from scratch, not fork | Cleaner architecture, better Claude tool selection behavior, less refactoring debt |
| Day 0 | Monorepo with shared types | Single source of truth for SceneSpec and WS protocol |
| Day 0 | Embedded WS in MCP server | Eliminate relay server — one fewer process boundary |
| Day 0 | Node.js (not Bun) for MCP server | Broader compatibility, easier npx distribution |
| Day 0 | esbuild for plugin bundling | Fast, single-file output for Figma plugin |

---

*Last updated: Phase 5 — implementation complete, functional testing pending. Component & Component Set support added to build_scene. 3 new lifecycle tools (convert_to_component, combine_as_variants, manage_component_properties) + get_library_components for team library discovery. Local component instances via componentId + property overrides via setProperties(). All packages build cleanly.*
