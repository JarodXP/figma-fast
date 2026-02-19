# FigmaFast -- Test Specifications

> **Version:** 2.0.0
> **Last updated:** 2026-02-19
> **Framework:** vitest ^4.0.18

---

## Existing Tests (Phase 5.5 -- All Passing)

| File | Tests | Status |
|------|-------|--------|
| `packages/shared/src/__tests__/colors.test.ts` | 11 | PASSING |
| `packages/shared/src/__tests__/fonts.test.ts` | 8 | PASSING |
| `packages/mcp-server/src/__tests__/schemas.test.ts` | 20 | PASSING |
| `packages/mcp-server/src/__tests__/server.test.ts` | 1 | PASSING |
| `packages/mcp-server/src/__tests__/ws-server.test.ts` | 2 | PASSING |
| **TOTAL** | **42** | **ALL PASSING** |

---

## Phase 6: Page Management Tests

```
TEST-P6-001: create_page MCP tool registers with correct schema
Type: unit
Priority: critical

GIVEN the MCP server with all tools registered
WHEN tools/list is called
THEN a tool named "create_page" exists with parameter schema { name: string }
```

```
TEST-P6-002: create_page handler creates a page with given name
Type: integration (requires Figma API mock)
Priority: critical

GIVEN a Figma document with 1 page ("Page 1")
WHEN handleCreatePage("My New Page") is called
THEN figma.createPage() is invoked AND the new page's name is set to "My New Page"
AND the handler returns { id: <string>, name: "My New Page" }
```

```
TEST-P6-003: rename_page MCP tool registers with correct schema
Type: unit
Priority: critical

GIVEN the MCP server with all tools registered
WHEN tools/list is called
THEN a tool named "rename_page" exists with parameters { pageId: string, name: string }
```

```
TEST-P6-004: rename_page handler renames an existing page
Type: integration (requires Figma API mock)
Priority: critical

GIVEN a page with id "0:1" and name "Old Name"
WHEN handleRenamePage("0:1", "New Name") is called
THEN the page's name is set to "New Name"
AND the handler returns { id: "0:1", name: "New Name", oldName: "Old Name" }
```

```
TEST-P6-005: rename_page handler throws for nonexistent page
Type: integration (requires Figma API mock)
Priority: high

GIVEN no page with id "999:0"
WHEN handleRenamePage("999:0", "Any") is called
THEN it throws an error containing "not found"
```

```
TEST-P6-006: set_current_page MCP tool registers with correct schema
Type: unit
Priority: critical

GIVEN the MCP server with all tools registered
WHEN tools/list is called
THEN a tool named "set_current_page" exists with parameter { pageId: string }
```

```
TEST-P6-007: set_current_page handler switches to target page
Type: integration (requires Figma API mock)
Priority: critical

GIVEN pages ["0:1" (Page 1), "0:2" (Page 2)] with currentPage = "0:1"
WHEN handleSetCurrentPage("0:2") is called
THEN figma.setCurrentPageAsync is called with the page node for "0:2"
AND the handler returns { id: "0:2", name: "Page 2" }
```

```
TEST-P6-008: set_current_page handler throws for nonexistent page
Type: integration (requires Figma API mock)
Priority: high

GIVEN no page with id "999:0"
WHEN handleSetCurrentPage("999:0") is called
THEN it throws an error containing "not found"
```

```
TEST-P6-009: Page management WS message types are in ServerToPluginMessage
Type: unit
Priority: high

GIVEN the ServerToPluginMessage type definition
WHEN a message with type "create_page" is constructed with { id: string, name: string }
AND a message with type "rename_page" is constructed with { id: string, pageId: string, name: string }
AND a message with type "set_current_page" is constructed with { id: string, pageId: string }
THEN all three compile without TypeScript errors
```

```
TEST-P6-010: MCP server registers all 19 tools after Phase 6
Type: integration
Priority: critical

GIVEN a fresh MCP server with all Phase 6 tools registered
WHEN tools/list is called
THEN exactly 19 tools are returned (16 existing + 3 page tools)
```

