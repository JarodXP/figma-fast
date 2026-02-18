/**
 * FigmaFast plugin main thread.
 * Runs in the Figma sandbox — communicates with UI iframe via postMessage.
 */

import type { SceneNode as SceneSpec } from '@figma-fast/shared';
import { buildScene } from './scene-builder/index.js';
import {
  handleGetDocumentInfo,
  handleGetNodeInfo,
  handleGetSelection,
  handleGetStyles,
  handleGetLocalComponents,
  handleExportNode,
  handleModifyNode,
  handleDeleteNodes,
  handleMoveNode,
  handleCloneNode,
} from './handlers.js';

// Show plugin UI
figma.showUI(__html__, { visible: true, width: 300, height: 200 });

/** Send a successful result back to the UI bridge */
function sendResult(id: string, data: unknown): void {
  figma.ui.postMessage({ type: 'result', id, success: true, data });
}

/** Send an error result back to the UI bridge */
function sendError(id: string, err: unknown): void {
  figma.ui.postMessage({
    type: 'result',
    id,
    success: false,
    error: err instanceof Error ? err.message : String(err),
  });
}

// Handle messages from UI iframe (which bridges to the WS server)
figma.ui.onmessage = (msg: { type: string; id: string; [key: string]: unknown }) => {
  switch (msg.type) {
    case 'ping':
      figma.ui.postMessage({ type: 'pong', id: msg.id });
      break;

    case 'build_scene':
      buildScene(msg.spec as SceneSpec, msg.parentId as string | undefined)
        .then((result) => {
          figma.ui.postMessage({
            type: 'result',
            id: msg.id,
            success: result.success,
            data: result,
          });
        })
        .catch((err) => sendError(msg.id, err));
      break;

    // ─── Read Tools ──────────────────────────────────────────

    case 'get_document_info':
      handleGetDocumentInfo()
        .then((data) => sendResult(msg.id, data))
        .catch((err) => sendError(msg.id, err));
      break;

    case 'get_node_info':
      handleGetNodeInfo(msg.nodeId as string, msg.depth as number | undefined)
        .then((data) => sendResult(msg.id, data))
        .catch((err) => sendError(msg.id, err));
      break;

    case 'get_selection':
      handleGetSelection()
        .then((data) => sendResult(msg.id, data))
        .catch((err) => sendError(msg.id, err));
      break;

    case 'get_styles':
      handleGetStyles()
        .then((data) => sendResult(msg.id, data))
        .catch((err) => sendError(msg.id, err));
      break;

    case 'get_local_components':
      handleGetLocalComponents()
        .then((data) => sendResult(msg.id, data))
        .catch((err) => sendError(msg.id, err));
      break;

    case 'export_node':
      handleExportNode(msg.nodeId as string, msg.format as string, msg.scale as number)
        .then((data) => sendResult(msg.id, data))
        .catch((err) => sendError(msg.id, err));
      break;

    // ─── Edit Tools ──────────────────────────────────────────

    case 'modify_node':
      handleModifyNode(msg.nodeId as string, msg.properties as Partial<SceneSpec>)
        .then((data) => sendResult(msg.id, data))
        .catch((err) => sendError(msg.id, err));
      break;

    case 'delete_nodes':
      handleDeleteNodes(msg.nodeIds as string[])
        .then((data) => sendResult(msg.id, data))
        .catch((err) => sendError(msg.id, err));
      break;

    case 'move_node':
      handleMoveNode(
        msg.nodeId as string,
        msg.x as number | undefined,
        msg.y as number | undefined,
        msg.parentId as string | undefined,
        msg.index as number | undefined,
      )
        .then((data) => sendResult(msg.id, data))
        .catch((err) => sendError(msg.id, err));
      break;

    case 'clone_node':
      handleCloneNode(msg.nodeId as string)
        .then((data) => sendResult(msg.id, data))
        .catch((err) => sendError(msg.id, err));
      break;

    default:
      console.log(`[FigmaFast] Unknown message type: ${msg.type}`);
      sendError(msg.id, `Unknown command: ${msg.type}`);
      break;
  }
};
