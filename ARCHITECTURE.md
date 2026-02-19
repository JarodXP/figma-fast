# FigmaFast -- Technical Architecture

> **Version:** 1.0.0
> **Last updated:** 2026-02-19

---

## System Diagram

```
+------------------+        stdio (JSON-RPC)       +---------------------+
|                  | <---------------------------> |                     |
|  Claude / AI     |                               |  MCP Server         |
|  (Claude Desktop |                               |  packages/          |
|   or Claude Code)|                               |    mcp-server/      |
|                  |                               |                     |
+------------------+                               |  - Tool definitions |
                                                   |  - Zod validation   |
                                                   |  - Request/response |
                                                   |    correlation      |
                                                   |                     |
                                                   |  +---------------+  |
                                                   |  | Embedded WS   |  |
                                                   |  | Server (:3056)|  |
                                                   |  +-------+-------+  |
                                                   +----------|----------+
                                                              |
                                                   WebSocket (JSON messages)
                                                              |
                                                   +----------|----------+
                                                   |  Figma Plugin       |
                                                   |  packages/          |
                                                   |    figma-plugin/    |
                                                   |                     |
                                                   |  +---------------+  |
                                                   |  | UI iframe     |  |
                                                   |  | (WS client)   |  |
                                                   |  +-------+-------+  |
                                                   |          | postMessage
                                                   |  +-------+-------+  |
                                                   |  | Main thread   |  |
                                                   |  | (Figma API)   |  |
                                                   |  +---------------+  |
                                                   +---------------------+
```

---

## Directory Structure

```
figma-fast/
├── packages/
│   ├── shared/                     # Shared types & utilities (compiled with tsc)
│   │   ├── src/
│   │   │   ├── index.ts            # Re-exports all types and utilities
│   │   │   ├── scene-spec.ts       # SceneNode -- THE core type (147 lines)
│   │   │   ├── messages.ts         # WebSocket message protocol types (48 lines)
│   │   │   └── colors.ts           # hexToRgba / rgbaToHex conversion (46 lines)
│   │   ├── dist/                   # tsc output (.js, .d.ts, .d.ts.map)
│   │   ├── package.json            # @figma-fast/shared
│   │   └── tsconfig.json
│   │
│   ├── mcp-server/                 # MCP server + embedded WebSocket server
│   │   ├── src/
│   │   │   ├── index.ts            # Entry: McpServer + StdioTransport + WS start (40 lines)
│   │   │   ├── ws/
│   │   │   │   └── server.ts       # WS server, request correlation, sendToPlugin() (128 lines)
│   │   │   └── tools/
│   │   │       ├── ping.ts         # ping tool (58 lines)
│   │   │       ├── build-scene.ts  # build_scene tool + Zod schemas (308 lines)
│   │   │       ├── read-tools.ts   # 6 read tools (317 lines)
│   │   │       ├── edit-tools.ts   # 4 edit tools (272 lines)
│   │   │       └── component-tools.ts # 3 component lifecycle tools (163 lines)
│   │   ├── dist/                   # tsc output
│   │   ├── package.json            # @figma-fast/mcp-server
│   │   └── tsconfig.json
│   │
│   └── figma-plugin/               # Figma plugin (bundled with esbuild)
│       ├── src/
│       │   ├── main.ts             # Plugin entry: message routing (161 lines)
│       │   ├── ui.html             # WS client + status UI (158 lines)
│       │   ├── handlers.ts         # All read/edit/component handlers (597 lines)
│       │   ├── serialize-node.ts   # Node-to-JSON serializer (265 lines)
│       │   └── scene-builder/
│       │       ├── index.ts        # buildScene orchestrator (120 lines)
│       │       ├── build-node.ts   # Recursive buildNode + property helpers (491 lines)
│       │       └── fonts.ts        # collectFonts, preloadFonts, getFontStyle (91 lines)
│       ├── dist/                   # esbuild IIFE output
│       │   ├── main.js             # Bundled plugin code
│       │   ├── ui.html             # Copied from src
│       │   └── manifest.json       # Copied from root
│       ├── manifest.json           # Figma plugin manifest
│       ├── build.mjs               # esbuild build script (35 lines)
│       ├── package.json            # @figma-fast/figma-plugin
│       └── tsconfig.json
│
├── prompts_templates/
│   └── FIGMA_DESIGN_ARCHITECT.md   # System prompt template for Figma design workflow
│
├── package.json                    # Workspace root (npm workspaces)
├── tsconfig.base.json              # Shared TS config
├── REFERENCE.md                    # Figma API patterns extracted from ClaudeTalkToFigma (1081 lines)
├── PROGRESSION.md                  # Original build plan & checklist (588 lines)
├── README.md                       # User-facing documentation
├── PLAN.md                         # CTO strategic plan (this audit)
├── ARCHITECTURE.md                 # This file
├── TESTS.md                        # Test specifications
├── TASKS.md                        # Granular task breakdown
└── PROGRESS.md                     # Sprint progress tracker
```