---

## Phase 7A: Style Binding Tests

```
TEST-P7A-001: SceneNodeSchema accepts fillStyleId field
Type: unit
Priority: critical

GIVEN { type: "RECTANGLE", fillStyleId: "S:abc123,1:1" }
WHEN parsed by SceneNodeSchema
THEN validation succeeds AND the fillStyleId value is preserved
```

```
TEST-P7A-002: SceneNodeSchema accepts textStyleId field
Type: unit
Priority: critical

GIVEN { type: "TEXT", characters: "Hello", textStyleId: "S:def456,2:2" }
WHEN parsed by SceneNodeSchema
THEN validation succeeds
```

```
TEST-P7A-003: SceneNodeSchema accepts effectStyleId field
Type: unit
Priority: critical

GIVEN { type: "FRAME", effectStyleId: "S:ghi789,3:3" }
WHEN parsed by SceneNodeSchema
THEN validation succeeds
```

```
TEST-P7A-004: ModifyPropertiesSchema accepts style ID fields
Type: unit
Priority: critical

GIVEN { fillStyleId: "S:abc,1:1", textStyleId: "S:def,2:2", effectStyleId: "S:ghi,3:3" }
WHEN parsed by ModifyPropertiesSchema
THEN validation succeeds for all three fields
```

```
TEST-P7A-005: Style binding in build_scene applies fillStyleId
Type: integration (requires Figma API mock)
Priority: critical

GIVEN a RECTANGLE spec with fillStyleId: "S:abc,1:1" and NO fills array
WHEN buildNode is called
THEN node.fillStyleId is set to "S:abc,1:1" AND fills are NOT manually applied
```

```
TEST-P7A-006: Style binding in build_scene applies textStyleId
Type: integration (requires Figma API mock)
Priority: critical

GIVEN a TEXT spec with textStyleId: "S:def,2:2" and characters: "Hello"
WHEN buildNode is called
THEN node.textStyleId is set to "S:def,2:2"
```

```
TEST-P7A-007: Style binding in build_scene applies effectStyleId
Type: integration (requires Figma API mock)
Priority: critical

GIVEN a FRAME spec with effectStyleId: "S:ghi,3:3"
WHEN buildNode is called
THEN node.effectStyleId is set to "S:ghi,3:3"
```

```
TEST-P7A-008: Style binding in modify_node applies style IDs
Type: integration (requires Figma API mock)
Priority: critical

GIVEN an existing RECTANGLE node
WHEN handleModifyNode is called with { fillStyleId: "S:abc,1:1" }
THEN the node's fillStyleId is set
```

```
TEST-P7A-009: fillStyleId takes precedence over fills array
Type: integration (requires Figma API mock)
Priority: high

GIVEN a spec with BOTH fillStyleId and fills
WHEN buildNode is called
THEN fillStyleId is applied AND the explicit fills array is ignored (style wins)
```

```
TEST-P7A-010: get_styles returns style IDs usable for binding
Type: integration (requires Figma API mock)
Priority: medium

GIVEN a file with paint style "Primary Blue" (id "S:abc,1:1")
WHEN handleGetStyles is called
THEN the returned paintStyles array includes { id: "S:abc,1:1", name: "Primary Blue", ... }
AND this ID can be used as a fillStyleId value
```

---

## Phase 7B: Style Creation Tests

```
TEST-P7B-001: create_paint_style MCP tool registers correctly
Type: unit
Priority: critical

GIVEN the MCP server with Phase 7B tools registered
WHEN tools/list is called
THEN "create_paint_style" exists with parameters { name: string, fills: Fill[] }
```

