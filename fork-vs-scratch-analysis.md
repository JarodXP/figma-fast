# Fork ClaudeTalkToFigma vs. Build from Scratch

## Strategic Analysis for a Performant Figma MCP Server

---

## Executive Summary

Both paths lead to the same destination â€” a **declarative scene-graph MCP server** that collapses 20â€“200+ tool calls into 1â€“5. The question is which gets you there faster, cleaner, and with less risk.

**Recommendation: Build from scratch.** The existing codebase's architecture is the problem, not the solution. Forking saves ~3 days of boilerplate but inherits weeks of refactoring debt.

---

## What ClaudeTalkToFigma Actually Is

Based on the repo analysis (v0.6.1, 166 commits, MIT license, ~285 stars):

**Architecture:**
```
Claude â†stdioâ†’ MCP Server (Bun/TS) â†WSâ†’ Relay Server (port 3055) â†WSâ†’ Plugin UI (iframe) â†postMessageâ†’ Plugin Main
```
- 3 separate processes: MCP server, WS relay, Figma plugin
- ~40+ atomic MCP tools (create_rectangle, set_fill_color, set_font_size, etc.)
- Each tool = 1 WS round-trip = 1 postMessage = 1 Figma API call
- Channel-based routing (multi-client support via channel IDs)
- Modular tool structure (refactored in v0.5)
- Jest test suite, CI/CD with DXT packaging

**What's Reusable:**
- Figma plugin â†” iframe postMessage protocol (message types, serialization)
- Font loading patterns (`loadFontAsync` handling)
- Node property mappings (how MCP params â†’ Figma API properties)
- DXT packaging pipeline (GitHub Actions)
- Community knowledge (40 forks, 12 open issues = real-world edge cases)

**What's the Problem:**
- The relay server is a separate process (unnecessary hop)
- Every tool is atomic â€” 1 tool = 1 node operation
- No batching, no scene-graph, no declarative API
- Plugin code is a flat message dispatcher, not a tree builder
- Tool descriptions are imperative-oriented (Claude "thinks" in steps)

---

## Strategy A: Fork & Refactor

### What You'd Do

1. Fork the repo
2. Merge MCP server + WS relay into one process
3. Keep existing 40+ atomic tools as Tier 3/4
4. Add new `build_scene` / `batch_modify` tools (Tier 1/2)
5. Rewrite plugin main thread to add Scene Builder Engine
6. Keep plugin UI/iframe mostly as-is (WS connection logic)
7. Update tool descriptions to steer Claude toward declarative tools

### Realistic Timeline: ~5â€“6 weeks

| Phase | Duration | Work |
|-------|----------|------|
| Codebase audit & understand | 3â€“4 days | Read all code, map message types, understand edge cases |
| Merge relay into MCP server | 3â€“4 days | Refactor WS from separate process into embedded server |
| Add Scene Builder to plugin | 1.5 weeks | New `buildScene()` recursive engine, font pre-loading |
| Add Tier 1/2 MCP tools | 1 week | `build_scene`, `batch_modify`, `instantiate_components` |
| Refactor tool descriptions | 2â€“3 days | Rewrite all tool descriptions to guide Claude toward batching |
| Fix breakage & regression test | 1 week | Existing tests will break; channel routing may conflict |
| Polish & release | 3â€“4 days | DXT packaging, docs, migration guide |

### Pros

- **Existing plugin works.** You start with a Figma plugin that already handles all node types, font loading, error cases, and real-world quirks. That's ~2 weeks of work you skip.
- **Community & distribution.** 285 stars, npm package, DXT packaging, multi-IDE support (Claude Desktop, Cursor, Windsurf, Copilot). You inherit the install base.
- **Backwards compatibility.** Existing users can keep using atomic tools while you add declarative ones. No migration cliff.
- **Battle-tested edge cases.** Timeout handling, chunking, stroke weight edge cases, opacity bugs â€” all already discovered and fixed.
- **License is MIT.** No legal friction.

