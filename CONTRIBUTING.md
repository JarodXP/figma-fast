# Contributing to figma-fast

Thank you for your interest in contributing! This document covers how to get set up and how to submit contributions.

## Prerequisites

- Node.js 20+
- npm 10+
- A Figma account (free or paid)
- A Figma personal access token for tools that call the Figma REST API

## Setup

```bash
git clone https://github.com/<your-org>/figma-fast.git
cd figma-fast
npm install
npm run build
```

## Project structure

```
packages/
  figma-plugin/   # Figma plugin (runs inside Figma, TypeScript)
  mcp-server/     # MCP server (runs locally, exposes tools to AI clients)
  shared/         # Types and utilities shared between the two packages
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed breakdown.

## Development workflow

```bash
# Build all packages
npm run build

# Run tests
npm test

# Run linter
npm run lint
```

### Working on the plugin

The plugin must be built before loading it in Figma:

```bash
cd packages/figma-plugin
npm run build
```

Then load the `packages/figma-plugin/dist/` folder as a local plugin in Figma (Plugins → Development → Import plugin from manifest).

### Working on the MCP server

```bash
cd packages/mcp-server
npm run dev   # runs via tsx (no build step needed)
```

## Submitting changes

1. Fork the repository and create a branch from `main`.
2. Make your changes and add or update tests as needed.
3. Ensure `npm test` and `npm run lint` pass.
4. Open a pull request against `main` with a clear description of the problem and solution.

## Reporting bugs

Please open a GitHub issue with:
- A clear title and description
- Steps to reproduce
- Expected vs. actual behavior
- Figma version and OS if relevant

## Code style

This project uses ESLint and Prettier. Run `npm run lint` before submitting. Formatting is enforced via `.prettierrc` at the root.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
