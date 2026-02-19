# FigmaFast -- Task Breakdown

> **Version:** 2.0.0
> **Last updated:** 2026-02-19
> **Mandatory sequence:** Tests -> Implementation -> Validation -> Regression -> Fix (if needed)

---

## Phase 5.5: Test & Quality Infrastructure -- COMPLETE

All 9 tasks (TASK-001 through TASK-009) completed. See PROGRESS.md for execution log.

---

## Phase 6: Page Management

### TASK-014: Write tests for page management tool registration (TEST-P6-001, TEST-P6-003, TEST-P6-006, TEST-P6-009, TEST-P6-010)
- **Status:** DONE
- **Dependencies:** None
- **Type:** Test
- **Est. iterations:** 2-3
- **Files affected:** `packages/mcp-server/src/__tests__/server.test.ts` (update)
- **Verification:** `npm test` passes all new page tool registration tests
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read TESTS.md for TEST-P6-001, TEST-P6-003, TEST-P6-006, TEST-P6-009, TEST-P6-010.
  Read packages/mcp-server/src/__tests__/server.test.ts for the existing server integration test pattern.

  Task: Update the server integration test to verify that 19 tools are registered (will be 19 after page tools are added). Add individual test cases that check "create_page", "rename_page", and "set_current_page" are in the tool list.

  IMPORTANT: These tests will FAIL until TASK-015 is complete (the tools don't exist yet). That is expected -- write the tests first, they will be validated after implementation.

  For now, update the expected tool count from 16 to 19 in a new describe block "Phase 6 tools" so the existing test for 16 tools still passes. Add the new tests as .skip or in a separate describe that we can enable after implementation.

  Actually, the better approach: Add the 3 new tool name assertions in a SKIPPED test block. Do NOT change the existing "16 tools" assertion yet -- it protects the current baseline. We'll update the count after implementation.

  Run `npm test` until all tests pass (the new tests should be skipped).
  ```

### TASK-015: Add page management message types to shared protocol
- **Status:** DONE
- **Dependencies:** None (can run parallel with TASK-014)
- **Type:** Implementation
- **Est. iterations:** 1-2
- **Files affected:** `packages/shared/src/messages.ts`, `packages/shared/src/scene-spec.ts` (no changes needed)
- **Verification:** `npm run build` succeeds
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read packages/shared/src/messages.ts for the current WS message protocol.

  Task: Add 3 new message types to the ServerToPluginMessage union:
  1. { type: 'create_page'; id: string; name: string }
  2. { type: 'rename_page'; id: string; pageId: string; name: string }
  3. { type: 'set_current_page'; id: string; pageId: string }

  Run `npm run build` to verify shared package compiles. Then rebuild all packages: `npm run build`.
  ```

### TASK-016: Implement page management plugin handlers
- **Status:** DONE
- **Dependencies:** TASK-015
- **Type:** Implementation
- **Est. iterations:** 3-5
- **Files affected:** `packages/figma-plugin/src/handlers.ts`, `packages/figma-plugin/src/main.ts`
- **Verification:** `npm run build` succeeds (plugin compiles)
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read packages/figma-plugin/src/handlers.ts for the existing handler pattern.
  Read packages/figma-plugin/src/main.ts for the message routing switch.
  Read REFERENCE.md lines 128-131 for the Figma API patterns for page management.

  Task: Implement 3 new handlers in handlers.ts:

  1. handleCreatePage(name: string): Promise<unknown>
     - Call figma.createPage()
     - Set page.name = name
     - Return { id: page.id, name: page.name }

  2. handleRenamePage(pageId: string, name: string): Promise<unknown>
     - Look up page via figma.getNodeByIdAsync(pageId)
     - Verify it's a PAGE type
     - Store oldName = page.name
     - Set page.name = name
     - Return { id: page.id, name, oldName }

  3. handleSetCurrentPage(pageId: string): Promise<unknown>
     - Look up page via figma.getNodeByIdAsync(pageId)
     - Verify it's a PAGE type
     - Call figma.setCurrentPageAsync(page)
     - Return { id: page.id, name: page.name }

  Add all 3 handlers to the exports.

  Update main.ts message switch to route:
  - 'create_page' -> handleCreatePage(msg.name as string)
  - 'rename_page' -> handleRenamePage(msg.pageId as string, msg.name as string)
  - 'set_current_page' -> handleSetCurrentPage(msg.pageId as string)

  Run `npm run build` until all packages compile clean.
  ```

### TASK-017: Implement page management MCP tools
- **Status:** DONE
- **Dependencies:** TASK-015
- **Type:** Implementation
- **Est. iterations:** 3-5
- **Files affected:** `packages/mcp-server/src/tools/page-tools.ts` (new), `packages/mcp-server/src/index.ts`
- **Verification:** `npm run build` succeeds
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read packages/mcp-server/src/tools/edit-tools.ts for the existing MCP tool registration pattern (NOT_CONNECTED, sendToPlugin, etc).
  Read packages/mcp-server/src/index.ts for how tool modules are registered.

  Task: Create packages/mcp-server/src/tools/page-tools.ts with 3 MCP tools:

  1. create_page
     - Description: "Create a new page in the Figma document. Returns the new page's ID and name."
     - Parameters: { name: z.string().describe("Name for the new page") }
     - Sends to plugin: { type: 'create_page', name }
     - Returns: "Created page <name> (id: <id>)"

  2. rename_page
     - Description: "Rename an existing page. Get page IDs from get_document_info."
     - Parameters: { pageId: z.string(), name: z.string() }
     - Sends to plugin: { type: 'rename_page', pageId, name }
     - Returns: "Renamed page from <oldName> to <name> (id: <id>)"

  3. set_current_page
     - Description: "Switch to a different page. All subsequent build_scene and read operations will target this page. Get page IDs from get_document_info."
     - Parameters: { pageId: z.string() }
     - Sends to plugin: { type: 'set_current_page', pageId }
     - Returns: "Switched to page <name> (id: <id>)"

  Export a registerPageTools(server: McpServer) function.

  Update packages/mcp-server/src/index.ts:
  - Import registerPageTools from './tools/page-tools.js'
  - Call registerPageTools(server) after registerComponentTools

  Run `npm run build` until all packages compile clean.
  ```

### TASK-018: Enable and validate page management tests
- **Status:** DONE
- **Dependencies:** TASK-014, TASK-016, TASK-017
- **Type:** Validation
- **Est. iterations:** 2-3
- **Files affected:** `packages/mcp-server/src/__tests__/server.test.ts` (update)
- **Verification:** `npm test` passes ALL tests including new page tool tests
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read packages/mcp-server/src/__tests__/server.test.ts for the skipped page tool tests.

  Task:
  1. Unskip the page management tool tests from TASK-014.
  2. Update the main tool count assertion from 16 to 19.
  3. Run `npm test` -- if any tests fail, fix either the tests or the implementation.
  4. Run `npm run build && npm test` to verify full regression.
  5. Report: total tests, pass count, fail count.
  ```

---

## Phase 7A: Style Binding

### TASK-019: Write tests for style binding schema additions (TEST-P7A-001 through TEST-P7A-004)
- **Status:** DONE
- **Dependencies:** TASK-018 (Phase 6 complete)
- **Type:** Test
- **Est. iterations:** 2-3
- **Files affected:** `packages/mcp-server/src/__tests__/schemas.test.ts` (update)
- **Verification:** `npm test` passes (new tests should FAIL until TASK-020 adds the schema fields)
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read TESTS.md for TEST-P7A-001 through TEST-P7A-004.
  Read packages/mcp-server/src/__tests__/schemas.test.ts for the existing schema test pattern.
  Read packages/mcp-server/src/schemas.ts for SceneNodeSchema and ModifyPropertiesSchema.

  Task: Add tests for fillStyleId, textStyleId, and effectStyleId in both SceneNodeSchema and ModifyPropertiesSchema.

  Add these as SKIPPED tests (describe.skip or it.skip) since the schema fields don't exist yet.
  They will be enabled after TASK-020 adds the fields.

  Test that:
  - SceneNodeSchema accepts { type: "RECTANGLE", fillStyleId: "S:abc,1:1" }
  - SceneNodeSchema accepts { type: "TEXT", characters: "x", textStyleId: "S:abc,1:1" }
  - SceneNodeSchema accepts { type: "FRAME", effectStyleId: "S:abc,1:1" }
  - ModifyPropertiesSchema accepts all three style ID fields

  Run `npm test` until existing tests still pass.
  ```

### TASK-020: Add style binding fields to schemas and types
- **Status:** DONE
- **Dependencies:** TASK-019
- **Type:** Implementation
- **Est. iterations:** 2-3
- **Files affected:** `packages/shared/src/scene-spec.ts`, `packages/mcp-server/src/schemas.ts`
- **Verification:** `npm run build` succeeds
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read packages/shared/src/scene-spec.ts for the SceneNode interface.
  Read packages/mcp-server/src/schemas.ts for SceneNodeSchema and ModifyPropertiesSchema.

  Task:
  1. In packages/shared/src/scene-spec.ts, add to the SceneNode interface:
     - fillStyleId?: string;
     - textStyleId?: string;
     - effectStyleId?: string;
     (Add them after the effects/fills section, with JSDoc comments explaining they're Figma style IDs from get_styles)

  2. In packages/mcp-server/src/schemas.ts, add to SceneNodeSchema:
     - fillStyleId: z.string().optional().describe('Figma paint style ID to bind (from get_styles). Overrides fills array if set.')
     - textStyleId: z.string().optional().describe('Figma text style ID to bind (from get_styles). Sets font, size, etc.')
     - effectStyleId: z.string().optional().describe('Figma effect style ID to bind (from get_styles). Overrides effects array if set.')

  3. In ModifyPropertiesSchema, add the same 3 fields with identical descriptions.

  Run `npm run build` to verify compilation.
  ```

### TASK-021: Implement style binding in plugin build-node.ts and handlers.ts
- **Status:** DONE
- **Dependencies:** TASK-020
- **Type:** Implementation
- **Est. iterations:** 3-5
- **Files affected:** `packages/figma-plugin/src/scene-builder/build-node.ts`, `packages/figma-plugin/src/handlers.ts`
- **Verification:** `npm run build` succeeds
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read packages/figma-plugin/src/scene-builder/build-node.ts, specifically the buildNode function steps 4 (VISUAL PROPERTIES) and 7 (TEXT).
  Read packages/figma-plugin/src/handlers.ts, specifically handleModifyNode.

  Task: Add style binding support.

  In build-node.ts buildNode():
  After step 4 (VISUAL PROPERTIES), add step 4b (STYLE BINDING):

  // 4b. STYLE BINDING — apply style IDs (overrides individual properties)
  if (spec.fillStyleId && 'fillStyleId' in node) {
    try {
      (node as any).fillStyleId = spec.fillStyleId;
    } catch (err) {
      errors.push(`fillStyleId: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (spec.effectStyleId && 'effectStyleId' in node) {
    try {
      (node as any).effectStyleId = spec.effectStyleId;
    } catch (err) {
      errors.push(`effectStyleId: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (spec.textStyleId && node.type === 'TEXT') {
    try {
      (node as TextNode).textStyleId = spec.textStyleId;
    } catch (err) {
      errors.push(`textStyleId: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  In handlers.ts handleModifyNode():
  After the auto-layout section and before text properties, add style binding:

  // Style binding
  if (properties.fillStyleId && 'fillStyleId' in sceneNode) {
    try {
      (sceneNode as any).fillStyleId = properties.fillStyleId;
    } catch (err) {
      errors.push(`fillStyleId: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (properties.effectStyleId && 'effectStyleId' in sceneNode) {
    try {
      (sceneNode as any).effectStyleId = properties.effectStyleId;
    } catch (err) {
      errors.push(`effectStyleId: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (properties.textStyleId && node.type === 'TEXT') {
    try {
      (node as TextNode).textStyleId = properties.textStyleId;
    } catch (err) {
      errors.push(`textStyleId: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  Run `npm run build` until all packages compile clean.
  ```

### TASK-022: Update build_scene tool description with style binding examples
- **Status:** DONE
- **Dependencies:** TASK-021
- **Type:** DX
- **Est. iterations:** 1-2
- **Files affected:** `packages/mcp-server/src/tools/build-scene.ts`
- **Verification:** `npm run build` succeeds
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read packages/mcp-server/src/tools/build-scene.ts for the TOOL_DESCRIPTION string.

  Task: Add a style binding section to the TOOL_DESCRIPTION, after the COMPONENTS section:

  STYLE BINDING: Use get_styles first to discover style IDs, then bind them to nodes. Style IDs override individual fill/effect properties.

  Example 5 - Rectangle with bound paint style:
  {
    "scene": {
      "type": "RECTANGLE", "name": "Styled Box", "width": 200, "height": 100,
      "fillStyleId": "S:abc123,1:1",
      "effectStyleId": "S:def456,2:2",
      "cornerRadius": 8
    }
  }

  Run `npm run build` to verify.
  ```

### TASK-023: Enable style binding tests and validate
- **Status:** DONE
- **Dependencies:** TASK-019, TASK-020, TASK-021
- **Type:** Validation
- **Est. iterations:** 2-3
- **Files affected:** `packages/mcp-server/src/__tests__/schemas.test.ts`
- **Verification:** `npm run build && npm test` passes ALL tests
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast

  Task:
  1. Unskip the style binding schema tests from TASK-019 in packages/mcp-server/src/__tests__/schemas.test.ts.
  2. Run `npm test` -- all tests must pass.
  3. Run `npm run build && npm test` for full regression.
  4. Report: total tests, pass count, fail count.
  ```

---

## Phase 7B: Style Creation

### TASK-024: Write tests for style creation tool registration (TEST-P7B-001, TEST-P7B-003, TEST-P7B-005, TEST-P7B-007)
- **Status:** DONE
- **Dependencies:** TASK-023 (Phase 7A complete)
- **Type:** Test
- **Est. iterations:** 2-3
- **Files affected:** `packages/mcp-server/src/__tests__/server.test.ts` (update)
- **Verification:** `npm test` passes (new tests skipped until implementation)
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read TESTS.md for TEST-P7B-001, TEST-P7B-003, TEST-P7B-005, TEST-P7B-007.
  Read packages/mcp-server/src/__tests__/server.test.ts.

  Task: Add SKIPPED tests asserting:
  - "create_paint_style" tool exists with { name: string, fills: array }
  - "create_text_style" tool exists with { name, fontFamily?, fontSize?, ... }
  - "create_effect_style" tool exists with { name: string, effects: array }
  - Total tool count is 22 (19 after P6 + 3 style creation tools)

  Run `npm test` to verify existing tests still pass.
  ```

### TASK-025: Add style creation message types
- **Status:** DONE
- **Dependencies:** TASK-023
- **Type:** Implementation
- **Est. iterations:** 1-2
- **Files affected:** `packages/shared/src/messages.ts`
- **Verification:** `npm run build` succeeds
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read packages/shared/src/messages.ts.
  Read packages/shared/src/scene-spec.ts for Fill and Effect types.

  Task: Add 3 new message types to ServerToPluginMessage:
  1. { type: 'create_paint_style'; id: string; name: string; fills: Fill[] }
  2. { type: 'create_text_style'; id: string; name: string; fontFamily?: string; fontSize?: number; fontWeight?: number | string; lineHeight?: number | LineHeight; letterSpacing?: number; textDecoration?: TextDecoration; textCase?: TextCase }
  3. { type: 'create_effect_style'; id: string; name: string; effects: Effect[] }

  Import Fill, Effect, LineHeight, TextDecoration, TextCase from './scene-spec.js'.
  Run `npm run build`.
  ```

### TASK-026: Implement style creation plugin handlers
- **Status:** DONE
- **Dependencies:** TASK-025
- **Type:** Implementation
- **Est. iterations:** 4-6
- **Files affected:** `packages/figma-plugin/src/handlers.ts`, `packages/figma-plugin/src/main.ts`
- **Verification:** `npm run build` succeeds
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read packages/figma-plugin/src/handlers.ts for existing handler patterns.
  Read packages/figma-plugin/src/scene-builder/build-node.ts for the applyFills and applyEffects functions (to understand how fills/effects are converted from spec to Figma format).
  Read packages/shared/src/colors.ts for hexToRgba.

  Task: Implement 3 new handlers in handlers.ts:

  1. handleCreatePaintStyle(name: string, fills: Fill[]): Promise<unknown>
     - Call const style = figma.createPaintStyle()
     - style.name = name
     - Convert fills from spec format to Figma Paint[] format (same logic as applyFills but building the array instead of assigning)
     - style.paints = figmaPaints
     - Return { id: style.id, name: style.name, key: style.key }

  2. handleCreateTextStyle(name: string, props: { fontFamily?, fontSize?, fontWeight?, lineHeight?, letterSpacing?, textDecoration?, textCase? }): Promise<unknown>
     - Call const style = figma.createTextStyle()
     - style.name = name
     - Load the font: await figma.loadFontAsync({ family: fontFamily || 'Inter', style: getFontStyleFromWeight(fontWeight || 400) })
     - Set style.fontName, style.fontSize, style.lineHeight, style.letterSpacing, style.textDecoration, style.textCase as provided
     - Return { id: style.id, name: style.name, key: style.key }

  3. handleCreateEffectStyle(name: string, effects: Effect[]): Promise<unknown>
     - Call const style = figma.createEffectStyle()
     - style.name = name
     - Convert effects from spec format to Figma Effect[] format (same logic as applyEffects)
     - style.effects = figmaEffects
     - Return { id: style.id, name: style.name, key: style.key }

  Import hexToRgba from '@figma-fast/shared'. Use the existing getFontStyleFromWeight helper already in handlers.ts.

  Add the 3 new message type cases to main.ts switch statement.

  Run `npm run build` until clean.
  ```

### TASK-027: Implement style creation MCP tools
- **Status:** DONE
- **Dependencies:** TASK-025
- **Type:** Implementation
- **Est. iterations:** 3-5
- **Files affected:** `packages/mcp-server/src/tools/style-tools.ts` (new), `packages/mcp-server/src/index.ts`
- **Verification:** `npm run build` succeeds
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read packages/mcp-server/src/tools/edit-tools.ts for the MCP tool pattern.
  Read packages/mcp-server/src/schemas.ts for FillSchema and EffectSchema.

  Task: Create packages/mcp-server/src/tools/style-tools.ts with 3 MCP tools:

  1. create_paint_style
     - Description: "Create a local paint style (color/gradient) in the Figma file. Returns the style ID which can be used with fillStyleId on any node. Use get_styles to see existing styles."
     - Parameters: { name: z.string(), fills: z.array(FillSchema).min(1) }
     - Sends: { type: 'create_paint_style', name, fills }
     - Returns: "Created paint style <name> (id: <id>, key: <key>)"

  2. create_text_style
     - Description: "Create a local text style in the Figma file. Returns the style ID for use with textStyleId."
     - Parameters: { name: z.string(), fontFamily: z.string().optional(), fontSize: z.number().optional(), fontWeight: z.union([z.number(), z.string()]).optional(), lineHeight: z.union([z.number(), LineHeightSchema]).optional(), letterSpacing: z.number().optional(), textDecoration: z.enum([...]).optional(), textCase: z.enum([...]).optional() }
     - Sends: { type: 'create_text_style', name, ...props }

  3. create_effect_style
     - Description: "Create a local effect style in the Figma file. Returns the style ID for use with effectStyleId."
     - Parameters: { name: z.string(), effects: z.array(EffectSchema).min(1) }
     - Sends: { type: 'create_effect_style', name, effects }

  Import FillSchema, EffectSchema, LineHeightSchema from '../schemas.js'.
  Export registerStyleTools(server: McpServer).
  Update packages/mcp-server/src/index.ts to import and call registerStyleTools.

  Run `npm run build` until clean.
  ```

### TASK-028: Enable style creation tests and validate
- **Status:** DONE
- **Dependencies:** TASK-024, TASK-026, TASK-027
- **Type:** Validation
- **Est. iterations:** 2-3
- **Files affected:** `packages/mcp-server/src/__tests__/server.test.ts`
- **Verification:** `npm run build && npm test` passes ALL tests
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast

  Task:
  1. Unskip style creation tool tests from TASK-024.
  2. Update the tool count assertion to 22 (or whatever the current total is).
  3. Run `npm test` -- all must pass.
  4. Run `npm run build && npm test` for full regression.
  ```

---

## Phase 8: Image Fills

### TASK-029: Write tests for image fill schema and tool registration (TEST-P8-001, TEST-P8-003, TEST-P8-008, TEST-P8-009)
- **Status:** DONE
- **Dependencies:** TASK-028 (Phase 7B complete)
- **Type:** Test
- **Est. iterations:** 2-3
- **Files affected:** `packages/mcp-server/src/__tests__/schemas.test.ts` (update), `packages/mcp-server/src/__tests__/server.test.ts` (update)
- **Verification:** `npm test` passes (new tests skipped)
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read TESTS.md for TEST-P8-001, TEST-P8-003, TEST-P8-008, TEST-P8-009.

  Task: Add SKIPPED tests:
  - FillSchema accepts { type: "IMAGE", imageUrl: "https://example.com/photo.png", scaleMode: "FILL" }
  - "set_image_fill" tool exists in server tool list
  - Invalid URL validation (when imageUrl is "not-a-url")
  - Total tool count is 23

  Run `npm test` to verify existing tests pass.
  ```

### TASK-030: Add imageUrl to FillSchema and shared types
- **Status:** DONE
- **Dependencies:** TASK-029
- **Type:** Implementation
- **Est. iterations:** 1-2
- **Files affected:** `packages/shared/src/scene-spec.ts`, `packages/mcp-server/src/schemas.ts`
- **Verification:** `npm run build` succeeds
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read packages/shared/src/scene-spec.ts for the Fill interface.
  Read packages/mcp-server/src/schemas.ts for FillSchema.

  Task:
  1. In scene-spec.ts Fill interface, add:
     imageUrl?: string; // URL for IMAGE fill type -- server downloads the image

  2. In schemas.ts FillSchema, add:
     imageUrl: z.string().url().optional().describe('URL of image for IMAGE fill type. Server downloads and uploads to Figma.')

  Run `npm run build`.
  ```

### TASK-031: Add image fill WS message type
- **Status:** DONE
- **Dependencies:** TASK-030
- **Type:** Implementation
- **Est. iterations:** 1-2
- **Files affected:** `packages/shared/src/messages.ts`
- **Verification:** `npm run build` succeeds
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read packages/shared/src/messages.ts.

  Task: Add new message type to ServerToPluginMessage:
  { type: 'set_image_fill'; id: string; nodeId: string; imageData: string; scaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE' }

  Note: imageData is base64-encoded image bytes.
  Also add to build_scene message: an optional imagePayloads field:
  Scratch that -- for build_scene, the image data will be embedded differently.
  Actually, add a separate message type for image pre-upload:
  { type: 'upload_image'; id: string; imageData: string }
  This returns { imageHash: string } which can then be referenced in build_scene.

  Actually, simplest approach: modify the build_scene flow so the MCP server pre-downloads
  all IMAGE fills, converts them to base64, and includes imageData on the fill objects sent to the plugin.
  The plugin then calls figma.createImage(bytes) for each.

  Let's keep it simple. Just add:
  { type: 'set_image_fill'; id: string; nodeId: string; imageData: string; scaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE' }

  For build_scene, we'll handle image downloads in a separate task.

  Run `npm run build`.
  ```

### TASK-032: Implement set_image_fill MCP tool (server-side download)
- **Status:** DONE
- **Dependencies:** TASK-031
- **Type:** Implementation
- **Est. iterations:** 4-6
- **Files affected:** `packages/mcp-server/src/tools/image-tools.ts` (new), `packages/mcp-server/src/index.ts`
- **Verification:** `npm run build` succeeds
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read packages/mcp-server/src/tools/edit-tools.ts for the MCP tool pattern.
  Read packages/mcp-server/src/ws/server.ts for sendToPlugin.

  Task: Create packages/mcp-server/src/tools/image-tools.ts:

  1. set_image_fill MCP tool
     - Description: "Set a node's fill to an image from a URL. The image is downloaded by the server and uploaded to Figma. Supports PNG, JPG, GIF, SVG, and WebP."
     - Parameters: { nodeId: z.string(), imageUrl: z.string().url(), scaleMode: z.enum(['FILL', 'FIT', 'CROP', 'TILE']).optional().default('FILL') }
     - Handler logic:
       a. Validate URL (the Zod .url() does this)
       b. Fetch the image using Node.js fetch() with a 30s timeout via AbortController
       c. Get the response as ArrayBuffer, convert to Buffer, then to base64
       d. Send to plugin: { type: 'set_image_fill', nodeId, imageData: base64, scaleMode }
       e. Return the result

  Export registerImageTools(server: McpServer).
  Update packages/mcp-server/src/index.ts.

  Run `npm run build`.
  ```

### TASK-033: Implement set_image_fill plugin handler
- **Status:** DONE
- **Dependencies:** TASK-031
- **Type:** Implementation
- **Est. iterations:** 3-5
- **Files affected:** `packages/figma-plugin/src/handlers.ts`, `packages/figma-plugin/src/main.ts`
- **Verification:** `npm run build` succeeds
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read packages/figma-plugin/src/handlers.ts for handler patterns.
  Read packages/figma-plugin/src/handlers.ts lines 21-33 for the base64Encode function (we need base64DECODE here).

  Task: Add handleSetImageFill handler:

  handleSetImageFill(nodeId: string, imageData: string, scaleMode?: string): Promise<unknown>
  1. Decode base64 to Uint8Array:
     const binaryString = imageData; // base64 string
     // Need a base64 DECODER for the Figma sandbox (no atob available)
     // Implement base64Decode similar to the existing base64Encode
     const bytes = base64Decode(imageData);
  2. Create image: const image = figma.createImage(bytes);
  3. Get node: const node = await figma.getNodeByIdAsync(nodeId);
  4. Apply fill: node.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: (scaleMode || 'FILL') as ImagePaint['scaleMode'] }]
  5. Return { nodeId: node.id, name: node.name, imageHash: image.hash }

  IMPORTANT: Implement base64Decode in the same file (Figma sandbox has no atob).
  Use the reverse of the existing base64Encode lookup.

  Add 'set_image_fill' case to main.ts switch.

  Run `npm run build`.
  ```

### TASK-034: Add IMAGE fill support in build_scene (server-side pre-download)
- **Status:** DONE
- **Dependencies:** TASK-032, TASK-033
- **Type:** Implementation
- **Est. iterations:** 5-7
- **Files affected:** `packages/mcp-server/src/tools/build-scene.ts`, `packages/figma-plugin/src/scene-builder/build-node.ts`, `packages/shared/src/messages.ts`
- **Verification:** `npm run build` succeeds
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read packages/mcp-server/src/tools/build-scene.ts for the build_scene tool handler.
  Read packages/figma-plugin/src/scene-builder/build-node.ts for the applyFills function (lines 71-117).

  Task: Make IMAGE fills work in build_scene.

  Strategy: The MCP server pre-downloads all images from URLs in the scene spec before sending to the plugin. The downloaded image bytes (base64) are attached to the message payload so the plugin can create them.

  MCP Server changes (build-scene.ts):
  1. Before calling sendToPlugin, walk the scene spec tree and find all fills with type: "IMAGE" and imageUrl.
  2. For each, fetch the image (with 30s timeout), convert to base64.
  3. Store as a map: { [imageUrl]: base64Data }
  4. Add imagePayloads: Record<string, string> to the build_scene message.

  Shared types changes (messages.ts):
  Update the build_scene message type to include:
  imagePayloads?: Record<string, string>; // Map of imageUrl -> base64 data

  Plugin changes (build-node.ts applyFills):
  When processing a fill with type 'IMAGE':
  - If fill.imageUrl and imagePayloads[fill.imageUrl] exists:
    const bytes = base64Decode(imagePayloads[fill.imageUrl]);
    const image = figma.createImage(bytes);
    Return { type: 'IMAGE', imageHash: image.hash, scaleMode: fill.scaleMode || 'FILL' } as ImagePaint
  - If no imageUrl or no payload: fall back to gray placeholder (existing behavior)

  The buildNode function needs to receive imagePayloads as a parameter.
  Update the function signature and all call sites (buildScene orchestrator, buildComponentSet, recursive calls).

  Run `npm run build` until clean.
  ```

### TASK-035: Enable image fill tests and validate
- **Status:** DONE
- **Dependencies:** TASK-029, TASK-032, TASK-033, TASK-034
- **Type:** Validation
- **Est. iterations:** 2-3
- **Files affected:** `packages/mcp-server/src/__tests__/schemas.test.ts`, `packages/mcp-server/src/__tests__/server.test.ts`
- **Verification:** `npm run build && npm test` passes ALL tests
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast

  Task:
  1. Unskip image fill tests from TASK-029.
  2. Update tool count assertion.
  3. Run `npm test` and `npm run build && npm test`.
  4. Report: total tests, pass, fail.
  ```

---

## Phase 9: Boolean Operations

### TASK-036: Write tests for boolean_operation tool (TEST-P9-001 through TEST-P9-003, TEST-P9-010)
- **Status:** DONE
- **Dependencies:** TASK-035 (Phase 8 complete)
- **Type:** Test
- **Est. iterations:** 2-3
- **Files affected:** `packages/mcp-server/src/__tests__/server.test.ts` (update)
- **Verification:** `npm test` passes (new tests skipped)
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read TESTS.md for TEST-P9-001 through TEST-P9-003, TEST-P9-010.

  Task: Add SKIPPED tests:
  - "boolean_operation" tool exists with { operation: enum, nodeIds: string[] }
  - Zod validation rejects invalid operation type
  - Zod validation requires at least 2 nodeIds
  - Total tool count is 24

  Run `npm test`.
  ```

### TASK-037: Add boolean operation message type
- **Status:** DONE
- **Dependencies:** TASK-035
- **Type:** Implementation
- **Est. iterations:** 1-2
- **Files affected:** `packages/shared/src/messages.ts`
- **Verification:** `npm run build` succeeds
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read packages/shared/src/messages.ts.

  Task: Add to ServerToPluginMessage:
  { type: 'boolean_operation'; id: string; operation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE'; nodeIds: string[] }

  Run `npm run build`.
  ```

### TASK-038: Implement boolean_operation plugin handler
- **Status:** DONE
- **Dependencies:** TASK-037
- **Type:** Implementation
- **Est. iterations:** 3-5
- **Files affected:** `packages/figma-plugin/src/handlers.ts`, `packages/figma-plugin/src/main.ts`
- **Verification:** `npm run build` succeeds
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read packages/figma-plugin/src/handlers.ts.

  Task: Add handleBooleanOperation handler:

  handleBooleanOperation(operation: string, nodeIds: string[]): Promise<unknown>
  1. Resolve all nodes: const nodes = [] for each id, getNodeByIdAsync, throw if not found
  2. All nodes must have the same parent. Verify this.
  3. Cast nodes to SceneNode[] (they must support boolean ops)
  4. const parent = nodes[0].parent as BaseNode & ChildrenMixin
  5. Switch on operation:
     - 'UNION': result = figma.union(nodes, parent)
     - 'SUBTRACT': result = figma.subtract(nodes, parent)
     - 'INTERSECT': result = figma.intersect(nodes, parent)
     - 'EXCLUDE': result = figma.exclude(nodes, parent)
     - default: throw new Error(`Unknown operation: ${operation}`)
  6. Return { resultNodeId: result.id, name: result.name, type: result.type, operation, inputCount: nodeIds.length }

  Add 'boolean_operation' case to main.ts switch.

  Run `npm run build`.
  ```

### TASK-039: Implement boolean_operation MCP tool
- **Status:** DONE
- **Dependencies:** TASK-037
- **Type:** Implementation
- **Est. iterations:** 2-3
- **Files affected:** `packages/mcp-server/src/tools/boolean-tools.ts` (new), `packages/mcp-server/src/index.ts`
- **Verification:** `npm run build` succeeds
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read packages/mcp-server/src/tools/edit-tools.ts for MCP tool pattern.

  Task: Create packages/mcp-server/src/tools/boolean-tools.ts:

  boolean_operation tool:
  - Description: "Combine two or more shapes using a boolean operation. All nodes must share the same parent. The original nodes are consumed and replaced by the result.

  Operations:
  - UNION: Combines all shapes into one (add)
  - SUBTRACT: Removes subsequent shapes from the first (cut)
  - INTERSECT: Keeps only the overlapping area
  - EXCLUDE: Keeps everything except the overlapping area (XOR)

  Example — subtract a circle from a rectangle:
  { \"operation\": \"SUBTRACT\", \"nodeIds\": [\"rectangle-id\", \"circle-id\"] }"

  - Parameters: {
      operation: z.enum(['UNION', 'SUBTRACT', 'INTERSECT', 'EXCLUDE']),
      nodeIds: z.array(z.string()).min(2).describe('Node IDs to combine. Order matters for SUBTRACT.')
    }
  - Sends: { type: 'boolean_operation', operation, nodeIds }
  - Returns: "Boolean <operation>: created <type> <name> (id: <resultId>) from <count> nodes"

  Export registerBooleanTools(server: McpServer).
  Update index.ts.

  Run `npm run build`.
  ```

### TASK-040: Enable boolean operation tests and validate
- **Status:** DONE
- **Dependencies:** TASK-036, TASK-038, TASK-039
- **Type:** Validation
- **Est. iterations:** 2-3
- **Files affected:** `packages/mcp-server/src/__tests__/server.test.ts`
- **Verification:** `npm run build && npm test` passes ALL tests
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast

  Task:
  1. Unskip boolean operation tests from TASK-036.
  2. Update tool count assertion to 24.
  3. Run `npm test` and `npm run build && npm test`.
  4. Report: total tests, pass, fail.
  ```

---

## Full Regression Check

### TASK-041: Full build + test regression after all phases
- **Status:** DONE
- **Dependencies:** TASK-040
- **Type:** Validation
- **Est. iterations:** 1-2
- **Files affected:** None (read-only)
- **Verification:** `npm run build && npm test && npm run lint && npm run format:check` all exit 0
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast

  Task: Run full validation:
  1. npm run build -- all 3 packages compile clean
  2. npm test -- ALL tests pass
  3. npm run lint -- clean
  4. npm run format:check -- clean
  5. Report: total test files, total tests, pass, fail, build time.
  If ANY step fails, fix it.
  ```

---

## Task Dependency Graph

```
Phase 6: Page Management
  TASK-014 (page tests)     ─┐
  TASK-015 (message types)  ─┤─── TASK-016 (plugin handlers) ─┐
                             └─── TASK-017 (MCP tools) ───────┤
                                                               └── TASK-018 (validate)

Phase 7A: Style Binding
  TASK-019 (binding tests)  ─── TASK-020 (schema fields) ─── TASK-021 (plugin impl) ─── TASK-022 (tool desc) ─── TASK-023 (validate)

Phase 7B: Style Creation
  TASK-024 (creation tests) ─┐
  TASK-025 (message types)  ─┤─── TASK-026 (plugin handlers) ─┐
                             └─── TASK-027 (MCP tools) ───────┤
                                                               └── TASK-028 (validate)

Phase 8: Image Fills
  TASK-029 (image tests)    ─┐
  TASK-030 (schema update)  ─┤─── TASK-031 (WS message) ──┬── TASK-032 (MCP tool) ─┐
                             │                             └── TASK-033 (plugin)    ├── TASK-034 (build_scene) ── TASK-035 (validate)
                             └──────────────────────────────────────────────────────┘

Phase 9: Boolean Operations
  TASK-036 (bool tests)     ─┐
  TASK-037 (message type)   ─┤─── TASK-038 (plugin handler) ─┐
                             └─── TASK-039 (MCP tool) ───────┤
                                                              └── TASK-040 (validate)

Full Regression
  TASK-040 ─── TASK-041 (final regression)
```

---

## Summary

| Phase | Tasks | New Tools | New Tests (spec) | Est. Total Iterations |
|-------|-------|-----------|-----------------|----------------------|
| Phase 6: Page Management | TASK-014 to TASK-018 (5) | 3 | 10 | 12-18 |
| Phase 7A: Style Binding | TASK-019 to TASK-023 (5) | 0 (schema extension) | 10 | 12-18 |
| Phase 7B: Style Creation | TASK-024 to TASK-028 (5) | 3 | 7 | 13-20 |
| Phase 8: Image Fills | TASK-029 to TASK-035 (7) | 1 | 9 | 18-28 |
| Phase 9: Boolean Operations | TASK-036 to TASK-040 (5) | 1 | 10 | 10-16 |
| Regression | TASK-041 (1) | 0 | 0 | 1-2 |
| **TOTAL** | **28 tasks** | **8 new tools** | **46 new tests** | **66-102 iterations** |
