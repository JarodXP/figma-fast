# FigmaFast — Reference Manual

> **What is this?** Patterns, property mappings, edge cases, and gotchas extracted from [ClaudeTalkToFigma](https://github.com/ArinspunkMCP/ClaudeTalkToFigma). This file is our cheat sheet so we don't reinvent what they already figured out.
>
> **How to fill this in:** Clone the repo, read the code, and fill in each section below. Use Claude Code to help — point it at the repo and ask it to extract each section.

```bash
git clone https://github.com/ArinspunkMCP/ClaudeTalkToFigma.git ~/reference/claude-talk-to-figma
```

---

## 1. Codebase Map

### Directory Structure

```
claude-talk-to-figma-mcp/
├── src/
│   ├── claude_mcp_plugin/                 # Figma Plugin (runs inside Figma)
│   │   ├── code.js                        # Plugin main thread — handles ALL Figma API calls
│   │   ├── manifest.json                  # Figma plugin manifest (permissions, network, etc.)
│   │   ├── ui.html                        # Plugin UI iframe — WS client + postMessage bridge
│   │   └── setcharacters.js               # Character setting utility (mixed-font support)
│   │
│   ├── talk_to_figma_mcp/                 # MCP Server (Node.js, stdio transport)
│   │   ├── server.ts                      # Entry point — creates McpServer, registers tools, connects WS
│   │   ├── package.json                   # MCP package config
│   │   ├── tsconfig.json                  # TypeScript config
│   │   ├── config/
│   │   │   └── config.ts                  # Server config (port 3055, reconnect 2000ms, WS URL)
│   │   ├── tools/
│   │   │   ├── index.ts                   # Tool registration aggregator — registerTools(server)
│   │   │   ├── document-tools.ts          # get_document_info, get_selection, get_node_info, export, pages
│   │   │   ├── creation-tools.ts          # create_rectangle, frame, text, ellipse, polygon, star, etc.
│   │   │   ├── modification-tools.ts      # set_fill_color, stroke, opacity, corner_radius, auto_layout, effects
│   │   │   ├── text-tools.ts              # set_text_content, font_name, font_size, font_weight, etc.
│   │   │   └── component-tools.ts         # create_component_instance, create_component_from_node, etc.
│   │   ├── types/
│   │   │   ├── index.ts                   # FigmaResponse, PendingRequest, CommandProgressUpdate, FigmaCommand union
│   │   │   └── color.ts                   # Color { r, g, b, a? } and ColorWithDefaults interfaces
│   │   ├── utils/
│   │   │   ├── websocket.ts               # WS client — connectToFigma(), sendCommandToFigma(), joinChannel()
│   │   │   ├── logger.ts                  # Logging to stderr (avoids contaminating stdio MCP transport)
│   │   │   ├── figma-helpers.ts           # rgbaToHex(), filterFigmaNode() — node data reduction
│   │   │   └── defaults.ts                # FIGMA_DEFAULTS, applyColorDefaults() — opacity=1, strokeWeight=1
│   │   └── prompts/
│   │       └── index.ts                   # Claude system prompts (design strategy, naming conventions)
│   │
│   └── socket.ts                          # WebSocket relay server (Bun runtime, port 3055)
│
├── scripts/
│   ├── launcher.js                        # CLI entry point (npx claude-talk-to-figma-mcp)
│   ├── setup.sh                           # Setup script
│   ├── configure-claude.js                # Auto-configure Claude Desktop MCP settings
│   └── test-integration.js                # Integration test runner
│
├── tests/                                 # Jest tests (unit + integration)
├── context/                               # Documentation & context files
├── images/                                # Plugin icons
├── prompts/                               # Localized system prompts (EN, ES, PT, KO, GAL)
│
├── package.json                           # Root package — bin entries for CLI
├── tsconfig.json                          # Root TypeScript config
├── tsup.config.ts                         # Build: server.ts + socket.ts → CJS + ESM
├── manifest.json                          # DXT manifest (for Claude Desktop extension packaging)
├── jest.config.cjs                        # Jest config
└── Dockerfile                             # Docker setup
```

### Process Architecture

```
Claude Desktop/IDE
    │ (stdio — JSON-RPC / MCP protocol)
    ▼
MCP Server (Node.js)  ──  src/talk_to_figma_mcp/server.ts
    │ (WebSocket on port 3055)
    ▼
Socket Relay Server (Bun)  ──  src/socket.ts
    │ (WebSocket — channel-based broadcast)
    ▼
Figma Plugin UI (iframe)  ──  src/claude_mcp_plugin/ui.html
    │ (parent.postMessage / figma.ui.onmessage)
    ▼
Figma Plugin Main Thread  ──  src/claude_mcp_plugin/code.js
    │ (figma.* API calls)
    ▼
Figma Design Document
```

**Key details:**
- **Port:** 3055 (hardcoded in socket.ts, configurable in MCP server via `--port=` CLI arg)
- **WS protocol:** `ws://localhost:3055` (dev), `wss://` for remote
- **Transport:** MCP server uses stdio (`StdioServerTransport`), NOT HTTP
- **Relay is separate process:** MCP server is a WS *client*, socket.ts is the WS *server* — they are two separate processes
- **Channel routing:** Plugin UI generates random 8-char channel name on connect; MCP server must `join_channel` to the same channel name to communicate
- **Request/response correlation:** UUID-based — each command gets a `uuidv4()` ID, plugin returns result with matching ID
- **Timeouts:** 60s default for commands (`sendCommandToFigma`), 120s extended during progress updates, 10s connection timeout
- **Reconnect:** Exponential backoff, max 30s, auto-reconnect on disconnect

---

## 2. MCP Tools Inventory

**Total: 55 MCP tools** across 5 categories. All registered via `server.tool()` from `@modelcontextprotocol/sdk`. All tools (except `join_channel`) call `sendCommandToFigma(command, params)` which sends over WebSocket to the plugin.

### Document & Read Tools (11 tools)

| # | Tool Name | Zod Params | Plugin Command | Figma API | Notes |
|---|-----------|------------|----------------|-----------|-------|
| 1 | `get_document_info` | *(none)* | `get_document_info` | `figma.currentPage.loadAsync()`, reads `figma.currentPage` | Returns page name, id, children list, currentPage info |
| 2 | `get_selection` | *(none)* | `get_selection` | `figma.currentPage.selection` | Returns selectionCount + array of {id, name, type, visible} |
| 3 | `get_node_info` | `nodeId: z.string()` | `get_node_info` | `figma.getNodeByIdAsync()` → `node.exportAsync({format: "JSON_REST_V1"})` | Returns full REST API-style JSON export of node |
| 4 | `get_nodes_info` | `nodeIds: z.array(z.string())` | `get_node_info` (per node) | Same as above, `Promise.all` | Parallel node export |
| 5 | `get_styles` | *(none)* | `get_styles` | `figma.getLocalPaintStylesAsync()`, `getLocalTextStylesAsync()`, `getLocalEffectStylesAsync()`, `getLocalGridStylesAsync()` | Returns colors, texts, effects, grids |
| 6 | `get_local_components` | *(none)* | `get_local_components` | `figma.loadAllPagesAsync()` → `figma.root.findAllWithCriteria({types:["COMPONENT"]})` | Returns {count, components[{id, name, key}]} |
| 7 | `get_remote_components` | *(none)* | `get_remote_components` | `figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync()` | Team library components |
| 8 | `scan_text_nodes` | `nodeId: z.string()` | `scan_text_nodes` | Recursive tree walk, finds all TEXT nodes | Chunked (chunkSize=10), sends progress updates |
| 9 | `join_channel` | `channel: z.string()` | *(via joinChannel() utility)* | N/A — WS channel routing | Sends `join` + `ping` to verify; required before any other command |
| 10 | `export_node_as_image` | `nodeId: z.string()`, `format?: z.enum(["PNG","JPG","SVG","PDF"])`, `scale?: z.number().positive()` | `export_node_as_image` | `node.exportAsync({format, constraint:{type:"SCALE",value:scale}})` | Returns base64 string + mimeType; 60s timeout for large exports |
| 11 | `get_pages` | *(none)* | `get_pages` | `figma.root.children` | Returns array of {id, name, childCount} |

### Page Management Tools (4 tools)

| # | Tool Name | Zod Params | Plugin Command | Figma API | Notes |
|---|-----------|------------|----------------|-----------|-------|
| 12 | `create_page` | `name: z.string()` | `create_page` | `figma.createPage()` | Returns {id, name} |
| 13 | `delete_page` | `pageId: z.string()` | `delete_page` | `page.remove()` | Cannot delete last page |
| 14 | `rename_page` | `pageId: z.string()`, `name: z.string()` | `rename_page` | `page.name = name` | Returns {id, name, oldName} |
| 15 | `set_current_page` | `pageId: z.string()` | `set_current_page` | `figma.setCurrentPageAsync(page)` | Returns {id, name} |

### Creation Tools (10 tools)

| # | Tool Name | Zod Params | Plugin Command | Figma API | Notes |
|---|-----------|------------|----------------|-----------|-------|
| 16 | `create_rectangle` | `x: z.number()`, `y: z.number()`, `width: z.number()`, `height: z.number()`, `name?: z.string()`, `parentId?: z.string()` | `create_rectangle` | `figma.createRectangle()` → `rect.resize(w,h)` | Uses `resize()` not direct width/height assignment |
| 17 | `create_frame` | `x`, `y`, `width`, `height`, `name?`, `parentId?`, `fillColor?: RGBA`, `strokeColor?: RGBA`, `strokeWeight?: z.number().positive()` | `create_frame` | `figma.createFrame()` | Only creation tool that accepts fill/stroke inline |
| 18 | `create_text` | `x`, `y`, `text: z.string()`, `fontSize?`, `fontWeight?: z.number()`, `fontColor?: RGBA`, `name?`, `parentId?`, `textAlignHorizontal?: z.enum(["LEFT","CENTER","RIGHT","JUSTIFIED"])`, `textAutoResize?: z.enum(["WIDTH_AND_HEIGHT","HEIGHT","NONE","TRUNCATE"])` | `create_text` | `figma.createText()` → `figma.loadFontAsync({family:"Inter", style})` → `setCharacters()` | **Always loads Inter**. Maps weight→style name (400→"Regular", 700→"Bold", etc.) |
| 19 | `create_ellipse` | `x`, `y`, `width`, `height`, `name?`, `parentId?`, `fillColor?`, `strokeColor?`, `strokeWeight?` | `create_ellipse` | `figma.createEllipse()` | Same fill/stroke pattern as frame |
| 20 | `create_polygon` | Same as ellipse + `sides?: z.number().min(3)` | `create_polygon` | `figma.createPolygon()` → `polygon.pointCount = sides` | Default sides: not set (Figma default) |
| 21 | `create_star` | Same + `points?: z.number().min(3)`, `innerRadius?: z.number().min(0.01).max(0.99)` | `create_star` | `figma.createStar()` | `star.pointCount`, `star.innerRadius` |
| 22 | `group_nodes` | `nodeIds: z.array(z.string())`, `name?: z.string()` | `group_nodes` | `figma.group(nodes, parent)` | Returns {id, name, type, children[]} |
| 23 | `ungroup_nodes` | `nodeId: z.string()` | `ungroup_nodes` | Moves children to parent, removes group | Returns {success, ungroupedCount, items[]} |
| 24 | `clone_node` | `nodeId: z.string()`, `x?: z.number()`, `y?: z.number()` | `clone_node` | `node.clone()` → appends to same parent | Position optional |
| 25 | `insert_child` | `parentId: z.string()`, `childId: z.string()`, `index?: z.number()` | `insert_child` | `parent.insertChild(index, child)` | Reparents existing node |
| 26 | `flatten_node` | `nodeId: z.string()` | `flatten_node` | `figma.flatten([node])` | Converts to vector path |

### Modification Tools (12 tools)

| # | Tool Name | Zod Params | Plugin Command | Figma API | Notes |
|---|-----------|------------|----------------|-----------|-------|
| 27 | `set_fill_color` | `nodeId`, `r: [0-1]`, `g: [0-1]`, `b: [0-1]`, `a?: [0-1]` | `set_fill_color` | `node.fills = [{type:"SOLID", color:{r,g,b}, opacity:a}]` | **Replaces ALL fills** with single solid. Alpha maps to `opacity` field, NOT `color.a` |
| 28 | `set_stroke_color` | `nodeId`, `r`, `g`, `b`, `a?`, `strokeWeight?: z.number().min(0)` | `set_stroke_color` | `node.strokes = [{type:"SOLID",...}]` + `node.strokeWeight` | Weight required by plugin (MCP applies default=1) |
| 29 | `set_selection_colors` | `nodeId`, `r`, `g`, `b`, `a?` | `set_selection_colors` | Recursive — walks all descendants, updates ALL solid fills + strokes | Chunked (200/chunk), sends progress updates. For icon recoloring |
| 30 | `move_node` | `nodeId`, `x: z.number()`, `y: z.number()` | `move_node` | `node.x = x; node.y = y` | Direct position assignment |
| 31 | `resize_node` | `nodeId`, `width: z.number().positive()`, `height: z.number().positive()` | `resize_node` | `node.resize(width, height)` | Uses `resize()` method |
| 32 | `delete_node` | `nodeId: z.string()` | `delete_node` | `node.remove()` | Returns {id, name, type} of deleted node |
| 33 | `set_corner_radius` | `nodeId`, `radius: z.number().min(0)`, `corners?: z.array(z.boolean()).length(4)` | `set_corner_radius` | Uniform: `node.cornerRadius = r`. Per-corner: `node.topLeftRadius`, etc. | corners=[TL, TR, BR, BL] booleans — which corners to apply to |
| 34 | `set_auto_layout` | `nodeId`, `layoutMode: z.enum(["HORIZONTAL","VERTICAL","NONE"])`, `paddingTop/Bottom/Left/Right?`, `itemSpacing?`, `primaryAxisAlignItems?: z.enum(["MIN","CENTER","MAX","SPACE_BETWEEN"])`, `counterAxisAlignItems?: z.enum(["MIN","CENTER","MAX"])`, `layoutWrap?: z.enum(["WRAP","NO_WRAP"])`, `strokesIncludedInLayout?: z.boolean()` | `set_auto_layout` | Direct property assignment on FrameNode | Does NOT set `layoutSizingHorizontal/Vertical` (missing!) |
| 35 | `set_effects` | `nodeId`, `effects: z.array(z.object({type: enum, color?: RGBA, offset?: {x,y}, radius?, spread?, visible?, blendMode?}))` | `set_effects` | `node.effects = validEffects` | Types: `DROP_SHADOW`, `INNER_SHADOW`, `LAYER_BLUR`, `BACKGROUND_BLUR`. **Replaces ALL effects** |
| 36 | `set_effect_style_id` | `nodeId`, `effectStyleId: z.string()` | `set_effect_style_id` | `node.effectStyleId = id` | Applies an existing effect style |
| 37 | `rename_node` | `nodeId`, `name: z.string()` | `rename_node` | `node.name = name` | Returns {id, name, oldName, type} |

### Text Tools (14 tools)

| # | Tool Name | Zod Params | Plugin Command | Figma API | Notes |
|---|-----------|------------|----------------|-----------|-------|
| 38 | `set_text_content` | `nodeId`, `text: z.string()` | `set_text_content` | `figma.loadFontAsync(node.fontName)` → `setCharacters(node, text)` | Loads EXISTING font first. Uses `setCharacters()` helper for mixed-font safety |
| 39 | `set_multiple_text_contents` | `nodeId`, `text: z.array(z.object({nodeId, text}))` | `set_multiple_text_contents` | Same per-node, with progress updates | Chunked, returns {replacementsApplied, replacementsFailed, ...} |
| 40 | `set_font_name` | `nodeId`, `family: z.string()`, `style?: z.string()` | `set_font_name` | `figma.loadFontAsync({family, style})` → `node.fontName = {family, style}` | Style defaults to "Regular" |
| 41 | `set_font_size` | `nodeId`, `fontSize: z.number().positive()` | `set_font_size` | `figma.loadFontAsync(node.fontName)` → `node.fontSize = size` | Must load font first! |
| 42 | `set_font_weight` | `nodeId`, `weight: z.number()` | `set_font_weight` | Maps weight→style string, loads font, sets `node.fontName` | Same weight→style map as create_text |
| 43 | `set_letter_spacing` | `nodeId`, `letterSpacing: z.number()`, `unit?: z.enum(["PIXELS","PERCENT"])` | `set_letter_spacing` | `node.letterSpacing = {value, unit}` | Default unit: PIXELS |
| 44 | `set_line_height` | `nodeId`, `lineHeight: z.number()`, `unit?: z.enum(["PIXELS","PERCENT","AUTO"])` | `set_line_height` | `node.lineHeight = {value, unit}` | Default unit: PIXELS |
| 45 | `set_paragraph_spacing` | `nodeId`, `paragraphSpacing: z.number()` | `set_paragraph_spacing` | `node.paragraphSpacing = value` | |
| 46 | `set_text_case` | `nodeId`, `textCase: z.enum(["ORIGINAL","UPPER","LOWER","TITLE"])` | `set_text_case` | `node.textCase = value` | |
| 47 | `set_text_decoration` | `nodeId`, `textDecoration: z.enum(["NONE","UNDERLINE","STRIKETHROUGH"])` | `set_text_decoration` | `node.textDecoration = value` | |
| 48 | `set_text_align` | `nodeId`, `textAlignHorizontal?: z.enum(["LEFT","CENTER","RIGHT","JUSTIFIED"])`, `textAlignVertical?: z.enum(["TOP","CENTER","BOTTOM"])` | `set_text_align` | Direct property assignment | |
| 49 | `get_styled_text_segments` | `nodeId`, `property: z.enum(["fillStyleId","fontName","fontSize","textCase","textDecoration","textStyleId","fills","letterSpacing","lineHeight","fontWeight"])` | `get_styled_text_segments` | `node.getStyledTextSegments([property])` | Returns text segments with styling info |
| 50 | `set_text_style_id` | `nodeId`, `textStyleId: z.string()` | `set_text_style_id` | `node.textStyleId = id` | Applies an existing text style |
| 51 | `load_font_async` | `family: z.string()`, `style?: z.string()` | `load_font_async` | `figma.loadFontAsync({family, style})` | Pre-load a font; style defaults to "Regular" |

### Component Tools (4 tools)

| # | Tool Name | Zod Params | Plugin Command | Figma API | Notes |
|---|-----------|------------|----------------|-----------|-------|
| 52 | `create_component_instance` | `componentKey: z.string()`, `x: z.number()`, `y: z.number()` | `create_component_instance` | Local search first → `figma.importComponentByKeyAsync(key)` → `component.createInstance()` | 10s timeout on import. Searches current page → all pages → remote import |
| 53 | `create_component_from_node` | `nodeId: z.string()`, `name?: z.string()` | `create_component_from_node` | Creates component from existing node | Returns {id, name, key} |
| 54 | `create_component_set` | `componentIds: z.array(z.string())`, `name?: z.string()` | `create_component_set` | `figma.combineAsVariants(components, parent)` | Creates variant set; returns {id, name, key, variantCount} |
| 55 | `set_instance_variant` | `nodeId: z.string()`, `properties: z.record(z.string())` | `set_instance_variant` | `instance.setProperties(properties)` | Changes variant on existing instance |

### RGBA Color Zod Schema (shared across tools)

```typescript
// Used in set_fill_color, set_stroke_color, create_frame, create_text, etc.
const RGBA = z.object({
  r: z.number().min(0).max(1),   // Red 0-1 (NOT 0-255)
  g: z.number().min(0).max(1),   // Green 0-1
  b: z.number().min(0).max(1),   // Blue 0-1
  a: z.number().min(0).max(1).optional()  // Alpha 0-1, defaults to 1
});
```

### FigmaCommand Union Type (all valid command strings)

```typescript
// src/talk_to_figma_mcp/types/index.ts
export type FigmaCommand =
  | "get_document_info" | "get_selection" | "get_node_info"
  | "create_rectangle" | "create_frame" | "create_text"
  | "create_ellipse" | "create_polygon" | "create_star"
  | "create_vector" | "create_line"
  | "set_fill_color" | "set_stroke_color" | "set_selection_colors"
  | "move_node" | "resize_node" | "delete_node"
  | "get_styles" | "get_local_components" | "get_team_components"
  | "create_component_instance" | "export_node_as_image"
  | "join" | "ping"
  | "set_corner_radius" | "clone_node" | "set_text_content"
  | "scan_text_nodes" | "set_multiple_text_contents"
  | "set_auto_layout" | "set_font_name" | "set_font_size"
  | "set_font_weight" | "set_letter_spacing" | "set_line_height"
  | "set_paragraph_spacing" | "set_text_case" | "set_text_decoration"
  | "get_styled_text_segments" | "load_font_async"
  | "get_remote_components" | "set_effects" | "set_effect_style_id"
  | "set_text_style_id" | "group_nodes" | "ungroup_nodes"
  | "flatten_node" | "insert_child"
  | "create_component_from_node" | "create_component_set"
  | "set_instance_variant"
  | "create_page" | "delete_page" | "rename_page"
  | "get_pages" | "set_current_page" | "rename_node"
  | "set_text_align";
```

---

## 3. PostMessage Protocol

The plugin has a simple **4-message** envelope protocol between UI iframe and main thread. All 55 Figma commands are routed through a single `execute-command` message type.

### Main Thread → UI (figma.ui.postMessage)

| Message Type | Payload | Purpose |
|-------------|---------|---------|
| `auto-connect` | `{ type: "auto-connect" }` | Sent on `figma.on("run")` — tells UI to initiate WS connection |
| `init-settings` | `{ type: "init-settings", settings: { serverPort: number } }` | Sent on plugin init — passes saved settings to UI |
| `command-result` | `{ type: "command-result", id: string, result: any }` | Success response for an `execute-command` |
| `command-error` | `{ type: "command-error", id: string, error: string }` | Error response for an `execute-command` |
| `command_progress` | `{ type: "command_progress", commandId: string, commandType: string, status: "started"\|"in_progress"\|"completed"\|"error", progress: number, totalItems: number, processedItems: number, message: string, timestamp: number, currentChunk?: number, totalChunks?: number, chunkSize?: number, payload?: any }` | Progress updates during long operations (scan_text_nodes, set_selection_colors, set_multiple_text_contents) |

### UI → Main Thread (parent.postMessage)

| Message Type | Payload | Purpose |
|-------------|---------|---------|
| `update-settings` | `{ type: "update-settings", serverPort: number }` | Update server port; saved to `figma.clientStorage` |
| `notify` | `{ type: "notify", message: string }` | Show `figma.notify()` toast |
| `close-plugin` | `{ type: "close-plugin" }` | Call `figma.closePlugin()` |
| `execute-command` | `{ type: "execute-command", id: string, command: string, params: object }` | **THE key message** — routes ALL Figma API commands from WS→UI→Main |

### UI Message Handlers (window.onmessage for messages from Main)

| Message Type | Handler Action |
|-------------|---------------|
| `connection-status` | Updates UI connection indicator |
| `auto-connect` | Calls `this.connect()` — initiates WS connection |
| `auto-disconnect` | Calls `this.disconnect()` |
| `command-result` | Calls `sendSuccessResponse(id, result)` — sends result back over WS |
| `command-error` | Calls `sendErrorResponse(id, error)` — sends error back over WS |
| `command_progress` | Calls `updateProgress()` (UI bar) + `sendProgressUpdate()` (relays to WS) |

### Execute-Command Routing (in code.js handleCommand switch)

All 57 commands routed through the single `execute-command` envelope:

```javascript
// code.js — the complete command dispatch
async function handleCommand(command, params) {
  switch (command) {
    case "ping":                       return { status: "ok" };
    case "get_document_info":          return await getDocumentInfo();
    case "get_selection":              return await getSelection();
    case "get_node_info":              return await getNodeInfo(params.nodeId);
    case "get_nodes_info":             return await getNodesInfo(params.nodeIds);
    case "create_rectangle":           return await createRectangle(params);
    case "create_frame":               return await createFrame(params);
    case "create_text":                return await createText(params);
    case "create_ellipse":             return await createEllipse(params);
    case "create_polygon":             return await createPolygon(params);
    case "create_star":                return await createStar(params);
    case "create_vector":              return await createVector(params);
    case "create_line":                return await createLine(params);
    case "set_fill_color":             return await setFillColor(params);
    case "set_stroke_color":           return await setStrokeColor(params);
    case "set_selection_colors":       return await setSelectionColors(params);
    case "move_node":                  return await moveNode(params);
    case "resize_node":                return await resizeNode(params);
    case "delete_node":                return await deleteNode(params);
    case "get_styles":                 return await getStyles();
    case "get_local_components":       return await getLocalComponents();
    case "create_component_instance":  return await createComponentInstance(params);
    case "export_node_as_image":       return await exportNodeAsImage(params);
    case "set_corner_radius":          return await setCornerRadius(params);
    case "set_text_content":           return await setTextContent(params);
    case "clone_node":                 return await cloneNode(params);
    case "scan_text_nodes":            return await scanTextNodes(params);
    case "set_multiple_text_contents": return await setMultipleTextContents(params);
    case "set_auto_layout":            return await setAutoLayout(params);
    case "set_font_name":              return await setFontName(params);
    case "set_font_size":              return await setFontSize(params);
    case "set_font_weight":            return await setFontWeight(params);
    case "set_letter_spacing":         return await setLetterSpacing(params);
    case "set_line_height":            return await setLineHeight(params);
    case "set_paragraph_spacing":      return await setParagraphSpacing(params);
    case "set_text_case":              return await setTextCase(params);
    case "set_text_decoration":        return await setTextDecoration(params);
    case "set_text_align":             return await setTextAlign(params);
    case "get_styled_text_segments":   return await getStyledTextSegments(params);
    case "load_font_async":            return await loadFontAsyncWrapper(params);
    case "get_remote_components":      return await getRemoteComponents(params);
    case "set_effects":                return await setEffects(params);
    case "set_effect_style_id":        return await setEffectStyleId(params);
    case "set_text_style_id":          return await setTextStyleId(params);
    case "group_nodes":                return await groupNodes(params);
    case "ungroup_nodes":              return await ungroupNodes(params);
    case "flatten_node":               return await flattenNode(params);
    case "insert_child":               return await insertChild(params);
    case "create_component_from_node": return await createComponentFromNode(params);
    case "create_component_set":       return await createComponentSet(params);
    case "set_instance_variant":       return await setInstanceVariant(params);
    case "create_page":                return await createPage(params);
    case "delete_page":                return await deletePage(params);
    case "rename_page":                return await renamePage(params);
    case "get_pages":                  return await getPages();
    case "set_current_page":           return await setCurrentPage(params);
    case "rename_node":                return await renameNode(params);
    default:                           throw new Error(`Unknown command: ${command}`);
  }
}
```

### Full Request/Response Lifecycle

```
1. Claude calls MCP tool: create_rectangle({x:0, y:0, width:100, height:100})
2. MCP server (server.ts) → tool handler → sendCommandToFigma("create_rectangle", params)
3. websocket.ts creates WS message:
   {
     id: "uuid-123",
     type: "message",
     channel: "abc12345",
     message: { id: "uuid-123", command: "create_rectangle", params: {x:0, y:0, width:100, height:100, commandId: "uuid-123"} }
   }
4. Socket relay (socket.ts) receives → broadcasts to all clients in channel "abc12345"
5. Plugin UI (ui.html) receives WS message → handleSocketMessage():
   - Sees data.command exists → calls parent.postMessage({pluginMessage: {type: "execute-command", id: "uuid-123", command: "create_rectangle", params: {...}}})
6. Plugin main (code.js) figma.ui.onmessage receives → handleCommand("create_rectangle", params)
7. Plugin executes: figma.createRectangle(), sets properties
8. Plugin sends result back: figma.ui.postMessage({type: "command-result", id: "uuid-123", result: {id: "node-id", name: "Rectangle", ...}})
9. UI receives → sendSuccessResponse("uuid-123", result):
   {
     id: "uuid-123",
     type: "message",
     channel: "abc12345",
     message: { id: "uuid-123", result: {id: "node-id", ...} }
   }
10. Socket relay broadcasts → MCP server receives → resolves pending promise → returns to Claude
```

---

## 4. WebSocket Protocol

**Relay server:** `src/socket.ts` — runs on Bun, port 3055. Separate process from MCP server.

### Connection Handshake

```
1. Client connects to ws://localhost:3055
2. Server sends welcome:
   { type: "system", message: "Please join a channel to start communicating with Figma" }

3. Client sends join:
   { type: "join", channel: "abc12345", id: "uuid-for-join" }

4. Server creates channel if needed, adds client, sends two messages:
   a) { type: "system", message: "Joined channel: abc12345", channel: "abc12345" }
   b) { type: "system", message: { id: "uuid-for-join", result: "Connected to channel: abc12345" }, channel: "abc12345" }

5. Other clients in channel get notified:
   { type: "system", message: "A new client has joined the channel", channel: "abc12345" }
```

**Plugin UI generates channel name:** 8 random chars from `[a-z0-9]`. MCP server must call `join_channel` with the same channel name.

### Message Formats

**Command (MCP → Relay → Plugin):**
```json
{
  "id": "uuid-v4",
  "type": "message",
  "channel": "abc12345",
  "message": {
    "id": "uuid-v4",
    "command": "create_rectangle",
    "params": { "x": 0, "y": 0, "width": 100, "height": 100, "commandId": "uuid-v4" }
  }
}
```

**Response (Plugin → Relay → MCP):**
```json
{
  "id": "uuid-v4",
  "type": "message",
  "channel": "abc12345",
  "message": { "id": "uuid-v4", "result": { "id": "node-id", "name": "Rectangle" } }
}
```

**Error Response:**
```json
{ "id": "uuid-v4", "error": "Node not found with ID: xxx" }
```

**Progress Update (Plugin → Relay → MCP):**
```json
{
  "id": "command-uuid",
  "type": "progress_update",
  "channel": "abc12345",
  "message": {
    "id": "command-uuid",
    "type": "progress_update",
    "data": {
      "type": "command_progress",
      "commandId": "command-uuid",
      "commandType": "scan_text_nodes",
      "status": "in_progress",
      "progress": 45,
      "totalItems": 100,
      "processedItems": 45,
      "message": "Processing chunk 5/10",
      "timestamp": 1234567890
    }
  }
}
```

### Channel Routing

- **Data structure:** `channels = Map<string, Set<ServerWebSocket>>` — channel name → set of connected sockets
- **Broadcast:** All `type: "message"` messages are broadcast to ALL clients in the channel (including sender)
- **Channel creation:** Lazy — created when first client joins
- **Client tracking:** Each WS gets a unique `clientId = "client_{timestamp}_{random7}"`
- **Cleanup:** On WS close, client removed from all channels; other clients notified
- **Stats:** Server tracks `totalConnections`, `activeConnections`, `messagesSent`, `messagesReceived`, `errors`
- **Status endpoint:** `GET http://localhost:3055/status` returns JSON with stats + uptime
- **Relay has NO message parsing:** It just forwards raw JSON between channel members. The command/result semantics are handled by the endpoints.

### MCP Server WebSocket Client (websocket.ts)

```typescript
// Key constants
const defaultPort = 3055;
const reconnectInterval = 2000;  // ms
const commandTimeout = 60000;    // 60s default
const progressTimeout = 120000;  // 120s during progress updates
const connectionTimeout = 10000; // 10s to establish connection

// Request tracking
const pendingRequests = new Map<string, PendingRequest>();

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
  lastActivity: number;
}

// sendCommandToFigma() flow:
// 1. Generate UUID
// 2. Create request: { id, type: "message"|"join", channel, message: { id, command, params } }
// 3. Store promise callbacks in pendingRequests map
// 4. Set timeout (60s default)
// 5. ws.send(JSON.stringify(request))
// 6. Wait for response matching the same ID
// 7. On match: clearTimeout, resolve/reject promise, delete from map
```

### Reconnection Strategy

```typescript
// On disconnect:
// 1. Reject all pending requests
// 2. Calculate backoff: min(30000, 2000 * 1.5^random(0-4))
// 3. setTimeout(connectToFigma, backoff)
// Result: reconnects between 2-30s with randomized exponential backoff
```

---

## 5. Figma API Property Mappings (THE GOLD)

These are the exact translations from friendly params to Figma API, extracted from `code.js`.

### 5.1 Colors

```typescript
// They DON'T convert hex→RGB — colors are passed as 0-1 floats from MCP layer
// MCP server sends { r: 0.5, g: 0.3, b: 0.8, a: 1 } directly

// Reverse direction (Figma→MCP) uses rgbaToHex in figma-helpers.ts:
function rgbaToHex(color: any): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = Math.round(color.a * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a === 255 ? '' : a.toString(16).padStart(2, '0')}`;
}

