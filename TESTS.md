# FigmaFast -- Test Specifications

> **Version:** 6.0.0
> **Last updated:** 2026-03-06
> **Framework:** vitest ^4.0.18
> **All tests use Given/When/Then format**
> **Status legend:** SPECIFIED | IMPLEMENTED | PASSING | FAILING | EXISTING

---

## Existing Tests (Baseline -- All Passing)

### `packages/mcp-server/src/__tests__/server.test.ts`
- **Status**: EXISTING (PASSING)
- **Type**: integration
- **Framework**: vitest
- **Count**: 16 tests
- **Notes**: Tool count assertions were fixed in Sprint 3. Will need updating again after adding jam_* tools.

### `packages/mcp-server/src/__tests__/ws-server.test.ts`
- **Status**: EXISTING (FAILING -- 5 tests, IPv6 localhost issue)
- **Type**: unit/integration
- **Count**: 9 tests
- **Notes**: All `ws://localhost:${port}` must become `ws://127.0.0.1:${port}`. Node.js v24+ resolves localhost to ::1 but server binds 127.0.0.1 only.

### `packages/mcp-server/src/__tests__/relay.test.ts`
- **Status**: EXISTING (PASSING)
- **Type**: unit/integration
- **Count**: 22 tests

### `packages/mcp-server/src/__tests__/relay-detached.test.ts`
- **Status**: EXISTING (PASSING)
- **Type**: integration
- **Count**: 7 tests

### `packages/mcp-server/src/__tests__/schemas.test.ts`
- **Status**: EXISTING (PASSING)
- **Type**: unit
- **Count**: 30 tests

### `packages/shared/src/__tests__/colors.test.ts`
- **Status**: EXISTING (PASSING)
- **Type**: unit
- **Count**: 11 tests

### `packages/shared/src/__tests__/fonts.test.ts`
- **Status**: EXISTING (PASSING)
- **Type**: unit
- **Count**: 8 tests

### `packages/shared/src/__tests__/warnings.test.ts`
- **Status**: EXISTING (PASSING)
- **Type**: unit
- **Count**: 7 tests

### `packages/figma-plugin/src/scene-builder/build-node.test.ts`
- **Status**: EXISTING (PASSING)
- **Type**: unit
- **Framework**: vitest
- **Count**: 20 tests (approx)
- **Notes**: Uses Figma global mock pattern. Tests build-node property application.

**Total existing: 130 tests across 9 files (125 passing, 5 failing in ws-server.test.ts).**

---

## Phase 1: FigJam Foundation

### FigJam Tool Registration Tests

File: `packages/mcp-server/src/__tests__/server.test.ts` (update existing assertions)

#### TEST-FJ-001: MCP server registers all jam_* tools
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: critical
- **File**: `packages/mcp-server/src/__tests__/server.test.ts`

GIVEN the MCP server is created with all tool registrations including `registerFigjamTools`
WHEN the server's tool list is inspected
THEN it includes `jam_create_sticky`, `jam_create_connector`, `jam_create_shape`, `jam_create_code_block`, `jam_create_table`, `jam_get_timer`
AND the total tool count is previous count + 6

### FigJam Message Type Tests

File: `packages/mcp-server/src/__tests__/schemas.test.ts` (extend)

#### TEST-FJ-002: FigJam Zod schemas validate correct input
- **Status**: SPECIFIED
- **Type**: unit
- **Priority**: critical
- **File**: `packages/mcp-server/src/__tests__/schemas.test.ts`

GIVEN the FigJam tool Zod schemas (JamStickySchema, JamConnectorSchema, JamShapeSchema, JamCodeBlockSchema, JamTableSchema)
WHEN valid parameters are parsed:
  - JamStickySchema: `{ text: "Hello", color: "YELLOW" }`
  - JamConnectorSchema: `{ startNodeId: "1:2", endNodeId: "3:4" }`
  - JamShapeSchema: `{ shapeType: "DIAMOND", text: "Decision" }`
  - JamCodeBlockSchema: `{ code: "const x = 1;", language: "JAVASCRIPT" }`
  - JamTableSchema: `{ numRows: 3, numCols: 4 }`
