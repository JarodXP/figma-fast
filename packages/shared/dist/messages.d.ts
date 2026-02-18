/**
 * WebSocket message protocol types for FigmaFast.
 * All communication between MCP server and Figma plugin uses these types.
 */
import type { SceneNode } from './scene-spec.js';
/** Modification to apply to an existing node */
export interface Modification {
    nodeId: string;
    properties: Partial<SceneNode>;
}
/** Messages sent from MCP server to Figma plugin */
export type ServerToPluginMessage = {
    type: 'ping';
    id: string;
} | {
    type: 'build_scene';
    id: string;
    spec: SceneNode;
    parentId?: string;
} | {
    type: 'batch_modify';
    id: string;
    modifications: Modification[];
} | {
    type: 'read_node';
    id: string;
    nodeId: string;
    depth?: number;
} | {
    type: 'get_document_info';
    id: string;
} | {
    type: 'get_node_info';
    id: string;
    nodeId: string;
    depth?: number;
} | {
    type: 'get_selection';
    id: string;
} | {
    type: 'get_styles';
    id: string;
} | {
    type: 'get_local_components';
    id: string;
} | {
    type: 'export_node';
    id: string;
    nodeId: string;
    format: string;
    scale: number;
} | {
    type: 'modify_node';
    id: string;
    nodeId: string;
    properties: Partial<SceneNode>;
} | {
    type: 'delete_nodes';
    id: string;
    nodeIds: string[];
} | {
    type: 'move_node';
    id: string;
    nodeId: string;
    x?: number;
    y?: number;
    parentId?: string;
    index?: number;
} | {
    type: 'clone_node';
    id: string;
    nodeId: string;
};
/** Messages sent from Figma plugin to MCP server */
export type PluginToServerMessage = {
    type: 'pong';
    id: string;
} | {
    type: 'result';
    id: string;
    success: boolean;
    data?: unknown;
    error?: string;
};
/** Union of all WebSocket messages */
export type WsMessage = ServerToPluginMessage | PluginToServerMessage;
//# sourceMappingURL=messages.d.ts.map