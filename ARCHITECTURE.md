# FigmaFast -- Technical Architecture

> **Version:** 2.0.0
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
                                                   |  - Image download   |
                                                   |    (new in v2.0)    |
                                                   |                     |
                                                   |  +---------------+  |
                                                   |  | Embedded WS   |  |
                                                   |  | Server (:3056)|  |
                                                   |  +-------+-------+  |
                                                   +----------|----------+
                                                              |
                                                   WebSocket (JSON messages)
                                                   (+ base64 image payloads)
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

## Directory Structure (v2.0 projected)

```
figma-fast/
├── packages/
│   ├── shared/                     # Shared types & utilities (compiled with tsc)
│   │   ├── src/
│   │   │   ├── index.ts            # Re-exports all types and utilities
│   │   │   ├── scene-spec.ts       # SceneNode -- THE core type
│   │   │   ├── messages.ts         # WebSocket message protocol types
│   │   │   ├── colors.ts           # hexToRgba / rgbaToHex conversion
│   │   │   ├── fonts.ts            # Pure font logic (getFontStyle, collectFonts)
│   │   │   └── __tests__/
│   │   │       ├── colors.test.ts
│   │   │       └── fonts.test.ts
│   │   ├── dist/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── mcp-server/                 # MCP server + embedded WebSocket server
│   │   ├── src/
│   │   │   ├── index.ts            # Entry: McpServer + StdioTransport + WS start
│   │   │   ├── schemas.ts          # Shared Zod schemas (extracted in Phase 5.5)
│   │   │   ├── ws/
│   │   │   │   └── server.ts       # WS server, request correlation, sendToPlugin()
│   │   │   ├── tools/
│   │   │   │   ├── ping.ts         # ping tool
│   │   │   │   ├── build-scene.ts  # build_scene tool (+ image pre-download in v2.0)
│   │   │   │   ├── read-tools.ts   # 7 read tools (get_document_info, etc.)
│   │   │   │   ├── edit-tools.ts   # 4 edit tools (modify_node, etc.)
│   │   │   │   ├── component-tools.ts # 3 component lifecycle tools
│   │   │   │   ├── page-tools.ts   # NEW: 3 page management tools
│   │   │   │   ├── style-tools.ts  # NEW: 3 style creation tools
│   │   │   │   ├── image-tools.ts  # NEW: set_image_fill tool
│   │   │   │   └── boolean-tools.ts # NEW: boolean_operation tool
│   │   │   └── __tests__/
│   │   │       ├── schemas.test.ts
│   │   │       ├── server.test.ts
│   │   │       └── ws-server.test.ts
│   │   ├── dist/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── figma-plugin/               # Figma plugin (bundled with esbuild)
│       ├── src/
│       │   ├── main.ts             # Plugin entry: message routing
│       │   ├── ui.html             # WS client + status UI
│       │   ├── handlers.ts         # All handlers (+ page, style, image, boolean in v2.0)
│       │   ├── serialize-node.ts   # Node-to-JSON serializer
│       │   └── scene-builder/
│       │       ├── index.ts        # buildScene orchestrator
│       │       ├── build-node.ts   # Recursive buildNode + property helpers
│       │       └── fonts.ts        # collectFonts, preloadFonts, getFontStyle
│       ├── dist/
│       ├── manifest.json
│       ├── build.mjs
│       ├── package.json
│       └── tsconfig.json
│
├── prompts_templates/
│   └── FIGMA_DESIGN_ARCHITECT.md
│
├── package.json                    # Workspace root
├── tsconfig.base.json
├── vitest.config.ts
├── eslint.config.js
├── .prettierrc
├── REFERENCE.md                    # Figma API patterns (1081 lines)
├── PROGRESSION.md                  # Original build checklist
├── README.md
├── PLAN.md                         # CTO strategic plan
├── ARCHITECTURE.md                 # This file
├── TESTS.md                        # Test specifications
├── TASKS.md                        # Granular task breakdown
└── PROGRESS.md                     # Sprint progress tracker
```

---

## Data Flow

### 1. build_scene (Happy Path -- v2.0 with Image Support)

