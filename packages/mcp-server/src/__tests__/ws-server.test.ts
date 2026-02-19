import { describe, it, expect, afterEach } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';
import { sendToPlugin, startWsServer } from '../ws/server.js';

// TEST-NF-002: sendToPlugin rejects when no plugin connected
describe('sendToPlugin - no plugin connected', () => {
  it('rejects with "Figma plugin is not connected" when no plugin is connected', async () => {
    // The WS server module uses module-level state. If no plugin has ever connected
    // (or after disconnect), sendToPlugin should reject immediately.
    await expect(sendToPlugin({ type: 'ping' })).rejects.toThrow('Figma plugin is not connected');
  });
});

// TEST-NF-003: sendToPlugin rejects on timeout
describe('sendToPlugin - timeout', () => {
  let wss: WebSocketServer | null = null;
  let clientSocket: WebSocket | null = null;

  afterEach(async () => {
    // Clean up client socket
    if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.close();
    }
    clientSocket = null;

    // Close WS server
    await new Promise<void>((resolve) => {
      if (!wss) {
        resolve();
        return;
      }
      wss.close(() => resolve());
      wss = null;
    });
  });

  it('rejects with timeout error when plugin connects but never responds', async () => {
    // Pick a random high port to avoid conflicts
    const port = 39100 + Math.floor(Math.random() * 100);

    // Start our own WS server on this port (outside the module)
    // and start the module's WS server to the same port
    // The module-level startWsServer is idempotent (skips if already started).
    // We need to start it on a NEW port so it is actually started for this test.
    startWsServer(port);

    // Wait for the WS server to be listening
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    // Connect a mock client (acts as the "plugin") that never sends a response
    await new Promise<void>((resolve, reject) => {
      clientSocket = new WebSocket(`ws://localhost:${port}`);
      clientSocket.on('open', () => resolve());
      clientSocket.on('error', reject);
    });

    // Allow the server to process the connection event
    await new Promise<void>((resolve) => setTimeout(resolve, 20));

    // Now send a message with a short timeout
    await expect(sendToPlugin({ type: 'ping' }, 100)).rejects.toThrow(/timed out/i);
  }, 5000);
});