// Color defaults (MCP layer):
const FIGMA_DEFAULTS = { color: { opacity: 1 }, stroke: { weight: 1 } };
function applyColorDefaults(color: Color): ColorWithDefaults {
  return { r: color.r, g: color.g, b: color.b, a: color.a ?? 1 };
}
```

### 5.2 Fills

```javascript
// PATTERN: Always replaces ALL fills with a single SOLID paint
// Alpha goes to `opacity` field, NOT into `color` object

// For set_fill_color:
const paintStyle = {
  type: "SOLID",
  color: { r: parseFloat(r), g: parseFloat(g), b: parseFloat(b) },
  opacity: parseFloat(a),  // Alpha is SEPARATE from color
};
node.fills = [paintStyle];  // REPLACES entire fills array

// For create_frame / create_ellipse / create_polygon / create_star:
if (fillColor) {
  const fillStyle = {
    type: "SOLID",
    color: {
      r: parseFloat(fillColor.r) || 0,
      g: parseFloat(fillColor.g) || 0,
      b: parseFloat(fillColor.b) || 0,
    },
    opacity: parseFloat(fillColor.a) || 1
  };
  node.fills = [fillStyle];
}

// NOTE: create_rectangle does NOT support fill inline — must use set_fill_color after creation
// NOTE: Ellipse defaults fillColor to { r: 0.8, g: 0.8, b: 0.8, a: 1 } (light gray)
```

### 5.3 Strokes

```javascript
// Same pattern as fills — replaces ALL strokes with single SOLID
const paintStyle = {
  type: "SOLID",
  color: { r: rgbColor.r, g: rgbColor.g, b: rgbColor.b },
  opacity: rgbColor.a,
};
node.strokes = [paintStyle];