THEN all parse successfully without errors

#### TEST-FJ-003: FigJam Zod schemas reject invalid input
- **Status**: SPECIFIED
- **Type**: unit
- **Priority**: high
- **File**: `packages/mcp-server/src/__tests__/schemas.test.ts`

GIVEN the FigJam tool Zod schemas
WHEN invalid parameters are parsed:
  - JamStickySchema with missing `text`: `{ color: "YELLOW" }`
  - JamConnectorSchema with no endpoints: `{}`
  - JamShapeSchema with invalid shapeType: `{ shapeType: "INVALID" }`
  - JamTableSchema with zero rows: `{ numRows: 0, numCols: 3 }`
THEN all throw ZodError with descriptive messages

### FigJam Guard Tests

These tests verify that Figma-only tools return clear errors in FigJam context.
Since plugin handlers run in the Figma sandbox (not testable with vitest), we test
the MCP tool layer behavior by verifying that error messages from the plugin are
properly surfaced. The guard logic itself is tested via manual acceptance.

#### TEST-FJ-010: Guarded tools are documented
- **Status**: SPECIFIED
- **Type**: documentation
- **Priority**: high

GIVEN the following tools are Figma-only and do not work in FigJam:
  1. `create_page` (figma.createPage not available)
  2. `convert_to_component` (figma.createComponent not available)
  3. `combine_as_variants` (figma.combineAsVariants not available)
  4. `manage_component_properties` (requires COMPONENT/COMPONENT_SET)
  5. `create_paint_style` (figma.createPaintStyle not available)
  6. `create_text_style` (figma.createTextStyle not available)
  7. `create_effect_style` (figma.createEffectStyle not available)
  8. `boolean_operation` (figma.union/subtract/intersect/exclude not available)
  9. `get_local_components` (no components in FigJam)
THEN each handler checks `figma.editorType === 'figjam'` and throws:
  `"Not supported in FigJam: <tool_name> is only available in Figma design files."`

### FigJam Serialization Tests

These verify that the serializer extracts FigJam-specific properties. Since
serialize-node.ts runs in the Figma sandbox, we cannot unit test it with vitest.
These are behavioral specs for manual acceptance testing.

#### TEST-FJ-020: Serialize StickyNode
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: critical

GIVEN a StickyNode exists in the FigJam file with text "Hello World" and authorVisible=true
WHEN `serializeNode(stickyNode, 0)` is called
THEN the result includes:
  - `type: "STICKY"`
  - `text: "Hello World"`
  - `authorVisible: true`
  - Standard properties: id, name, x, y, width, height, fills

#### TEST-FJ-021: Serialize ConnectorNode
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: critical

GIVEN a ConnectorNode exists connecting node A (id "1:2") to node B (id "3:4")
WHEN `serializeNode(connectorNode, 0)` is called
THEN the result includes:
  - `type: "CONNECTOR"`
  - `connectorStart: { endpointNodeId: "1:2", ... }`
  - `connectorEnd: { endpointNodeId: "3:4", ... }`
  - `connectorStartStrokeCap: string`
  - `connectorEndStrokeCap: string`

#### TEST-FJ-022: Serialize ShapeWithTextNode
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: high

GIVEN a ShapeWithTextNode with shapeType "DIAMOND" and text "Decision"
WHEN `serializeNode(shapeWithTextNode, 0)` is called
THEN the result includes:
  - `type: "SHAPE_WITH_TEXT"`
  - `shapeType: "DIAMOND"`
  - `text: "Decision"`

#### TEST-FJ-023: Serialize CodeBlockNode
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: high

GIVEN a CodeBlockNode with code "const x = 1;" and language "JAVASCRIPT"
WHEN `serializeNode(codeBlockNode, 0)` is called
THEN the result includes:
  - `type: "CODE_BLOCK"`
  - `code: "const x = 1;"`
  - `codeLanguage: "JAVASCRIPT"`