### Cons

- **You're refactoring someone else's architecture.** The 3-process design (MCP + relay + plugin) is the core bottleneck. Merging them means touching every layer.
- **Atomic tools become dead weight.** 40+ tools that Claude will still sometimes call instead of `build_scene`. You'll need to manage tool priority in descriptions, or Claude will default to what it knows.
- **Plugin message protocol is 1:1.** Each message type maps to one operation. Adding `build_scene` means a new message type, a new handler in the UI iframe, a new handler in plugin main â€” and it must coexist with 40+ existing message types.
- **Test suite tests the wrong thing.** Current tests verify atomic operations. You need tests for recursive tree building, which is a completely different concern.
- **Bun dependency.** The project is heavily Bun-oriented. If you want Node.js compatibility (broader audience), that's more refactoring.
- **Code style & conventions.** You inherit naming conventions, error handling patterns, and TypeScript idioms that may not match your preferences. Death by a thousand paper cuts.

### Risk Profile

| Risk | Severity | Likelihood |
|------|----------|------------|
| Relay merge breaks channel routing | High | Medium |
| Claude still prefers atomic tools over `build_scene` | High | High |
| Plugin postMessage protocol can't handle large payloads | Medium | Low |
| Existing users file bugs during transition | Medium | High |
| Merge conflicts with upstream | Low | Medium |

---

## Strategy B: Build from Scratch

### What You'd Do

1. New repo, clean TypeScript project
2. MCP server with embedded WS (single process)
3. Figma plugin built for declarative scene building from day 1
4. Tiered tool design: Tier 1 (scene), Tier 2 (batch), Tier 3 (atomic), Tier 4 (read)
5. Reference ClaudeTalkToFigma for Figma API patterns (property mappings, font loading)

### Realistic Timeline: ~4â€“5 weeks

| Phase | Duration | Work |
|-------|----------|------|
| Project scaffolding | 1â€“2 days | TS project, MCP SDK, WS server, plugin manifest |
| Scene Builder Engine (plugin) | 1.5 weeks | Recursive tree builder, font pre-loading, undo batching |
| MCP tools (Tier 1â€“2) | 1 week | `build_scene`, `batch_modify`, `instantiate_components` |
| MCP tools (Tier 3â€“4) | 3â€“4 days | Atomic modify/delete, read tools (reference existing code) |
| Plugin UI (iframe + WS) | 2â€“3 days | Minimal UI, connection management, status display |
| Testing & edge cases | 1 week | Scene builder tests, large payload handling, error recovery |
| Polish & release | 3â€“4 days | npm packaging, docs, tool descriptions with examples |

### Pros

- **Architecture matches the goal.** Every design decision serves the declarative model. No legacy to work around.
- **Simpler codebase.** 2 processes (MCP+WS combined, plugin) instead of 3. One message protocol designed for tree payloads.
- **Tool descriptions are clean.** You write `build_scene` as the primary tool from the start. Claude learns the right pattern immediately. No competing atomic tools diluting its behavior.
- **Plugin is a tree builder, not a message dispatcher.** The core function is `buildScene(spec)` â†’ Figma nodes. Everything else is secondary.
- **Modern stack choices.** Pick your runtime (Node, Bun, Deno), your test framework, your style. No inherited baggage.
- **Smaller surface area.** Fewer tools (8â€“12 vs 40+) means less for Claude to choose from, fewer descriptions to maintain, and faster tool listing in the MCP handshake.

### Cons

- **You rewrite Figma API mappings.** Property-by-property: how `fills` maps to Figma's paint array, how `layoutMode` sets auto-layout, how `cornerRadius` handles mixed corners. This is ~2â€“3 days of tedious but straightforward work. You can reference the existing codebase.
- **No community.** Zero stars, no npm presence, no DXT package. You start from zero on distribution.
- **Edge cases rediscovered.** Font loading race conditions, stroke weight = 0 edge case, opacity vs alpha, plugin timeouts on large trees â€” you'll hit these again. But you'll hit them in the context of your architecture, not someone else's.
- **No backwards compatibility.** Users of ClaudeTalkToFigma can't migrate without switching entirely. No gradual adoption.
- **More upfront work.** Plugin UI boilerplate, WS connection handling, channel routing (if you want multi-client) â€” all from zero.