// Stroke weight is separate:
if ("strokeWeight" in node) {
  node.strokeWeight = strokeWeightParsed;
}

// MCP layer default: strokeWeight = 1 (from defaults.ts)
// Plugin REQUIRES both color and weight — throws if weight undefined

// NOTE: They don't set strokeAlign (INSIDE, OUTSIDE, CENTER) — defaults to CENTER
// NOTE: strokeWeight is validated as z.number().min(0) — allows 0
```

### 5.4 Auto-Layout

```javascript
// setAutoLayout — the complete implementation from code.js:
async function setAutoLayout(params) {
  const {
    nodeId, layoutMode,
    paddingTop, paddingBottom, paddingLeft, paddingRight,
    itemSpacing,
    primaryAxisAlignItems,   // "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN"
    counterAxisAlignItems,   // "MIN" | "CENTER" | "MAX"
    layoutWrap,              // "WRAP" | "NO_WRAP"
    strokesIncludedInLayout  // boolean
  } = params;

  // To disable auto-layout:
  if (layoutMode === "NONE") {
    node.layoutMode = "NONE";
  } else {
    node.layoutMode = layoutMode;  // "HORIZONTAL" or "VERTICAL"
    if (paddingTop !== undefined) node.paddingTop = paddingTop;
    if (paddingBottom !== undefined) node.paddingBottom = paddingBottom;
    if (paddingLeft !== undefined) node.paddingLeft = paddingLeft;
    if (paddingRight !== undefined) node.paddingRight = paddingRight;
    if (itemSpacing !== undefined) node.itemSpacing = itemSpacing;
    if (primaryAxisAlignItems !== undefined) node.primaryAxisAlignItems = primaryAxisAlignItems;
    if (counterAxisAlignItems !== undefined) node.counterAxisAlignItems = counterAxisAlignItems;
    if (layoutWrap !== undefined) node.layoutWrap = layoutWrap;
    if (strokesIncludedInLayout !== undefined) node.strokesIncludedInLayout = strokesIncludedInLayout;
  }
}

