# Task Registry -- FigJam Support + Testing Infrastructure
# Plan: v6.0.0 -- 2026-03-06
# Status: PENDING | IN_PROGRESS | DONE | BLOCKED | FAILED
# Mandatory sequence: Tests -> Implementation -> Validation -> Regression -> Fix

---

## Phase 1: FigJam Foundation

### TASK-501: Add FigJam message types to shared package
- **Status**: DONE
- **Depends on**: none
- **Type**: IMPLEMENTATION
- **Ralph prompt**: |
    Read `packages/shared/src/messages.ts`. Add new message types for all FigJam commands to the
    `ServerToPluginMessage` union type. Add these variants:

    ```
    | { type: 'jam_create_sticky'; id: string; text: string; color?: string; x?: number; y?: number; parentId?: string }
    | { type: 'jam_create_connector'; id: string; startNodeId?: string; endNodeId?: string; startPosition?: { x: number; y: number }; endPosition?: { x: number; y: number }; startStrokeCap?: string; endStrokeCap?: string }
    | { type: 'jam_create_shape'; id: string; shapeType: string; text?: string; x?: number; y?: number; parentId?: string }
    | { type: 'jam_create_code_block'; id: string; code: string; language?: string; x?: number; y?: number; parentId?: string }
    | { type: 'jam_create_table'; id: string; numRows: number; numCols: number; cellData?: string[][]; x?: number; y?: number; parentId?: string }
    | { type: 'jam_get_timer'; id: string }
    ```

    Run `cd packages/shared && npx tsc --noEmit` to verify types compile.
- **Max iterations**: 5
- **Files affected**: `packages/shared/src/messages.ts`
- **Verification**: `cd /Users/jarod/Projects/jarod/figma-fast/packages/shared && npx tsc --noEmit`

### TASK-502: Add FigJam Zod schemas to schemas.ts
- **Status**: DONE
- **Depends on**: TASK-501
- **Type**: IMPLEMENTATION
- **Ralph prompt**: |
    Read `packages/mcp-server/src/schemas.ts`. Add Zod schemas for FigJam tool parameters.

    Add these exported schemas:

    ```typescript
    export const JamStickyColorSchema = z.enum([
      'GRAY', 'YELLOW', 'ORANGE', 'GREEN', 'BLUE', 'VIOLET', 'PINK', 'RED',
      'LIGHT_GRAY', 'TEAL', 'LIGHT_GREEN'
    ]).optional().describe('Sticky note background color (default: YELLOW)');

    export const JamShapeTypeSchema = z.enum([
      'SQUARE', 'ELLIPSE', 'DIAMOND', 'TRIANGLE_UP', 'TRIANGLE_DOWN',
      'PARALLELOGRAM_RIGHT', 'PARALLELOGRAM_LEFT',
      'ENG_DATABASE', 'ENG_QUEUE', 'ENG_FILE', 'ENG_FOLDER',
    ]).describe('FigJam shape type');

    export const JamConnectorStrokeCapSchema = z.enum([
      'NONE', 'ARROW_LINES', 'ARROW_EQUILATERAL', 'TRIANGLE_FILLED',
      'DIAMOND_FILLED', 'CIRCLE_FILLED',
    ]).optional().describe('Connector endpoint stroke cap style');

    export const JamCodeLanguageSchema = z.enum([
      'PLAIN', 'BASH', 'CPP', 'CSS', 'GO', 'GRAPHQL', 'HTML', 'JAVA',
      'JAVASCRIPT', 'JSON', 'KOTLIN', 'PYTHON', 'RUBY', 'RUST', 'SQL',
      'SWIFT', 'TYPESCRIPT', 'XML', 'YAML',
    ]).optional().describe('Code block language (default: PLAIN)');
    ```

    Run `cd packages/mcp-server && npx tsc --noEmit` to verify.
- **Max iterations**: 5
- **Files affected**: `packages/mcp-server/src/schemas.ts`
- **Verification**: `cd /Users/jarod/Projects/jarod/figma-fast/packages/mcp-server && npx tsc --noEmit`

### TASK-503: Write FigJam schema validation tests
- **Status**: DONE
- **Depends on**: TASK-502
- **Type**: TEST_CREATION
- **Ralph prompt**: |
    Read `packages/mcp-server/src/__tests__/schemas.test.ts` and `packages/mcp-server/src/schemas.ts`.

    Add a new `describe('FigJam schemas')` block to schemas.test.ts with tests for:

    1. JamStickyColorSchema: valid "YELLOW" passes, invalid "PURPLE" fails
    2. JamShapeTypeSchema: valid "DIAMOND" passes, invalid "HEXAGON" fails, missing value fails
    3. JamConnectorStrokeCapSchema: valid "ARROW_LINES" passes, undefined passes (optional)
    4. JamCodeLanguageSchema: valid "JAVASCRIPT" passes, "INVALID" fails, undefined passes (optional)

    These correspond to TEST-FJ-002 and TEST-FJ-003 from TESTS.md.

    Run `cd packages/mcp-server && npx vitest run __tests__/schemas.test.ts` until all tests pass.
- **Max iterations**: 8
- **Files affected**: `packages/mcp-server/src/__tests__/schemas.test.ts`
- **Verification**: `cd /Users/jarod/Projects/jarod/figma-fast && npm test -- --run packages/mcp-server/src/__tests__/schemas.test.ts`

### TASK-504: Update manifest.json to include figjam editor type
- **Status**: DONE
- **Depends on**: none
- **Type**: IMPLEMENTATION
- **Ralph prompt**: |
    Read `packages/figma-plugin/manifest.json`.
    Change `"editorType": ["figma"]` to `"editorType": ["figma", "figjam"]`.
    This is a one-line change. Verify the JSON is still valid.
