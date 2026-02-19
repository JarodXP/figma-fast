/**
 * Detect properties that will be silently ignored by Figma for a given node type.
 * Returns an array of warning strings, each prefixed with "[warning]".
 * These warnings are informational -- they do NOT block the operation.
 */
export declare function detectIgnoredProperties(nodeType: string, parentType: string | undefined, properties: Record<string, unknown>): string[];
//# sourceMappingURL=warnings.d.ts.map