// MISSING from their implementation:
// - layoutSizingHorizontal / layoutSizingVertical  (FIXED, HUG, FILL)
// - primaryAxisSizingMode
// - counterAxisSizingMode
// - layoutAlign on children
// - layoutGrow on children
// These are critical for responsive layouts — we MUST add them in FigmaFast
```

### 5.5 Corner Radius

```javascript
// Two modes: uniform and per-corner

// Uniform (default):
node.cornerRadius = radius;

// Per-corner — uses boolean array [TL, TR, BR, BL]:
if (corners && Array.isArray(corners) && corners.length === 4) {
  if ("topLeftRadius" in node) {
    if (corners[0]) node.topLeftRadius = radius;   // Top-left
    if (corners[1]) node.topRightRadius = radius;   // Top-right
    if (corners[2]) node.bottomRightRadius = radius; // Bottom-right
    if (corners[3]) node.bottomLeftRadius = radius;  // Bottom-left
  } else {
    node.cornerRadius = radius;  // Fallback to uniform
  }
}

// NOTE: The boolean array design means you can only set SOME corners to ONE radius value.
// You CANNOT set different radii per corner with this API.
// FigmaFast should accept [12, 0, 8, 0] — four separate radius values.
```

### 5.6 Effects (Shadows, Blur)

```javascript
// setEffects — replaces ALL effects on the node

