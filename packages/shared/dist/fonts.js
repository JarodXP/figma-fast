"use strict";
/**
 * Font utilities — pure logic functions extracted for testability.
 * preloadFonts (which depends on the Figma API) remains in the figma-plugin package.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFontStyle = getFontStyle;
exports.collectFonts = collectFonts;
const FALLBACK_FONT = { family: 'Inter', style: 'Regular' };
/**
 * Map numeric font weight to Figma style name.
 * Accepts string passthrough for direct style names like "Bold Italic".
 */
function getFontStyle(weight) {
    if (typeof weight === 'string')
        return weight;
    switch (weight) {
        case 100:
            return 'Thin';
        case 200:
            return 'Extra Light';
        case 300:
            return 'Light';
        case 400:
            return 'Regular';
        case 500:
            return 'Medium';
        case 600:
            return 'Semi Bold';
        case 700:
            return 'Bold';
        case 800:
            return 'Extra Bold';
        case 900:
            return 'Black';
        default:
            return 'Regular';
    }
}
/**
 * Walk the entire spec tree and collect all unique {family, style} pairs
 * from TEXT nodes. Must be called before building any nodes.
 */
function collectFonts(spec) {
    const seen = new Set();
    const fonts = [];
    function walk(node) {
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
//# sourceMappingURL=fonts.js.map