```
TEST-P7B-002: create_paint_style handler creates a paint style
Type: integration (requires Figma API mock)
Priority: critical

GIVEN no paint styles exist
WHEN handleCreatePaintStyle("Primary Blue", [{ type: "SOLID", color: "#2563EB" }]) is called
THEN figma.createPaintStyle() is invoked
AND style.name is set to "Primary Blue"
AND style.paints includes a SOLID paint with the correct RGB values
AND returns { id: <string>, name: "Primary Blue", key: <string> }
```

```
TEST-P7B-003: create_text_style MCP tool registers correctly
Type: unit
Priority: critical

GIVEN the MCP server with Phase 7B tools registered
WHEN tools/list is called
THEN "create_text_style" exists with parameters { name, fontFamily?, fontSize?, fontWeight?, lineHeight?, letterSpacing?, textDecoration?, textCase? }
```

```
TEST-P7B-004: create_text_style handler creates a text style
Type: integration (requires Figma API mock)
Priority: critical

GIVEN no text styles exist
WHEN handleCreateTextStyle("Heading 1", { fontFamily: "Inter", fontSize: 32, fontWeight: 700 }) is called
THEN figma.createTextStyle() is invoked
AND style.fontName is set to { family: "Inter", style: "Bold" }
AND style.fontSize is set to 32
AND returns { id: <string>, name: "Heading 1", key: <string> }
```

```
TEST-P7B-005: create_effect_style MCP tool registers correctly
Type: unit
Priority: critical

GIVEN the MCP server with Phase 7B tools registered
WHEN tools/list is called
THEN "create_effect_style" exists with parameters { name: string, effects: Effect[] }
```

```
TEST-P7B-006: create_effect_style handler creates an effect style
Type: integration (requires Figma API mock)
Priority: critical

GIVEN no effect styles exist
WHEN handleCreateEffectStyle("Card Shadow", [{ type: "DROP_SHADOW", color: "#00000026", offset: { x: 0, y: 2 }, radius: 8 }]) is called
THEN figma.createEffectStyle() is invoked
AND style.effects includes a DROP_SHADOW with correct values
AND returns { id: <string>, name: "Card Shadow", key: <string> }
```

```
TEST-P7B-007: MCP server registers all 22 tools after Phase 7B
Type: integration
Priority: critical

GIVEN a fresh MCP server with all Phase 7B tools registered
WHEN tools/list is called
THEN exactly 22 tools are returned (19 after P6 + 3 style creation tools)
```

---

## Phase 8: Image Fill Tests

```
TEST-P8-001: set_image_fill MCP tool registers correctly
Type: unit
Priority: critical

GIVEN the MCP server with Phase 8 tools registered
WHEN tools/list is called
THEN "set_image_fill" exists with parameters { nodeId: string, imageUrl: string, scaleMode?: enum }
```

```
TEST-P8-002: set_image_fill downloads image from URL on MCP server
Type: integration
Priority: critical

GIVEN a valid image URL returning a 1x1 PNG
WHEN the set_image_fill tool handler is invoked
THEN the MCP server fetches the URL
AND the response bytes are base64-encoded
AND sent to the plugin via WS as { type: "set_image_fill", nodeId, imageData: <base64>, scaleMode }
```

```
TEST-P8-003: set_image_fill handler rejects invalid URL
Type: unit
Priority: high

GIVEN an imageUrl that is not a valid URL (e.g., "not-a-url")
WHEN the set_image_fill tool handler is invoked
THEN it returns an error without attempting fetch
```

```
TEST-P8-004: set_image_fill handler rejects on fetch timeout
Type: integration
Priority: high

GIVEN a URL that does not respond within 30 seconds
WHEN the set_image_fill tool handler is invoked
THEN it returns a timeout error
```

```
TEST-P8-005: Plugin handler applies image fill to node
Type: integration (requires Figma API mock)
Priority: critical

GIVEN a RECTANGLE node and base64 image data
WHEN handleSetImageFill(nodeId, imageData, "FILL") is called in the plugin
THEN figma.createImage(bytes) is called
AND the node's fills are set to [{ type: "IMAGE", imageHash: image.hash, scaleMode: "FILL" }]
```

