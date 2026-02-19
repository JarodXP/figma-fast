# FigmaFast -- Test Specifications

> **Version:** 1.0.0
> **Last updated:** 2026-02-19
> **Framework:** vitest (recommended -- zero-config TS, Zod-native, fast)

---

## Existing Tests

**42 tests across 5 test files. All passing as of 2026-02-19.**

| File | Tests | Status |
|------|-------|--------|
| `packages/shared/src/__tests__/colors.test.ts` | 11 | PASSING |
| `packages/shared/src/__tests__/fonts.test.ts` | 8 | PASSING |
| `packages/mcp-server/src/__tests__/schemas.test.ts` | 20 | PASSING |
| `packages/mcp-server/src/__tests__/server.test.ts` | 1 | PASSING |
| `packages/mcp-server/src/__tests__/ws-server.test.ts` | 2 | PASSING |

---

## Coverage Gaps

| Area | Current Coverage | Priority | Notes |
|------|-----------------|----------|-------|
| `packages/shared/src/colors.ts` | 0% | CRITICAL | Pure functions, trivially testable |
| `packages/shared/src/scene-spec.ts` | 0% (types only) | N/A | TypeScript types -- validated by compiler |
| `packages/shared/src/messages.ts` | 0% (types only) | N/A | TypeScript types -- validated by compiler |
| `packages/mcp-server/src/tools/build-scene.ts` (Zod schemas) | 0% | CRITICAL | Recursive schema with edge cases |
| `packages/mcp-server/src/tools/edit-tools.ts` (Zod schemas) | 0% | HIGH | Duplicate schemas, must stay in sync |
| `packages/mcp-server/src/ws/server.ts` | 0% | MEDIUM | Network code, harder to unit test |
| `packages/mcp-server/src/tools/*.ts` (tool handlers) | 0% | MEDIUM | Depend on WS connection, need mocking |
| `packages/figma-plugin/src/scene-builder/fonts.ts` | 0% | HIGH | Pure logic (collectFonts, getFontStyle) |
| `packages/figma-plugin/src/scene-builder/build-node.ts` | 0% | LOW | Depends on Figma API, needs sandbox mock |
| `packages/figma-plugin/src/handlers.ts` | 0% | LOW | Depends on Figma API |
| `packages/figma-plugin/src/serialize-node.ts` | 0% | LOW | Depends on Figma API |

---

## Regression Scope

Since there are no existing tests, the initial test suite IS the regression suite. All tests below must pass before any new feature work begins.

---

## New Functional Tests

### Color Utilities (`packages/shared/src/colors.ts`)

```
TEST-001: hexToRgba parses 6-digit hex correctly
Type: unit
Priority: critical

GIVEN a standard 6-digit hex color "#FF8800"
WHEN hexToRgba is called
THEN it returns { r: 1, g: 0.533..., b: 0, a: 1 }
```

```
TEST-002: hexToRgba parses 3-digit shorthand hex
Type: unit
Priority: critical

GIVEN a 3-digit hex color "#F80"
WHEN hexToRgba is called
THEN it returns { r: 1, g: 0.533..., b: 0, a: 1 } (same as #FF8800)
```

```
TEST-003: hexToRgba parses 8-digit hex with alpha
Type: unit
Priority: critical

GIVEN an 8-digit hex color "#FF000080"
WHEN hexToRgba is called
THEN it returns { r: 1, g: 0, b: 0, a: 0.502... } (128/255)
```

```
TEST-004: hexToRgba handles # prefix presence/absence
Type: unit
Priority: high

GIVEN hex colors "#FF0000" and "FF0000" (without hash)
WHEN hexToRgba is called on both
THEN both return identical { r: 1, g: 0, b: 0, a: 1 }
```

```
TEST-005: hexToRgba handles black and white
Type: unit
Priority: high

GIVEN "#000000" and "#FFFFFF"
WHEN hexToRgba is called on each
THEN black returns { r: 0, g: 0, b: 0, a: 1 } and white returns { r: 1, g: 1, b: 1, a: 1 }
```

```
TEST-006: hexToRgba handles full transparency
Type: unit
Priority: high

GIVEN "#00000000"
WHEN hexToRgba is called
THEN it returns { r: 0, g: 0, b: 0, a: 0 }
```

```
TEST-007: rgbaToHex converts opaque color correctly
Type: unit
Priority: critical

GIVEN { r: 1, g: 0, b: 0, a: 1 }
WHEN rgbaToHex is called
THEN it returns "#ff0000" (no alpha suffix since fully opaque)
```

```
TEST-008: rgbaToHex includes alpha when not fully opaque
Type: unit
Priority: critical

GIVEN { r: 0, g: 0, b: 0, a: 0.5 }
WHEN rgbaToHex is called
THEN it returns "#00000080" (alpha = 128/255 ~ 0x80)
```

