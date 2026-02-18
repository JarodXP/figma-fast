/**
 * FigmaFast plugin build script.
 * Bundles main.ts → dist/main.js (IIFE for Figma sandbox)
 * Copies manifest.json and ui.html to dist/
 */

import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, 'dist');

// Ensure dist directory exists
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Bundle main.ts → dist/main.js
await esbuild.build({
  entryPoints: [resolve(__dirname, 'src/main.ts')],
  bundle: true,
  format: 'iife',
  target: 'es2015',
  outfile: resolve(distDir, 'main.js'),
  sourcemap: false,
  minify: false,
});

// Copy static files to dist
copyFileSync(resolve(__dirname, 'manifest.json'), resolve(distDir, 'manifest.json'));
copyFileSync(resolve(__dirname, 'src/ui.html'), resolve(distDir, 'ui.html'));

console.log('Plugin built successfully → dist/');
