"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectIgnoredProperties = detectIgnoredProperties;
/**
 * Detect properties that will be silently ignored by Figma for a given node type.
 * Returns an array of warning strings, each prefixed with "[warning]".
 * These warnings are informational -- they do NOT block the operation.
 */
function detectIgnoredProperties(nodeType, parentType, properties) {
    const warnings = [];
    // Rule 1: x/y on children of COMPONENT_SET are auto-managed
    if (parentType === 'COMPONENT_SET') {
        if ('x' in properties)
            warnings.push('[warning] x is ignored on children of COMPONENT_SET (positions are auto-managed by Figma)');
        if ('y' in properties)
            warnings.push('[warning] y is ignored on children of COMPONENT_SET (positions are auto-managed by Figma)');
    }
    // Rule 2: Layout properties on TEXT nodes
    if (nodeType === 'TEXT') {
        const layoutProps = ['layoutMode', 'itemSpacing', 'padding', 'primaryAxisAlignItems', 'counterAxisAlignItems'];
        for (const prop of layoutProps) {
            if (prop in properties) {
                warnings.push(`[warning] ${prop} is ignored on TEXT nodes (TEXT does not support auto-layout)`);
            }
        }
    }
    // Rule 3: Text properties on non-TEXT nodes
    if (nodeType !== 'TEXT') {
        const textProps = [
            'characters',
            'fontSize',
            'fontFamily',
            'fontWeight',
            'fontStyle',
            'textAlignHorizontal',
            'textAlignVertical',
            'textAutoResize',
            'lineHeight',
            'letterSpacing',
            'textDecoration',
            'textCase',
            'textStyleId',
        ];
        for (const prop of textProps) {
            if (prop in properties) {
                warnings.push(`[warning] ${prop} is ignored on ${nodeType} nodes (only TEXT nodes support text properties)`);
            }
        }
    }
    // Rule 4: Structural changes on INSTANCE nodes (read-only structure)
    if (nodeType === 'INSTANCE') {
        const structuralProps = ['layoutMode', 'children'];
        for (const prop of structuralProps) {
            if (prop in properties) {
                warnings.push(`[warning] ${prop} is ignored on INSTANCE nodes (structure is controlled by the main component)`);
            }
        }
    }
    return warnings;
}
//# sourceMappingURL=warnings.js.map