---

## Data Flow

### 1. build_scene (Happy Path)

```
Claude sends: tools/call "build_scene" { scene: SceneNode, parentNodeId?: string }
  |
  v
MCP Server (build-scene.ts):
  1. Validate params with Zod SceneNodeSchema (recursive, lazy)
  2. Check isPluginConnected()
  3. Call sendToPlugin({ type: 'build_scene', spec, parentId }, 120_000ms timeout)
  |
  v
WS Server (server.ts):
  1. Generate UUID correlation ID
  2. Store PendingRequest with resolve/reject/timeout
  3. JSON.stringify and send via WebSocket
  |
  v
Plugin UI (ui.html):
  1. ws.onmessage receives JSON
  2. parent.postMessage({ pluginMessage: msg }, '*')
  |
  v
Plugin Main Thread (main.ts):
  1. figma.ui.onmessage receives msg
  2. Dispatches to buildScene(msg.spec, msg.parentId)
  |
  v
Scene Builder (index.ts + build-node.ts + fonts.ts):
  1. Determine parent node (or currentPage)
  2. collectFonts(spec) -- walk tree, collect unique {family, style}
  3. preloadFonts(fontRefs) -- Promise.all with per-font error catching
  4. commitUndo() -- start batch
  5. buildNode(spec, parent, idMap, failedFonts) -- RECURSIVE:
     a. createNode(spec) -- figma.create*() or importComponentByKeyAsync
     b. Apply name, geometry (resize), position
     c. Apply fills, strokes, effects, cornerRadius, opacity
     d. Apply auto-layout (layoutMode, padding, spacing, alignment)
     e. Append to parent
     f. Apply text properties (font, characters, alignment)
     g. Apply sizing (layoutSizingH/V -- must be after parent append)
     h. Apply component instance overrides
     i. Record id -> node.id in idMap
     j. Recurse into children
  6. commitUndo() -- end batch
  7. Scroll viewport to root node
  8. Return { success, rootNodeId, nodeIdMap, nodeCount, errors, fontSubstitutions, durationMs }
  |
  v (response flows back through the same chain in reverse)
Plugin Main -> postMessage -> UI iframe -> WebSocket -> WS Server resolves PendingRequest -> MCP Server formats text response -> Claude
```

### 2. Request/Response Correlation

Every message from server to plugin includes a UUID `id` field. The plugin echoes this `id` back in the response. The WS server maintains a `Map<string, PendingRequest>` to match responses to promises. Timeouts auto-reject after configurable duration (default 30s, 120s for build_scene).

### 3. Plugin Communication Model

Figma plugins have a sandboxed main thread (access to Figma API, no network) and a UI iframe (access to network, no Figma API). Communication between them is via `postMessage`. The UI iframe acts as a WebSocket bridge:

- **Inbound:** WS message -> JSON parse -> `parent.postMessage({ pluginMessage: msg })` -> main thread
- **Outbound:** main thread -> `figma.ui.postMessage(msg)` -> `window.onmessage` -> WS send

---

## API Contracts

### MCP Tools (16 total)