- **Max iterations**: 2
- **Files affected**: `packages/figma-plugin/manifest.json`
- **Verification**: `node -e "JSON.parse(require('fs').readFileSync('/Users/jarod/Projects/jarod/figma-fast/packages/figma-plugin/manifest.json', 'utf8')); console.log('Valid JSON')"`

### TASK-505: Add editorType to get_document_info response
- **Status**: DONE
- **Depends on**: none
- **Type**: IMPLEMENTATION
- **Ralph prompt**: |
    Read `packages/figma-plugin/src/handlers.ts`. Find the `handleGetDocumentInfo` function.

    Add `editorType: (figma as any).editorType` to the returned object. The return should become:

    ```typescript
    return {
      name: figma.root.name,
      editorType: (figma as any).editorType,
      currentPageId: currentPage.id,
      currentPageName: currentPage.name,
      pages,
      topLevelFrames,
    };
    ```

    Use `(figma as any).editorType` because the Figma plugin typings bundled in the project
    may not include this property. It returns `"figma"`, `"figjam"`, or `"dev"` at runtime.

    Run `cd packages/figma-plugin && npm run build` to verify.
- **Max iterations**: 3
- **Files affected**: `packages/figma-plugin/src/handlers.ts`
- **Verification**: `cd /Users/jarod/Projects/jarod/figma-fast && npm run build`

### TASK-506: Add FigJam guards to Figma-only handlers
- **Status**: DONE
- **Depends on**: TASK-505
- **Type**: IMPLEMENTATION
- **Ralph prompt**: |
    Read `packages/figma-plugin/src/handlers.ts`.

    Add a helper function at the top of the file (after imports, before the base64 section):

    ```typescript
    /** Throws if called in FigJam context. Used to guard Figma-only operations. */
    function requireFigmaDesign(toolName: string): void {
      if ((figma as any).editorType === 'figjam') {
        throw new Error(`Not supported in FigJam: ${toolName} is only available in Figma design files.`);
      }
    }
    ```

    Then add `requireFigmaDesign('tool_name');` as the FIRST line in each of these handlers:
    1. `handleCreatePage` -- add `requireFigmaDesign('create_page');`
    2. `handleConvertToComponent` -- add `requireFigmaDesign('convert_to_component');`
    3. `handleCombineAsVariants` -- add `requireFigmaDesign('combine_as_variants');`
    4. `handleManageComponentProperties` -- add `requireFigmaDesign('manage_component_properties');`
    5. `handleCreatePaintStyle` -- add `requireFigmaDesign('create_paint_style');`
    6. `handleCreateTextStyle` -- add `requireFigmaDesign('create_text_style');`
    7. `handleCreateEffectStyle` -- add `requireFigmaDesign('create_effect_style');`
    8. `handleBooleanOperation` -- add `requireFigmaDesign('boolean_operation');`
    9. `handleGetLocalComponents` -- add `requireFigmaDesign('get_local_components');`

    Run `npm run build` to verify compilation.
- **Max iterations**: 8
- **Files affected**: `packages/figma-plugin/src/handlers.ts`
- **Verification**: `cd /Users/jarod/Projects/jarod/figma-fast && npm run build`

### TASK-507: Add FigJam node serialization
- **Status**: DONE
- **Depends on**: none
- **Type**: IMPLEMENTATION
- **Ralph prompt**: |
    Read `packages/figma-plugin/src/serialize-node.ts`.

    Extend the `SerializedNode` interface with FigJam-specific optional properties:

    ```typescript
    // FigJam: Sticky
    text?: string;
    authorVisible?: boolean;
    // FigJam: ShapeWithText
    shapeType?: string;
    // FigJam: Connector
    connectorStart?: unknown;
    connectorEnd?: unknown;
    connectorStartStrokeCap?: string;
    connectorEndStrokeCap?: string;
    // FigJam: CodeBlock
    code?: string;
    codeLanguage?: string;
    // FigJam: Table
    numRows?: number;
    numColumns?: number;
    ```

    Then in the `serializeNode` function, add FigJam-specific extraction AFTER the existing
    component properties section (after the INSTANCE block) and BEFORE the children section.
    Add this block:

    ```typescript
    // FigJam node types
    if (node.type === 'STICKY') {
      const sticky = node as any;
      if (sticky.text) result.text = sticky.text.characters;
      result.authorVisible = sticky.authorVisible;
    }
    if (node.type === 'SHAPE_WITH_TEXT') {
      const shape = node as any;
      result.shapeType = shape.shapeType;
      if (shape.text) result.text = shape.text.characters;
    }
    if (node.type === 'CONNECTOR') {
      const conn = node as any;
      result.connectorStart = conn.connectorStart;
      result.connectorEnd = conn.connectorEnd;
      result.connectorStartStrokeCap = conn.connectorStartStrokeCap;
      result.connectorEndStrokeCap = conn.connectorEndStrokeCap;
    }
    if (node.type === 'CODE_BLOCK') {
      const cb = node as any;
      result.code = cb.code;
      result.codeLanguage = cb.codeLanguage;
    }
    if (node.type === 'TABLE') {
      const table = node as any;
      result.numRows = table.numRows;
      result.numColumns = table.numColumns;
    }
    ```

    Use `as any` casts because the Figma typings may not include FigJam-specific types.

    Run `npm run build` to verify compilation.
- **Max iterations**: 8
- **Files affected**: `packages/figma-plugin/src/serialize-node.ts`
- **Verification**: `cd /Users/jarod/Projects/jarod/figma-fast && npm run build`