```
TEST-P8-006: IMAGE fill type in build_scene with imageUrl
Type: integration
Priority: critical

GIVEN a scene spec: { type: "RECTANGLE", width: 200, height: 200, fills: [{ type: "IMAGE", imageUrl: "https://example.com/photo.png", scaleMode: "FILL" }] }
WHEN build_scene is invoked
THEN the MCP server downloads the image before sending to plugin
AND the plugin creates the image and applies it as a fill
```

```
TEST-P8-007: IMAGE fill with invalid URL falls back to placeholder
Type: integration
Priority: high

GIVEN a scene spec with fills: [{ type: "IMAGE", imageUrl: "https://nonexistent.invalid/img.png" }]
WHEN build_scene is invoked
THEN the node is created with a gray placeholder fill
AND an error is added to the errors array
```

```
TEST-P8-008: SceneNodeSchema FillSchema accepts imageUrl field
Type: unit
Priority: critical

GIVEN { type: "IMAGE", imageUrl: "https://example.com/photo.png", scaleMode: "FILL" }
WHEN parsed by FillSchema
THEN validation succeeds
```

```
TEST-P8-009: MCP server registers all 23 tools after Phase 8
Type: integration
Priority: critical

GIVEN a fresh MCP server with all Phase 8 tools registered
WHEN tools/list is called
THEN exactly 23 tools are returned (22 after P7B + 1 image tool)
```

---

## Phase 9: Boolean Operations Tests

```
TEST-P9-001: boolean_operation MCP tool registers correctly
Type: unit
Priority: critical

GIVEN the MCP server with Phase 9 tools registered
WHEN tools/list is called
THEN "boolean_operation" exists with parameters { operation: enum, nodeIds: string[] }
```

```
TEST-P9-002: boolean_operation validates operation type
Type: unit
Priority: critical

GIVEN operation: "INVALID_OP"
WHEN boolean_operation tool handler is invoked
THEN Zod validation fails with an error about the operation enum
```

```
TEST-P9-003: boolean_operation requires at least 2 node IDs
Type: unit
Priority: high

GIVEN operation: "UNION" and nodeIds: ["123:1"]
WHEN boolean_operation tool handler is invoked
THEN Zod validation fails (min 2 nodes required)
```

```
TEST-P9-004: Plugin handler executes UNION operation
Type: integration (requires Figma API mock)
Priority: critical

GIVEN two RECTANGLE nodes with ids "1:1" and "1:2"
WHEN handleBooleanOperation("UNION", ["1:1", "1:2"]) is called
THEN figma.union([node1, node2], parent) is called
AND returns { resultNodeId: <string>, operation: "UNION", inputCount: 2 }
```

```
TEST-P9-005: Plugin handler executes SUBTRACT operation
Type: integration (requires Figma API mock)
Priority: critical

GIVEN two RECTANGLE nodes
WHEN handleBooleanOperation("SUBTRACT", [nodeId1, nodeId2]) is called
THEN figma.subtract([node1, node2], parent) is called
```

```
TEST-P9-006: Plugin handler executes INTERSECT operation
Type: integration (requires Figma API mock)
Priority: high

GIVEN two ELLIPSE nodes
WHEN handleBooleanOperation("INTERSECT", [nodeId1, nodeId2]) is called
THEN figma.intersect([node1, node2], parent) is called
```

```
TEST-P9-007: Plugin handler executes EXCLUDE operation
Type: integration (requires Figma API mock)
Priority: high

GIVEN two RECTANGLE nodes
WHEN handleBooleanOperation("EXCLUDE", [nodeId1, nodeId2]) is called
THEN figma.exclude([node1, node2], parent) is called
```

```
TEST-P9-008: boolean_operation fails if nodes not found
Type: integration (requires Figma API mock)
Priority: high

GIVEN nodeIds referencing nonexistent nodes
WHEN handleBooleanOperation("UNION", ["999:1", "999:2"]) is called
THEN it throws an error containing "not found"
```

