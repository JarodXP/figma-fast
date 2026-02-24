# FigmaFast

A high-performance MCP server for Figma. Build entire designs — complete with components, styles, images, and boolean shapes — in a single tool call instead of dozens of individual operations.

```
Claude / AI  <--stdio-->  MCP Server  <--WebSocket-->  Figma Plugin
```

## Why FigmaFast?

Traditional Figma MCP tools create nodes one at a time. A simple card with a title and subtitle takes 3+ tool calls. A dashboard with 50 elements takes 50+ calls.

FigmaFast's `build_scene` tool takes a **declarative scene tree** and creates everything in one call — frames, text, shapes, components, component sets with variants, images from URL, and style bindings. A full dashboard in a single request. Combined with read tools for inspecting the canvas, edit tools for surgical changes, style/page/component management tools, and boolean operations for custom shapes, it gives AI assistants a complete Figma design system workflow.

### Tool Inventory (27 tools)

#### Scene Building

| Tool | Purpose |
|------|---------|
| `build_scene` | Create entire UI trees from a declarative spec — frames, text, shapes, components, component sets, images, and style bindings in one call |

#### Reading & Inspecting

| Tool | Purpose |
|------|---------|
| `get_document_info` | List pages, current page, top-level frames |
| `get_node_info` | Read all properties of a node by ID |
| `batch_get_node_info` | Read multiple nodes in one call (reduces round-trips) |
| `get_selection` | Get currently selected nodes |
| `get_styles` | List local paint, text, and effect styles |
| `get_local_components` | List local components with keys |
| `get_library_components` | Search team library components via REST API |
| `export_node_as_image` | Export a node as PNG, SVG, JPG, or PDF |
| `get_image_fill` | Extract the raw image data from an IMAGE fill (logos, photos embedded in a design) |

#### Editing & Manipulation

| Tool | Purpose |
|------|---------|
| `modify_node` | Update properties of an existing node (including style binding) |
| `batch_modify` | Modify multiple nodes in one call (single undo entry) |
| `delete_nodes` | Delete nodes by ID |
| `move_node` | Reposition or reparent a node |
| `clone_node` | Duplicate a node |

#### Components

| Tool | Purpose |
|------|---------|
| `convert_to_component` | Convert an existing frame into a reusable component |
| `combine_as_variants` | Combine components into a component set with variants |
| `manage_component_properties` | Add, edit, or remove component properties |

#### Styles

| Tool | Purpose |
|------|---------|
| `create_paint_style` | Create a reusable paint style (color token) |
| `create_text_style` | Create a reusable text style (typography token) |
| `create_effect_style` | Create a reusable effect style (shadow/blur token) |

#### Pages

| Tool | Purpose |
|------|---------|
| `create_page` | Create a new page in the document |
| `rename_page` | Rename an existing page |
| `set_current_page` | Switch the active page |

#### Images & Shapes

| Tool | Purpose |
|------|---------|
| `set_image_fill` | Fill a node with an image from a URL |
| `boolean_operation` | Combine shapes via UNION, SUBTRACT, INTERSECT, or EXCLUDE |

#### Utility

| Tool | Purpose |
|------|---------|
| `ping` | Health check — verify plugin connection |

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

Claude calls `batch_modify` to update both in a single round-trip.

### Build a design system

```
Create a design system page with color token styles: Primary/500 (#1A56DB),
Neutral/100 (#F3F4F6), Neutral/900 (#111827). Then create a Button component set
with Default and Disabled variants.
```

Claude calls `create_page` to set up the page, `create_paint_style` for each token, then `build_scene` with `COMPONENT_SET` and `COMPONENT` nodes — all with style bindings.

### Add images

```
Add a hero image from Unsplash to the header frame, and set it to fill mode.
```

Claude calls `set_image_fill` with the URL. The MCP server downloads the image and sends it to the plugin as base64.

### Download embedded images

```
Extract the logo from the header node so I can use it in code.
```

Claude calls `get_node_info` to find IMAGE fills (which now include `imageHash`), then `get_image_fill` to retrieve the raw source bytes. This is distinct from `export_node_as_image` — it gives you the original uploaded image, not a re-render of the node.