### TASK-508: Add build_scene pre-flight FigJam check
- **Status**: DONE
- **Depends on**: none
- **Type**: IMPLEMENTATION
- **Ralph prompt**: |
    Read `packages/figma-plugin/src/scene-builder/index.ts`.

    Add a pre-flight check in the `buildScene` function, AFTER step 1 (DETERMINE PARENT,
    around line 57) and BEFORE step 2 (COLLECT FONTS, line 62). Insert this:

    ```typescript
    // 1.5. FIGJAM CHECK -- reject unsupported node types
    if ((figma as any).editorType === 'figjam') {
      const FIGJAM_UNSUPPORTED = new Set(['COMPONENT', 'COMPONENT_SET', 'COMPONENT_INSTANCE']);
      const unsupported = new Set<string>();
      function scanUnsupported(s: SceneSpec) {
        if (FIGJAM_UNSUPPORTED.has(s.type)) unsupported.add(s.type);
        if (s.children) s.children.forEach(scanUnsupported);
      }
      scanUnsupported(spec);
      if (unsupported.size > 0) {
        const types = Array.from(unsupported).join(', ');
        return {
          success: false,
          rootNodeId: '',
          nodeIdMap: {},
          nodeCount: 0,
          errors: [`FigJam does not support the following node types: ${types}. Use Figma design files for components.`],
          fontSubstitutions: [],
          durationMs: Date.now() - startTime,
        };
      }
    }
    ```

    Run `npm run build` to verify compilation.
- **Max iterations**: 5
- **Files affected**: `packages/figma-plugin/src/scene-builder/index.ts`
- **Verification**: `cd /Users/jarod/Projects/jarod/figma-fast && npm run build`

### TASK-509: Phase 1 build and lint check
- **Status**: DONE
- **Depends on**: TASK-501, TASK-502, TASK-503, TASK-504, TASK-505, TASK-506, TASK-507, TASK-508
- **Type**: REGRESSION
- **Ralph prompt**: |
    Run the full build and test suite to verify Phase 1 work:
    ```
    cd /Users/jarod/Projects/jarod/figma-fast
    npm run build
    npm test -- --run
    npm run lint
    ```
    All 110+ existing tests must pass. New schema tests must pass.
    If any test fails, read the failing test and the code it tests, then fix.
- **Max iterations**: 10
- **Files affected**: none (verification only)
- **Verification**: `cd /Users/jarod/Projects/jarod/figma-fast && npm run build && npm test -- --run && npm run lint`

---

## Phase 2: FigJam Tools

### TASK-510: Implement figjam-handlers.ts
- **Status**: DONE
- **Depends on**: TASK-509
- **Type**: IMPLEMENTATION
- **Ralph prompt**: |
    Create new file `packages/figma-plugin/src/figjam-handlers.ts`.

    Read `packages/figma-plugin/src/handlers.ts` for the pattern (how handlers work, how
    they return data, how they use commitUndo).

    Implement these handlers:

    ```typescript
    /**
     * FigJam-specific plugin handlers.
     * These only work when figma.editorType === 'figjam'.
     */

    /** Throws if not in FigJam context */
    function requireFigjam(toolName: string): void {
      if ((figma as any).editorType !== 'figjam') {
        throw new Error(`${toolName} is only available in FigJam files.`);
      }
    }

    export async function handleJamCreateSticky(
      text: string,
      color?: string,
      x?: number,
      y?: number,
      parentId?: string,
    ): Promise<unknown> {
      requireFigjam('jam_create_sticky');
      const sticky = (figma as any).createSticky() as any;
      // Load font for sticky text -- FigJam stickies use Inter Medium by default
      await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
      sticky.text.characters = text;
      if (x !== undefined) sticky.x = x;
      if (y !== undefined) sticky.y = y;
      if (parentId) {
        const parent = await figma.getNodeByIdAsync(parentId);
        if (parent && 'children' in parent) {
          (parent as any).appendChild(sticky);
        }
      }
      try { figma.commitUndo?.(); } catch { /* may not be available */ }
      return { nodeId: sticky.id, name: sticky.name, type: sticky.type };
    }

    export async function handleJamCreateConnector(
      startNodeId?: string,
      endNodeId?: string,
      startPosition?: { x: number; y: number },
      endPosition?: { x: number; y: number },
      startStrokeCap?: string,
      endStrokeCap?: string,
    ): Promise<unknown> {
      requireFigjam('jam_create_connector');
      const connector = (figma as any).createConnector() as any;

      if (startNodeId) {
        const startNode = await figma.getNodeByIdAsync(startNodeId);
        if (!startNode) throw new Error(`Start node not found: ${startNodeId}`);
        connector.connectorStart = { endpointNodeId: startNodeId, magnet: 'AUTO' };
      } else if (startPosition) {
        connector.connectorStart = { position: startPosition };
      }

      if (endNodeId) {
        const endNode = await figma.getNodeByIdAsync(endNodeId);
        if (!endNode) throw new Error(`End node not found: ${endNodeId}`);
        connector.connectorEnd = { endpointNodeId: endNodeId, magnet: 'AUTO' };
      } else if (endPosition) {
        connector.connectorEnd = { position: endPosition };
      }

      if (startStrokeCap) connector.connectorStartStrokeCap = startStrokeCap;
      if (endStrokeCap) connector.connectorEndStrokeCap = endStrokeCap;

      try { figma.commitUndo?.(); } catch { /* may not be available */ }
      return { nodeId: connector.id, name: connector.name, type: connector.type };
    }

    export async function handleJamCreateShape(
      shapeType: string,
      text?: string,
      x?: number,
      y?: number,
      parentId?: string,
    ): Promise<unknown> {
      requireFigjam('jam_create_shape');
      const shape = (figma as any).createShapeWithText() as any;
      shape.shapeType = shapeType;
      if (text) {
        await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
        shape.text.characters = text;
      }
      if (x !== undefined) shape.x = x;
      if (y !== undefined) shape.y = y;
      if (parentId) {
        const parent = await figma.getNodeByIdAsync(parentId);
        if (parent && 'children' in parent) (parent as any).appendChild(shape);
      }
      try { figma.commitUndo?.(); } catch { /* may not be available */ }
      return { nodeId: shape.id, name: shape.name, type: shape.type, shapeType: shape.shapeType };
    }

    export async function handleJamCreateCodeBlock(
      code: string,
      language?: string,
      x?: number,
      y?: number,
      parentId?: string,
    ): Promise<unknown> {
      requireFigjam('jam_create_code_block');
      const codeBlock = (figma as any).createCodeBlock() as any;
      codeBlock.code = code;
      if (language) codeBlock.codeLanguage = language;
      if (x !== undefined) codeBlock.x = x;
      if (y !== undefined) codeBlock.y = y;
      if (parentId) {
        const parent = await figma.getNodeByIdAsync(parentId);
        if (parent && 'children' in parent) (parent as any).appendChild(codeBlock);
      }
      try { figma.commitUndo?.(); } catch { /* may not be available */ }
      return { nodeId: codeBlock.id, name: codeBlock.name, type: codeBlock.type };
    }

    export async function handleJamCreateTable(
      numRows: number,
      numCols: number,
      cellData?: string[][],
      x?: number,
      y?: number,
      parentId?: string,
    ): Promise<unknown> {
      requireFigjam('jam_create_table');
      const table = (figma as any).createTable(numRows, numCols) as any;
      if (x !== undefined) table.x = x;
      if (y !== undefined) table.y = y;
      if (parentId) {
        const parent = await figma.getNodeByIdAsync(parentId);
        if (parent && 'children' in parent) (parent as any).appendChild(table);
      }
      if (cellData) {
        await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
        for (let r = 0; r < cellData.length && r < numRows; r++) {
          const row = cellData[r];
          if (!row) continue;
          for (let c = 0; c < row.length && c < numCols; c++) {
            try {
              const cell = table.cellAt(r, c);
              if (cell && cell.text) {
                cell.text.characters = row[c];
              }
            } catch {
              // Skip cells that fail -- partial population is acceptable
            }
          }
        }
      }
      try { figma.commitUndo?.(); } catch { /* may not be available */ }
      return { nodeId: table.id, name: table.name, type: table.type, numRows, numColumns: numCols };
    }

    export async function handleJamGetTimer(): Promise<unknown> {
      requireFigjam('jam_get_timer');
      const timer = (figma as any).timer;
      if (!timer) return { status: 'unavailable' };
      return {
        remaining: timer.remaining,
        totalDuration: timer.totalDuration,
        isRunning: timer.isRunning,
        isPaused: timer.isPaused,
      };
    }
    ```

    Run `npm run build` to verify.