```
Claude sends: tools/call "build_scene" { scene: SceneNode, parentNodeId?: string }
  |
  v
MCP Server (build-scene.ts):
  1. Validate params with Zod SceneNodeSchema
  2. Check isPluginConnected()
  3. NEW: Walk scene tree, find all IMAGE fills with imageUrl
  4. NEW: Fetch each image URL in parallel (30s timeout per image)
  5. NEW: Build imagePayloads map { imageUrl -> base64Data }
  6. Call sendToPlugin({ type: 'build_scene', spec, parentId, imagePayloads }, 120_000ms)
  |
  v
WS Server -> Plugin UI -> Plugin Main Thread -> Scene Builder:
  1. Determine parent node
  2. collectFonts(spec) + preloadFonts()
  3. commitUndo() -- start batch
  4. buildNode(spec, parent, idMap, failedFonts, imagePayloads) -- RECURSIVE:
     a. createNode(spec)
     b. Apply name, geometry, position
     c. Apply fills (NEW: IMAGE fills use imagePayloads to create images)
     d. Apply strokes, effects, cornerRadius, opacity
     e. Apply style bindings (fillStyleId, textStyleId, effectStyleId) -- NEW
     f. Apply auto-layout
     g. Append to parent
     h. Apply text properties
     i. Apply sizing
     j. Apply component instance overrides
     k. Record id -> node.id
     l. Recurse into children
  5. commitUndo() -- end batch
  6. Scroll viewport
  7. Return result
```

### 2. set_image_fill (New Data Flow)

```
Claude sends: tools/call "set_image_fill" { nodeId: "123:456", imageUrl: "https://..." }
  |
  v
MCP Server (image-tools.ts):
  1. Validate URL (Zod .url())
  2. fetch(imageUrl) with 30s AbortController timeout
  3. response.arrayBuffer() -> Buffer.from() -> .toString('base64')
  4. sendToPlugin({ type: 'set_image_fill', nodeId, imageData: base64, scaleMode })
  |
  v
Plugin (handlers.ts):
  1. base64Decode(imageData) -> Uint8Array
  2. figma.createImage(bytes) -> image
  3. node.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode }]
  4. Return { nodeId, name, imageHash }
```

### 3. Request/Response Correlation (unchanged)

Every message includes UUID `id` for correlation. WS server maintains `Map<string, PendingRequest>`. Timeouts auto-reject.

### 4. Plugin Communication Model (unchanged)

UI iframe bridges WebSocket to main thread via `postMessage`. Main thread has Figma API access, no network. UI has network, no Figma API.

---

## API Contracts

### MCP Tools (24 total after v2.0)

| Tool | Type | Input Schema | Timeout | Plugin-Routed | Phase |
|------|------|-------------|---------|---------------|-------|
| `ping` | connectivity | `{}` | 10s | Yes | 1 |
| `build_scene` | creation | `{ scene: SceneNode, parentNodeId? }` | 120s | Yes | 2 |
| `get_document_info` | read | `{}` | 30s | Yes | 3 |
| `get_node_info` | read | `{ nodeId, depth? }` | 30s | Yes | 3 |
| `get_selection` | read | `{}` | 30s | Yes | 3 |
| `get_styles` | read | `{}` | 30s | Yes | 3 |
| `get_local_components` | read | `{}` | 30s | Yes | 3 |
| `get_library_components` | read | `{ fileKey, query? }` | 30s | No (REST) | 5 |
| `export_node_as_image` | read | `{ nodeId, format?, scale? }` | 30s | Yes | 3 |
| `modify_node` | edit | `{ nodeId, properties }` | 30s | Yes | 3 |
| `delete_nodes` | edit | `{ nodeIds }` | 30s | Yes | 3 |
| `move_node` | edit | `{ nodeId, x?, y?, parentId?, index? }` | 30s | Yes | 3 |
| `clone_node` | edit | `{ nodeId }` | 30s | Yes | 3 |
| `convert_to_component` | component | `{ nodeId }` | 30s | Yes | 5 |
| `combine_as_variants` | component | `{ nodeIds, name? }` | 30s | Yes | 5 |
| `manage_component_properties` | component | `{ componentId, action, properties }` | 30s | Yes | 5 |
| `create_page` | page | `{ name }` | 30s | Yes | **6** |
| `rename_page` | page | `{ pageId, name }` | 30s | Yes | **6** |
| `set_current_page` | page | `{ pageId }` | 30s | Yes | **6** |
| `create_paint_style` | style | `{ name, fills }` | 30s | Yes | **7B** |
| `create_text_style` | style | `{ name, fontFamily?, fontSize?, ... }` | 30s | Yes | **7B** |
| `create_effect_style` | style | `{ name, effects }` | 30s | Yes | **7B** |
| `set_image_fill` | image | `{ nodeId, imageUrl, scaleMode? }` | 60s | Hybrid | **8** |
| `boolean_operation` | shape | `{ operation, nodeIds }` | 30s | Yes | **9** |

