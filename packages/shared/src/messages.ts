/**
 * WebSocket message protocol types for FigmaFast.
 * All communication between MCP server and Figma plugin uses these types.
 */

import type { SceneNode, Fill, Effect, LineHeight, TextDecoration, TextCase } from './scene-spec.js';

/** Modification to apply to an existing node */
export interface Modification {
  nodeId: string;
  properties: Partial<SceneNode>;
}

/** Component property definition for manage_component_properties */
export interface ComponentPropertyDefinition {
  name: string;
  type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT';
  defaultValue: string | boolean;
  variantOptions?: string[];
}

/** Messages sent from MCP server to Figma plugin */
export type ServerToPluginMessage =
  | { type: 'ping'; id: string }
  | {
      type: 'build_scene';
      id: string;
      spec: SceneNode;
      parentId?: string;
      /** Map of imageUrl -> base64 image data for IMAGE fills */
      imagePayloads?: Record<string, string>;
    }
  | { type: 'batch_modify'; id: string; modifications: Modification[] }
  | { type: 'read_node'; id: string; nodeId: string; depth?: number }
  | { type: 'get_document_info'; id: string }
  | { type: 'get_node_info'; id: string; nodeId: string; depth?: number }
  | { type: 'get_selection'; id: string }
  | { type: 'get_styles'; id: string }
  | { type: 'get_local_components'; id: string }
  | { type: 'export_node'; id: string; nodeId: string; format: string; scale: number }
  | { type: 'modify_node'; id: string; nodeId: string; properties: Partial<SceneNode> }
  | { type: 'delete_nodes'; id: string; nodeIds: string[] }
  | { type: 'move_node'; id: string; nodeId: string; x?: number; y?: number; parentId?: string; index?: number }
  | { type: 'clone_node'; id: string; nodeId: string }
  | { type: 'convert_to_component'; id: string; nodeId: string }
  | { type: 'combine_as_variants'; id: string; nodeIds: string[]; name?: string }
  | {
      type: 'manage_component_properties';
      id: string;
      componentId: string;
      action: 'add' | 'update' | 'delete';
      properties: ComponentPropertyDefinition[];
    }
  // Phase 6: Page Management
  | { type: 'create_page'; id: string; name: string }
  | { type: 'rename_page'; id: string; pageId: string; name: string }
  | { type: 'set_current_page'; id: string; pageId: string }
  // Phase 7B: Style Creation
  | { type: 'create_paint_style'; id: string; name: string; fills: Fill[] }
  | {
      type: 'create_text_style';
      id: string;
      name: string;
      fontFamily?: string;
      fontSize?: number;
      fontWeight?: number | string;
      lineHeight?: number | LineHeight;
      letterSpacing?: number;
      textDecoration?: TextDecoration;
      textCase?: TextCase;
    }
  | { type: 'create_effect_style'; id: string; name: string; effects: Effect[] }
  // Phase 8: Image Fills
  | {
      type: 'set_image_fill';
      id: string;
      nodeId: string;
      imageData: string;
      scaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE';
    }
  | { type: 'get_image_fill'; id: string; nodeId: string; fillIndex?: number }
  // Phase 9: Boolean Operations
  | {
      type: 'boolean_operation';
      id: string;
      operation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE';
      nodeIds: string[];
    }
  // Phase 10D: Batch Read
  | { type: 'batch_get_node_info'; id: string; nodeIds: string[]; depth?: number };

/** Messages sent from Figma plugin to MCP server */
export type PluginToServerMessage =
  | { type: 'pong'; id: string }
  | { type: 'result'; id: string; success: boolean; data?: unknown; error?: string };

/** Union of all WebSocket messages */
export type WsMessage = ServerToPluginMessage | PluginToServerMessage;