- **Max iterations**: 15
- **Files affected**: `packages/figma-plugin/src/figjam-handlers.ts` (NEW)
- **Verification**: `cd /Users/jarod/Projects/jarod/figma-fast && npm run build`

### TASK-511: Wire FigJam handlers into main.ts message router
- **Status**: DONE
- **Depends on**: TASK-510
- **Type**: IMPLEMENTATION
- **Ralph prompt**: |
    Read `packages/figma-plugin/src/main.ts`.

    Add imports from the new figjam-handlers.ts at the top (after existing imports):

    ```typescript
    import {
      handleJamCreateSticky,
      handleJamCreateConnector,
      handleJamCreateShape,
      handleJamCreateCodeBlock,
      handleJamCreateTable,
      handleJamGetTimer,
    } from './figjam-handlers.js';
    ```

    Add new cases in the switch statement BEFORE the `default` case.
    Add them in a new section comment block:

    ```typescript
    // --- FigJam Tools -------------------------------------------

    case 'jam_create_sticky':
      handleJamCreateSticky(
        msg.text as string,
        msg.color as string | undefined,
        msg.x as number | undefined,
        msg.y as number | undefined,
        msg.parentId as string | undefined,
      )
        .then((data) => sendResult(msg.id, data))
        .catch((err) => sendError(msg.id, err));
      break;

    case 'jam_create_connector':
      handleJamCreateConnector(
        msg.startNodeId as string | undefined,
        msg.endNodeId as string | undefined,
        msg.startPosition as { x: number; y: number } | undefined,
        msg.endPosition as { x: number; y: number } | undefined,
        msg.startStrokeCap as string | undefined,
        msg.endStrokeCap as string | undefined,
      )
        .then((data) => sendResult(msg.id, data))
        .catch((err) => sendError(msg.id, err));
      break;

    case 'jam_create_shape':
      handleJamCreateShape(
        msg.shapeType as string,
        msg.text as string | undefined,
        msg.x as number | undefined,
        msg.y as number | undefined,
        msg.parentId as string | undefined,
      )
        .then((data) => sendResult(msg.id, data))
        .catch((err) => sendError(msg.id, err));
      break;

    case 'jam_create_code_block':
      handleJamCreateCodeBlock(
        msg.code as string,
        msg.language as string | undefined,
        msg.x as number | undefined,
        msg.y as number | undefined,
        msg.parentId as string | undefined,
      )
        .then((data) => sendResult(msg.id, data))
        .catch((err) => sendError(msg.id, err));
      break;

    case 'jam_create_table':
      handleJamCreateTable(
        msg.numRows as number,
        msg.numCols as number,
        msg.cellData as string[][] | undefined,
        msg.x as number | undefined,
        msg.y as number | undefined,
        msg.parentId as string | undefined,
      )
        .then((data) => sendResult(msg.id, data))
        .catch((err) => sendError(msg.id, err));
      break;

    case 'jam_get_timer':
      handleJamGetTimer()
        .then((data) => sendResult(msg.id, data))
        .catch((err) => sendError(msg.id, err));
      break;
    ```

    Run `npm run build` to verify.
