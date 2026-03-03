/**
 * WsRelay -- in-process WebSocket relay for multi-client connection switching.
 *
 * The relay is the single WebSocket server (bound to a port). All MCP servers and
 * the Figma plugin connect to it as clients. The relay:
 *   - Identifies connections as either "plugin" (sends hello) or "MCP client" (sends register)
 *   - Maintains a registry of MCP clients with an "active" designation
 *   - Forwards commands from the active client to the plugin
 *   - Routes plugin responses back to the originating client via correlation ID
 *   - Sends immediate error responses for inactive clients or missing plugin
 *   - Broadcasts client_list to plugin on any registry change (Phase 2)
 *   - Handles set_active_client from plugin to switch the active client (Phase 2)
 */
import { WebSocket } from 'ws';
interface ClientEntry {
    socket: WebSocket;
    clientName: string;
    connectedAt: number;
}
export declare class WsRelay {
    private port;
    private wss;
    private _pluginSocket;
    private clients;
    private _activeClientId;
    private pendingMessageSources;
    constructor(port: number);
    start(): Promise<void>;
    close(): Promise<void>;
    /** Read-only accessors for testing */
    get clientRegistry(): Map<string, ClientEntry>;
    get currentActiveClientId(): string | null;
    get currentPluginSocket(): WebSocket | null;
    private handleNewConnection;
    private handlePluginConnection;
    private broadcastToClients;
    /**
     * Broadcast the current client list to the plugin.
     * Called on any registry change: client connect, client disconnect, active switch.
     */
    private broadcastClientList;
    private handleClientRegistration;
    private handleClientDisconnect;
    private handleClientMessage;
    private handlePluginMessage;
    private handleSetActiveClient;
}
export {};
//# sourceMappingURL=relay.d.ts.map