/**
 * FigmaFast WebSocket relay client.
 *
 * Connects to a WS relay (starting one as a detached process if none is running) and
 * registers as an MCP client. Provides sendToPlugin / isPluginConnected for use by
 * tool handlers.
 *
 * Exported API (unchanged from pre-relay version):
 *   startWsServer(port?, clientName?): void
 *   sendToPlugin(message, timeoutMs?): Promise<PluginToServerMessage>
 *   isPluginConnected(): boolean
 *   _resetForTesting(): void   -- for testing only
 */
import type { ServerToPluginMessage, PluginToServerMessage } from '@figma-fast/shared';
/** Distributive Omit that works correctly over union types */
type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
/**
 * Reset all module state. ONLY for use in tests.
 */
export declare function _resetForTesting(): void;
/**
 * Start or connect to a WS relay and register as a client.
 * Idempotent for the same port.
 */
export declare function startWsServer(port?: number, clientName?: string): void;
/**
 * Send a message to the Figma plugin via the relay. Returns a Promise that resolves
 * with the plugin's response or rejects on timeout/inactive client/disconnected plugin.
 */
export declare function sendToPlugin(message: DistributiveOmit<ServerToPluginMessage, 'id'>, timeoutMs?: number): Promise<PluginToServerMessage>;
/**
 * Check if the Figma plugin is connected and this client is active.
 */
export declare function isPluginConnected(): boolean;
export {};
//# sourceMappingURL=server.d.ts.map