- **Max iterations**: 5
- **Files affected**: `packages/figma-plugin/src/main.ts`
- **Verification**: `cd /Users/jarod/Projects/jarod/figma-fast && npm run build`

### TASK-512: Implement figjam-tools.ts (MCP tool registration)
- **Status**: DONE
- **Depends on**: TASK-502, TASK-501
- **Type**: IMPLEMENTATION
- **Ralph prompt**: |
    Read `packages/mcp-server/src/tools/edit-tools.ts` for the pattern (how MCP tools are
    registered, how they call sendToPlugin, how they format responses).

    Also read `packages/mcp-server/src/schemas.ts` for the FigJam schemas (JamStickyColorSchema,
    JamShapeTypeSchema, JamConnectorStrokeCapSchema, JamCodeLanguageSchema).

    Create new file `packages/mcp-server/src/tools/figjam-tools.ts` with a
    `registerFigjamTools(server: McpServer)` function that registers 6 tools:

    1. `jam_create_sticky` -- params: text (required string), color (JamStickyColorSchema),
       x (optional number), y (optional number), parentId (optional string).
       Description: Create a sticky note in FigJam.

    2. `jam_create_connector` -- params: startNodeId (optional string), endNodeId (optional string),
       startPosition (optional {x,y}), endPosition (optional {x,y}),
       startStrokeCap (JamConnectorStrokeCapSchema), endStrokeCap (JamConnectorStrokeCapSchema).
       Description: Create a connector between nodes in FigJam.

    3. `jam_create_shape` -- params: shapeType (JamShapeTypeSchema), text (optional string),
       x (optional number), y (optional number), parentId (optional string).
       Description: Create a shape with text in FigJam.

    4. `jam_create_code_block` -- params: code (required string),
       language (JamCodeLanguageSchema), x, y, parentId.
       Description: Create a code block in FigJam.

    5. `jam_create_table` -- params: numRows (int 1-100), numCols (int 1-100),
       cellData (optional string[][]), x, y, parentId.
       Description: Create a table in FigJam.

    6. `jam_get_timer` -- no params.
       Description: Get the FigJam timer state (read-only).

    Each tool follows the same pattern as edit-tools.ts:
    - Check `isPluginConnected()`, return NOT_CONNECTED if false
    - Call `sendToPlugin({ type: 'jam_*', ...params }, TIMEOUT)`
    - Format the response as text content
    - Catch errors and return them as isError: true

    Run `npm run build` to verify.
- **Max iterations**: 15
- **Files affected**: `packages/mcp-server/src/tools/figjam-tools.ts` (NEW)
- **Verification**: `cd /Users/jarod/Projects/jarod/figma-fast && npm run build`

### TASK-513: Register FigJam tools in index.ts
- **Status**: DONE
- **Depends on**: TASK-512
- **Type**: IMPLEMENTATION
- **Ralph prompt**: |
    Read `packages/mcp-server/src/index.ts`.

    Add the import:
    ```typescript
    import { registerFigjamTools } from './tools/figjam-tools.js';
    ```

    Add the registration call after `registerBatchTools(server);`:
    ```typescript
    registerFigjamTools(server);
    ```

    Run `npm run build` to verify.
- **Max iterations**: 3
- **Files affected**: `packages/mcp-server/src/index.ts`
- **Verification**: `cd /Users/jarod/Projects/jarod/figma-fast && npm run build`

### TASK-514: Update server.test.ts tool count assertions
- **Status**: DONE
- **Depends on**: TASK-513
- **Type**: TEST_CREATION
- **Ralph prompt**: |
    Read `packages/mcp-server/src/__tests__/server.test.ts`.

    Find all tool count assertions (lines with `expect(...).toBe(...)` or `toBeGreaterThanOrEqual`
    that check the number of registered tools). Each assertion needs to increase by 6
    (the 6 new jam_* tools: jam_create_sticky, jam_create_connector, jam_create_shape,
    jam_create_code_block, jam_create_table, jam_get_timer).

    Also add a new test that verifies the jam_* tool names are present:

    ```typescript
    it('should register all jam_* FigJam tools', async () => {
      // Use the existing pattern from the test file to get tool names
      const jamTools = ['jam_create_sticky', 'jam_create_connector', 'jam_create_shape',
        'jam_create_code_block', 'jam_create_table', 'jam_get_timer'];
      for (const toolName of jamTools) {
        expect(toolNames).toContain(toolName);
      }
    });
    ```

    Adapt the above to match the existing test file's pattern for listing tools.

    Run `npm test -- --run packages/mcp-server/src/__tests__/server.test.ts` until all pass.
- **Max iterations**: 8
- **Files affected**: `packages/mcp-server/src/__tests__/server.test.ts`
- **Verification**: `cd /Users/jarod/Projects/jarod/figma-fast && npm test -- --run packages/mcp-server/src/__tests__/server.test.ts`

---

## Phase 3: Regression & Validation

### TASK-515: Full regression check
- **Status**: DONE
- **Depends on**: TASK-514, TASK-511
- **Type**: REGRESSION
- **Ralph prompt**: |
    Run the complete build, test, and lint pipeline:
    ```
    cd /Users/jarod/Projects/jarod/figma-fast
    npm run build
    npm test -- --run
    npm run lint
    ```

    ALL tests must pass (existing 110 + new schema tests + updated server tests).
    Build must succeed.
    Lint must pass (4 pre-existing warnings acceptable, 0 new warnings or errors).

    If anything fails, read the failing test/error, identify the root cause, and fix it.
    Iterate until green.