| Tool | Type | Input Schema | Timeout | Plugin-Routed |
|------|------|-------------|---------|---------------|
| `ping` | connectivity | `{}` | 10s | Yes |
| `build_scene` | creation | `{ scene: SceneNode, parentNodeId?: string }` | 120s | Yes |
| `get_document_info` | read | `{}` | 30s | Yes |
| `get_node_info` | read | `{ nodeId: string, depth?: 0-10 }` | 30s | Yes |
| `get_selection` | read | `{}` | 30s | Yes |
| `get_styles` | read | `{}` | 30s | Yes |
| `get_local_components` | read | `{}` | 30s | Yes |
| `get_library_components` | read | `{ fileKey: string, query?: string }` | 30s | **No (REST API)** |
| `export_node_as_image` | read | `{ nodeId: string, format?: PNG/SVG/JPG/PDF, scale?: 0.01-4 }` | 30s | Yes |
| `modify_node` | edit | `{ nodeId: string, properties: ModifyProps }` | 30s | Yes |
| `delete_nodes` | edit | `{ nodeIds: string[] }` | 30s | Yes |
| `move_node` | edit | `{ nodeId: string, x?, y?, parentId?, index? }` | 30s | Yes |
| `clone_node` | edit | `{ nodeId: string }` | 30s | Yes |
| `convert_to_component` | component | `{ nodeId: string }` | 30s | Yes |
| `combine_as_variants` | component | `{ nodeIds: string[], name?: string }` | 30s | Yes |
| `manage_component_properties` | component | `{ componentId, action, properties[] }` | 30s | Yes |

### WebSocket Message Protocol

**Server -> Plugin:** `ServerToPluginMessage` (16 message types matching tools above)
**Plugin -> Server:** `PluginToServerMessage` (2 types: `pong` | `result`)

All messages are JSON. All include `id: string` for correlation (except `hello` handshake from UI).

### SceneNode Spec (Core Contract)

The `SceneNode` interface in `packages/shared/src/scene-spec.ts` is the central type. It supports:
- 12 node types: FRAME, TEXT, RECTANGLE, ELLIPSE, GROUP, COMPONENT, COMPONENT_SET, COMPONENT_INSTANCE, POLYGON, STAR, LINE, VECTOR
- Visual properties: fills (solid, gradient), strokes, effects (shadow, blur), corner radius, opacity
- Auto-layout: layoutMode, padding, itemSpacing, alignment, sizing
- Text: characters, font, size, weight, alignment, decoration, case, lineHeight, letterSpacing
- Components: componentKey, componentId, overrides, swapComponent, componentDescription
- Hierarchy: children (recursive)

Colors are hex strings (#RGB, #RRGGBB, #RRGGBBAA). Converted to Figma {r,g,b,a} 0-1 range by `hexToRgba()`.

---

## Conventions

### Code Style
- TypeScript strict mode everywhere
- ES module imports with `.js` extension (Node16 module resolution)
- Figma plugin bundled to IIFE ES2015 target
- Error handling: try/catch with descriptive error messages
- Console logging: `console.error()` for MCP server (avoids contaminating stdio), `console.log()` / `console.warn()` in plugin
- No linting or formatting tools configured (GAP)

### Naming
- Files: kebab-case (`build-node.ts`, `scene-spec.ts`)
- Types: PascalCase (`SceneNode`, `BuildResult`)
- Functions: camelCase (`buildNode`, `sendToPlugin`)
- Constants: UPPER_SNAKE for timeouts and config, camelCase for most constants
- Packages: `@figma-fast/shared`, `@figma-fast/mcp-server`, `@figma-fast/figma-plugin`

### Build Order
`shared` -> `mcp-server` -> `figma-plugin` (plugin bundles shared via esbuild)

### Port Convention
- Default WS port: 3056 (configurable via `FIGMA_FAST_PORT`)
- ClaudeTalkToFigma uses 3055 (no conflict by default)

---

## Known Technical Debt

1. **Zero test coverage** -- No test files, no test framework, no test scripts
2. **No CI/CD** -- No GitHub Actions, no pre-commit hooks
3. **No linting/formatting** -- No eslint, no prettier
4. **GROUP is a FRAME hack** -- `figma.createFrame()` with no fills, not actual `figma.group()`
5. **Duplicate Zod schemas** -- FillSchema, StrokeSchema, EffectSchema, LineHeightSchema duplicated between `build-scene.ts` and `edit-tools.ts`
6. **Image fill not supported** -- Renders as gray placeholder solid fill
7. **Gradient fill limited** -- GradientTransform defaults to identity if not provided
8. **No input sanitization** -- Hex color parsing trusts input format
9. **commitUndo fragile** -- Wrapped in try/catch with silent failure, behavior varies across Figma API versions
10. **Plugin Phase 1 testing incomplete** -- Tasks 1.3.3 and 1.3.4 (full path verification) never checked off
