/**
 * Font utilities — pure logic functions extracted for testability.
 * preloadFonts (which depends on the Figma API) remains in the figma-plugin package.
 */
import type { SceneNode as SceneSpec } from './scene-spec.js';
export interface FontRef {
    family: string;
    style: string;
}
/**
 * Map numeric font weight to Figma style name.
 * Accepts string passthrough for direct style names like "Bold Italic".
 */
export declare function getFontStyle(weight: number | string | undefined): string;
/**
 * Walk the entire spec tree and collect all unique {family, style} pairs
 * from TEXT nodes. Must be called before building any nodes.
 */
export declare function collectFonts(spec: SceneSpec): FontRef[];
//# sourceMappingURL=fonts.d.ts.map