- **Max iterations**: 10
- **Files affected**: various (fixes only)
- **Verification**: `cd /Users/jarod/Projects/jarod/figma-fast && npm run build && npm test -- --run && npm run lint`

---

## Phase 4: Testing Infrastructure

### TASK-601: Fix failing ws-server.test.ts tests (IPv4)
- **Status**: DONE
- **Depends on**: none
- **Type**: BUG_FIX
- **Ralph prompt**: |
    Read `packages/mcp-server/src/__tests__/ws-server.test.ts`.

    Replace ALL occurrences of `ws://localhost:${port}` with `ws://127.0.0.1:${port}`.
    There are exactly 8 occurrences across lines 54, 85, 143, 179, 218, 242, 255, 291.

    This is the same fix applied to `packages/mcp-server/src/ws/server.ts` in Sprint 5.
    Node.js v24+ resolves `localhost` to `::1` (IPv6) but the WS relay binds to `127.0.0.1` only.

    Run `cd /Users/jarod/Projects/jarod/figma-fast && npx vitest run packages/mcp-server/src/__tests__/ws-server.test.ts`
    until all 9 tests in the file pass.
- **Max iterations**: 3
- **Files affected**: `packages/mcp-server/src/__tests__/ws-server.test.ts`
- **Verification**: `cd /Users/jarod/Projects/jarod/figma-fast && npx vitest run packages/mcp-server/src/__tests__/ws-server.test.ts`
- **Tests**: TEST-TI-001

### TASK-602: Add coverage reporting
- **Status**: DONE
- **Depends on**: TASK-601
- **Type**: INFRASTRUCTURE
- **Ralph prompt**: |
    1. Install the coverage provider:
       ```
       cd /Users/jarod/Projects/jarod/figma-fast && npm install -D @vitest/coverage-v8
       ```

    2. Read `vitest.config.ts`. Add the `coverage` block inside the `test` object:
       ```typescript
       export default defineConfig({
         test: {
           include: ['packages/*/src/**/*.test.ts'],
           environment: 'node',
           passWithNoTests: true,
           coverage: {
             provider: 'v8',
             reporter: ['text', 'lcov'],
             exclude: ['**/node_modules/**', '**/*.test.ts', '**/dist/**'],
           },
         },
       });
       ```

    3. Read `package.json` (root). Add a new script:
       ```
       "test:coverage": "vitest run --coverage"
       ```
       Add it after the existing `"test"` script line.

    4. Run `npm run test:coverage` to verify coverage output is generated.

    5. Verify that a `coverage/` directory was created with lcov data.
- **Max iterations**: 5
- **Files affected**: `vitest.config.ts`, `package.json`
- **Verification**: `cd /Users/jarod/Projects/jarod/figma-fast && npm run test:coverage`
- **Tests**: TEST-TI-002

### TASK-603: Add GitHub Actions CI workflow
- **Status**: DONE
- **Depends on**: TASK-601
- **Type**: INFRASTRUCTURE
- **Ralph prompt**: |
    1. Create the directory:
       ```
       mkdir -p /Users/jarod/Projects/jarod/figma-fast/.github/workflows
       ```

    2. Create file `.github/workflows/ci.yml` with this content:

       ```yaml
       name: CI

       on:
         push:
           branches: [main]
         pull_request:
           branches: [main]

       jobs:
         build-and-test:
           runs-on: ubuntu-latest

           steps:
             - uses: actions/checkout@v4

             - name: Setup Node.js
               uses: actions/setup-node@v4
               with:
                 node-version: '24'
                 cache: 'npm'

             - name: Install dependencies
               run: npm ci

             - name: Build all packages
               run: npm run build

             - name: Run tests
               run: npm test

             - name: Run linter
               run: npm run lint
       ```

    3. Validate the YAML is syntactically correct:
       ```
       python3 -c "import yaml; yaml.safe_load(open('/Users/jarod/Projects/jarod/figma-fast/.github/workflows/ci.yml')); print('Valid YAML')"
       ```
- **Max iterations**: 5
- **Files affected**: `.github/workflows/ci.yml` (NEW)
- **Verification**: `ls -la /Users/jarod/Projects/jarod/figma-fast/.github/workflows/ci.yml && python3 -c "import yaml; yaml.safe_load(open('/Users/jarod/Projects/jarod/figma-fast/.github/workflows/ci.yml')); print('Valid YAML')"`
- **Tests**: TEST-TI-003

