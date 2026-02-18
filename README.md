# FigmaFast

A high-performance MCP server for Figma. Build entire designs in a single tool call instead of dozens of individual operations.

```
Claude / AI  <--stdio-->  MCP Server  <--WebSocket-->  Figma Plugin
```

## Why FigmaFast?

Traditional Figma MCP tools create nodes one at a time. A simple card with a title and subtitle takes 3+ tool calls. A dashboard with 50 elements takes 50+ calls.

FigmaFast's `build_scene` tool takes a **declarative scene tree** and creates everything in one call. A full dashboard in a single request. Combined with read tools for inspecting the canvas and edit tools for surgical changes, it gives AI assistants a complete Figma workflow.

### Tool Inventory

| Tool | Purpose |
|------|---------|
| `build_scene` | Create entire UI trees from a declarative spec (primary tool) |
| `get_document_info` | List pages, current page, top-level frames |
| `get_node_info` | Read all properties of a node by ID |
| `get_selection` | Get currently selected nodes |
| `get_styles` | List local paint, text, and effect styles |
| `get_local_components` | List local components with keys |
| `export_node_as_image` | Export a node as PNG, SVG, JPG, or PDF |
| `modify_node` | Update properties of an existing node |
| `delete_nodes` | Delete nodes by ID |
| `move_node` | Reposition or reparent a node |
| `clone_node` | Duplicate a node |

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **Figma Desktop** (or Figma in the browser)

### 1. Clone and build

```bash
git clone <repo-url> figma-fast
cd figma-fast
npm install
npm run build
```

### 2. Load the Figma plugin

1. Open Figma and open any file
2. Go to **Menu > Plugins > Development > Import plugin from manifest...**
3. Select `packages/figma-plugin/manifest.json`
4. Run the plugin: **Menu > Plugins > Development > FigmaFast**
5. The plugin panel appears with a connection status dot (yellow = connecting, green = connected)

### 3. Configure your AI client

#### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "figma-fast": {
      "command": "node",
      "args": ["/absolute/path/to/figma-fast/packages/mcp-server/dist/index.js"]
    }
  }
}
```

#### Claude Code

Add to `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "figma-fast": {
      "command": "node",
      "args": ["/absolute/path/to/figma-fast/packages/mcp-server/dist/index.js"]
    }
  }
}
```

### 4. Verify

Ask Claude: *"Ping the Figma plugin"* -- you should get a `pong` response with round-trip time.

## Usage Examples

### Create a card

```
Create a card in Figma with a title "Revenue", a big number "$12,450",
and a subtitle "+12% from last month" on a white background with a shadow.
```

Claude will call `build_scene` with a single tree:

```json
{
  "scene": {
    "type": "FRAME",
    "name": "Revenue Card",
    "width": 280,
    "fills": [{"type": "SOLID", "color": "#FFFFFF"}],
    "cornerRadius": 12,
    "effects": [{"type": "DROP_SHADOW", "color": "#00000019", "offset": {"x": 0, "y": 2}, "radius": 8}],
    "layoutMode": "VERTICAL",
    "padding": 24,
    "itemSpacing": 4,
    "layoutSizingVertical": "HUG",
    "children": [
      {
        "type": "TEXT",
        "characters": "Revenue",
        "fontSize": 14,
        "fills": [{"type": "SOLID", "color": "#6B7280"}],
        "layoutSizingHorizontal": "FILL"
      },
      {
        "type": "TEXT",
        "characters": "$12,450",
        "fontSize": 32,
        "fontWeight": 700,
        "fills": [{"type": "SOLID", "color": "#111827"}],
        "layoutSizingHorizontal": "FILL"
      },
      {
        "type": "TEXT",
        "characters": "+12% from last month",
        "fontSize": 12,
        "fills": [{"type": "SOLID", "color": "#10B981"}],
        "layoutSizingHorizontal": "FILL"
      }
    ]
  }
}
```

### Inspect and edit

```
What's on the current page? Show me the structure.
```

Claude calls `get_document_info` to see pages and frames, then `get_node_info` to drill into specifics.

```
Change the title text to "Total Revenue" and make the number blue.
```

Claude calls `modify_node` twice -- once for the text content, once for the fill color.

### Export for review

```
Export that card as a PNG so I can see it.
```

Claude calls `export_node_as_image` and can directly view the result.

## Architecture

```
figma-fast/
├── packages/
│   ├── shared/              # Shared types & utilities
│   │   └── src/
│   │       ├── scene-spec.ts    # SceneNode type (the core contract)
│   │       ├── messages.ts      # WebSocket message protocol
│   │       └── colors.ts        # Hex <-> RGBA conversion
│   ├── mcp-server/          # MCP server + embedded WebSocket
│   │   └── src/
│   │       ├── index.ts         # Entry: stdio MCP + WS server
│   │       ├── tools/           # MCP tool definitions
│   │       │   ├── build-scene.ts
│   │       │   ├── read-tools.ts
│   │       │   └── edit-tools.ts
│   │       └── ws/server.ts     # WebSocket server
│   └── figma-plugin/        # Figma plugin
│       ├── manifest.json
│       └── src/
│           ├── main.ts          # Plugin main thread
│           ├── ui.html          # UI iframe (WS client)
│           ├── handlers.ts      # Read & edit handlers
│           ├── serialize-node.ts
│           └── scene-builder/   # Recursive scene builder
│               ├── index.ts
│               ├── build-node.ts
│               └── fonts.ts
└── package.json             # npm workspaces root
```

### How it works

1. **Claude** calls an MCP tool (e.g. `build_scene`) via stdio
2. **MCP Server** validates params, sends a WebSocket message to the plugin
3. **Plugin UI** (iframe) receives the WS message, forwards to the main thread via `postMessage`
4. **Plugin Main Thread** executes Figma API calls (create nodes, read properties, export)
5. **Response** flows back: main thread -> UI iframe -> WebSocket -> MCP server -> Claude

All requests use a correlation ID for reliable request/response matching with configurable timeouts.

## SceneNode Spec Reference

Every node in a `build_scene` tree has these properties:

| Property | Type | Description |
|----------|------|-------------|
| `type` | `string` | **Required.** `FRAME`, `TEXT`, `RECTANGLE`, `ELLIPSE`, `GROUP`, `COMPONENT_INSTANCE`, `POLYGON`, `STAR`, `LINE`, `VECTOR` |
| `id` | `string` | Client-assigned ID. Returned in `nodeIdMap` for follow-up references. |
| `name` | `string` | Layer name in Figma |
| `x`, `y` | `number` | Position |
| `width`, `height` | `number` | Size |
| `fills` | `Fill[]` | Fill paints. `[{"type": "SOLID", "color": "#FF0000"}]` |
| `strokes` | `Stroke[]` | Stroke paints with weight and alignment |
| `effects` | `Effect[]` | Shadows and blurs |
| `opacity` | `number` | 0-1 |
| `cornerRadius` | `number \| [tl, tr, br, bl]` | Uniform or per-corner radius |
| `clipsContent` | `boolean` | Whether frame clips children |
| `visible` | `boolean` | Visibility |
| `locked` | `boolean` | Lock state |
| `children` | `SceneNode[]` | Child nodes (for FRAME, GROUP) |

### Auto-Layout (on FRAME nodes)

| Property | Type | Description |
|----------|------|-------------|
| `layoutMode` | `HORIZONTAL \| VERTICAL \| NONE` | Enables auto-layout |
| `itemSpacing` | `number` | Gap between children |
| `padding` | `number \| [top, right, bottom, left]` | Inner padding |
| `primaryAxisAlignItems` | `MIN \| CENTER \| MAX \| SPACE_BETWEEN` | Main axis alignment |
| `counterAxisAlignItems` | `MIN \| CENTER \| MAX` | Cross axis alignment |

### Sizing (on children of auto-layout frames)

| Property | Type | Description |
|----------|------|-------------|
| `layoutSizingHorizontal` | `FIXED \| HUG \| FILL` | Horizontal sizing mode |
| `layoutSizingVertical` | `FIXED \| HUG \| FILL` | Vertical sizing mode |

### Text Properties (on TEXT nodes)

| Property | Type | Description |
|----------|------|-------------|
| `characters` | `string` | Text content |
| `fontSize` | `number` | Font size in px |
| `fontFamily` | `string` | Font family (default: Inter) |
| `fontWeight` | `number \| string` | 100-900 or style name like "Bold" |
| `textAlignHorizontal` | `LEFT \| CENTER \| RIGHT \| JUSTIFIED` | Horizontal alignment |
| `textAlignVertical` | `TOP \| CENTER \| BOTTOM` | Vertical alignment |
| `textAutoResize` | `WIDTH_AND_HEIGHT \| HEIGHT \| NONE \| TRUNCATE` | Auto-resize mode |
| `lineHeight` | `number \| {value, unit}` | Line height in px or `{value, unit: 'PIXELS'/'PERCENT'/'AUTO'}` |
| `letterSpacing` | `number` | Letter spacing in px |
| `textDecoration` | `NONE \| UNDERLINE \| STRIKETHROUGH` | Text decoration |
| `textCase` | `ORIGINAL \| UPPER \| LOWER \| TITLE` | Text transform |

### Colors

All colors are hex strings: `#RGB`, `#RRGGBB`, or `#RRGGBBAA`.