// Effect type mapping:
switch (effect.type) {
  case "DROP_SHADOW":
  case "INNER_SHADOW":
    return {
      type: effect.type,
      color: effect.color || { r: 0, g: 0, b: 0, a: 0.5 },  // Default: 50% black
      offset: effect.offset || { x: 0, y: 0 },                 // Default: no offset
      radius: effect.radius || 5,                                // Default: 5px blur
      spread: effect.spread || 0,                                // Default: no spread
      visible: effect.visible !== undefined ? effect.visible : true,
      blendMode: effect.blendMode || "NORMAL"
    };
  case "LAYER_BLUR":
  case "BACKGROUND_BLUR":
    return {
      type: effect.type,
      radius: effect.radius || 5,
      visible: effect.visible !== undefined ? effect.visible : true
    };
}

node.effects = validEffects;  // REPLACES entire effects array

// NOTE: Color in shadow uses { r, g, b, a } where a IS part of the color object
// This is DIFFERENT from fills where alpha is `opacity` on the paint, not `color.a`
// Shadow color: { r: 0, g: 0, b: 0, a: 0.5 }  ← alpha IN the color
// Fill color:   { type: "SOLID", color: {r,g,b}, opacity: 0.5 }  ← alpha SEPARATE
```

### 5.7 Text Properties

```javascript
// CRITICAL ORDER: Load font BEFORE setting any text properties

