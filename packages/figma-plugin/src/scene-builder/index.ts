/**
 * Scene Builder orchestrator.
 * Coordinates font preloading, undo batching, recursive node building,
 * and viewport scrolling for the build_scene command.
 */

import type { SceneNode as SceneSpec } from '@figma-fast/shared';
import { collectFonts, preloadFonts } from './fonts.js';
import { buildNode, type IdMap, type ImagePayloads } from './build-node.js';

export interface BuildSceneResult {
  success: boolean;
  rootNodeId: string;
  nodeIdMap: IdMap;
  nodeCount: number;
  errors: string[];
  fontSubstitutions: string[];
  durationMs: number;
}

export async function buildScene(
  spec: SceneSpec,
  parentId?: string,
  imagePayloads?: ImagePayloads,
): Promise<BuildSceneResult> {
  const startTime = Date.now();
  const idMap: IdMap = {};
  const errors: string[] = [];

  // 1. DETERMINE PARENT
  let parent: BaseNode & ChildrenMixin;
  if (parentId) {
    const found = await figma.getNodeByIdAsync(parentId);
    if (!found) {
      return {
        success: false,
        rootNodeId: '',
        nodeIdMap: {},
        nodeCount: 0,
        errors: [`Parent node not found: ${parentId}`],
        fontSubstitutions: [],
        durationMs: Date.now() - startTime,
      };
    }
    if (!('children' in found)) {
      return {
        success: false,
        rootNodeId: '',
        nodeIdMap: {},
        nodeCount: 0,
        errors: [`Parent node ${parentId} cannot have children`],
        fontSubstitutions: [],
        durationMs: Date.now() - startTime,
      };
    }
    parent = found as BaseNode & ChildrenMixin;
  } else {
    parent = figma.currentPage;
  }

  // 2. COLLECT FONTS from entire spec tree
  const fontRefs = collectFonts(spec);

  // 3. PRELOAD ALL FONTS in parallel
  const failedFontRefs = await preloadFonts(fontRefs);
  const failedFonts = new Set(failedFontRefs.map((f) => `${f.family}::${f.style}`));
  const fontSubstitutions = failedFontRefs.map((f) => `${f.family} ${f.style} → Inter Regular`);

  // 4. UNDO BATCHING — start batch
  try {
    if (typeof figma.commitUndo === 'function') {
      figma.commitUndo();
    }
  } catch {
    // commitUndo may not be available in all Figma API versions
  }

  // 5. BUILD NODE TREE
  let rootNodeId = '';
  try {
    const result = await buildNode(spec, parent, idMap, failedFonts, imagePayloads);
    rootNodeId = result.node.id;
    errors.push(...result.errors);
  } catch (err) {
    errors.push(`Fatal build error: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 6. UNDO BATCHING — end batch (single Ctrl+Z undoes entire build)
  try {
    if (typeof figma.commitUndo === 'function') {
      figma.commitUndo();
    }
  } catch {
    // Silently skip
  }

  // 7. VIEWPORT — scroll to show created nodes
  if (rootNodeId) {
    try {
      const rootNode = await figma.getNodeByIdAsync(rootNodeId);
      if (rootNode) {
        figma.viewport.scrollAndZoomIntoView([rootNode as SceneNode]);
      }
    } catch {
      // Non-critical
    }
  }

  // 8. COUNT NODES
  const nodeCount = Object.keys(idMap).length;

  return {
    success: rootNodeId !== '',
    rootNodeId,
    nodeIdMap: idMap,
    nodeCount,
    errors,
    fontSubstitutions,
    durationMs: Date.now() - startTime,
  };
}
