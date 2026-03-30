#!/usr/bin/env node
/**
 * Build script for the Figma Fast Claude Desktop Extension (.mcpb / .dxt).
 *
 * Produces:
 *   dist-ext/
 *     manifest.json
 *     server/index.js          — main MCP server (single-file bundle)
 *     server/relay-process.js  — forked relay process (single-file bundle)
 *     icon.png                 — optional icon
 *
 * Then zips the directory into figma-fast.mcpb.
 */

import { execSync } from 'child_process';
import { mkdirSync, cpSync, existsSync, rmSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'dist-ext');
const SERVER_OUT = resolve(OUT, 'server');

// Clean previous build
if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(SERVER_OUT, { recursive: true });

console.log('[ext] Bundling MCP server with esbuild...');

const ESBUILD_COMMON = [
  '--bundle',
  '--platform=node',
  '--target=node18',
  '--format=cjs',
  '--external:bufferutil',
  '--external:utf-8-validate',
].join(' ');

// Bundle 1: main entry point
execSync(
  `npx esbuild packages/mcp-server/src/index.ts ${ESBUILD_COMMON} --outfile=${SERVER_OUT}/index.js`,
  { cwd: ROOT, stdio: 'inherit' }
);

// Bundle 2: relay-process (forked as child process, must be separate file)
execSync(
  `npx esbuild packages/mcp-server/src/ws/relay-process.ts ${ESBUILD_COMMON} --outfile=${SERVER_OUT}/relay-process.js`,
  { cwd: ROOT, stdio: 'inherit' }
);

// Write a package.json declaring CJS so Node doesn't treat bundles as ESM
writeFileSync(resolve(SERVER_OUT, 'package.json'), JSON.stringify({ type: 'commonjs' }));

console.log('[ext] Copying manifest and assets...');

// Copy manifest.json
cpSync(resolve(ROOT, 'manifest.json'), resolve(OUT, 'manifest.json'));

// Copy icon if available
const iconSrc = resolve(ROOT, 'assets/logo.png');
if (existsSync(iconSrc)) {
  cpSync(iconSrc, resolve(OUT, 'icon.png'));
}

console.log('[ext] Creating .mcpb archive...');

// Remove old archive
const archivePath = resolve(ROOT, 'figma-fast.mcpb');
if (existsSync(archivePath)) rmSync(archivePath);

// Create zip (mcpb is just a zip)
execSync(`cd "${OUT}" && zip -r "${archivePath}" .`, { stdio: 'inherit' });

console.log(`[ext] Done! Extension built: figma-fast.mcpb`);