### TASK-604: Add protocol contract test
- **Status**: DONE
- **Depends on**: TASK-601
- **Type**: TEST_CREATION
- **Ralph prompt**: |
    Create a new test file: `packages/shared/src/__tests__/protocol-contract.test.ts`

    This test verifies that every message type in the `ServerToPluginMessage` union
    in `packages/shared/src/messages.ts` has a corresponding `case` in the switch
    statement in `packages/figma-plugin/src/main.ts`.

    Read both source files:
    - `packages/shared/src/messages.ts`
    - `packages/figma-plugin/src/main.ts`

    Implementation approach:
    ```typescript
    import { describe, it, expect } from 'vitest';
    import { readFileSync } from 'node:fs';
    import { resolve } from 'node:path';

    describe('Protocol contract: ServerToPluginMessage vs main.ts switch', () => {
      const projectRoot = resolve(__dirname, '../../../../');
      const messagesSrc = readFileSync(resolve(projectRoot, 'packages/shared/src/messages.ts'), 'utf8');
      const mainSrc = readFileSync(resolve(projectRoot, 'packages/figma-plugin/src/main.ts'), 'utf8');

      // Extract type literals from ServerToPluginMessage union
      // The union ends at the next "export type" declaration
      const unionMatch = messagesSrc.match(/export type ServerToPluginMessage\s*=[\s\S]*?(?=\n\n?\/\*\*|\nexport\s)/);
      if (!unionMatch) throw new Error('Could not find ServerToPluginMessage union');

      const typeRegex = /type:\s*'([^']+)'/g;
      const messageTypes = new Set<string>();
      let match;
      while ((match = typeRegex.exec(unionMatch[0])) !== null) {
        messageTypes.add(match[1]);
      }

      // Extract case labels from main.ts switch
      const caseRegex = /case\s+'([^']+)'/g;
      const switchCases = new Set<string>();
      while ((match = caseRegex.exec(mainSrc)) !== null) {
        switchCases.add(match[1]);
      }

      it('every ServerToPluginMessage type has a case in main.ts switch', () => {
        const missingCases = [...messageTypes].filter(t => !switchCases.has(t));
        expect(missingCases, `Message types without handlers: ${missingCases.join(', ')}`).toEqual([]);
      });

      it('every case in main.ts switch corresponds to a ServerToPluginMessage type', () => {
        const extraCases = [...switchCases].filter(t => !messageTypes.has(t));
        expect(extraCases, `Switch cases without message types: ${extraCases.join(', ')}`).toEqual([]);
      });

      it('sanity: found at least 25 message types', () => {
        expect(messageTypes.size).toBeGreaterThanOrEqual(25);
        expect(switchCases.size).toBeGreaterThanOrEqual(25);
      });
    });
    ```

    Adjust path resolution as needed. The `__dirname` in the test file will be
    `packages/shared/src/__tests__/`, so `../../../../` reaches the project root.

    Run: `cd /Users/jarod/Projects/jarod/figma-fast && npx vitest run packages/shared/src/__tests__/protocol-contract.test.ts`
- **Max iterations**: 10
- **Files affected**: `packages/shared/src/__tests__/protocol-contract.test.ts` (NEW)
- **Verification**: `cd /Users/jarod/Projects/jarod/figma-fast && npx vitest run packages/shared/src/__tests__/protocol-contract.test.ts`
- **Tests**: TEST-TI-010, TEST-TI-011

### TASK-605: Extract pure handler logic and write tests
- **Status**: DONE
- **Depends on**: TASK-604
- **Type**: IMPLEMENTATION + TEST_CREATION
- **Ralph prompt**: |
    This task extracts pure (non-Figma-dependent) functions from `handlers.ts` into
    a testable module, then writes unit tests.

    **Step 1: Read the source files**
    Read `packages/figma-plugin/src/handlers.ts` fully. Identify pure functions:
    - `base64Encode(bytes: Uint8Array): string` (near top of file, ~lines 23-34)
    - `base64Decode(str: string): Uint8Array` (near top of file, ~lines 36-50)
    - Any other validation logic that does not reference `figma` globals

    **Step 2: Create the utility module**
    Create `packages/figma-plugin/src/handler-utils.ts` containing the exported
    `base64Encode` and `base64Decode` functions (copy from handlers.ts).

    **Step 3: Update handlers.ts**
    Replace the inline function definitions in handlers.ts with:
    ```typescript
    import { base64Encode, base64Decode } from './handler-utils.js';
    ```
    Remove the old function bodies and the `BASE64_CHARS` constant from handlers.ts.

    **Step 4: Create test file**
    Create `packages/figma-plugin/src/__tests__/handler-utils.test.ts`:

    ```typescript
    import { describe, it, expect } from 'vitest';
    import { base64Encode, base64Decode } from '../handler-utils.js';

    describe('base64Encode / base64Decode', () => {
      it('roundtrips "Hello"', () => {
        const input = new Uint8Array([72, 101, 108, 108, 111]);
        const encoded = base64Encode(input);
        expect(encoded).toBe('SGVsbG8=');
        const decoded = base64Decode(encoded);
        expect(Array.from(decoded)).toEqual(Array.from(input));
      });

      it('handles empty input', () => {
        const encoded = base64Encode(new Uint8Array([]));
        expect(encoded).toBe('');
      });

      it('handles padding (input length not divisible by 3)', () => {
        const input = new Uint8Array([1, 2]);
        const encoded = base64Encode(input);
        expect(encoded).toMatch(/=$/);
        const decoded = base64Decode(encoded);
        expect(Array.from(decoded)).toEqual([1, 2]);
      });

      it('handles single byte', () => {
        const input = new Uint8Array([255]);
        const decoded = base64Decode(base64Encode(input));
        expect(Array.from(decoded)).toEqual([255]);
      });

      it('handles large arrays (1024 bytes)', () => {
        const input = new Uint8Array(1024);
        for (let i = 0; i < 1024; i++) input[i] = i % 256;
        const decoded = base64Decode(base64Encode(input));
        expect(Array.from(decoded)).toEqual(Array.from(input));
      });
    });
    ```

    **Step 5: Build and test**
    ```
    cd /Users/jarod/Projects/jarod/figma-fast
    npm run build
    npx vitest run packages/figma-plugin/src/__tests__/handler-utils.test.ts
    npm test -- --run
    ```
    All must succeed.
- **Max iterations**: 15
- **Files affected**: `packages/figma-plugin/src/handler-utils.ts` (NEW), `packages/figma-plugin/src/handlers.ts` (modify), `packages/figma-plugin/src/__tests__/handler-utils.test.ts` (NEW)
- **Verification**: `cd /Users/jarod/Projects/jarod/figma-fast && npm run build && npx vitest run packages/figma-plugin/src/__tests__/handler-utils.test.ts && npm test -- --run`
- **Tests**: TEST-TI-020, TEST-TI-021, TEST-TI-022