// === CREATE TEXT (new node) ===
// 1. Create node
const textNode = figma.createText();
textNode.x = x; textNode.y = y; textNode.name = name;

// 2. Map weight to style name
const getFontStyle = (weight) => {
  switch (weight) {
    case 100: return "Thin";
    case 200: return "Extra Light";
    case 300: return "Light";
    case 400: return "Regular";
    case 500: return "Medium";
    case 600: return "Semi Bold";
    case 700: return "Bold";
    case 800: return "Extra Bold";
    case 900: return "Black";
    default: return "Regular";
  }
};

// 3. Load font (ALWAYS Inter for creation)
await figma.loadFontAsync({ family: "Inter", style: getFontStyle(fontWeight) });
textNode.fontName = { family: "Inter", style: getFontStyle(fontWeight) };
textNode.fontSize = parseInt(fontSize);

// 4. Set characters (uses setCharacters helper for mixed-font safety)
setCharacters(textNode, text);

// 5. Set text color (same paint pattern as fills)
textNode.fills = [{ type: "SOLID", color: { r, g, b }, opacity: a }];

// 6. Set alignment and resize (optional)
if (textAlignHorizontal) textNode.textAlignHorizontal = textAlignHorizontal;
if (textAutoResize) textNode.textAutoResize = textAutoResize;

// === MODIFY EXISTING TEXT ===
// Must load the node's EXISTING font first:
await figma.loadFontAsync(node.fontName);  // Load current font
node.fontSize = fontSize;                   // Then change properties

// For changing font family:
await figma.loadFontAsync({ family, style: style || "Regular" });
node.fontName = { family, style: style || "Regular" };

// For changing weight on existing text (preserves family):
const family = node.fontName.family;  // Keep current family
const style = getFontStyle(weight);    // Map weight to style
await figma.loadFontAsync({ family, style });
node.fontName = { family, style };

// Line height and letter spacing use value+unit objects:
node.letterSpacing = { value: letterSpacing, unit: "PIXELS" };  // or "PERCENT"
node.lineHeight = { value: lineHeight, unit: "PIXELS" };        // or "PERCENT" or "AUTO"

// Simple text properties (require font loaded first):
node.paragraphSpacing = paragraphSpacing;  // number
node.textCase = textCase;                  // "ORIGINAL" | "UPPER" | "LOWER" | "TITLE"
node.textDecoration = textDecoration;      // "NONE" | "UNDERLINE" | "STRIKETHROUGH"
node.textAlignHorizontal = alignment;      // "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED"
node.textAlignVertical = alignment;        // "TOP" | "CENTER" | "BOTTOM"
```

### 5.8 Constraints

```
// NOT IMPLEMENTED in ClaudeTalkToFigma
// No tool sets constraints (horizontal/vertical)
// We should add this in FigmaFast:
// node.constraints = { horizontal: "STRETCH", vertical: "MIN" }
// Values: "MIN" | "CENTER" | "MAX" | "STRETCH" | "SCALE"
```

### 5.9 Component Instantiation

```javascript
// createComponentInstance — uses KEY (not ID) for import

// Search order:
// 1. Current page components (fastest)
const currentPageComponents = figma.currentPage.findAllWithCriteria({ types: ["COMPONENT"] });
component = currentPageComponents.find(c => c.key === componentKey);

// 2. All pages (loads all pages first)
if (!component) {
  await figma.loadAllPagesAsync();
  const allComponents = figma.root.findAllWithCriteria({ types: ["COMPONENT"] });
  component = allComponents.find(c => c.key === componentKey);
}

