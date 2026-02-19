"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ws_1 = require("ws");
const server_js_1 = require("../ws/server.js");
// TEST-NF-002: sendToPlugin rejects when no plugin connected
(0, vitest_1.describe)('sendToPlugin - no plugin connected', () => {
    (0, vitest_1.it)('rejects with "Figma plugin is not connected" when no plugin is connected', async () => {
        // The WS server module uses module-level state. If no plugin has ever connected
        // (or after disconnect), sendToPlugin should reject immediately.
        await (0, vitest_1.expect)((0, server_js_1.sendToPlugin)({ type: 'ping' })).rejects.toThrow('Figma plugin is not connected');
    });
});
// TEST-NF-003: sendToPlugin rejects on timeout
(0, vitest_1.describe)('sendToPlugin - timeout', () => {
    let wss = null;
    let clientSocket = null;
    (0, vitest_1.afterEach)(async () => {
        // Clean up client socket
        if (clientSocket && clientSocket.readyState === ws_1.WebSocket.OPEN) {
            clientSocket.close();
        }
        clientSocket = null;
        // Close WS server
        await new Promise((resolve) => {
            if (!wss) {
                resolve();
                return;
            }
            wss.close(() => resolve());
            wss = null;
        });
    });
    (0, vitest_1.it)('rejects with timeout error when plugin connects but never responds', async () => {
        // Pick a random high port to avoid conflicts
        const port = 39100 + Math.floor(Math.random() * 100);
        // Start our own WS server on this port (outside the module)
        // and start the module's WS server to the same port
        // The module-level startWsServer is idempotent (skips if already started).
        // We need to start it on a NEW port so it is actually started for this test.
        (0, server_js_1.startWsServer)(port);
        // Wait for the WS server to be listening
        await new Promise((resolve) => setTimeout(resolve, 50));
        // Connect a mock client (acts as the "plugin") that never sends a response
        await new Promise((resolve, reject) => {
            clientSocket = new ws_1.WebSocket(`ws://localhost:${port}`);
            clientSocket.on('open', () => resolve());
            clientSocket.on('error', reject);
        });
        // Allow the server to process the connection event
        await new Promise((resolve) => setTimeout(resolve, 20));
        // Now send a message with a short timeout
        await (0, vitest_1.expect)((0, server_js_1.sendToPlugin)({ type: 'ping' }, 100)).rejects.toThrow(/timed out/i);
    }, 5000);
});
//# sourceMappingURL=ws-server.test.js.map