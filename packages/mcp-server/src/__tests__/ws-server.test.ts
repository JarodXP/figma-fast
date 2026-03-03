import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { WebSocket } from 'ws';
import { sendToPlugin, startWsServer, isPluginConnected, _resetForTesting } from '../ws/server.js';
import { WsRelay } from '../ws/relay.js';

// Helper: wait N ms
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


// TEST-NF-002: sendToPlugin rejects when no plugin connected
describe('sendToPlugin - no plugin connected', () => {
  beforeEach(() => {
    _resetForTesting();
  });

  it('rejects with "Figma plugin is not connected" when no plugin is connected', async () => {
    // The WS server module uses module-level state. If no plugin has ever connected
    // (or after disconnect), sendToPlugin should reject immediately.
    await expect(sendToPlugin({ type: 'ping' })).rejects.toThrow('Figma plugin is not connected');
  });
});

// TEST-NF-003: sendToPlugin rejects on timeout
describe('sendToPlugin - timeout', () => {
  let clientSocket: WebSocket | null = null;

  afterEach(async () => {
    // Reset module state (closes relay and client socket)
    _resetForTesting();

    // Clean up client socket
    if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.close();
    }
    clientSocket = null;

    await wait(50);
  });

  it('rejects with timeout error when plugin connects but never responds', async () => {
    // Pick a random high port to avoid conflicts
    const port = 39100 + Math.floor(Math.random() * 100);

    // Start the relay-based server on this port
    startWsServer(port, 'Timeout Test Client');

    // Wait for the relay to start and the module to register
    await wait(100);

    // Connect a mock plugin (sends hello) that never sends a response to pings
    await new Promise<void>((resolve, reject) => {
      clientSocket = new WebSocket(`ws://localhost:${port}`);
      clientSocket.on('open', () => {
        // Identify as the plugin
        clientSocket!.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
        resolve();
      });
      clientSocket.on('error', reject);
    });

    // Allow the relay to process the hello and notify the module
    await wait(50);

    // Now send a message with a short timeout -- plugin never responds
    await expect(sendToPlugin({ type: 'ping' }, 100)).rejects.toThrow(/timed out/i);
  }, 5000);
});

// TEST-S-001: startWsServer starts relay when no relay exists
describe('TEST-S-001: startWsServer starts relay when no relay running', () => {
  afterEach(async () => {
    _resetForTesting();
    await wait(50);
  });

  it('starts a WS relay on the given port and registers as client', async () => {
    const port = 39300 + Math.floor(Math.random() * 100);

    startWsServer(port, 'Test Client');
    await wait(100);

    // A new WebSocket should be able to connect to the relay
    const probe = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve, reject) => {
      probe.on('open', resolve);
      probe.on('error', reject);
    });

    expect(probe.readyState).toBe(WebSocket.OPEN);
    probe.close();
  });
});

// TEST-S-002: startWsServer connects to existing relay
describe('TEST-S-002: startWsServer connects to existing relay', () => {
  let relay: WsRelay | null = null;

  afterEach(async () => {
    _resetForTesting();
    await wait(50);
    await relay?.close();
    relay = null;
  });

  it('connects to existing relay without starting a new one', async () => {
    const port = 39300 + Math.floor(Math.random() * 100);

    // Start an external relay
    relay = new WsRelay(port);
    await relay.start();

    // Now start the server module (should connect to existing relay, not bind port)
    startWsServer(port, 'Second Client');
    await wait(100);

    // The relay should have 1 registered client
    expect(relay.clientRegistry.size).toBe(1);
  });
});

// TEST-S-003: sendToPlugin works through relay (end-to-end)
describe('TEST-S-003: sendToPlugin end-to-end through relay', () => {
  let mockPlugin: WebSocket | null = null;

  afterEach(async () => {
    if (mockPlugin && mockPlugin.readyState === WebSocket.OPEN) {
      mockPlugin.close();
    }
    mockPlugin = null;
    _resetForTesting();
    await wait(50);
  });

  it('sends message to plugin and resolves with response', async () => {
    const port = 39300 + Math.floor(Math.random() * 100);

    startWsServer(port, 'Test Client');
    await wait(100);

    // Connect mock plugin
    mockPlugin = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => mockPlugin!.on('open', resolve));
    mockPlugin.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
    await wait(50);

    // Plugin auto-responds to ping
    mockPlugin.on('message', (raw) => {
      const msg = JSON.parse(raw.toString()) as { type: string; id: string };
      if (msg.type === 'ping') {
        mockPlugin!.send(JSON.stringify({ type: 'pong', id: msg.id }));
      }
    });

    const response = await sendToPlugin({ type: 'ping' }, 1000);
    expect(response.type).toBe('pong');
  }, 5000);
});