```
TEST-009: hexToRgba and rgbaToHex roundtrip
Type: unit
Priority: high

GIVEN any valid hex color (e.g., "#3A7BF2")
WHEN hexToRgba then rgbaToHex is called
THEN the output equals the input (case-insensitive)
```

```
TEST-010: hexToRgba boundary values
Type: unit
Priority: medium

GIVEN edge case hex values "#000", "#FFF", "#00000000", "#FFFFFFFF"
WHEN hexToRgba is called on each
THEN values are within [0, 1] range for all components
```

### Font Utilities (`packages/figma-plugin/src/scene-builder/fonts.ts`)

Note: These test the pure logic functions. preloadFonts depends on Figma API and cannot be unit tested without mocking.

```
TEST-011: getFontStyle maps numeric weights to style names
Type: unit
Priority: critical

GIVEN each numeric weight: 100, 200, 300, 400, 500, 600, 700, 800, 900
WHEN getFontStyle is called
THEN it returns: Thin, Extra Light, Light, Regular, Medium, Semi Bold, Bold, Extra Bold, Black respectively
```

```
TEST-012: getFontStyle returns Regular for undefined/unknown weight
Type: unit
Priority: high

GIVEN undefined or an unmapped number (e.g., 450, 0, -1)
WHEN getFontStyle is called
THEN it returns "Regular"
```

```
TEST-013: getFontStyle passes through string values
Type: unit
Priority: high

GIVEN a string weight like "Bold Italic" or "Light"
WHEN getFontStyle is called
THEN it returns the string as-is
```

```
TEST-014: collectFonts returns unique font refs from TEXT nodes
Type: unit
Priority: critical

GIVEN a spec tree with 3 TEXT nodes: {fontFamily: "Roboto", fontWeight: 700}, {fontFamily: "Inter"}, {fontFamily: "Roboto", fontWeight: 700}
WHEN collectFonts is called
THEN it returns 3 entries: {Roboto, Bold}, {Inter, Regular}, and the fallback {Inter, Regular} (deduplicated, so 2 unique)
```

```
TEST-015: collectFonts always includes Inter Regular fallback
Type: unit
Priority: high

GIVEN a spec tree with only one TEXT node using {fontFamily: "Roboto", fontWeight: 400}
WHEN collectFonts is called
THEN the result includes both {Roboto, Regular} AND {Inter, Regular}
```

```
TEST-016: collectFonts handles spec with no TEXT nodes
Type: unit
Priority: high

GIVEN a spec tree containing only FRAME and RECTANGLE nodes
WHEN collectFonts is called
THEN it returns at least [{Inter, Regular}] (the fallback)
```

```
TEST-017: collectFonts walks nested children
Type: unit
Priority: critical

GIVEN a spec: FRAME > FRAME > TEXT {fontFamily: "Mono", fontWeight: 300}
WHEN collectFonts is called
THEN it includes {Mono, Light} in the result
```

### Zod Schema Validation (`packages/mcp-server/src/tools/build-scene.ts`)

Note: These require importing the Zod schemas. If they are not exported, the first task is to export them for testability.

```
TEST-018: SceneNodeSchema accepts minimal valid FRAME
Type: unit
Priority: critical

GIVEN { type: "FRAME" }
WHEN parsed by SceneNodeSchema
THEN validation succeeds
```

```
TEST-019: SceneNodeSchema rejects missing type
Type: unit
Priority: critical

GIVEN { name: "Card" } (no type field)
WHEN parsed by SceneNodeSchema
THEN validation fails with a meaningful error
```

```
TEST-020: SceneNodeSchema rejects invalid type
Type: unit
Priority: critical

GIVEN { type: "BUTTON" }
WHEN parsed by SceneNodeSchema
THEN validation fails (BUTTON is not a valid NodeType)
```

```
TEST-021: SceneNodeSchema accepts full TEXT node
Type: unit
Priority: high

GIVEN {
  type: "TEXT",
  characters: "Hello",
  fontSize: 16,
  fontFamily: "Inter",
  fontWeight: 700,
  textAlignHorizontal: "CENTER",
  textAutoResize: "WIDTH_AND_HEIGHT",
  fills: [{ type: "SOLID", color: "#000000" }]
}
WHEN parsed by SceneNodeSchema
THEN validation succeeds
```

```
TEST-022: SceneNodeSchema accepts nested children recursively
Type: unit
Priority: critical

GIVEN a FRAME with children containing another FRAME with TEXT children
WHEN parsed by SceneNodeSchema
THEN validation succeeds at all nesting levels
```