#### TEST-FJ-024: Serialize TableNode
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: high

GIVEN a TableNode with 3 rows and 4 columns
WHEN `serializeNode(tableNode, 0)` is called
THEN the result includes:
  - `type: "TABLE"`
  - `numRows: 3`
  - `numColumns: 4`
  - `children` contains cell summaries

#### TEST-FJ-025: get_document_info includes editorType
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: critical

GIVEN the plugin is running in a FigJam file
WHEN `get_document_info` is called
THEN the response includes `editorType: "figjam"`
AND when running in a Figma design file, the response includes `editorType: "figma"`

### Build Scene Pre-Flight Tests

#### TEST-FJ-030: build_scene rejects COMPONENT in FigJam
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: critical

GIVEN the plugin is running in a FigJam file
WHEN `build_scene` is called with a spec containing `{ type: "COMPONENT", name: "Button", children: [...] }`
THEN the build fails immediately with error:
  `"FigJam does not support the following node types: COMPONENT. Use Figma design files for components."`
AND no partial nodes are created

#### TEST-FJ-031: build_scene allows FRAME/TEXT/RECTANGLE in FigJam
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: high

GIVEN the plugin is running in a FigJam file
WHEN `build_scene` is called with a spec containing only FRAME, TEXT, and RECTANGLE nodes
THEN the build succeeds normally
AND all nodes are created on the FigJam canvas

#### TEST-FJ-032: build_scene rejects nested unsupported types in FigJam
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: high

GIVEN the plugin is running in a FigJam file
WHEN `build_scene` is called with a FRAME containing a nested COMPONENT_INSTANCE child
THEN the build fails with error listing "COMPONENT_INSTANCE" as unsupported
AND no nodes are created

---

## Phase 2: FigJam Tools

### jam_create_sticky Tests

#### TEST-JAM-001: Create sticky with text and default color
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: critical

GIVEN the plugin is running in a FigJam file
WHEN `jam_create_sticky` is called with `{ text: "TODO: Review PR" }`
THEN a StickyNode is created on the current page
AND the sticky text is "TODO: Review PR"
AND the sticky has default yellow color
AND the response includes `{ nodeId, name, type: "STICKY" }`

#### TEST-JAM-002: Create sticky with specified color
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: high

GIVEN the plugin is running in a FigJam file
WHEN `jam_create_sticky` is called with `{ text: "Done", color: "GREEN" }`
THEN a StickyNode is created with green background color
AND the text is "Done"

#### TEST-JAM-003: Create sticky with position
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: medium

GIVEN the plugin is running in a FigJam file
WHEN `jam_create_sticky` is called with `{ text: "Note", x: 100, y: 200 }`
THEN the sticky is positioned at (100, 200)

#### TEST-JAM-004: Create sticky fails gracefully in Figma (not FigJam)
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: high

GIVEN the plugin is running in a Figma design file (not FigJam)
WHEN `jam_create_sticky` is called
THEN it returns an error: "jam_create_sticky is only available in FigJam files."

### jam_create_connector Tests

#### TEST-JAM-010: Create connector between two nodes
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: critical

GIVEN the plugin is running in a FigJam file with two stickies (nodeA, nodeB)
WHEN `jam_create_connector` is called with `{ startNodeId: nodeA.id, endNodeId: nodeB.id }`
THEN a ConnectorNode is created connecting the two stickies
AND `connectorStart.endpointNodeId` equals nodeA.id
AND `connectorEnd.endpointNodeId` equals nodeB.id
AND the response includes `{ nodeId, type: "CONNECTOR" }`

#### TEST-JAM-011: Create connector with stroke caps
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: medium

GIVEN the plugin is running in a FigJam file with two nodes
WHEN `jam_create_connector` is called with `{ startNodeId: "...", endNodeId: "...", endStrokeCap: "ARROW_LINES" }`
THEN the connector end has an arrow cap

