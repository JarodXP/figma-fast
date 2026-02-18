"use strict";
/**
 * Embedded WebSocket server for FigmaFast.
 * Direct point-to-point connection — no relay, no channels.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWsServer = startWsServer;
exports.sendToPlugin = sendToPlugin;
exports.isPluginConnected = isPluginConnected;
const ws_1 = require("ws");
const crypto_1 = require("crypto");
let wss = null;
let pluginSocket = null;
const pendingRequests = new Map();
const DEFAULT_TIMEOUT_MS = 30_000;
/**
 * Start the WebSocket server on the given port.
 */
function startWsServer(port = 3055) {
    if (wss)
        return;
    wss = new ws_1.WebSocketServer({ port });
    wss.on('listening', () => {
        console.error(`[FigmaFast] WebSocket server listening on port ${port}`);
    });
    wss.on('connection', (socket) => {
        console.error('[FigmaFast] Figma plugin connected');
        // Only track one plugin connection (point-to-point)
        // Don't close the old socket — that triggers UI reconnect loops.
        // Just silently replace it; the old one will close on its own.
        if (pluginSocket && pluginSocket.readyState === ws_1.WebSocket.OPEN) {
            console.error('[FigmaFast] Replacing existing plugin connection');
        }
        pluginSocket = socket;
        socket.on('message', (raw) => {
            try {
                const msg = JSON.parse(raw.toString());
                handlePluginMessage(msg);
            }
            catch (err) {
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
function handlePluginMessage(msg) {
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
function sendToPlugin(message, timeoutMs = DEFAULT_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        if (!pluginSocket || pluginSocket.readyState !== ws_1.WebSocket.OPEN) {
            reject(new Error('Figma plugin is not connected. Open the FigmaFast plugin in Figma.'));
            return;
        }
        const id = (0, crypto_1.randomUUID)();
        const fullMessage = { ...message, id };
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
function isPluginConnected() {
    return pluginSocket !== null && pluginSocket.readyState === ws_1.WebSocket.OPEN;
}
//# sourceMappingURL=server.js.map