```
TEST-023: SceneNodeSchema validates fill types
Type: unit
Priority: high

GIVEN fills with type "INVALID_FILL"
WHEN parsed by SceneNodeSchema
THEN validation fails
```

```
TEST-024: SceneNodeSchema accepts all 12 node types
Type: unit
Priority: high

GIVEN each of: FRAME, TEXT, RECTANGLE, ELLIPSE, GROUP, COMPONENT, COMPONENT_SET, COMPONENT_INSTANCE, POLYGON, STAR, LINE, VECTOR
WHEN parsed as { type: <nodeType> }
THEN all 12 pass validation
```

```
TEST-025: SceneNodeSchema validates cornerRadius as number or 4-tuple
Type: unit
Priority: medium

GIVEN cornerRadius: 8 (number) and cornerRadius: [8, 8, 0, 0] (tuple)
WHEN parsed by SceneNodeSchema
THEN both pass validation

GIVEN cornerRadius: [8, 8] (2-tuple) or cornerRadius: "8px" (string)
WHEN parsed by SceneNodeSchema
THEN both fail validation
```

```
TEST-026: SceneNodeSchema validates padding as number or 4-tuple
Type: unit
Priority: medium

GIVEN padding: 16 (number) and padding: [16, 24, 16, 24] (tuple)
WHEN parsed by SceneNodeSchema
THEN both pass validation

GIVEN padding: [16, 24] (2-tuple)
WHEN parsed by SceneNodeSchema
THEN validation fails
```

```
TEST-027: SceneNodeSchema validates opacity range
Type: unit
Priority: medium

GIVEN opacity: 0 and opacity: 1 and opacity: 0.5
WHEN parsed by SceneNodeSchema
THEN all pass

GIVEN opacity: -0.1 or opacity: 1.5
WHEN parsed by SceneNodeSchema
THEN both fail
```

```
TEST-028: FillSchema validates gradient stops
Type: unit
Priority: medium

GIVEN { type: "GRADIENT_LINEAR", gradientStops: [{ position: 0, color: "#FF0000" }, { position: 1, color: "#0000FF" }] }
WHEN parsed by FillSchema
THEN validation succeeds
```

```
TEST-029: EffectSchema validates all effect types
Type: unit
Priority: medium

GIVEN each of: DROP_SHADOW, INNER_SHADOW, LAYER_BLUR, BACKGROUND_BLUR with required radius field
WHEN parsed by EffectSchema
THEN all pass validation
```

### Schema Sync Between build-scene.ts and edit-tools.ts

```
TEST-030: ModifyPropertiesSchema accepts all properties that build-scene SceneNodeSchema accepts
Type: unit
Priority: high

GIVEN a set of common property names (fills, strokes, effects, cornerRadius, layoutMode, characters, fontSize, etc.)
WHEN checked against both SceneNodeSchema and ModifyPropertiesSchema
THEN both schemas accept the same property shapes for shared properties
```

---

## Non-Functional Tests

```
TEST-NF-001: MCP server starts and registers all 16 tools
Type: integration
Priority: critical

GIVEN a fresh MCP server process started via stdio
WHEN an initialize request followed by tools/list is sent
THEN the response includes exactly 16 tools with correct names
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

## Test Categories Summary

| Work Type | Test IDs | Count |
|-----------|----------|-------|
| Color utilities | TEST-001 through TEST-010 | 10 |
| Font utilities | TEST-011 through TEST-017 | 7 |
| Zod schema validation | TEST-018 through TEST-030 | 13 |
| Non-functional | TEST-NF-001 through TEST-NF-004 | 4 |
| **TOTAL** | | **34** |

---

## Test Infrastructure Requirements

1. **Framework:** vitest (recommended for TS monorepo, fast, native ESM)
2. **Config:** `vitest.config.ts` at workspace root or per-package
3. **Coverage:** `@vitest/coverage-v8`
4. **Test location:** `packages/<pkg>/src/__tests__/<file>.test.ts` (colocated)
5. **Script:** `"test": "vitest run"` in root package.json
6. **CI gate:** Tests must pass before any merge to main

### Testability Gaps

The following require code changes before they can be tested:

1. **Zod schemas in build-scene.ts are NOT exported.** They need to be exported (or extracted to a shared schemas file) for direct testing.
2. **Zod schemas are DUPLICATED** between `build-scene.ts` and `edit-tools.ts`. Extract to a shared `schemas.ts` file.
3. **Plugin code depends on Figma globals** (`figma.*`). Cannot be unit tested without a mock. Plugin tests should be deferred or limited to pure logic extraction.
4. **WS server uses module-level state** (`pluginSocket`, `pendingRequests`). Testing requires either dependency injection or module-level mocking.