#### TEST-JAM-012: Create connector with invalid node IDs returns error
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: high

GIVEN the plugin is running in a FigJam file
WHEN `jam_create_connector` is called with `{ startNodeId: "999:999", endNodeId: "888:888" }`
THEN it returns an error about nodes not found

### jam_create_shape Tests

#### TEST-JAM-020: Create shape with text
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: critical

GIVEN the plugin is running in a FigJam file
WHEN `jam_create_shape` is called with `{ shapeType: "DIAMOND", text: "Decision Point" }`
THEN a ShapeWithTextNode is created with diamond shape
AND the shape text is "Decision Point"
AND the response includes `{ nodeId, type: "SHAPE_WITH_TEXT", shapeType: "DIAMOND" }`

#### TEST-JAM-021: Create shape with valid shape types
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: high

GIVEN the plugin is running in a FigJam file
WHEN `jam_create_shape` is called with each valid shapeType:
  SQUARE, ELLIPSE, DIAMOND, TRIANGLE_UP, TRIANGLE_DOWN, PARALLELOGRAM_RIGHT, PARALLELOGRAM_LEFT, ENG_DATABASE, ENG_QUEUE, ENG_FILE, ENG_FOLDER
THEN each creates a valid ShapeWithTextNode with the correct shapeType

### jam_create_code_block Tests

#### TEST-JAM-030: Create code block with code and language
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: critical

GIVEN the plugin is running in a FigJam file
WHEN `jam_create_code_block` is called with `{ code: "function hello() { return 'world'; }", language: "JAVASCRIPT" }`
THEN a CodeBlockNode is created
AND `codeBlockNode.code` equals the provided code string
AND `codeBlockNode.codeLanguage` equals "JAVASCRIPT"
AND the response includes `{ nodeId, type: "CODE_BLOCK" }`

#### TEST-JAM-031: Create code block with default language
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: medium

GIVEN the plugin is running in a FigJam file
WHEN `jam_create_code_block` is called with `{ code: "print('hello')" }` (no language specified)
THEN a CodeBlockNode is created with `codeLanguage` set to "PLAIN" (or the API default)

### jam_create_table Tests

#### TEST-JAM-040: Create empty table
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: critical

GIVEN the plugin is running in a FigJam file
WHEN `jam_create_table` is called with `{ numRows: 3, numCols: 4 }`
THEN a TableNode is created with 3 rows and 4 columns
AND the response includes `{ nodeId, type: "TABLE", numRows: 3, numColumns: 4 }`

#### TEST-JAM-041: Create table with cell data
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: high

GIVEN the plugin is running in a FigJam file
WHEN `jam_create_table` is called with:
  `{ numRows: 2, numCols: 2, cellData: [["Name", "Age"], ["Alice", "30"]] }`
THEN a TableNode is created
AND cell (0,0) contains "Name", cell (0,1) contains "Age"
AND cell (1,0) contains "Alice", cell (1,1) contains "30"

#### TEST-JAM-042: Create table with partial cell data
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: medium

GIVEN the plugin is running in a FigJam file
WHEN `jam_create_table` is called with:
  `{ numRows: 3, numCols: 3, cellData: [["Header"]] }`
THEN a TableNode is created with 3x3 dimensions
AND cell (0,0) contains "Header"
AND remaining cells are empty (no error thrown)

### jam_get_timer Tests

#### TEST-JAM-050: Get timer state when no timer is running
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: high

GIVEN the plugin is running in a FigJam file
AND no timer has been started
WHEN `jam_get_timer` is called
THEN the response includes timer state information (null/stopped state)

#### TEST-JAM-051: Get timer state when timer is running
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: medium

GIVEN the plugin is running in a FigJam file
AND a timer has been started manually by the user
WHEN `jam_get_timer` is called
THEN the response includes `{ remaining, totalDuration, isRunning: true }`

#### TEST-JAM-052: jam_get_timer fails gracefully in Figma
- **Status**: SPECIFIED
- **Type**: e2e (manual)
- **Priority**: high

