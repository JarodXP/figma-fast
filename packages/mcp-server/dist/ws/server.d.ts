/**
 * Embedded WebSocket server for FigmaFast.
 * Direct point-to-point connection — no relay, no channels.
 */
import type { ServerToPluginMessage, PluginToServerMessage } from '@figma-fast/shared';
/** Distributive Omit that works correctly over union types */
type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
/**
 * Start the WebSocket server on the given port.
 */
export declare function startWsServer(port?: number): void;
/**
 * Send a message to the Figma plugin and wait for a correlated response.
 */
export declare function sendToPlugin(message: DistributiveOmit<ServerToPluginMessage, 'id'>, timeoutMs?: number): Promise<PluginToServerMessage>;
/**
 * Check if the Figma plugin is currently connected.
 */
export declare function isPluginConnected(): boolean;
export {};
//# sourceMappingURL=server.d.ts.map