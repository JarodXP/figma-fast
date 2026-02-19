# FigmaFast -- Task Breakdown

> **Version:** 1.0.0
> **Last updated:** 2026-02-19
> **Mandatory sequence:** Tests -> Implementation -> Validation -> Regression -> Fix (if needed)

---

## Phase 5.5: Test & Quality Infrastructure (CTO MANDATED)

This phase MUST complete before any new feature work (Phase 4 or Phase 6).

### TASK-001: Install vitest and configure test infrastructure
- **Status:** DONE
- **Dependencies:** None
- **Type:** Infrastructure
- **Est. iterations:** 2-3
- **Files affected:** `package.json`, `vitest.config.ts` (new), `packages/shared/package.json`
- **Verification:** `npm test` runs and exits 0 (with no tests yet)
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Task: Install vitest as a dev dependency at the workspace root. Create a vitest.config.ts at the root that discovers tests in packages/*/src/**/*.test.ts. Add a "test" script to the root package.json: "vitest run". Add a "test:watch" script: "vitest". Verify `npm test` runs and exits 0.
  Do NOT install jest. Use vitest.
  ```

### TASK-002: Extract shared Zod schemas from build-scene.ts and edit-tools.ts
- **Status:** DONE
- **Dependencies:** None (can run parallel with TASK-001)
- **Type:** Refactor
- **Est. iterations:** 3-5
- **Files affected:** `packages/mcp-server/src/schemas.ts` (new), `packages/mcp-server/src/tools/build-scene.ts`, `packages/mcp-server/src/tools/edit-tools.ts`
- **Verification:** `npm run build` succeeds with zero errors
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Task: The Zod schemas (FillSchema, StrokeSchema, EffectSchema, LineHeightSchema, SceneNodeSchema) are duplicated between packages/mcp-server/src/tools/build-scene.ts and packages/mcp-server/src/tools/edit-tools.ts.

  1. Create packages/mcp-server/src/schemas.ts
  2. Move ALL shared Zod schemas there (FillSchema, StrokeSchema, EffectSchema, LineHeightSchema, SceneNodeSchema, ModifyPropertiesSchema)
  3. Export them all as named exports
  4. Update build-scene.ts to import from '../schemas.js'
  5. Update edit-tools.ts to import from '../schemas.js'
  6. Run `npm run build` and fix any errors until it compiles clean.
  ```

### TASK-003: Write unit tests for color utilities (TEST-001 through TEST-010)
- **Status:** DONE
- **Dependencies:** TASK-001
- **Type:** Test
- **Est. iterations:** 2-3
- **Files affected:** `packages/shared/src/__tests__/colors.test.ts` (new)
- **Verification:** `npm test` passes all 10 color tests
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read TESTS.md for test specifications TEST-001 through TEST-010.
  Read packages/shared/src/colors.ts for the implementation.

  Task: Create packages/shared/src/__tests__/colors.test.ts using vitest.
  Write tests for TEST-001 through TEST-010 as specified in TESTS.md.
  Use `import { hexToRgba, rgbaToHex } from '../colors.js'`.
  Use `describe` blocks for hexToRgba and rgbaToHex.
  For floating point comparisons, use `toBeCloseTo(expected, 2)`.
  Run `npm test` until all tests pass.
  ```

### TASK-004: Write unit tests for font utilities (TEST-011 through TEST-017)
- **Status:** DONE
- **Dependencies:** TASK-001
- **Type:** Test
- **Est. iterations:** 2-3
- **Files affected:** `packages/shared/src/__tests__/fonts.test.ts` (new)
- **Verification:** `npm test` passes all 7 font tests
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read TESTS.md for test specifications TEST-011 through TEST-017.
  Read packages/figma-plugin/src/scene-builder/fonts.ts for the implementation.

  IMPORTANT: The font functions (getFontStyle, collectFonts) are in the figma-plugin package which has Figma global types. For testability, we need to extract the PURE LOGIC functions (getFontStyle, collectFonts -- NOT preloadFonts) into packages/shared/src/fonts.ts so they can be tested without Figma dependencies.

  Steps:
  1. Create packages/shared/src/fonts.ts with getFontStyle and collectFonts (copy from figma-plugin, adjust imports)
  2. Export from packages/shared/src/index.ts
  3. Update packages/figma-plugin/src/scene-builder/fonts.ts to import from @figma-fast/shared (for getFontStyle and collectFonts) and keep preloadFonts locally
  4. Run `npm run build` to verify compilation
  5. Create packages/shared/src/__tests__/fonts.test.ts with tests TEST-011 through TEST-017
  6. Run `npm test` until all tests pass
  ```

### TASK-005: Write unit tests for Zod schemas (TEST-018 through TEST-030)
- **Status:** DONE
- **Dependencies:** TASK-001, TASK-002
- **Type:** Test
- **Est. iterations:** 3-5
- **Files affected:** `packages/mcp-server/src/__tests__/schemas.test.ts` (new)
- **Verification:** `npm test` passes all 13 schema tests
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read TESTS.md for test specifications TEST-018 through TEST-030.
  Read packages/mcp-server/src/schemas.ts (created in TASK-002) for the Zod schemas.

  Task: Create packages/mcp-server/src/__tests__/schemas.test.ts using vitest.
  Write tests for TEST-018 through TEST-030 as specified in TESTS.md.
  Import schemas from '../schemas.js'.
  Use `.safeParse()` to test both success and failure cases.
  For success: assert `result.success === true`.
  For failure: assert `result.success === false` and optionally check error messages.
  Run `npm test` until all tests pass.
  ```

### TASK-006: Write integration test for MCP server tool registration (TEST-NF-001)
- **Status:** DONE
- **Dependencies:** TASK-001
- **Type:** Integration test
- **Est. iterations:** 3-5
- **Files affected:** `packages/mcp-server/src/__tests__/server.test.ts` (new)
- **Verification:** `npm test` passes the server integration test
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read TESTS.md for test specification TEST-NF-001.
  Read packages/mcp-server/src/index.ts for server setup.

  Task: Create packages/mcp-server/src/__tests__/server.test.ts.
  This test should verify that the MCP server registers all 16 tools.
  Approach: Import the McpServer class, create an instance, register all tools (call the register* functions), then verify the tool count and names via the server's internal state or by using an InMemoryTransport if MCP SDK provides one.
  If direct inspection isn't feasible, test by spawning the server process and sending initialize + tools/list via stdio (child_process approach).
  Run `npm test` until the test passes.
  ```