GIVEN the plugin is running in a Figma design file (not FigJam)
WHEN `jam_get_timer` is called
THEN it returns an error: "jam_get_timer is only available in FigJam files."

---

---

## Phase 4: Testing Infrastructure

### 4A: Fix Failing Tests + Infrastructure

#### TEST-TI-001: ws-server tests pass after IPv4 fix
- **Status**: SPECIFIED
- **Type**: unit/integration (fix)
- **Priority**: critical
- **File**: `packages/mcp-server/src/__tests__/ws-server.test.ts`

GIVEN all 8 occurrences of `ws://localhost:${port}` in ws-server.test.ts are replaced with `ws://127.0.0.1:${port}`
WHEN the test suite is run with `npx vitest run packages/mcp-server/src/__tests__/ws-server.test.ts`
THEN all 9 tests in ws-server.test.ts pass
AND no other test files are affected

#### TEST-TI-002: Coverage reporting works
- **Status**: SPECIFIED
- **Type**: infrastructure
- **Priority**: high
- **File**: `vitest.config.ts`, `package.json`

GIVEN vitest.config.ts has `coverage: { provider: 'v8', reporter: ['text', 'lcov'], exclude: ['**/node_modules/**', '**/*.test.ts'] }`
AND package.json has script `"test:coverage": "vitest run --coverage"`
AND `@vitest/coverage-v8` is installed as a devDependency
WHEN `npm run test:coverage` is executed
THEN a text coverage summary is printed to stdout
AND an `lcov.info` file is generated in `coverage/` directory
AND test files (*.test.ts) are excluded from coverage metrics

#### TEST-TI-003: GitHub Actions CI workflow runs
- **Status**: SPECIFIED
- **Type**: infrastructure
- **Priority**: high
- **File**: `.github/workflows/ci.yml`

GIVEN `.github/workflows/ci.yml` exists
AND it triggers on push to main and pull_request to main
WHEN a push or PR is created
THEN the workflow installs dependencies with `npm ci`
AND builds all packages with `npm run build`
AND runs the test suite with `npm test`
AND runs the linter with `npm run lint`
AND uses Node.js 24.x

### 4B: Contract + Logic Tests

#### TEST-TI-010: Protocol contract -- all message types have handlers
- **Status**: SPECIFIED
- **Type**: unit (static analysis)
- **Priority**: high
- **File**: `packages/shared/src/__tests__/protocol-contract.test.ts` (NEW)

GIVEN the `ServerToPluginMessage` union type in `packages/shared/src/messages.ts`
AND the switch statement in `packages/figma-plugin/src/main.ts`
WHEN both files are read and the message type strings are extracted
THEN every `type:` literal in the `ServerToPluginMessage` union has a matching `case` in the switch
AND every `case` in the switch (except `default`) corresponds to a type in the union
AND the test lists any mismatches clearly in the failure message

#### TEST-TI-011: Protocol contract -- detects missing handler (negative)
- **Status**: SPECIFIED
- **Type**: unit (static analysis)
- **Priority**: medium
- **File**: `packages/shared/src/__tests__/protocol-contract.test.ts`

GIVEN a synthetic test scenario where the extracted types and cases are compared
WHEN one type is present in messages.ts but absent from main.ts cases
THEN the contract test fails with a message identifying the missing case

#### TEST-TI-020: Pure handler validation -- modify_node property validation
- **Status**: SPECIFIED
- **Type**: unit
- **Priority**: high
- **File**: `packages/figma-plugin/src/__tests__/handler-utils.test.ts` (NEW)

GIVEN pure validation functions are extracted from handlers.ts
WHEN `validateModifyNodeProperties({fills: [{type: 'SOLID', color: '#FF0000'}]})` is called
THEN it returns the validated/transformed properties without error
AND when invalid properties `{fills: 'not-an-array'}` are passed
THEN it throws a descriptive validation error

