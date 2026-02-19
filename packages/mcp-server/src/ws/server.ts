/**
 * Embedded WebSocket server for FigmaFast.
 * Direct point-to-point connection — no relay, no channels.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import type { ServerToPluginMessage, PluginToServerMessage } from '@figma-fast/shared';

/** Distributive Omit that works correctly over union types */
type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

interface PendingRequest {
  resolve: (msg: PluginToServerMessage) => void;
  reject: (err: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

let wss: WebSocketServer | null = null;
let pluginSocket: WebSocket | null = null;
const pendingRequests = new Map<string, PendingRequest>();

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Start the WebSocket server on the given port.
 */
export function startWsServer(port: number = 3055): void {
  if (wss) return;

  wss = new WebSocketServer({ port });

  wss.on('listening', () => {
    console.error(`[FigmaFast] WebSocket server listening on port ${port}`);
  });

  wss.on('connection', (socket) => {
    console.error('[FigmaFast] Figma plugin connected');

    // Only track one plugin connection (point-to-point)
    // Don't close the old socket — that triggers UI reconnect loops.
    // Just silently replace it; the old one will close on its own.
    if (pluginSocket && pluginSocket.readyState === WebSocket.OPEN) {
      console.error('[FigmaFast] Replacing existing plugin connection');
    }
    pluginSocket = socket;

    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as PluginToServerMessage;
        handlePluginMessage(msg);
      } catch (err) {
        console.error('[FigmaFast] Failed to parse plugin message:', err);
      }
    });

    socket.on('close', () => {
      // Only act if THIS socket is still the active one
      if (pluginSocket === socket) {
        console.error('[FigmaFast] Figma plugin disconnected');
        pluginSocket = null;
        // Reject all pending requests
        for (const [id, req] of pendingRequests) {
          clearTimeout(req.timeout);
          req.reject(new Error('Plugin disconnected'));
          pendingRequests.delete(id);
        }
      }
    });

    socket.on('error', (err) => {
      console.error('[FigmaFast] Socket error:', err.message);
    });
  });

  wss.on('error', (err) => {
    console.error('[FigmaFast] WebSocket server error:', err.message);
  });
}

/**
 * Handle an incoming message from the plugin.
 */
function handlePluginMessage(msg: PluginToServerMessage): void {
  if (msg.type === 'pong' || msg.type === 'result') {
    const pending = pendingRequests.get(msg.id);
    if (pending) {
      clearTimeout(pending.timeout);
      pendingRequests.delete(msg.id);
      pending.resolve(msg);
    }
  }
}

/**
 * Send a message to the Figma plugin and wait for a correlated response.
 */
export function sendToPlugin(
  message: DistributiveOmit<ServerToPluginMessage, 'id'>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<PluginToServerMessage> {
  return new Promise((resolve, reject) => {
    if (!pluginSocket || pluginSocket.readyState !== WebSocket.OPEN) {
      reject(new Error('Figma plugin is not connected. Open the FigmaFast plugin in Figma.'));
      return;
    }

    const id = randomUUID();
    const fullMessage = { ...message, id } as ServerToPluginMessage;

    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`Request timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    pendingRequests.set(id, { resolve, reject, timeout });

    pluginSocket.send(JSON.stringify(fullMessage));
  });
}

/**
 * Check if the Figma plugin is currently connected.
 */
export function isPluginConnected(): boolean {
  return pluginSocket !== null && pluginSocket.readyState === WebSocket.OPEN;
}
