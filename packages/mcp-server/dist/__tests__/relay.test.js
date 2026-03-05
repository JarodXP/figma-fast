"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ws_1 = require("ws");
const relay_js_1 = require("../ws/relay.js");
// Helper: wait for N milliseconds
function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
// Helper: wait for a single message on a socket
function nextMessage(socket) {
    return new Promise((resolve, reject) => {
        const onMessage = (raw) => {
            socket.off('message', onMessage);
            socket.off('error', onError);
            try {
                resolve(JSON.parse(raw.toString()));
            }
            catch {
                reject(new Error(`Failed to parse message: ${raw}`));
            }
        };
        const onError = (err) => {
            socket.off('message', onMessage);
            socket.off('error', onError);
            reject(err);
        };
        socket.on('message', onMessage);
        socket.on('error', onError);
    });
}
// Helper: collect all messages received by a socket within a time window
function collectMessages(socket, ms) {
    return new Promise((resolve) => {
        const messages = [];
        const onMessage = (raw) => {
            try {
                messages.push(JSON.parse(raw.toString()));
            }
            catch {
                // ignore unparseable
            }
        };
        socket.on('message', onMessage);
        setTimeout(() => {
            socket.off('message', onMessage);
            resolve(messages);
        }, ms);
    });
}
// TEST-R-001: Relay server starts and listens on specified port
(0, vitest_1.describe)('TEST-R-001: Relay starts and listens', () => {
    let relay;
    (0, vitest_1.afterEach)(async () => {
        await relay?.close();
    });
    (0, vitest_1.it)('starts a WebSocketServer on the specified port and accepts connections', async () => {
        const port = 39200 + Math.floor(Math.random() * 100);
        relay = new relay_js_1.WsRelay(port);
        await relay.start();
        // A WS client can connect
        const client = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve, reject) => {
            client.on('open', resolve);
            client.on('error', reject);
        });
        (0, vitest_1.expect)(client.readyState).toBe(ws_1.WebSocket.OPEN);
        client.close();
    });
});
// TEST-R-002: Relay identifies plugin connection via hello handshake
(0, vitest_1.describe)('TEST-R-002: Plugin identified via hello handshake', () => {
    let relay;
    (0, vitest_1.afterEach)(async () => {
        await relay?.close();
    });
    (0, vitest_1.it)('sets pluginSocket when a connection sends hello', async () => {
        const port = 39200 + Math.floor(Math.random() * 100);
        relay = new relay_js_1.WsRelay(port);
        await relay.start();
        const plugin = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => plugin.on('open', resolve));
        plugin.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
        await wait(50);
        (0, vitest_1.expect)(relay.currentPluginSocket).not.toBeNull();
        plugin.close();
    });
});
// TEST-R-003: Relay identifies MCP client via register handshake
(0, vitest_1.describe)('TEST-R-003: MCP client identified via register handshake', () => {
    let relay;
    (0, vitest_1.afterEach)(async () => {
        await relay?.close();
    });
    (0, vitest_1.it)('adds client to registry when register message is received', async () => {
        const port = 39200 + Math.floor(Math.random() * 100);
        relay = new relay_js_1.WsRelay(port);
        await relay.start();
        const client = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client.on('open', resolve));
        client.send(JSON.stringify({ type: 'register', clientId: 'uuid-1', clientName: 'Claude Desktop' }));
        await wait(50);
        (0, vitest_1.expect)(relay.clientRegistry.size).toBe(1);
        (0, vitest_1.expect)(relay.clientRegistry.has('uuid-1')).toBe(true);
        (0, vitest_1.expect)(relay.clientRegistry.get('uuid-1')?.clientName).toBe('Claude Desktop');
        client.close();
    });
});
// TEST-R-004: First registered client is designated active
(0, vitest_1.describe)('TEST-R-004: First client designated active', () => {
    let relay;
    (0, vitest_1.afterEach)(async () => {
        await relay?.close();
    });
    (0, vitest_1.it)('sets activeClientId to the first registered client', async () => {
        const port = 39200 + Math.floor(Math.random() * 100);
        relay = new relay_js_1.WsRelay(port);
        await relay.start();
        const client = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client.on('open', resolve));
        client.send(JSON.stringify({ type: 'register', clientId: 'uuid-1', clientName: 'Claude Desktop' }));
        await wait(50);
        (0, vitest_1.expect)(relay.currentActiveClientId).toBe('uuid-1');
        client.close();
    });
});
// TEST-R-005: Second registered client is designated inactive
(0, vitest_1.describe)('TEST-R-005: Second client is inactive', () => {
    let relay;
    (0, vitest_1.afterEach)(async () => {
        await relay?.close();
    });
    (0, vitest_1.it)('leaves second client inactive while first remains active', async () => {
        const port = 39200 + Math.floor(Math.random() * 100);
        relay = new relay_js_1.WsRelay(port);
        await relay.start();
        const client1 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client1.on('open', resolve));
        client1.send(JSON.stringify({ type: 'register', clientId: 'uuid-1', clientName: 'Claude Desktop' }));
        await wait(50);
        const client2 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client2.on('open', resolve));
        client2.send(JSON.stringify({ type: 'register', clientId: 'uuid-2', clientName: 'Claude Code' }));
        await wait(50);
        (0, vitest_1.expect)(relay.clientRegistry.size).toBe(2);
        (0, vitest_1.expect)(relay.currentActiveClientId).toBe('uuid-1');
        client1.close();
        client2.close();
    });
});
// TEST-R-006: Active client messages forwarded to plugin
(0, vitest_1.describe)('TEST-R-006: Active client messages forwarded to plugin', () => {
    let relay;
    (0, vitest_1.afterEach)(async () => {
        await relay?.close();
    });
    (0, vitest_1.it)('forwards ping from active client to plugin', async () => {
        const port = 39200 + Math.floor(Math.random() * 100);
        relay = new relay_js_1.WsRelay(port);
        await relay.start();
        // Connect plugin first
        const plugin = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => plugin.on('open', resolve));
        plugin.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
        await wait(50);
        // Connect active client
        const client = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client.on('open', resolve));
        client.send(JSON.stringify({ type: 'register', clientId: 'uuid-1', clientName: 'Claude Desktop' }));
        await wait(50);
        // Consume the registered message
        const msgPromise = nextMessage(plugin);
        client.send(JSON.stringify({ type: 'ping', id: 'abc-123' }));
        const received = await msgPromise;
        (0, vitest_1.expect)(received).toEqual({ type: 'ping', id: 'abc-123' });
        client.close();
        plugin.close();
    });
});
// TEST-R-007: Plugin responses forwarded back to originating client
(0, vitest_1.describe)('TEST-R-007: Plugin responses routed back to client', () => {
    let relay;
    (0, vitest_1.afterEach)(async () => {
        await relay?.close();
    });
    (0, vitest_1.it)('routes pong response to the client that sent ping', async () => {
        const port = 39200 + Math.floor(Math.random() * 100);
        relay = new relay_js_1.WsRelay(port);
        await relay.start();
        const plugin = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => plugin.on('open', resolve));
        plugin.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
        await wait(50);
        const client = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client.on('open', resolve));
        client.send(JSON.stringify({ type: 'register', clientId: 'uuid-1', clientName: 'Claude Desktop' }));
        await wait(50);
        // Plugin waits for client to send ping, then responds
        plugin.on('message', (raw) => {
            const msg = JSON.parse(raw.toString());
            plugin.send(JSON.stringify({ type: 'pong', id: msg.id }));
        });
        const responsePromise = nextMessage(client);
        // Drain the 'registered' message first
        await wait(10);
        client.send(JSON.stringify({ type: 'ping', id: 'abc-123' }));
        const response = await responsePromise;
        (0, vitest_1.expect)(response).toMatchObject({ type: 'pong', id: 'abc-123' });
        client.close();
        plugin.close();
    });
});
// TEST-R-008: Inactive client auto-activates on first request
(0, vitest_1.describe)('TEST-R-008: Inactive client auto-activates on request', () => {
    let relay;
    (0, vitest_1.afterEach)(async () => {
        await relay?.close();
    });
    (0, vitest_1.it)('auto-activates the requesting client and forwards the message to the plugin', async () => {
        const port = 39200 + Math.floor(Math.random() * 100);
        relay = new relay_js_1.WsRelay(port);
        await relay.start();
        const plugin = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => plugin.on('open', resolve));
        plugin.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
        await wait(50);
        // Register first (active) client
        const client1 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client1.on('open', resolve));
        client1.send(JSON.stringify({ type: 'register', clientId: 'uuid-1', clientName: 'Claude Desktop' }));
        await wait(50);
        // Register second (initially inactive) client
        const client2 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client2.on('open', resolve));
        client2.send(JSON.stringify({ type: 'register', clientId: 'uuid-2', clientName: 'Claude Code' }));
        await wait(50);
        // Client2 sends a request — should auto-activate and reach the plugin
        const pluginMsgPromise = nextMessageOfType(plugin, 'ping');
        client2.send(JSON.stringify({ type: 'ping', id: 'xyz-789' }));
        const pluginMsg = await pluginMsgPromise;
        (0, vitest_1.expect)(pluginMsg.type).toBe('ping');
        (0, vitest_1.expect)(pluginMsg.id).toBe('xyz-789');
        (0, vitest_1.expect)(relay.currentActiveClientId).toBe('uuid-2');
        client1.close();
        client2.close();
        plugin.close();
    });
});
// TEST-R-009: Client disconnect removes from registry
(0, vitest_1.describe)('TEST-R-009: Client disconnect removes from registry', () => {
    let relay;
    (0, vitest_1.afterEach)(async () => {
        await relay?.close();
    });
    (0, vitest_1.it)('removes disconnected client from registry', async () => {
        const port = 39200 + Math.floor(Math.random() * 100);
        relay = new relay_js_1.WsRelay(port);
        await relay.start();
        const client1 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client1.on('open', resolve));
        client1.send(JSON.stringify({ type: 'register', clientId: 'uuid-1', clientName: 'A' }));
        await wait(50);
        const client2 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client2.on('open', resolve));
        client2.send(JSON.stringify({ type: 'register', clientId: 'uuid-2', clientName: 'B' }));
        await wait(50);
        (0, vitest_1.expect)(relay.clientRegistry.size).toBe(2);
        client2.close();
        await wait(50);
        (0, vitest_1.expect)(relay.clientRegistry.size).toBe(1);
        (0, vitest_1.expect)(relay.clientRegistry.has('uuid-1')).toBe(true);
        (0, vitest_1.expect)(relay.clientRegistry.has('uuid-2')).toBe(false);
        client1.close();
    });
});
// TEST-R-010: Active client disconnect does not auto-promote
(0, vitest_1.describe)('TEST-R-010: Active client disconnect leaves no active client', () => {
    let relay;
    (0, vitest_1.afterEach)(async () => {
        await relay?.close();
    });
    (0, vitest_1.it)('sets activeClientId to null when active client disconnects', async () => {
        const port = 39200 + Math.floor(Math.random() * 100);
        relay = new relay_js_1.WsRelay(port);
        await relay.start();
        const client1 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client1.on('open', resolve));
        client1.send(JSON.stringify({ type: 'register', clientId: 'uuid-1', clientName: 'A' }));
        await wait(50);
        const client2 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client2.on('open', resolve));
        client2.send(JSON.stringify({ type: 'register', clientId: 'uuid-2', clientName: 'B' }));
        await wait(50);
        (0, vitest_1.expect)(relay.currentActiveClientId).toBe('uuid-1');
        client1.close();
        await wait(50);
        (0, vitest_1.expect)(relay.currentActiveClientId).toBeNull();
        (0, vitest_1.expect)(relay.clientRegistry.has('uuid-2')).toBe(true);
        client2.close();
    });
});
// TEST-R-011: Messages to plugin when plugin not connected return error
(0, vitest_1.describe)('TEST-R-011: Plugin not connected returns error', () => {
    let relay;
    (0, vitest_1.afterEach)(async () => {
        await relay?.close();
    });
    (0, vitest_1.it)('returns error "Figma plugin is not connected" when no plugin is connected', async () => {
        const port = 39200 + Math.floor(Math.random() * 100);
        relay = new relay_js_1.WsRelay(port);
        await relay.start();
        const client = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client.on('open', resolve));
        client.send(JSON.stringify({ type: 'register', clientId: 'uuid-1', clientName: 'Claude Desktop' }));
        await wait(50);
        const responsePromise = nextMessage(client);
        await wait(10);
        client.send(JSON.stringify({ type: 'ping', id: 'abc-123' }));
        const response = await responsePromise;
        (0, vitest_1.expect)(response.type).toBe('relay_error');
        (0, vitest_1.expect)(response.id).toBe('abc-123');
        (0, vitest_1.expect)(response.error).toMatch(/Figma plugin is not connected/);
        client.close();
    });
});
// TEST-R-012: Plugin disconnect rejects pending requests
(0, vitest_1.describe)('TEST-R-012: Plugin disconnect rejects pending requests', () => {
    let relay;
    (0, vitest_1.afterEach)(async () => {
        await relay?.close();
    });
    (0, vitest_1.it)('sends error to client when plugin disconnects with pending request', async () => {
        const port = 39200 + Math.floor(Math.random() * 100);
        relay = new relay_js_1.WsRelay(port);
        await relay.start();
        const plugin = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => plugin.on('open', resolve));
        plugin.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
        await wait(50);
        const client = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client.on('open', resolve));
        client.send(JSON.stringify({ type: 'register', clientId: 'uuid-1', clientName: 'Claude Desktop' }));
        await wait(50);
        // Collect messages for 200ms after sending ping
        const messagesPromise = collectMessages(client, 200);
        await wait(10);
        // Send a ping that the plugin will never respond to
        client.send(JSON.stringify({ type: 'ping', id: 'abc-123' }));
        await wait(30);
        // Plugin disconnects before responding
        plugin.close();
        const messages = await messagesPromise;
        const errorMsg = messages.find((m) => m.id === 'abc-123');
        (0, vitest_1.expect)(errorMsg).toBeDefined();
        (0, vitest_1.expect)(errorMsg?.error).toMatch(/Plugin disconnected/);
        client.close();
    });
});
// TEST-R-013: Relay handles malformed messages without crashing
(0, vitest_1.describe)('TEST-R-013: Malformed messages do not crash relay', () => {
    let relay;
    (0, vitest_1.afterEach)(async () => {
        await relay?.close();
    });
    (0, vitest_1.it)('continues running after receiving invalid JSON', async () => {
        const port = 39200 + Math.floor(Math.random() * 100);
        relay = new relay_js_1.WsRelay(port);
        await relay.start();
        const client = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client.on('open', resolve));
        // Send invalid JSON
        client.send('not json at all');
        await wait(50);
        // Relay should still be running -- new connections work
        const client2 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve, reject) => {
            client2.on('open', resolve);
            client2.on('error', reject);
        });
        (0, vitest_1.expect)(client2.readyState).toBe(ws_1.WebSocket.OPEN);
        client.close();
        client2.close();
    });
});
// TEST-R-014: Relay graceful shutdown closes all connections
(0, vitest_1.describe)('TEST-R-014: Graceful shutdown closes all connections', () => {
    (0, vitest_1.it)('closes all sockets when close() is called', async () => {
        const port = 39200 + Math.floor(Math.random() * 100);
        const relay = new relay_js_1.WsRelay(port);
        await relay.start();
        const plugin = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => plugin.on('open', resolve));
        plugin.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
        const client1 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client1.on('open', resolve));
        client1.send(JSON.stringify({ type: 'register', clientId: 'uuid-1', clientName: 'A' }));
        const client2 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client2.on('open', resolve));
        client2.send(JSON.stringify({ type: 'register', clientId: 'uuid-2', clientName: 'B' }));
        await wait(50);
        await relay.close();
        await wait(50);
        // All sockets should be closed
        (0, vitest_1.expect)(plugin.readyState).not.toBe(ws_1.WebSocket.OPEN);
        (0, vitest_1.expect)(client1.readyState).not.toBe(ws_1.WebSocket.OPEN);
        (0, vitest_1.expect)(client2.readyState).not.toBe(ws_1.WebSocket.OPEN);
    });
});
// TEST-R-015: Plugin reconnect after disconnect is seamless
(0, vitest_1.describe)('TEST-R-015: Plugin reconnect is seamless', () => {
    let relay;
    (0, vitest_1.afterEach)(async () => {
        await relay?.close();
    });
    (0, vitest_1.it)('replaces pluginSocket and routes to new plugin connection', async () => {
        const port = 39200 + Math.floor(Math.random() * 100);
        relay = new relay_js_1.WsRelay(port);
        await relay.start();
        // Connect first plugin
        const plugin1 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => plugin1.on('open', resolve));
        plugin1.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
        await wait(50);
        // Connect active client
        const client = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client.on('open', resolve));
        client.send(JSON.stringify({ type: 'register', clientId: 'uuid-1', clientName: 'Claude Desktop' }));
        await wait(50);
        // Plugin1 disconnects
        plugin1.close();
        await wait(50);
        // Plugin2 connects and sends hello
        const plugin2 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => plugin2.on('open', resolve));
        plugin2.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
        await wait(50);
        // Relay should have plugin2 as the plugin socket
        (0, vitest_1.expect)(relay.currentPluginSocket).not.toBeNull();
        // Verify messages route to plugin2
        const plugin2MsgPromise = nextMessage(plugin2);
        client.send(JSON.stringify({ type: 'ping', id: 'test-reconnect' }));
        const received = await plugin2MsgPromise;
        (0, vitest_1.expect)(received).toEqual({ type: 'ping', id: 'test-reconnect' });
        client.close();
        plugin2.close();
    });
});
// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: Broadcast and client-switch tests (TEST-R-020 through TEST-R-026)
// ─────────────────────────────────────────────────────────────────────────────
// Helper: wait for a specific message type on a socket (with timeout)
function nextMessageOfType(socket, type, timeoutMs = 1000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off('message', onMessage);
            reject(new Error(`Timed out waiting for '${type}' message (${timeoutMs}ms)`));
        }, timeoutMs);
        const onMessage = (raw) => {
            try {
                const msg = JSON.parse(raw.toString());
                if (msg.type === type) {
                    clearTimeout(timer);
                    socket.off('message', onMessage);
                    resolve(msg);
                }
                // if wrong type, keep listening
            }
            catch {
                // ignore parse errors and keep listening
            }
        };
        socket.on('message', onMessage);
    });
}
// TEST-R-020: Relay broadcasts client_list to plugin on client connect
(0, vitest_1.describe)('TEST-R-020: Relay broadcasts client_list to plugin on client connect', () => {
    let relay;
    (0, vitest_1.afterEach)(async () => {
        await relay?.close();
    });
    (0, vitest_1.it)('sends client_list with 2 clients to plugin after second client registers', async () => {
        const port = 39200 + Math.floor(Math.random() * 100);
        relay = new relay_js_1.WsRelay(port);
        await relay.start();
        // Connect plugin
        const plugin = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => plugin.on('open', resolve));
        plugin.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
        await wait(50);
        // Connect first (active) client
        const client1 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client1.on('open', resolve));
        client1.send(JSON.stringify({ type: 'register', clientId: 'id-1', clientName: 'Claude Desktop' }));
        await wait(50);
        // Set up listener for client_list BEFORE second client connects
        const clientListPromise = nextMessageOfType(plugin, 'client_list', 500);
        // Connect second (inactive) client
        const client2 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client2.on('open', resolve));
        client2.send(JSON.stringify({ type: 'register', clientId: 'id-2', clientName: 'Claude Code' }));
        const msg = await clientListPromise;
        (0, vitest_1.expect)(msg.type).toBe('client_list');
        (0, vitest_1.expect)(msg.clients).toHaveLength(2);
        const desktop = msg.clients.find((c) => c.clientId === 'id-1');
        const code = msg.clients.find((c) => c.clientId === 'id-2');
        (0, vitest_1.expect)(desktop?.isActive).toBe(true);
        (0, vitest_1.expect)(code?.isActive).toBe(false);
        client1.close();
        client2.close();
        plugin.close();
    });
});
// TEST-R-021: Relay broadcasts client_list on client disconnect
(0, vitest_1.describe)('TEST-R-021: Relay broadcasts client_list on client disconnect', () => {
    let relay;
    (0, vitest_1.afterEach)(async () => {
        await relay?.close();
    });
    (0, vitest_1.it)('sends updated client_list with 1 client after inactive client disconnects', async () => {
        const port = 39200 + Math.floor(Math.random() * 100);
        relay = new relay_js_1.WsRelay(port);
        await relay.start();
        const plugin = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => plugin.on('open', resolve));
        plugin.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
        await wait(50);
        const client1 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client1.on('open', resolve));
        client1.send(JSON.stringify({ type: 'register', clientId: 'id-1', clientName: 'A' }));
        await wait(50);
        const client2 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client2.on('open', resolve));
        client2.send(JSON.stringify({ type: 'register', clientId: 'id-2', clientName: 'B' }));
        await wait(50);
        // Drain any pending client_list from client2 registration
        await wait(30);
        // Listen for client_list broadcast triggered by disconnect
        const clientListPromise = nextMessageOfType(plugin, 'client_list', 500);
        client2.close();
        const msg = await clientListPromise;
        (0, vitest_1.expect)(msg.type).toBe('client_list');
        (0, vitest_1.expect)(msg.clients).toHaveLength(1);
        (0, vitest_1.expect)(msg.clients[0].clientId).toBe('id-1');
        client1.close();
        plugin.close();
    });
});
// TEST-R-022: set_active_client switches the active client
(0, vitest_1.describe)('TEST-R-022: set_active_client switches the active client', () => {
    let relay;
    (0, vitest_1.afterEach)(async () => {
        await relay?.close();
    });
    (0, vitest_1.it)('updates active client and sends activated/deactivated/client_list messages', async () => {
        const port = 39200 + Math.floor(Math.random() * 100);
        relay = new relay_js_1.WsRelay(port);
        await relay.start();
        const plugin = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => plugin.on('open', resolve));
        plugin.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
        await wait(50);
        const client1 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client1.on('open', resolve));
        client1.send(JSON.stringify({ type: 'register', clientId: 'id-A', clientName: 'A-name' }));
        await wait(50);
        const client2 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client2.on('open', resolve));
        client2.send(JSON.stringify({ type: 'register', clientId: 'id-B', clientName: 'B-name' }));
        await wait(50);
        // Drain registration messages
        await wait(30);
        // Set up listeners before sending set_active_client
        const activatedPromise = nextMessageOfType(client2, 'activated', 500);
        const deactivatedPromise = nextMessageOfType(client1, 'deactivated', 500);
        const clientListPromise = nextMessageOfType(plugin, 'client_list', 500);
        plugin.send(JSON.stringify({ type: 'set_active_client', clientId: 'id-B' }));
        const [activated, deactivated, clientList] = await Promise.all([
            activatedPromise,
            deactivatedPromise,
            clientListPromise,
        ]);
        (0, vitest_1.expect)(activated.type).toBe('activated');
        (0, vitest_1.expect)(deactivated.type).toBe('deactivated');
        (0, vitest_1.expect)(deactivated.reason).toMatch(/B-name/);
        (0, vitest_1.expect)(clientList.type).toBe('client_list');
        const bEntry = clientList.clients.find((c) => c.clientId === 'id-B');
        const aEntry = clientList.clients.find((c) => c.clientId === 'id-A');
        (0, vitest_1.expect)(bEntry?.isActive).toBe(true);
        (0, vitest_1.expect)(aEntry?.isActive).toBe(false);
        // Verify relay internal state
        (0, vitest_1.expect)(relay.currentActiveClientId).toBe('id-B');
        client1.close();
        client2.close();
        plugin.close();
    });
});
// TEST-R-023: set_active_client with invalid clientId is ignored
(0, vitest_1.describe)('TEST-R-023: set_active_client with invalid clientId is ignored', () => {
    let relay;
    (0, vitest_1.afterEach)(async () => {
        await relay?.close();
    });
    (0, vitest_1.it)('does not change active client when clientId does not exist', async () => {
        const port = 39200 + Math.floor(Math.random() * 100);
        relay = new relay_js_1.WsRelay(port);
        await relay.start();
        const plugin = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => plugin.on('open', resolve));
        plugin.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
        await wait(50);
        const client1 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client1.on('open', resolve));
        client1.send(JSON.stringify({ type: 'register', clientId: 'id-A', clientName: 'A' }));
        await wait(50);
        plugin.send(JSON.stringify({ type: 'set_active_client', clientId: 'nonexistent' }));
        await wait(50);
        (0, vitest_1.expect)(relay.currentActiveClientId).toBe('id-A');
        client1.close();
        plugin.close();
    });
});
// TEST-R-024: Commands route to newly active client after switch
(0, vitest_1.describe)('TEST-R-024: Commands route to newly active client after switch', () => {
    let relay;
    (0, vitest_1.afterEach)(async () => {
        await relay?.close();
    });
    (0, vitest_1.it)('forwards ping from new active client and rejects from old active client', async () => {
        const port = 39200 + Math.floor(Math.random() * 100);
        relay = new relay_js_1.WsRelay(port);
        await relay.start();
        const plugin = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => plugin.on('open', resolve));
        plugin.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
        await wait(50);
        const client1 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client1.on('open', resolve));
        client1.send(JSON.stringify({ type: 'register', clientId: 'id-A', clientName: 'A' }));
        await wait(50);
        const client2 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client2.on('open', resolve));
        client2.send(JSON.stringify({ type: 'register', clientId: 'id-B', clientName: 'B' }));
        await wait(50);
        // Switch to client2
        plugin.send(JSON.stringify({ type: 'set_active_client', clientId: 'id-B' }));
        await wait(50);
        // Client2 (now active) should reach the plugin
        const pluginMsgPromise = nextMessage(plugin);
        client2.send(JSON.stringify({ type: 'ping', id: 'ping-from-B' }));
        const received = await pluginMsgPromise;
        (0, vitest_1.expect)(received).toMatchObject({ type: 'ping', id: 'ping-from-B' });
        // Client1 sends — auto-activates itself and its request also reaches the plugin
        const pluginMsgPromise2 = nextMessageOfType(plugin, 'ping');
        client1.send(JSON.stringify({ type: 'ping', id: 'ping-from-A' }));
        const received2 = await pluginMsgPromise2;
        (0, vitest_1.expect)(received2.type).toBe('ping');
        (0, vitest_1.expect)(received2.id).toBe('ping-from-A');
        (0, vitest_1.expect)(relay.currentActiveClientId).toBe('id-A');
        client1.close();
        client2.close();
        plugin.close();
    });
});
// TEST-R-025: Active client disconnect shows no active client in client_list
(0, vitest_1.describe)('TEST-R-025: Active client disconnect leaves no active client', () => {
    let relay;
    (0, vitest_1.afterEach)(async () => {
        await relay?.close();
    });
    (0, vitest_1.it)('sends client_list with B inactive and no active client after A disconnects', async () => {
        const port = 39200 + Math.floor(Math.random() * 100);
        relay = new relay_js_1.WsRelay(port);
        await relay.start();
        const plugin = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => plugin.on('open', resolve));
        plugin.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
        await wait(50);
        const client1 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client1.on('open', resolve));
        client1.send(JSON.stringify({ type: 'register', clientId: 'id-A', clientName: 'A' }));
        await wait(50);
        const client2 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client2.on('open', resolve));
        client2.send(JSON.stringify({ type: 'register', clientId: 'id-B', clientName: 'B' }));
        await wait(50);
        // Drain registration broadcasts
        await wait(30);
        // Listen for client_list after A disconnects
        const clientListPromise = nextMessageOfType(plugin, 'client_list', 500);
        client1.close();
        const msg = await clientListPromise;
        (0, vitest_1.expect)(msg.clients).toHaveLength(1);
        const bEntry = msg.clients.find((c) => c.clientId === 'id-B');
        (0, vitest_1.expect)(bEntry?.isActive).toBe(false);
        // Relay internal state: no active client
        (0, vitest_1.expect)(relay.currentActiveClientId).toBeNull();
        client2.close();
        plugin.close();
    });
});
// TEST-R-026: Response routing uses correlation ID (not active status)
(0, vitest_1.describe)('TEST-R-026: Response routing uses correlation ID not active status', () => {
    let relay;
    (0, vitest_1.afterEach)(async () => {
        await relay?.close();
    });
    (0, vitest_1.it)('routes plugin response to originating client even after active switch', async () => {
        const port = 39200 + Math.floor(Math.random() * 100);
        relay = new relay_js_1.WsRelay(port);
        await relay.start();
        // Plugin that we control manually
        const plugin = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => plugin.on('open', resolve));
        plugin.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
        await wait(50);
        // Client A (starts active)
        const client1 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client1.on('open', resolve));
        client1.send(JSON.stringify({ type: 'register', clientId: 'id-A', clientName: 'A' }));
        await wait(50);
        // Client B (starts inactive)
        const client2 = new ws_1.WebSocket(`ws://localhost:${port}`);
        await new Promise((resolve) => client2.on('open', resolve));
        client2.send(JSON.stringify({ type: 'register', clientId: 'id-B', clientName: 'B' }));
        await wait(50);
        // A sends a ping — plugin receives it but does NOT respond yet
        const pluginReceived = nextMessage(plugin);
        client1.send(JSON.stringify({ type: 'ping', id: 'msg-1' }));
        await pluginReceived; // Confirm plugin got it
        await wait(20);
        // Switch active to B BEFORE plugin responds
        plugin.send(JSON.stringify({ type: 'set_active_client', clientId: 'id-B' }));
        await wait(50);
        // Now plugin responds with msg-1
        // Client A should receive the response, not client B
        const client1ResponsePromise = nextMessage(client1);
        plugin.send(JSON.stringify({ type: 'result', id: 'msg-1', success: true }));
        const response = await client1ResponsePromise;
        (0, vitest_1.expect)(response.type).toBe('result');
        (0, vitest_1.expect)(response.id).toBe('msg-1');
        (0, vitest_1.expect)(response.success).toBe(true);
        client1.close();
        client2.close();
        plugin.close();
    });
});
//# sourceMappingURL=relay.test.js.map