### TASK-606: Add tool execution integration tests
- **Status**: DONE
- **Depends on**: TASK-601
- **Type**: TEST_CREATION
- **Ralph prompt**: |
    Read `packages/mcp-server/src/__tests__/server.test.ts` for the existing test pattern.
    Read `packages/mcp-server/src/ws/server.ts` to understand `sendToPlugin` and `isPluginConnected`.
    Read one tool file (e.g., `packages/mcp-server/src/tools/read-tools.ts`) to see how tools
    import and call `sendToPlugin`.

    Create `packages/mcp-server/src/__tests__/tool-execution.test.ts`.

    Mock the `ws/server` module before importing tools:

    ```typescript
    import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

    const mockSendToPlugin = vi.fn();
    const mockIsPluginConnected = vi.fn();

    vi.mock('../ws/server.js', () => ({
      sendToPlugin: mockSendToPlugin,
      isPluginConnected: mockIsPluginConnected,
      startWsServer: vi.fn(),
      _resetForTesting: vi.fn(),
    }));

    import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
    import { Client } from '@modelcontextprotocol/sdk/client/index.js';
    import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
    import { registerReadTools } from '../tools/read-tools.js';
    import { registerEditTools } from '../tools/edit-tools.js';
    import { registerBuildSceneTool } from '../tools/build-scene.js';
    import { registerFigjamTools } from '../tools/figjam-tools.js';
    ```

    Write tests for these scenarios (see TESTS.md TEST-TI-030 through TEST-TI-035):
    1. `get_node_info` happy path -- mock returns success, verify tool output
    2. `get_node_info` error path -- mock returns failure, verify error surface
    3. `modify_node` happy path -- verify correct message sent to plugin
    4. `build_scene` happy path -- verify spec forwarded
    5. `jam_create_sticky` happy path -- verify FigJam tool works through MCP
    6. Plugin not connected -- verify NOT_CONNECTED error without calling sendToPlugin

    Each test:
    - Sets up mockSendToPlugin return value
    - Calls tool via `client.callTool()`
    - Asserts on the response content and mock call arguments

    Run: `cd /Users/jarod/Projects/jarod/figma-fast && npx vitest run packages/mcp-server/src/__tests__/tool-execution.test.ts`
- **Max iterations**: 15
- **Files affected**: `packages/mcp-server/src/__tests__/tool-execution.test.ts` (NEW)
- **Verification**: `cd /Users/jarod/Projects/jarod/figma-fast && npx vitest run packages/mcp-server/src/__tests__/tool-execution.test.ts`
- **Tests**: TEST-TI-030 through TEST-TI-035

### TASK-607: Add scene builder orchestrator tests
- **Status**: DONE
- **Depends on**: TASK-601
- **Type**: TEST_CREATION
- **Ralph prompt**: |
    Read `packages/figma-plugin/src/scene-builder/index.ts` fully.
    Read `packages/figma-plugin/src/scene-builder/build-node.test.ts` for the Figma mock pattern.
    Read `packages/figma-plugin/src/scene-builder/build-node.ts` for what Figma APIs are called.
    Read `packages/figma-plugin/src/scene-builder/fonts.ts` for font handling.

    Create `packages/figma-plugin/src/scene-builder/__tests__/scene-builder.test.ts`.

    Set up the Figma global mock BEFORE importing buildScene. Follow the exact pattern
    from build-node.test.ts but extend it:

    ```typescript
    import { describe, it, expect, vi, beforeEach } from 'vitest';

    // Create mock node factory (copy from build-node.test.ts)
    function createMockNode(type: string, overrides: Record<string, any> = {}) {
      // ... same as build-node.test.ts
    }

    const figmaMock: any = {
      editorType: 'figma',
      createFrame: () => createMockNode('FRAME'),
      createText: () => createMockNode('TEXT'),
      createRectangle: () => createMockNode('RECTANGLE'),
      createEllipse: () => createMockNode('ELLIPSE'),
      createLine: () => createMockNode('LINE'),
      createPolygon: () => createMockNode('POLYGON'),
      createStar: () => createMockNode('STAR'),
      createVector: () => createMockNode('VECTOR'),
      createComponent: () => createMockNode('COMPONENT'),
      loadFontAsync: vi.fn().mockResolvedValue(undefined),
      getNodeByIdAsync: vi.fn().mockResolvedValue(null),
      currentPage: createMockNode('PAGE'),
      commitUndo: vi.fn(),
    };

    (globalThis as any).figma = figmaMock;

    // Import AFTER mock
    import { buildScene } from '../index.js';
    ```

    Test cases (from TESTS.md TEST-TI-040 through TEST-TI-044):
    1. Simple FRAME build -- success, nodeCount=1
    2. Nested nodes (FRAME > TEXT + RECTANGLE) -- nodeCount=3
    3. FigJam rejects COMPONENT -- success=false, error message
    4. parentId targeting -- node appended to parent
    5. Font preloading -- loadFontAsync called for TEXT nodes

    Reset the mock between tests using beforeEach.

    Run: `cd /Users/jarod/Projects/jarod/figma-fast && npx vitest run packages/figma-plugin/src/scene-builder/__tests__/scene-builder.test.ts`
- **Max iterations**: 20
- **Files affected**: `packages/figma-plugin/src/scene-builder/__tests__/scene-builder.test.ts` (NEW)
- **Verification**: `cd /Users/jarod/Projects/jarod/figma-fast && npx vitest run packages/figma-plugin/src/scene-builder/__tests__/scene-builder.test.ts`
- **Tests**: TEST-TI-040 through TEST-TI-044