// 3. Remote import (team libraries) — with 10s timeout
if (!component) {
  const importPromise = figma.importComponentByKeyAsync(componentKey);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timeout")), 10000)
  );
  component = await Promise.race([importPromise, timeoutPromise]);
}

// Create instance
const instance = component.createInstance();
instance.x = x;
instance.y = y;
figma.currentPage.appendChild(instance);

// NOTE: They DON'T support overrides on instances — no way to set text/fill on instance children
// NOTE: Key vs ID: They use COMPONENT KEY (component.key) for the lookup, NOT node.id
// NOTE: createComponentFromNode uses figma.createComponentFromNode(node) for FRAME/GROUP/INSTANCE
// NOTE: setInstanceVariant uses node.setProperties(properties) — for changing variant props

// Component set creation:
const componentSet = figma.combineAsVariants(components, figma.currentPage);
```

---

## 6. Font Loading

### Pre-loading Pattern

```javascript
// NO pre-loading or caching. Every text operation loads the font fresh:

// Create text: always loads Inter
await figma.loadFontAsync({ family: "Inter", style: getFontStyle(fontWeight) });

// Modify existing text: loads the node's current font
await figma.loadFontAsync(node.fontName);

// Change font family: loads the new font
await figma.loadFontAsync({ family, style: style || "Regular" });

// NO font cache — each operation calls loadFontAsync independently
// NO batch font loading — fonts are loaded one-at-a-time per command
```

### Default/Fallback Fonts

```javascript
// Fallback font: Inter Regular (hardcoded)
const fallbackFont = { family: "Inter", style: "Regular" };

// The setCharacters() helper handles mixed-font text nodes:
const setCharacters = async (node, characters, options) => {
  const fallbackFont = (options && options.fallbackFont) || {
    family: "Inter", style: "Regular"
  };

  try {
    if (node.fontName === figma.mixed) {
      // Mixed fonts — multiple strategies:
      // Default: use first character's font
      const firstCharFont = node.getRangeFontName(0, 1);
      await figma.loadFontAsync(firstCharFont);
      node.fontName = firstCharFont;
    } else {
      // Single font — load it
      await figma.loadFontAsync({ family: node.fontName.family, style: node.fontName.style });
    }
  } catch (err) {
    // Font load failed — fall back to Inter Regular
    console.warn(`Failed to load font, using fallback`);
    await figma.loadFontAsync(fallbackFont);
    node.fontName = fallbackFont;
  }

  try {
    node.characters = characters;
    return true;
  } catch (err) {
    console.warn(`Failed to set characters. Skipped.`);
    return false;
  }
};

// Smart strategies for mixed-font nodes (not exposed via MCP tools):
// "prevail" — use the most common font in the text
// "strict" — preserve per-range fonts, re-apply after setting characters
// "experimental" — preserve font ranges by delimiter (newline/space)
```

### Known Issues

```
- No font existence check — if font isn't installed/available, loadFontAsync throws
- Mixed fonts (figma.mixed) require special handling — can't just set characters directly
- create_text ALWAYS uses Inter — ignores user's document fonts
- No way to list available fonts — user must know exact family+style names
- setFontWeight maps numeric weight to style name; if the font doesn't have that
  exact style name (e.g., "Semi Bold" vs "SemiBold"), loadFontAsync will fail
- Font must be loaded before EVERY text property change, not just characters
  (fontSize, textCase, textDecoration, letterSpacing, etc. all require font loaded)
```

---

## 7. Edge Cases & Gotchas

### From Code Comments & Implementation Analysis

| Location | Gotcha | Notes |
|----------|--------|-------|
| `code.js:setFillColor` | All RGBA must be provided — throws if any undefined | Plugin validates completeness; won't default missing values |
| `code.js:setStrokeColor` | strokeWeight REQUIRED by plugin | Even though MCP schema says optional, plugin throws without it |
| `code.js:createText` | Always creates with Inter font | Ignores document fonts; must change font after creation |
| `code.js:setCharacters` | Mixed font handling (`figma.mixed`) | If node has multiple fonts, must handle specially or lose formatting |
| `code.js:exportNodeAsImage` | 60s timeout for large exports | Custom base64 encoder (can't use btoa in Figma sandbox) |
| `code.js:createComponentInstance` | 10s timeout on import | Complex/remote components may time out |
| `code.js:getRemoteComponents` | 45s internal timeout | Team library fetch can be very slow |
| `code.js:setEffectStyleId` | 20s timeout | Validates style exists before applying |
| `code.js:setTextStyleId` | 8s timeout, looks up by ID or Key | LLMs often pass key instead of ID — handles both |
| `code.js:flattenNode` | 20s timeout | Only works on VECTOR, BOOLEAN_OPERATION, STAR, POLYGON, ELLIPSE, RECTANGLE |
| `code.js:deletePage` | Cannot delete only page | Switches to another page first if deleting current |
| `code.js:setSelectionColors` | Chunks 200 nodes at a time | Yields with 1ms delay between chunks to prevent UI freeze |
| `code.js:scanTextNodes` | Highlights found text nodes briefly | Changes fills temporarily — could cause visual glitch |
| `code.js:groupNodes` | All nodes must share same parent | Throws if nodes have different parents |
| `code.js:createComponentFromNode` | Different paths for FRAME vs shapes | FRAME/GROUP uses `figma.createComponentFromNode()`; shapes clone into new component |
| `figma-helpers.ts:filterFigmaNode` | Skips VECTOR nodes entirely | Returns null for vectors — lost in get_node_info output |
| `websocket.ts` | Progress updates extend timeout to 120s | During long operations, timeout resets on each progress message |
| `socket.ts` | Broadcasts to ALL channel clients including sender | Both MCP server and plugin UI receive every message |

### Known Figma API Quirks (from code analysis)
- [x] **Stroke weight = 0:** Allowed by MCP schema (`z.number().min(0)`) but doesn't visually render. Plugin doesn't guard against it.
- [x] **Opacity vs fill alpha:** Fill uses `{type:"SOLID", color:{r,g,b}, opacity:a}` — alpha is `opacity` field. Effect shadow uses `{color:{r,g,b,a}}` — alpha is inside color. INCONSISTENT.
- [x] **Text node resize after setting characters:** Not explicitly handled. `textAutoResize` can be set to control behavior.
- [x] **Auto-layout + fixed size children:** Not handled — their API doesn't expose `layoutSizingHorizontal/Vertical` or `layoutGrow` on children.
- [x] **Plugin timeout thresholds:** No single limit. Individual operations have timeouts: 60s (export), 45s (remote components), 20s (effect style, flatten), 10s (component import), 8s (text style). WS command default: 60s.
- [x] **Max node count per operation:** Not limited. `setSelectionColors` processes ALL descendants. `scanTextNodes` processes ALL nodes. No cap.
- [x] **`commitUndo()` behavior:** NOT USED anywhere in the codebase. Each tool call is a separate undo step. No undo batching.
- [x] **`resize()` vs direct assignment:** All creation tools use `node.resize(w, h)` — NOT `node.width = w`. This is correct; direct assignment doesn't work for most node types.
- [x] **`parseFloat()` everywhere:** Plugin uses `parseFloat()` on all color values — converts string numbers to floats. Defensive but unnecessary if MCP sends proper types.
- [x] **`figma.getNodeByIdAsync()` pattern:** Every command that takes a `nodeId` does an async lookup + null check. This is unavoidable — nodes can be deleted between calls.

---

## 8. Build & Packaging

### Plugin Manifest (`src/claude_mcp_plugin/manifest.json`)
```json
{
  "name": "Claude Talk to Figma Plugin",
  "id": "claude-mcp-plugin",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "editorType": ["figma", "figjam"],
  "permissions": ["teamlibrary"],
  "networkAccess": {
    "allowedDomains": ["https://google.com"],
    "devAllowedDomains": ["http://localhost:3055", "ws://localhost:3055"]
  },
  "documentAccess": "dynamic-page",
  "enableProposedApi": true,
  "enablePrivatePluginApi": true
}
```

**Key notes:**
- `api: "1.0.0"` — uses Figma Plugin API v1
- `permissions: ["teamlibrary"]` — needed for `getAvailableComponentsAsync`
- `networkAccess.devAllowedDomains` — WS only works in dev mode. Production needs `allowedDomains`
- `documentAccess: "dynamic-page"` — can access pages lazily (not all at once)
- `enableProposedApi` + `enablePrivatePluginApi` — uses experimental Figma APIs

### DXT Packaging (Claude Desktop Extension)
```json
// manifest.json (root — DXT manifest, NOT plugin manifest)
{
  "dxt_version": "0.1",
  "name": "claude-talk-to-figma-mcp",
  "display_name": "Claude Talk to Figma",
  "version": "0.8.2",
  "server": {
    "type": "node",
    "entry_point": "dist/talk_to_figma_mcp/server.cjs",
    "mcp_config": {
      "command": "node",
      "args": ["${__dirname}/dist/talk_to_figma_mcp/server.cjs"],
      "env": { "NODE_ENV": "production" }
    }
  },
  "tools_generated": true
}
```

```bash
# Build DXT package:
npm run build:dxt   # syncs version → builds with tsup → runs `dxt pack`

