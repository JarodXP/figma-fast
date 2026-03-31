# Vortex Documentation Structure Standard

**Version:** 1.0
**Status:** CEO-approved, locked
**Date:** 2026-03-13
**Applies to:** All vortex product projects

---

## Overview

Every vortex product project uses this documentation structure. The structure lives inside the product project (the project that owns the design), not inside the app code repository.

A product project may produce an app. The app code lives in its own repository/directory. The app references the product project's docs -- it does not duplicate them.

---

## Canonical Structure

```
<product-project>/
    .vortex.json
    docs/
        DOCS-STRUCTURE.md               # This file (self-referencing standard)
        discovery/
            v1/
                VERSION_SUMMARY.md
                <flat files>
            v2/
                VERSION_SUMMARY.md
                <flat files>
        design/
            v1/
                VERSION_SUMMARY.md
                <flat files>
            v2/
                VERSION_SUMMARY.md
                <flat files>
        delivery/
            ARCHITECTURE.md
            PLAN.md
            TASKS.md
            TESTS.md
            PROGRESS.md
            BUGS.md
        handoff/
            <flat files>
```

---

## Rules

### General

1. `docs/` is the single root for all project documentation.
2. No documentation files live outside `docs/` (no root-level .md files except .vortex.json).
3. Every agent reads `docs/handoff/` at invocation start and updates their memory file before closing.

### Discovery (`docs/discovery/`)

Contains product discovery artifacts: ecosystem maps, personas, user journeys, problem statements, HMW questions.

- **Versioned.** Each version is a sibling folder: `v1/`, `v2/`, `v3/`, etc.
- **Flat inside each version.** No sub-folders. Use prefix-based naming for categorization.
- Each version folder contains a `VERSION_SUMMARY.md` explaining what triggered the new version and what changed.
- A new version is created when discovery fundamentally changes (pivot, new target persona, major scope shift). Minor updates to existing artifacts do NOT require a new version -- edit in place.

File naming convention:
```
ecosystem-map.md
persona-{name}.md
journey-{name}.md
problems-{name}.md
hmw-{name}.md
```

### Design (`docs/design/`)

Contains product design artifacts: knowledge bases, solution candidates, prioritization matrices, OSTs, user stories, wireframes, prototype PRDs.

- **Versioned.** Same pattern as discovery: `v1/`, `v2/`, etc.
- **Flat inside each version.** No sub-folders. Use prefix-based naming.
- Each version folder contains a `VERSION_SUMMARY.md` explaining the CEO decision or design pivot that triggered the new version.
- A new version is created when a CEO decision or design review produces a structural change to the design. Iterative refinements within a version are edited in place.

File naming convention:
```
knowledge-base.md
solutions.md
prioritization-matrix.md
ost.md
stories-{group}.md
stories-consolidated.md
wireframes-{name}.md
prototype-prd-{name}.md
```

### Delivery (`docs/delivery/`)

Contains CTO planning and execution artifacts.

- **Not versioned.** These are living documents tied to current execution.
- Files are at the root of `delivery/` -- no sub-folders.
- Standard files (all required, create empty if not yet populated):

| File | Owner | Purpose |
|------|-------|---------|
| ARCHITECTURE.md | CTO Planner | System architecture, tech stack, key decisions |
| PLAN.md | CTO Planner | Work packages, phases, sequencing |
| TASKS.md | CTO Planner | Task breakdown with status tracking |
| TESTS.md | CTO Planner | Test specifications (GWT format) |
| PROGRESS.md | Senior Dev | Execution progress, completed work |
| BUGS.md | Senior Dev | Bug registry with status |

### Handoff (`docs/handoff/`)

Contains all cross-agent communication: agent memory files, strategic briefs, CEO decisions and feedback.

- **Flat.** No sub-folders. Everything at the root of `handoff/`.
- **Every agent reads this directory at invocation start.**
- **Every agent updates their memory file before closing.**

File naming conventions:

| Pattern | Purpose | Examples |
|---------|---------|---------|
| `{ROLE}-MEMORY.md` | Agent boot context | CPO-MEMORY.md, CTO-MEMORY.md, DEV-MEMORY.md |
| `CPO-BRIEF.md` | CPO synthesis for CEO | Single file, updated per briefing |
| `CTO-ADVISORY.md` | CTO advisor output | Technical feasibility, trade-offs |
| `DESIGN-TO-DEV.md` | Designer-to-dev handoff | What dev needs to know from design |
| `CEO-DECISION-{date}-{slug}.md` | CEO decision record | CEO-DECISION-2026-03-12-us22.md |
| `CEO-FEEDBACK-{date}-{slug}.md` | CEO feedback on deliverable | CEO-FEEDBACK-2026-03-13-prototype-r1.md |

---

## .vortex.json Configuration

Every product project includes a `docs` section in `.vortex.json`:

```json
{
  "name": "Project Name",
  "description": "Project description",
  "docs": {
    "root": "docs",
    "discovery": "docs/discovery",
    "design": "docs/design",
    "delivery": "docs/delivery",
    "handoff": "docs/handoff"
  }
}
```

These paths are the defaults. Projects MAY override them, but the standard paths should be used unless there is a specific reason not to.

---

## App Code Separation

When a product project produces an app (e.g., a Next.js frontend):

- The app code lives in its own directory/repository, separate from the product project.
- The app gets its own `.vortex.json` with a `designSource` field pointing to the product project.
- The app does NOT duplicate docs. Developers read delivery and handoff docs from the product project.
- The app MAY have a `prototype/` folder for early-stage code before it graduates to its own project.

Example app `.vortex.json`:

```json
{
  "name": "App Name",
  "description": "App description",
  "designSource": "../jarod/vortex-pm"
}
```

---

## Versioning Protocol

### When to create a new version

- **Discovery:** Pivot, new target persona discovered, fundamental re-framing of the problem space.
- **Design:** CEO decision that changes scope, priority, or direction. Design review that produces structural changes.

### When NOT to create a new version

- Fixing typos or clarifying language in existing artifacts.
- Adding detail to an existing persona, journey, or story.
- Iterative refinement within the same design direction.

### VERSION_SUMMARY.md format

```markdown
# Version Summary -- [discovery|design] v[N]

**Created:** [date]
**Trigger:** [What CEO decision, pivot, or event triggered this version]

## Changes from v[N-1]
- [What changed and why]
- [What changed and why]

## Key decisions
- [Decision that shaped this version]
```

For v1, the trigger is "initial creation" and there is no "changes from" section.