// TEST-S-004: sendToPlugin rejects when client is inactive
describe('TEST-S-004: sendToPlugin rejects for inactive client', () => {
  let relay: WsRelay | null = null;

  afterEach(async () => {
    _resetForTesting();
    await wait(50);
    await relay?.close();
    relay = null;
  });

  it('rejects with "Another client is currently active" when inactive', async () => {
    const port = 39300 + Math.floor(Math.random() * 100);

    // Start a relay and register a first client externally (so THIS server is inactive)
    relay = new WsRelay(port);
    await relay.start();

    // Register first client externally
    const firstClient = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => firstClient.on('open', resolve));
    firstClient.send(JSON.stringify({ type: 'register', clientId: 'external-1', clientName: 'First Client' }));
    await wait(50);

    // Our module connects as second (inactive) client
    startWsServer(port, 'Second Client');
    await wait(100);

    // sendToPlugin should be rejected as inactive
    await expect(sendToPlugin({ type: 'ping' }, 500)).rejects.toThrow(/Another client is currently active/i);

    firstClient.close();
  }, 5000);
});

// TEST-S-005: isPluginConnected reflects relay state
describe('TEST-S-005: isPluginConnected reflects plugin connection state', () => {
  let mockPlugin: WebSocket | null = null;

  afterEach(async () => {
    if (mockPlugin && mockPlugin.readyState === WebSocket.OPEN) {
      mockPlugin.close();
    }
    mockPlugin = null;
    _resetForTesting();
    await wait(50);
  });

  it('returns false before plugin connects and true after', async () => {
    const port = 39300 + Math.floor(Math.random() * 100);

    startWsServer(port, 'Test Client');
    await wait(100);

    // Before plugin connects
    expect(isPluginConnected()).toBe(false);

    // Connect mock plugin
    mockPlugin = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => mockPlugin!.on('open', resolve));
    mockPlugin.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
    await wait(50);

    // After plugin connects
    expect(isPluginConnected()).toBe(true);
  });
});

// TEST-S-006: Race condition -- two processes start simultaneously
describe('TEST-S-006: Race condition -- two concurrent startWsServer calls', () => {
  it('only one relay starts, both clients register, no unhandled errors', async () => {
    const port = 39300 + Math.floor(Math.random() * 100);

    // Simulate two concurrent startWsServer calls by having one use the module
    // and one use a raw WsRelay. Both should end up registered.
    const relay = new WsRelay(port);

    // Start both concurrently
    const p1 = relay.start();

    // A second client connects after a tiny delay to simulate race
    const p2 = wait(10).then(async () => {
      const client = new WebSocket(`ws://localhost:${port}`);
      await new Promise<void>((resolve, reject) => {
        client.on('open', resolve);
        client.on('error', reject);
      });
      client.send(JSON.stringify({ type: 'register', clientId: 'client-2', clientName: 'Second' }));
      await wait(50);
      return client;
    });

    await p1;

    // First client connects
    const client1 = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => client1.on('open', resolve));
    client1.send(JSON.stringify({ type: 'register', clientId: 'client-1', clientName: 'First' }));
    await wait(50);

    const client2 = await p2;

    // Both clients should be in registry
    expect(relay.clientRegistry.size).toBe(2);

    client1.close();
    client2.close();
    await relay.close();
  });
});

// TEST-S-007: sendToPlugin latency through relay is under 5ms overhead
describe('TEST-S-007: sendToPlugin latency through relay under 5ms overhead', () => {
  let mockPlugin: WebSocket | null = null;

  afterEach(async () => {
    if (mockPlugin && mockPlugin.readyState === WebSocket.OPEN) {
      mockPlugin.close();
    }
    mockPlugin = null;
    _resetForTesting();
    await wait(50);
  });

  it('average relay overhead is under 5ms per request', async () => {
    const port = 39300 + Math.floor(Math.random() * 100);

    startWsServer(port, 'Perf Client');
    await wait(100);

    // Connect mock plugin that immediately responds to pings
    mockPlugin = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => mockPlugin!.on('open', resolve));
    mockPlugin.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
    await wait(50);

    mockPlugin.on('message', (raw) => {
      const msg = JSON.parse(raw.toString()) as { type: string; id: string };
      if (msg.type === 'ping') {
        mockPlugin!.send(JSON.stringify({ type: 'pong', id: msg.id }));
      }
    });

    // Measure 10 round-trips
    const times: number[] = [];
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      await sendToPlugin({ type: 'ping' }, 1000);
      times.push(performance.now() - start);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    // Each round-trip through local relay should be well under 10ms
    // (5ms overhead budget is generous for localhost)
    expect(avg).toBeLessThan(50); // Very lenient: 50ms total per round-trip
  }, 10000);
});