#### TEST-TI-021: Pure handler logic -- base64 encode/decode roundtrip
- **Status**: SPECIFIED
- **Type**: unit
- **Priority**: medium
- **File**: `packages/figma-plugin/src/__tests__/handler-utils.test.ts`

GIVEN the base64Encode and base64Decode functions are extracted from handlers.ts
WHEN a Uint8Array is encoded then decoded
THEN the result matches the original byte array
AND when an empty array is encoded
THEN the result is an empty string
AND when a string with padding is decoded
THEN the padding is handled correctly

#### TEST-TI-022: Pure handler logic -- color conversion integration
- **Status**: SPECIFIED
- **Type**: unit
- **Priority**: medium
- **File**: `packages/figma-plugin/src/__tests__/handler-utils.test.ts`

GIVEN the property transformation logic extracted from handleModifyNode
WHEN color properties like `{ fills: [{ type: 'SOLID', color: '#FF0000' }] }` are processed
THEN the hex color is converted to RGBA format `{ r: 1, g: 0, b: 0, a: 1 }`

### 4C: Integration + Orchestrator Tests

#### TEST-TI-030: Tool execution -- get_node_info happy path
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: critical
- **File**: `packages/mcp-server/src/__tests__/server.test.ts` (extend)

GIVEN the MCP server is running with all tools registered
AND `sendToPlugin` is mocked to return `{ type: 'result', id: '<id>', success: true, data: { id: '1:2', name: 'Frame', type: 'FRAME' } }`
WHEN the `get_node_info` tool is called via MCP client with `{ nodeId: '1:2' }`
THEN the tool returns content containing the node info JSON
AND `sendToPlugin` was called with `{ type: 'get_node_info', id: expect.any(String), nodeId: '1:2' }`

#### TEST-TI-031: Tool execution -- get_node_info error path
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: high
- **File**: `packages/mcp-server/src/__tests__/server.test.ts`

GIVEN the MCP server is running
AND `sendToPlugin` is mocked to return `{ type: 'result', id: '<id>', success: false, error: 'Node not found: 999:999' }`
WHEN the `get_node_info` tool is called with `{ nodeId: '999:999' }`
THEN the tool returns content with isError: true containing the error message

#### TEST-TI-032: Tool execution -- modify_node happy path
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: critical
- **File**: `packages/mcp-server/src/__tests__/server.test.ts`

GIVEN the MCP server is running
AND `sendToPlugin` is mocked to return a success result
WHEN `modify_node` is called with `{ nodeId: '1:2', properties: { name: 'Updated' } }`
THEN the tool returns success content
AND `sendToPlugin` was called with the correct message structure

#### TEST-TI-033: Tool execution -- build_scene happy path
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: critical
- **File**: `packages/mcp-server/src/__tests__/server.test.ts`

GIVEN the MCP server is running
AND `sendToPlugin` is mocked to return a success result with `{ rootNodeId: '1:5', nodeCount: 3 }`
WHEN `build_scene` is called with a simple spec `{ type: 'FRAME', name: 'Container', children: [] }`
THEN the tool returns content containing the root node ID and node count

#### TEST-TI-034: Tool execution -- jam_create_sticky happy path
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: high
- **File**: `packages/mcp-server/src/__tests__/server.test.ts`

GIVEN the MCP server is running
AND `sendToPlugin` is mocked to return `{ type: 'result', success: true, data: { nodeId: '5:1', type: 'STICKY' } }`
WHEN `jam_create_sticky` is called with `{ text: 'Hello' }`
THEN the tool returns content containing the sticky node info

#### TEST-TI-035: Tool execution -- plugin not connected
- **Status**: SPECIFIED
- **Type**: integration
- **Priority**: high
- **File**: `packages/mcp-server/src/__tests__/server.test.ts`

GIVEN the MCP server is running
AND `isPluginConnected()` returns false
WHEN any tool (e.g., `get_node_info`) is called
THEN the tool returns content with the NOT_CONNECTED error message
AND `sendToPlugin` is NOT called