### TASK-007: Write unit tests for WS server edge cases (TEST-NF-002, TEST-NF-003)
- **Status:** DONE
- **Dependencies:** TASK-001
- **Type:** Test
- **Est. iterations:** 3-5
- **Files affected:** `packages/mcp-server/src/__tests__/ws-server.test.ts` (new)
- **Verification:** `npm test` passes WS server tests
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Read TESTS.md for TEST-NF-002 and TEST-NF-003.
  Read packages/mcp-server/src/ws/server.ts for the implementation.

  Task: Create packages/mcp-server/src/__tests__/ws-server.test.ts.
  TEST-NF-002: Import sendToPlugin and isPluginConnected. When no plugin is connected, sendToPlugin should reject.
  TEST-NF-003: Start the WS server on a random port, connect a mock WS client that never responds, call sendToPlugin with a short timeout (100ms), verify it rejects with timeout.
  Use afterEach to clean up WS connections and servers.
  Run `npm test` until all tests pass.
  ```

### TASK-008: Add eslint and prettier configuration
- **Status:** DONE
- **Dependencies:** None
- **Type:** Infrastructure
- **Est. iterations:** 3-5
- **Files affected:** `.eslintrc.json` (new), `.prettierrc` (new), `package.json`
- **Verification:** `npm run lint` and `npm run format:check` exit 0
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Task: Add eslint and prettier to the project.
  1. Install: eslint, @typescript-eslint/parser, @typescript-eslint/eslint-plugin, prettier, eslint-config-prettier
  2. Create .eslintrc.json with TypeScript and prettier integration. Rules: warn on unused vars (except prefixed with _), error on no-console in mcp-server (use console.error instead).
  3. Create .prettierrc: { "singleQuote": true, "trailingComma": "all", "printWidth": 120 }
  4. Add scripts: "lint": "eslint packages/*/src/**/*.ts", "format:check": "prettier --check packages/*/src/**/*.ts"
  5. Run `npm run lint` -- fix any auto-fixable issues. Do NOT reformat all files in this task (that's a separate commit).
  6. Verify `npm run lint` exits 0.
  ```

### TASK-009: Validate full build + all tests pass (regression check)
- **Status:** DONE
- **Dependencies:** TASK-003, TASK-004, TASK-005, TASK-006, TASK-007
- **Type:** Validation
- **Est. iterations:** 1-2
- **Files affected:** None (read-only validation)
- **Verification:** `npm run build && npm test` exits 0
- **Ralph prompt:**
  ```
  Project: FigmaFast at /Users/jarod/Projects/vortex/figma-fast
  Task: Run the full validation suite.
  1. Run `npm run build` -- verify all 3 packages compile clean.
  2. Run `npm test` -- verify all tests pass.
  3. Report: total test count, pass count, fail count, coverage percentage.
  4. If any tests fail, fix them. Do NOT skip or delete failing tests.
  ```

---

## Phase 4: Batch Modifications (DEFERRED -- CTO Decision)

**Status: ON HOLD** pending latency measurement. See PLAN.md RC-1, RC-2.

Before starting Phase 4, measure the latency of N sequential `modify_node` calls vs what a `batch_modify` would save. If the latency gap is < 2x, batch_modify is not worth the complexity.

### TASK-010: Measure modify_node sequential latency
- **Status:** PENDING (blocked by Phase 5.5 completion)
- **Dependencies:** TASK-009
- **Type:** Measurement
- **Ralph prompt:** TBD -- requires live Figma plugin connection

---

## Phase 6: Polish, Error Handling, DX (DEFERRED)

These tasks should only start after Phase 5.5 is complete and all tests pass.

### TASK-011: Partial failure reporting in build_scene
- **Status:** PENDING
- **Dependencies:** TASK-009
- **Type:** Enhancement

### TASK-012: Improved WS disconnect recovery
- **Status:** PENDING
- **Dependencies:** TASK-009
- **Type:** Enhancement

### TASK-013: Rich tool descriptions with more examples
- **Status:** PENDING
- **Dependencies:** TASK-009
- **Type:** DX

---

## Task Dependency Graph

```
TASK-001 (vitest) ----> TASK-003 (color tests)
                   |---> TASK-004 (font tests) ---> TASK-009 (regression)
                   |---> TASK-006 (server test) -/
                   |---> TASK-007 (WS tests) ---/
                   |
TASK-002 (schemas) ---> TASK-005 (schema tests) --> TASK-009 (regression)

TASK-008 (eslint) -- independent, can run in parallel

TASK-009 (regression) --> TASK-010 (measure latency) --> Phase 4 decision
                      --> TASK-011, TASK-012, TASK-013 (Phase 6)
```