```
"#F00"        -- red
"#FF0000"     -- red
"#FF000080"   -- red at 50% opacity
"#00000019"   -- black at 10% opacity (good for subtle shadows)
```

### Component Instances

```json
{
  "type": "COMPONENT_INSTANCE",
  "componentKey": "abc123def...",
  "x": 0,
  "y": 0
}
```

Get component keys with `get_local_components`.

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `FIGMA_FAST_PORT` | `3056` | WebSocket server port |

To change the port, also update `WS_URL` in `packages/figma-plugin/src/ui.html` and `devAllowedDomains` in `packages/figma-plugin/manifest.json`, then rebuild.

## Development

```bash
# Build everything
npm run build

# Build only the plugin (after changing plugin code)
npm run build:plugin

# Build only the server (after changing server/shared code)
npm run build:server

# Run MCP server in dev mode (auto-restart on changes)
npm run dev
```

### Build order

`shared` -> `mcp-server` -> `figma-plugin` (the plugin bundles shared via esbuild)

### Reloading the plugin

After rebuilding, you need to reload the plugin in Figma:
- Close the plugin panel
- Re-run from **Plugins > Development > FigmaFast**

Figma does NOT hot-reload plugin code automatically.

## Troubleshooting

**Plugin shows "Connecting..." (yellow dot)**
- Make sure the MCP server is running (it starts the WebSocket server)
- Check that port 3056 isn't in use by another process: `lsof -i :3056`

**Plugin shows "Disconnected" (red dot)**
- The MCP server may have stopped. Restart your AI client to relaunch it.
- If using a custom port, ensure the plugin UI and manifest match.

**"Syntax error: Unexpected token" in Figma console**
- The plugin must be built with esbuild target `es2015`. Check `packages/figma-plugin/build.mjs`.

**Font not available**
- FigmaFast auto-falls back to Inter Regular. The response includes font substitution warnings.
- Ensure the font is installed on your system or available in the Figma file.

**Port conflict with ClaudeTalkToFigma**
- ClaudeTalkToFigma uses port 3055. FigmaFast uses 3056 by default. If you still have conflicts, change the port via `FIGMA_FAST_PORT`.

## License

MIT