#### TEST-TI-040: Scene builder orchestrator -- simple FRAME build
- **Status**: SPECIFIED
- **Type**: unit (with Figma mock)
- **Priority**: critical
- **File**: `packages/figma-plugin/src/scene-builder/__tests__/scene-builder.test.ts` (NEW)

GIVEN the Figma global mock is installed (following build-node.test.ts pattern)
AND `figma.currentPage` has an empty children array
WHEN `buildScene({ type: 'FRAME', name: 'Test', width: 200, height: 100, children: [] })` is called
THEN the result has `success: true`
AND `rootNodeId` is a non-empty string
AND `nodeCount` is 1
AND `errors` is an empty array

#### TEST-TI-041: Scene builder orchestrator -- nested nodes
- **Status**: SPECIFIED
- **Type**: unit (with Figma mock)
- **Priority**: high
- **File**: `packages/figma-plugin/src/scene-builder/__tests__/scene-builder.test.ts`

GIVEN the Figma global mock is installed
WHEN `buildScene` is called with a FRAME containing a TEXT child and a RECTANGLE child
THEN the result has `success: true`
AND `nodeCount` is 3
AND the nodeIdMap contains entries for all three nodes

#### TEST-TI-042: Scene builder orchestrator -- FigJam rejects COMPONENT
- **Status**: SPECIFIED
- **Type**: unit (with Figma mock)
- **Priority**: high
- **File**: `packages/figma-plugin/src/scene-builder/__tests__/scene-builder.test.ts`

GIVEN the Figma global mock has `editorType: 'figjam'`
WHEN `buildScene({ type: 'COMPONENT', name: 'Button', children: [] })` is called
THEN the result has `success: false`
AND `errors` contains a message about FigJam not supporting COMPONENT type
AND `nodeCount` is 0

#### TEST-TI-043: Scene builder orchestrator -- parentId targeting
- **Status**: SPECIFIED
- **Type**: unit (with Figma mock)
- **Priority**: medium
- **File**: `packages/figma-plugin/src/scene-builder/__tests__/scene-builder.test.ts`

GIVEN the Figma global mock is installed
AND a parent node with id 'parent-1' exists (returned by `figma.getNodeByIdAsync`)
WHEN `buildScene({ type: 'FRAME', name: 'Child', children: [] }, 'parent-1')` is called
THEN the result has `success: true`
AND the built node is appended to the parent node's children

#### TEST-TI-044: Scene builder orchestrator -- font preloading
- **Status**: SPECIFIED
- **Type**: unit (with Figma mock)
- **Priority**: medium
- **File**: `packages/figma-plugin/src/scene-builder/__tests__/scene-builder.test.ts`

GIVEN the Figma global mock is installed with `loadFontAsync` as a spy
WHEN `buildScene` is called with a spec containing a TEXT node with fontFamily 'Roboto'
THEN `figma.loadFontAsync` is called with `{ family: 'Roboto', style: 'Regular' }` (or equivalent)
AND the TEXT node's characters are set correctly

---

## Regression Scope

After each phase, the full test suite must pass:

1. All existing tests in `packages/shared/src/__tests__/` (colors, fonts, warnings) -- 26 tests
2. All existing tests in `packages/mcp-server/src/__tests__/schemas.test.ts` -- 40 tests
3. All existing tests in `packages/mcp-server/src/__tests__/server.test.ts` -- 17 tests
4. All existing tests in `packages/mcp-server/src/__tests__/ws-server.test.ts` -- 9 tests
5. All existing tests in `packages/mcp-server/src/__tests__/relay.test.ts` -- 22 tests
6. All existing tests in `packages/mcp-server/src/__tests__/relay-detached.test.ts` -- 7 tests
7. All existing tests in `packages/figma-plugin/src/scene-builder/build-node.test.ts` -- 9 tests
8. All new Phase 4 tests (protocol-contract, handler-utils, tool-execution, scene-builder orchestrator)
9. `npm run build` succeeds (TypeScript compilation)
10. `npm run lint` passes