```
TEST-P9-009: boolean_operation fails if nodes have different parents
Type: integration (requires Figma API mock)
Priority: medium

GIVEN two nodes with different parents
WHEN handleBooleanOperation("UNION", [nodeId1, nodeId2]) is called
THEN it throws an error about requiring the same parent
```

```
TEST-P9-010: MCP server registers all 24 tools after Phase 9
Type: integration
Priority: critical

GIVEN a fresh MCP server with all Phase 9 tools registered
WHEN tools/list is called
THEN exactly 24 tools are returned (23 after P8 + 1 boolean tool)
```

---

## Non-Functional Tests (retained from v1.0)

```
TEST-NF-001: MCP server starts and registers all tools
Type: integration
Priority: critical
NOTE: Update expected count as new tools are added per phase.

GIVEN a fresh MCP server process started via stdio
WHEN an initialize request followed by tools/list is sent
THEN the response includes the expected tool count with correct names
```

```
TEST-NF-002: sendToPlugin rejects when no plugin connected
Type: unit
Priority: high

GIVEN the WS server is running but no plugin has connected
WHEN sendToPlugin is called
THEN it rejects with "Figma plugin is not connected" error
```

```
TEST-NF-003: sendToPlugin rejects on timeout
Type: unit
Priority: high

GIVEN a connected mock WS client that never responds
WHEN sendToPlugin is called with a 100ms timeout
THEN it rejects with a timeout error after ~100ms
```

```
TEST-NF-004: Build succeeds with clean TypeScript compilation
Type: integration
Priority: critical

GIVEN the current source code
WHEN `npm run build` is executed
THEN all 3 packages compile without errors
```

---

## Coverage Gaps (to address incrementally)

| Area | Current Coverage | Priority | Phase to Address |
|------|-----------------|----------|-----------------|
| Plugin handlers (handlers.ts) | 0% | MEDIUM | Requires Figma mock -- defer |
| Plugin build-node.ts | 0% | LOW | Requires Figma mock -- defer |
| Plugin serialize-node.ts | 0% | LOW | Requires Figma mock -- defer |
| MCP tool handler boilerplate | 0% | LOW | Mostly WS relay code, low value |
| WS server full lifecycle | Partial (2 tests) | MEDIUM | Add in Phase 6 if time allows |

---

## Test Categories Summary

| Phase | Test IDs | Count |
|-------|----------|-------|
| Phase 5.5 (existing) | TEST-001 through TEST-030, TEST-NF-001 through TEST-NF-004 | 34 spec, 42 actual |
| Phase 6: Page Management | TEST-P6-001 through TEST-P6-010 | 10 |
| Phase 7A: Style Binding | TEST-P7A-001 through TEST-P7A-010 | 10 |
| Phase 7B: Style Creation | TEST-P7B-001 through TEST-P7B-007 | 7 |
| Phase 8: Image Fills | TEST-P8-001 through TEST-P8-009 | 9 |
| Phase 9: Boolean Operations | TEST-P9-001 through TEST-P9-010 | 10 |
| **TOTAL NEW** | | **46** |
| **TOTAL (existing + new)** | | **88** |

---

## Test Infrastructure Requirements

1. **Framework:** vitest ^4.0.18 (already installed)
2. **Config:** `vitest.config.ts` at workspace root (already exists)
3. **Test location:** `packages/<pkg>/src/__tests__/<file>.test.ts` (established convention)
4. **Script:** `"test": "vitest run"` in root package.json (already exists)
5. **New dependency needed for Phase 8:** None -- Node.js native `fetch` (available in Node >= 18)
6. **Figma API mocks:** For integration tests that reference Figma globals, these tests are SPEC ONLY until a Figma mock layer is added. Unit tests (schema validation, tool registration, message types) can be implemented immediately.