### Risk Profile

| Risk | Severity | Likelihood |
|------|----------|------------|
| Underestimate Figma API edge cases | Medium | Medium |
| Plugin review/approval delays (if publishing) | Medium | Low |
| Feature parity pressure from community | Low | Low |
| `build_scene` spec too complex for Claude to generate reliably | High | Medium |

---

## Head-to-Head Comparison

| Dimension | Fork | From Scratch | Winner |
|-----------|------|-------------|--------|
| **Time to first working `build_scene`** | ~3 weeks (refactor first) | ~2.5 weeks (build direct) | **Scratch** |
| **Time to production-ready** | ~5â€“6 weeks | ~4â€“5 weeks | **Scratch** |
| **Architecture cleanliness** | Compromised (legacy tools) | Purpose-built | **Scratch** |
| **Figma API coverage on day 1** | Full (40+ tools) | Partial (build up) | **Fork** |
| **Claude behavior (tool selection)** | Confused by 40+ tools | Focused on 8â€“12 tools | **Scratch** |
| **Community & distribution** | Inherit 285 stars, npm, DXT | Start from zero | **Fork** |
| **Maintenance burden** | High (legacy + new) | Low (only new) | **Scratch** |
| **Risk of breaking existing users** | High | None (new project) | **Scratch** |
| **Learning from edge cases** | Free (already in codebase) | Must reference externally | **Fork** |
| **Code ownership & confidence** | Partial (someone else's code) | Full | **Scratch** |

---

## The Deciding Factor: Claude's Tool Selection Behavior

This is the most underrated dimension. With 40+ atomic tools registered, Claude will frequently choose `create_rectangle` + `set_fill_color` + `move_node` instead of a single `build_scene` call â€” even with good tool descriptions. LLMs are **biased toward familiar, granular patterns**.

In a fork, you'd need to either:
- **Remove atomic tools** â†’ breaks backwards compatibility, alienates existing users
- **Keep both** â†’ Claude uses the wrong ones 30â€“50% of the time
- **Rename/deprecate** â†’ confusing tool namespace, documentation overhead

In a fresh build, you register 8â€“12 tools. `build_scene` is the obvious choice. Claude uses it correctly 90%+ of the time. **This single factor likely accounts for 2â€“3x real-world performance difference.**

---

## Recommendation

**Build from scratch**, but **study the fork closely.**

Specifically:

1. **Read ClaudeTalkToFigma's plugin code** before writing yours. Extract every Figma API property mapping, every font loading pattern, every edge case fix. This is your reference manual.
2. **Copy their DXT packaging workflow.** GitHub Actions config is directly reusable.
3. **Reference their test scenarios.** Their integration tests document real failure modes.
4. **Design for 8â€“12 tools**, not 40+. The tiered approach from the analysis document is correct.
5. **Ship `build_scene` first**, atomic tools second. If Claude can build a full card in one call on day 1, everything else is incremental.

The fork saves you ~3 days of Figma API boilerplate. The from-scratch approach saves you ~2 weeks of refactoring, gives you a cleaner architecture, and â€” most critically â€” produces better Claude behavior at runtime. That's a clear trade.

---

## Appendix: Hybrid Option

There's a middle path worth noting: **don't fork, but vendor specific files.**

1. Create a new repo from scratch
2. Copy (with attribution) specific utility functions from ClaudeTalkToFigma:
   - Color conversion helpers
   - Figma property mapping constants
   - Font loading utilities
3. Write everything else fresh

This gives you ~80% of the "reference the fork" benefit with 0% of the refactoring debt. MIT license makes this perfectly legal. Just credit the original in your README and LICENSE.