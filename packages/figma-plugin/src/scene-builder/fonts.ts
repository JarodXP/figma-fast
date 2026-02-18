/**
 * Font utilities for the Scene Builder.
 * Handles font collection, preloading, and weight-to-style mapping.
 */

import type { SceneNode as SceneSpec } from '@figma-fast/shared';

export interface FontRef {
  family: string;
  style: string;
}

const FALLBACK_FONT: FontRef = { family: 'Inter', style: 'Regular' };

/**
 * Map numeric font weight to Figma style name.
 * Accepts string passthrough for direct style names like "Bold Italic".
 */
export function getFontStyle(weight: number | string | undefined): string {
  if (typeof weight === 'string') return weight;
  switch (weight) {
    case 100: return 'Thin';
    case 200: return 'Extra Light';
    case 300: return 'Light';
    case 400: return 'Regular';
    case 500: return 'Medium';
    case 600: return 'Semi Bold';
    case 700: return 'Bold';
    case 800: return 'Extra Bold';
    case 900: return 'Black';
    default: return 'Regular';
  }
}

/**
 * Walk the entire spec tree and collect all unique {family, style} pairs
 * from TEXT nodes. Must be called before building any nodes.
 */
export function collectFonts(spec: SceneSpec): FontRef[] {
  const seen = new Set<string>();
  const fonts: FontRef[] = [];

  function walk(node: SceneSpec): void {
    if (node.type === 'TEXT') {
      const family = node.fontFamily ?? 'Inter';
      const style = getFontStyle(node.fontWeight);
      const key = `${family}::${style}`;
      if (!seen.has(key)) {
        seen.add(key);
        fonts.push({ family, style });
      }
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  walk(spec);

  // Always ensure the fallback font is included
  const fallbackKey = `${FALLBACK_FONT.family}::${FALLBACK_FONT.style}`;
  if (!seen.has(fallbackKey)) {
    fonts.push(FALLBACK_FONT);
  }

  return fonts;
}

/**
 * Load all collected fonts in parallel with per-font fallback.
 * Returns array of fonts that failed to load (for substitution reporting).
 */
export async function preloadFonts(fonts: FontRef[]): Promise<FontRef[]> {
  const failed: FontRef[] = [];

  await Promise.all(
    fonts.map(async (font) => {
      try {
        await figma.loadFontAsync(font);
      } catch {
        console.warn(`[FigmaFast] Font not available: ${font.family} ${font.style}`);
        failed.push(font);
      }
    })
  );

  return failed;
}
