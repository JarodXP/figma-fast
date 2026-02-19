/**
 * Font utilities for the Scene Builder.
 * Pure logic (getFontStyle, collectFonts) is imported from @figma-fast/shared.
 * This file only contains preloadFonts which depends on the Figma API.
 */

export type { FontRef } from '@figma-fast/shared';
export { getFontStyle, collectFonts } from '@figma-fast/shared';

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
    }),
  );

  return failed;
}