# Dependencies: @anthropic-ai/dxt (devDep)
```

### Build Config (`tsup.config.ts`)
```typescript
import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/talk_to_figma_mcp/server.ts', 'src/socket.ts'],
  format: ['cjs', 'esm'],       // Both formats
  dts: true,                     // Type declarations
  clean: true,                   // Clean output dir
  outDir: 'dist',
  target: 'node18',
  sourcemap: true,
  minify: false,
  splitting: false,
  bundle: true,                  // Bundles all dependencies
});
```

### Dev Workflow
```bash
# 1. Start the relay server (requires Bun)
bun run src/socket.ts
# or: bun run dist/socket.js

# 2. Start the MCP server (for Claude Desktop)
# Add to Claude Desktop config:
# { "command": "node", "args": ["dist/talk_to_figma_mcp/server.cjs"] }

# 3. Load plugin in Figma
# Figma → Plugins → Development → Import plugin from manifest
# Point to: src/claude_mcp_plugin/manifest.json

# 4. Watch mode for MCP server changes:
npm run dev         # tsup --watch

# Console access:
# - Plugin main thread: Figma → Plugins → Open Console (Ctrl+Alt+J on Windows)
# - MCP server logs: stderr (logger.ts writes to stderr to avoid MCP protocol contamination)
# - Relay server: stdout (Bun process)

# Hot reload: Plugin code changes require re-running the plugin in Figma.
# No automatic hot reload for plugin code.
```

### Dependencies
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",  // MCP protocol SDK
    "uuid": "latest",                       // Request ID generation
    "ws": "latest",                         // WebSocket client (MCP server side)
    "zod": "latest"                         // Schema validation for MCP tools
  },
  "devDependencies": {
    "@anthropic-ai/dxt": "^0.2.0",         // DXT packaging
    "tsup": "^8.4.0",                      // Build tool
    "typescript": "^5.8.3",
    "jest": "^29.7.0", "ts-jest": "^29.1.2" // Testing
  }
}
// NOTE: Relay server (socket.ts) runs on Bun — uses Bun.serve() native API
// NOTE: Plugin (code.js) is raw JS — no build step, runs directly in Figma
```

---

## 9. Patterns to REUSE (copy with attribution)

MIT license — free to copy verbatim.

1. **RGBA↔Hex conversion** — `src/talk_to_figma_mcp/utils/figma-helpers.ts:rgbaToHex()` — clean, handles alpha omission
2. **Font weight→style mapping** — `src/claude_mcp_plugin/code.js:getFontStyle()` — maps 100-900 to Figma style names
3. **setCharacters() with mixed-font safety** — `code.js:1278-1332` — handles `figma.mixed`, fallback fonts, three strategies
4. **Custom base64 encoder** — `code.js:customBase64Encode()` — needed because `btoa()` isn't available in Figma plugin sandbox
5. **Node filtering for JSON output** — `figma-helpers.ts:filterFigmaNode()` — strips vectors, converts colors to hex, reduces payload size
6. **Progress update pattern** — `code.js:sendProgressUpdate()` — chunked processing with progress relay through postMessage→WS
7. **Component search order** — `code.js:createComponentInstance()` — current page → all pages → remote import with timeout
8. **Plugin manifest** — `src/claude_mcp_plugin/manifest.json` — correct permissions, network access, API flags
9. **DXT manifest structure** — `manifest.json` (root) — correct server.mcp_config format

---

## 10. Patterns to AVOID (their mistakes we won't repeat)

1. **Separate relay server (socket.ts)** — Adds a whole Bun process just to route WS messages. We embed WS directly in the MCP server.
2. **55 atomic tools** — Every property change is a separate tool call. Claude must call `create_frame` → `set_fill_color` → `set_auto_layout` → `set_corner_radius` → etc. We collapse into `build_scene`.
3. **No undo batching** — Each tool call is a separate undo step. Building a card = 10+ undo entries. We use `commitUndo()` to batch.
4. **No batch operations** — No way to modify multiple nodes in one call. Changing 20 text strings = 20 tool calls. We add `batch_modify`.
5. **Colors as raw RGBA floats** — Forces Claude to do mental math (`0.2, 0.6, 0.9`). We should accept hex strings and convert.
6. **create_text always uses Inter** — Ignores the document's font. Should default to the document's most-used font or accept family param.
7. **No layoutSizing support** — Auto-layout without `layoutSizingHorizontal/Vertical` is incomplete. Children can't FILL or HUG.
8. **set_fill_color replaces ALL fills** — Can't add a second fill or preserve existing fills. Should support append/replace modes.
9. **Plugin code is raw JS** — No TypeScript, no type safety, 3900+ lines in one file. We use TypeScript with proper module structure.
10. **No error recovery** — If one node in a series fails, the whole operation stops. No partial success reporting.
11. **parseFloat() on everything** — Defensive parsing even though MCP sends proper types. Adds confusion (0 becomes NaN if empty string).
12. **Channel name must be manually copied** — User must copy 8-char code from Figma UI and paste into `join_channel` tool call. We auto-connect.
13. **filterFigmaNode skips VECTORs** — Silently drops vector nodes from `get_node_info` output. Design data is lost.

---

*Status: ALL SECTIONS COMPLETE. Filled from ClaudeTalkToFigma codebase analysis.*