```
Show me what images are embedded in node 123:456.
```

Claude calls `get_node_info` → sees fills with `type: "IMAGE"` and `imageHash`, then calls `get_image_fill` with `fillIndex` to view each one.

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
│   │       ├── colors.ts        # Hex <-> RGBA conversion
│   │       ├── fonts.ts         # Font style mapping & collection
│   │       └── warnings.ts     # Property constraint detection
│   ├── mcp-server/          # MCP server + embedded WebSocket
│   │   └── src/
│   │       ├── index.ts         # Entry: stdio MCP + WS server
│   │       ├── schemas.ts       # Shared Zod validation schemas
│   │       ├── tools/           # MCP tool definitions (26 tools)
│   │       │   ├── build-scene.ts    # Declarative scene builder
│   │       │   ├── read-tools.ts     # 7 read/inspect tools
│   │       │   ├── edit-tools.ts     # 4 edit/manipulation tools
│   │       │   ├── batch-tools.ts   # 2 batch operation tools
│   │       │   ├── component-tools.ts # 3 component lifecycle tools
│   │       │   ├── style-tools.ts    # 3 style creation tools
│   │       │   ├── page-tools.ts     # 3 page management tools
│   │       │   ├── image-tools.ts    # Image fill from URL
│   │       │   ├── boolean-tools.ts  # Boolean shape operations
│   │       │   └── ping.ts          # Health check
│   │       └── ws/server.ts     # WebSocket server
│   └── figma-plugin/        # Figma plugin
│       ├── manifest.json
│       └── src/
│           ├── main.ts          # Plugin main thread
│           ├── ui.html          # UI iframe (WS client)
│           ├── handlers.ts      # All plugin-side handlers
│           ├── serialize-node.ts
│           └── scene-builder/   # Recursive scene builder
│               ├── index.ts
│               ├── build-node.ts
│               └── fonts.ts
├── vitest.config.ts         # Test configuration
├── eslint.config.js         # Linting configuration
├── .prettierrc              # Formatting configuration
└── package.json             # npm workspaces root
```

### How it works

1. **Claude** calls an MCP tool (e.g. `build_scene`) via stdio
2. **MCP Server** validates params, sends a WebSocket message to the plugin
   - For image fills, the server downloads images and sends base64-encoded data
3. **Plugin UI** (iframe) receives the WS message, forwards to the main thread via `postMessage`
4. **Plugin Main Thread** executes Figma API calls (create nodes, read properties, export, apply images)
5. **Response** flows back: main thread -> UI iframe -> WebSocket -> MCP server -> Claude

All requests use a correlation ID for reliable request/response matching with configurable timeouts.

## SceneNode Spec Reference

Every node in a `build_scene` tree has these properties:

| Property | Type | Description |
|----------|------|-------------|
| `type` | `string` | **Required.** `FRAME`, `TEXT`, `RECTANGLE`, `ELLIPSE`, `GROUP`, `COMPONENT`, `COMPONENT_SET`, `COMPONENT_INSTANCE`, `POLYGON`, `STAR`, `LINE`, `VECTOR` |
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
| `children` | `SceneNode[]` | Child nodes (for FRAME, GROUP, COMPONENT, COMPONENT_SET) |
| `fillStyleId` | `string` | Bind a paint style to fills (from `get_styles`) |
| `textStyleId` | `string` | Bind a text style (TEXT nodes only) |
| `effectStyleId` | `string` | Bind an effect style |

### Auto-Layout (on FRAME / COMPONENT nodes)

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

### Components & Variants

Create reusable components directly in `build_scene`:

```json
{
  "type": "COMPONENT_SET",
  "name": "Button",
  "children": [
    {
      "type": "COMPONENT",
      "name": "State=Default, Size=md",
      "layoutMode": "HORIZONTAL",
      "padding": [12, 24, 12, 24],
      "fills": [{"type": "SOLID", "color": "#1A56DB"}],
      "cornerRadius": 8,
      "children": [
        {
          "type": "TEXT",
          "characters": "Button",
          "fontSize": 14,
          "fontWeight": 600,
          "fills": [{"type": "SOLID", "color": "#FFFFFF"}]
        }
      ]
    },
    {
      "type": "COMPONENT",
      "name": "State=Disabled, Size=md",
      "layoutMode": "HORIZONTAL",
      "padding": [12, 24, 12, 24],
      "fills": [{"type": "SOLID", "color": "#D1D5DB"}],
      "cornerRadius": 8,
      "children": [
        {
          "type": "TEXT",
          "characters": "Button",
          "fontSize": 14,
          "fontWeight": 600,
          "fills": [{"type": "SOLID", "color": "#6B7280"}]
        }
      ]
    }
  ]
}
```

`COMPONENT` nodes support all the same properties as `FRAME` (auto-layout, fills, effects, children, etc.). Variant axes are parsed from the component name (e.g., `"State=Default, Size=md"`).

### Component Instances

```json
{
  "type": "COMPONENT_INSTANCE",
  "componentKey": "abc123def...",
  "overrides": {
    "Label": "Submit Order",
    "Icon#visible": false
  },
  "x": 0,
  "y": 0
}
```

Get component keys with `get_local_components` or `get_library_components`. Use `overrides` to customize text content, visibility, and other properties of inner layers by name.

### Style Binding

Create styles with the `create_paint_style`, `create_text_style`, and `create_effect_style` tools, then bind them to nodes:

```json
{
  "type": "FRAME",
  "fillStyleId": "S:abc123...",
  "children": [
    {
      "type": "TEXT",
      "characters": "Dashboard",
      "textStyleId": "S:def456..."
    }
  ]
}
```

Style bindings work in both `build_scene` and `modify_node`. When a style is updated, all bound nodes update automatically.

### Image Fills

Add images to any node using a URL:

```json
{
  "type": "FRAME",
  "name": "Hero Image",
  "width": 800,
  "height": 400,
  "cornerRadius": 12,
  "clipsContent": true,
  "fills": [
    {
      "type": "IMAGE",
      "url": "https://images.unsplash.com/photo-abc...",
      "scaleMode": "FILL"
    }
  ]
}
```

Supported `scaleMode` values: `FILL`, `FIT`, `CROP`, `TILE`. Images can also be applied to existing nodes via the `set_image_fill` tool.

### Boolean Operations

Combine shapes into complex forms using the `boolean_operation` tool:

```
Combine nodeA and nodeB using SUBTRACT to create a cutout shape.
```

Supported operations: `UNION`, `SUBTRACT`, `INTERSECT`, `EXCLUDE`.

### Batch Operations

Reduce round-trips by modifying or reading multiple nodes in a single call:

```json
// batch_modify — update 4 nodes in one call (single undo entry)
{
  "modifications": [
    {"nodeId": "123:1", "properties": {"name": "Header", "fills": [{"type": "SOLID", "color": "#1A56DB"}]}},
    {"nodeId": "123:2", "properties": {"characters": "Updated Title"}},
    {"nodeId": "123:3", "properties": {"visible": false}},
    {"nodeId": "123:4", "properties": {"opacity": 0.5}}
  ]
}

// batch_get_node_info — read 5 nodes in one call
{
  "nodeIds": ["123:1", "123:2", "123:3", "123:4", "123:5"],
  "depth": 2
}
```

Batch operations create a single undo entry in Figma, making them cleaner than sequential calls.

### Smart Warnings

FigmaFast detects operations that Figma would silently ignore and returns warnings:

- Setting x/y on children of a `COMPONENT_SET` (positions are auto-managed)
- Applying layout properties (`layoutMode`, `itemSpacing`, `padding`) to `TEXT` nodes
- Applying text properties (`characters`, `fontSize`) to non-`TEXT` nodes
- Modifying structural properties on `COMPONENT_INSTANCE` nodes

Warnings appear in the response as `[warning]`-prefixed messages, helping AI agents avoid dead-end loops.

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

# Run tests
npm test

# Lint
npm run lint

# Check formatting
npm run format:check
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