### WebSocket Message Protocol (v2.0)

**Server -> Plugin:** `ServerToPluginMessage` (24 message types)
**Plugin -> Server:** `PluginToServerMessage` (2 types: `pong` | `result`)

New message types in v2.0:
- `create_page` (Phase 6)
- `rename_page` (Phase 6)
- `set_current_page` (Phase 6)
- `create_paint_style` (Phase 7B)
- `create_text_style` (Phase 7B)
- `create_effect_style` (Phase 7B)
- `set_image_fill` (Phase 8)
- `boolean_operation` (Phase 9)

### SceneNode Spec (Core Contract -- v2.0 additions)

New fields on SceneNode:
- `fillStyleId?: string` -- Bind a paint style by ID (Phase 7A)
- `textStyleId?: string` -- Bind a text style by ID (Phase 7A)
- `effectStyleId?: string` -- Bind an effect style by ID (Phase 7A)

New fields on Fill:
- `imageUrl?: string` -- URL for IMAGE fill type (Phase 8, server downloads)

---

## Conventions

### Code Style
- TypeScript strict mode everywhere
- ES module imports with `.js` extension (Node16 module resolution)
- Figma plugin bundled to IIFE ES2015 target
- Error handling: try/catch with descriptive error messages, errors collected in arrays
- Console logging: `console.error()` for MCP server (avoids contaminating stdio)
- ESLint + Prettier configured (Phase 5.5)

### Naming
- Files: kebab-case (`build-node.ts`, `page-tools.ts`)
- Types: PascalCase (`SceneNode`, `BuildResult`)
- Functions: camelCase (`buildNode`, `handleCreatePage`)
- Constants: UPPER_SNAKE for timeouts and config
- Packages: `@figma-fast/shared`, `@figma-fast/mcp-server`, `@figma-fast/figma-plugin`

### Tool Registration Pattern
- One `register<Category>Tools(server: McpServer)` function per tool file
- All called from `packages/mcp-server/src/index.ts`
- Tools follow NOT_CONNECTED / sendToPlugin / response format / error handling pattern

### Plugin Handler Pattern
- One `handle<Action>(params): Promise<unknown>` function per handler
- All in `packages/figma-plugin/src/handlers.ts`
- Routed via switch statement in `packages/figma-plugin/src/main.ts`
- Always return structured data (not raw strings)
- Collect errors in arrays, never throw for partial failures

### Build Order
`shared` -> `mcp-server` -> `figma-plugin` (plugin bundles shared via esbuild)

### Port Convention
- Default WS port: 3056 (configurable via `FIGMA_FAST_PORT`)
- ClaudeTalkToFigma uses 3055 (no conflict)

---

## Known Technical Debt

1. **No CI/CD** -- No GitHub Actions, no pre-commit hooks (gap from v1.0, still unresolved)
2. **GROUP is a FRAME hack** -- `figma.createFrame()` with no fills, not actual `figma.group()`
3. **Image fill not supported** -- Renders as gray placeholder (RESOLVING in Phase 8)
4. **Style binding not supported** -- Cannot apply styles by ID (RESOLVING in Phase 7A)
5. **Gradient fill limited** -- GradientTransform defaults to identity if not provided
6. **No input sanitization** -- Hex color parsing trusts input format
7. **commitUndo fragile** -- Wrapped in try/catch with silent failure
8. **Plugin handler tests blocked by Figma sandbox** -- Cannot unit test handlers that call figma.* without mocking framework
9. **handlers.ts growing large** -- 607+ lines, may need splitting after v2.0
10. **serialize-node.ts missing style ID serialization** -- Does not return fillStyleId/textStyleId/effectStyleId on read (should add in Phase 7A)
