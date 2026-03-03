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

import { WebSocket, WebSocketServer } from 'ws';

interface ClientEntry {
  socket: WebSocket;
  clientName: string;
  connectedAt: number;
}

interface PendingSource {
  clientId: string;
}

export class WsRelay {
  private wss: WebSocketServer | null = null;
  private _pluginSocket: WebSocket | null = null;
  private clients: Map<string, ClientEntry> = new Map();
  private _activeClientId: string | null = null;
  private pendingMessageSources: Map<string, PendingSource> = new Map();

  constructor(private port: number) {}

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wss = new WebSocketServer({ port: this.port });

      wss.on('listening', () => {
        this.wss = wss;
        resolve();
      });

      wss.on('error', (err) => {
        reject(err);
      });

      wss.on('connection', (socket) => {
        this.handleNewConnection(socket);
      });
    });
  }

  async close(): Promise<void> {
    // Close all client sockets
    for (const entry of this.clients.values()) {
      if (entry.socket.readyState === WebSocket.OPEN) {
        entry.socket.close();
      }
    }
    this.clients.clear();
    this._activeClientId = null;

    // Close plugin socket
    if (this._pluginSocket && this._pluginSocket.readyState === WebSocket.OPEN) {
      this._pluginSocket.close();
    }
    this._pluginSocket = null;

    // Close the server
    return new Promise((resolve) => {
      if (!this.wss) {
        resolve();
        return;
      }
      this.wss.close(() => {
        this.wss = null;
        resolve();
      });
    });
  }

  /** Read-only accessors for testing */
  get clientRegistry(): Map<string, ClientEntry> {
    return this.clients;
  }

  get currentActiveClientId(): string | null {
    return this._activeClientId;
  }

  get currentPluginSocket(): WebSocket | null {
    return this._pluginSocket;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private handleNewConnection(socket: WebSocket): void {
    // Wait for the first message to classify the connection
    let classified = false;

    const onFirstMessage = (raw: Buffer | string) => {
      socket.off('message', onFirstMessage);
      classified = true;

      let msg: { type: string; clientId?: string; clientName?: string; ts?: number };
      try {
        msg = JSON.parse(raw.toString()) as typeof msg;
      } catch (err) {
        console.error('[FigmaFast] Relay: malformed first message', err);
        return;
      }

      if (msg.type === 'hello') {
        this.handlePluginConnection(socket);
      } else if (msg.type === 'register' && msg.clientId && msg.clientName) {
        this.handleClientRegistration(socket, msg.clientId, msg.clientName);
      } else {
        // Unknown connection type — log and ignore
        console.error('[FigmaFast] Relay: unknown connection type, first message:', msg.type);
      }
    };

    socket.on('message', onFirstMessage);

    socket.on('error', (err) => {
      if (!classified) {
        socket.off('message', onFirstMessage);
      }
      console.error('[FigmaFast] Relay: socket error:', err.message);
    });
  }

  private handlePluginConnection(socket: WebSocket): void {
    console.error('[FigmaFast] Relay: Figma plugin connected');

    // Replace old plugin connection if any
    if (this._pluginSocket && this._pluginSocket.readyState === WebSocket.OPEN) {
      console.error('[FigmaFast] Relay: replacing existing plugin connection');
    }
    this._pluginSocket = socket;

    // Notify all registered clients that plugin is connected
    this.broadcastToClients(JSON.stringify({ type: 'plugin_connected' }));

    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type: string; id?: string; clientId?: string };
        this.handlePluginMessage(socket, msg);
      } catch (err) {
        console.error('[FigmaFast] Relay: malformed plugin message', err);
      }
    });

    socket.on('close', () => {
      if (this._pluginSocket === socket) {
        console.error('[FigmaFast] Relay: Figma plugin disconnected');
        this._pluginSocket = null;

        // Notify all registered clients that plugin disconnected
        this.broadcastToClients(JSON.stringify({ type: 'plugin_disconnected' }));

        // Reject all pending requests
        for (const [id, source] of this.pendingMessageSources) {
          const clientEntry = this.clients.get(source.clientId);
          if (clientEntry && clientEntry.socket.readyState === WebSocket.OPEN) {
            clientEntry.socket.send(
              JSON.stringify({ type: 'relay_error', id, error: 'Plugin disconnected' }),
            );
          }
          this.pendingMessageSources.delete(id);
        }
      }
    });

    socket.on('error', (err) => {
      console.error('[FigmaFast] Relay: plugin socket error:', err.message);
    });
  }

  private broadcastToClients(data: string): void {
    for (const entry of this.clients.values()) {
      if (entry.socket.readyState === WebSocket.OPEN) {
        entry.socket.send(data);
      }
    }
  }

  /**
   * Broadcast the current client list to the plugin.
   * Called on any registry change: client connect, client disconnect, active switch.
   */
  private broadcastClientList(): void {
    if (!this._pluginSocket || this._pluginSocket.readyState !== WebSocket.OPEN) {
      return;
    }

    const clients = Array.from(this.clients.entries()).map(([clientId, entry]) => ({
      clientId,
      clientName: entry.clientName,
      isActive: clientId === this._activeClientId,
      connectedAt: entry.connectedAt,
    }));

    this._pluginSocket.send(JSON.stringify({ type: 'client_list', clients }));
  }

  private handleClientRegistration(socket: WebSocket, clientId: string, clientName: string): void {
    console.error(`[FigmaFast] Relay: MCP client registered: ${clientName} (${clientId})`);

    const isFirstClient = this.clients.size === 0;
    const isActive = isFirstClient;

    if (isActive) {
      this._activeClientId = clientId;
    }

    this.clients.set(clientId, { socket, clientName, connectedAt: Date.now() });

    // Send registered confirmation
    socket.send(JSON.stringify({ type: 'registered', clientId, isActive }));

    // Broadcast updated client list to plugin
    this.broadcastClientList();

    // Set up message handler for this client
    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type: string; id?: string };
        this.handleClientMessage(clientId, msg);
      } catch (err) {
        console.error('[FigmaFast] Relay: malformed client message', err);
      }
    });

    socket.on('close', () => {
      this.handleClientDisconnect(clientId);
    });

    socket.on('error', (err) => {
      console.error(`[FigmaFast] Relay: client ${clientId} socket error:`, err.message);
    });
  }

  private handleClientDisconnect(clientId: string): void {
    console.error(`[FigmaFast] Relay: client disconnected: ${clientId}`);
    this.clients.delete(clientId);

    if (this._activeClientId === clientId) {
      this._activeClientId = null;
    }

    // Broadcast updated client list to plugin
    this.broadcastClientList();
  }

  private handleClientMessage(clientId: string, msg: { type: string; id?: string }): void {
    const isActive = this._activeClientId === clientId;

    if (!isActive) {
      // Reject inactive client
      const activeEntry = this._activeClientId ? this.clients.get(this._activeClientId) : null;
      const activeName = activeEntry?.clientName ?? 'unknown';
      const clientEntry = this.clients.get(clientId);
      if (clientEntry && clientEntry.socket.readyState === WebSocket.OPEN) {
        clientEntry.socket.send(
          JSON.stringify({
            type: 'result',
            id: msg.id ?? '',
            success: false,
            error: `Another client is currently active: ${activeName}`,
          }),
        );
      }
      return;
    }

    // Active client — check plugin is connected
    if (!this._pluginSocket || this._pluginSocket.readyState !== WebSocket.OPEN) {
      const clientEntry = this.clients.get(clientId);
      if (clientEntry && clientEntry.socket.readyState === WebSocket.OPEN) {
        clientEntry.socket.send(
          JSON.stringify({
            type: 'relay_error',
            id: msg.id ?? '',
            error: 'Figma plugin is not connected. Open the FigmaFast plugin in Figma.',
          }),
        );
      }
      return;
    }

    // Forward message to plugin, track correlation ID
    if (msg.id) {
      this.pendingMessageSources.set(msg.id, { clientId });
    }
    this._pluginSocket.send(JSON.stringify(msg));
  }

  private handlePluginMessage(socket: WebSocket, msg: { type: string; id?: string; clientId?: string }): void {
    if (socket !== this._pluginSocket) {
      // Stale plugin socket — ignore
      return;
    }

    // Handle set_active_client from plugin
    if (msg.type === 'set_active_client') {
      this.handleSetActiveClient(msg.clientId);
      return;
    }

    // Route response back to originating client via correlation ID
    if (msg.id) {
      const source = this.pendingMessageSources.get(msg.id);
      if (source) {
        this.pendingMessageSources.delete(msg.id);
        const clientEntry = this.clients.get(source.clientId);
        if (clientEntry && clientEntry.socket.readyState === WebSocket.OPEN) {
          clientEntry.socket.send(JSON.stringify(msg));
        }
        return;
      }
    }

    // No correlation ID or no pending source — forward to active client as fallback
    if (this._activeClientId) {
      const activeEntry = this.clients.get(this._activeClientId);
      if (activeEntry && activeEntry.socket.readyState === WebSocket.OPEN) {
        activeEntry.socket.send(JSON.stringify(msg));
      }
    }
  }

  private handleSetActiveClient(newClientId: string | undefined): void {
    if (!newClientId) return;

    const newEntry = this.clients.get(newClientId);
    if (!newEntry) {
      console.error(`[FigmaFast] Relay: set_active_client ignored — unknown clientId: ${newClientId}`);
      return;
    }

    const oldClientId = this._activeClientId;

    // No-op if already active
    if (oldClientId === newClientId) return;

    // Deactivate old client
    if (oldClientId) {
      const oldEntry = this.clients.get(oldClientId);
      if (oldEntry && oldEntry.socket.readyState === WebSocket.OPEN) {
        oldEntry.socket.send(
          JSON.stringify({
            type: 'deactivated',
            reason: `User switched to '${newEntry.clientName}'`,
          }),
        );
      }
    }

    // Activate new client
    this._activeClientId = newClientId;
    if (newEntry.socket.readyState === WebSocket.OPEN) {
      newEntry.socket.send(JSON.stringify({ type: 'activated' }));
    }

    console.error(`[FigmaFast] Relay: active client switched to ${newEntry.clientName} (${newClientId})`);

    // Broadcast updated client list to plugin
    this.broadcastClientList();
  }
}
