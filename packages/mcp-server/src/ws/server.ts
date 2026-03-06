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

import { WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import { fork } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { ServerToPluginMessage, PluginToServerMessage } from '@figma-fast/shared';

/** Distributive Omit that works correctly over union types */
type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

// Path to the compiled relay-process.js — resolved relative to this file (dist/ws/server.js → dist/ws/relay-process.js)
const RELAY_PROCESS_PATH = path.resolve(__dirname, 'relay-process.js');

/** Compute the PID file path for a given port */
function pidFilePath(port: number): string {
  return path.join(os.tmpdir(), `figma-fast-relay-${port}.pid`);
}

interface PendingRequest {
  resolve: (msg: PluginToServerMessage) => void;
  reject: (err: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

// ── Module-level state ────────────────────────────────────────────────────────

/** Our connection to the relay */
let relayClientSocket: WebSocket | null = null;

/** Whether this client is active in the relay */
let isActive = false;

/** Whether the Figma plugin is currently connected to the relay */
let pluginConnected = false;

/** Pending requests awaiting responses from the plugin */
const pendingRequests = new Map<string, PendingRequest>();

/** Whether startWsServer has been called (to support idempotency per port) */
let currentPort: number | null = null;

/**
 * Generation counter — incremented on every _resetForTesting() call.
 * Async operations capture their generation at start and bail if it changes,
 * preventing stale continuations from overwriting state for a subsequent test.
 */
let generation = 0;

const DEFAULT_TIMEOUT_MS = 30_000;

// ── Test support ──────────────────────────────────────────────────────────────

/**
 * Reset all module state. ONLY for use in tests.
 */
export function _resetForTesting(): void {
  // Increment generation to invalidate any in-flight async operations
  generation++;

  // Reject all pending requests
  for (const [id, req] of pendingRequests) {
    clearTimeout(req.timeout);
    req.reject(new Error('Reset for testing'));
    pendingRequests.delete(id);
  }

  // Close relay client socket
  if (relayClientSocket && relayClientSocket.readyState === WebSocket.OPEN) {
    relayClientSocket.close();
  }
  relayClientSocket = null;

  isActive = false;
  pluginConnected = false;
  currentPort = null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Start or connect to a WS relay and register as a client.
 * Idempotent for the same port.
 */
export function startWsServer(port: number = 3056, clientName?: string): void {
  if (currentPort === port) return;
  currentPort = port;

  const resolvedName = clientName ?? process.env.MCP_CLIENT_NAME ?? `MCP Client ${randomUUID().slice(0, 8)}`;
  const clientId = randomUUID();
  const myGeneration = generation;

  void startWsServerAsync(port, clientId, resolvedName, myGeneration);
}

/**
 * Send a message to the Figma plugin via the relay. Returns a Promise that resolves
 * with the plugin's response or rejects on timeout/inactive client/disconnected plugin.
 */
export function sendToPlugin(
  message: DistributiveOmit<ServerToPluginMessage, 'id'>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<PluginToServerMessage> {
  return new Promise((resolve, reject) => {
    if (!relayClientSocket || relayClientSocket.readyState !== WebSocket.OPEN) {
      reject(new Error('Figma plugin is not connected. Open the FigmaFast plugin in Figma.'));
      return;
    }

    if (!pluginConnected) {
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
    relayClientSocket.send(JSON.stringify(fullMessage));
  });
}

/**
 * Check if the Figma plugin is connected and this client is active.
 */
export function isPluginConnected(): boolean {
  return (
    relayClientSocket !== null &&
    relayClientSocket.readyState === WebSocket.OPEN &&
    pluginConnected
  );
}

// ── Private helpers ───────────────────────────────────────────────────────────

async function startWsServerAsync(port: number, clientId: string, clientName: string, myGeneration: number): Promise<void> {
  /** Check whether _resetForTesting() has been called since this async chain started. */
  const isStale = () => generation !== myGeneration;

  // Try to connect to an existing relay first
  const connected = await tryConnectToRelay(port, clientId, clientName, myGeneration);
  if (connected || isStale()) return;

  // No relay running — check PID file for a known relay process
  const pidFile = pidFilePath(port);
  if (fs.existsSync(pidFile)) {
    const existingPid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
    if (!isNaN(existingPid)) {
      const isAlive = (() => {
        try { process.kill(existingPid, 0); return true; }
        catch { return false; }
      })();

      if (isAlive) {
        // Relay may be starting up — retry connecting
        console.error(`[FigmaFast] PID file found (PID ${existingPid}), relay may be starting, retrying...`);
        await wait(300);
        if (isStale()) return;
        await tryConnectToRelay(port, clientId, clientName, myGeneration);
        return;
      } else {
        // Stale PID file — remove it and proceed
        console.error(`[FigmaFast] Removing stale PID file (dead PID ${existingPid})`);
        try { fs.unlinkSync(pidFile); } catch { /* ignore */ }
      }
    }
  }

  if (isStale()) return;

  // No relay running — fork a detached relay process and wait for it to be ready.
  // Using a detached process (rather than in-process) ensures the relay persists after
  // this MCP server process exits, so subsequent clients and the Figma plugin can
  // reconnect without requiring this process to still be alive.
  console.error(`[FigmaFast] No relay found on port ${port}, forking detached relay`);
  const child = await forkDetachedRelay(port, pidFile);
  if (isStale()) {
    if (child) { try { child.kill(); } catch { /* ok */ } }
    return;
  }
  if (child) {
    try { child.disconnect(); } catch { /* ok */ }
    child.unref();
  }

  // Connect to the relay we just started
  const connected2 = await tryConnectToRelay(port, clientId, clientName, myGeneration);
  if (!connected2 && !isStale()) {
    console.error(`[FigmaFast] Failed to connect to freshly forked relay on port ${port}`);
  }
}

/**
 * Fork a detached relay process and wait for it to signal 'ready' via IPC.
 * Returns the ChildProcess if the relay started successfully, or null on failure.
 */
function forkDetachedRelay(port: number, pidFile: string): Promise<import('child_process').ChildProcess | null> {
  return new Promise((resolve) => {
    let child: import('child_process').ChildProcess;
    try {
      child = fork(RELAY_PROCESS_PATH, [String(port), '60000', pidFile], {
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      });
    } catch (err) {
      console.error('[FigmaFast] Failed to fork relay process:', err);
      resolve(null);
      return;
    }

    console.error(`[FigmaFast] Forking detached relay on port ${port} (PID ${child.pid ?? 'unknown'})`);

    // Resolve when the relay signals it is listening
    const READY_TIMEOUT_MS = 12_000; // allow up to ~10s for port retry
    const timeout = setTimeout(() => {
      console.error('[FigmaFast] Relay did not signal ready in time, proceeding anyway');
      resolve(child);
    }, READY_TIMEOUT_MS);

    child.on('message', (msg: unknown) => {
      if (msg && typeof msg === 'object' && (msg as Record<string, unknown>).type === 'ready') {
        clearTimeout(timeout);
        console.error('[FigmaFast] Detached relay ready');
        resolve(child);
      }
    });

    child.on('exit', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        console.error(`[FigmaFast] Relay process exited unexpectedly with code ${code}`);
        resolve(null);
      } else {
        // Exited with code 0 — relay may have found a port conflict and given up;
        // resolve with child so caller can try to connect anyway.
        resolve(child);
      }
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      console.error('[FigmaFast] Relay process spawn error:', err.message);
      resolve(null);
    });
  });
}

function tryConnectToRelay(port: number, clientId: string, clientName: string, myGeneration: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    let connected = false;

    const connectTimeout = setTimeout(() => {
      if (!connected) {
        socket.terminate();
        resolve(false);
      }
    }, 500);

    socket.on('open', () => {
      connected = true;
      clearTimeout(connectTimeout);

      // If generation has changed since this async started, discard this connection
      if (generation !== myGeneration) {
        socket.close();
        resolve(false);
        return;
      }

      // Store the socket
      relayClientSocket = socket;

      // Register with the relay
      socket.send(JSON.stringify({ type: 'register', clientId, clientName }));

      // Set up message handler
      socket.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString()) as { type: string; clientId?: string; isActive?: boolean; id?: string; error?: string; reason?: string; success?: boolean; data?: unknown };
          handleRelayMessage(msg);
        } catch (err) {
          console.error('[FigmaFast] Failed to parse relay message:', err);
        }
      });

      socket.on('close', () => {
        console.error('[FigmaFast] Disconnected from relay');
        if (relayClientSocket === socket) {
          relayClientSocket = null;
          isActive = false;
          pluginConnected = false;

          // Reject all pending requests
          for (const [id, req] of pendingRequests) {
            clearTimeout(req.timeout);
            req.reject(new Error('Disconnected from relay'));
            pendingRequests.delete(id);
          }
        }
      });

      socket.on('error', (err) => {
        console.error('[FigmaFast] Relay client socket error:', err.message);
      });

      resolve(true);
    });

    socket.on('error', (err: NodeJS.ErrnoException) => {
      if (!connected) {
        clearTimeout(connectTimeout);
        if (err.code === 'ECONNREFUSED') {
          resolve(false);
        } else {
          resolve(false);
        }
      }
    });
  });
}

function handleRelayMessage(msg: { type: string; clientId?: string; isActive?: boolean; id?: string; error?: string; reason?: string; success?: boolean; data?: unknown }): void {
  switch (msg.type) {
    case 'registered':
      isActive = msg.isActive ?? false;
      console.error(`[FigmaFast] Registered with relay, active: ${isActive}`);
      break;

    case 'activated':
      isActive = true;
      console.error('[FigmaFast] Client activated');
      break;

    case 'deactivated':
      isActive = false;
      console.error(`[FigmaFast] Client deactivated: ${msg.reason ?? ''}`);
      break;

    case 'plugin_connected':
      pluginConnected = true;
      console.error('[FigmaFast] Plugin connected (relay notification)');
      break;

    case 'plugin_disconnected':
      pluginConnected = false;
      console.error('[FigmaFast] Plugin disconnected (relay notification)');
      break;

    case 'relay_error': {
      const id = msg.id ?? '';
      const pending = pendingRequests.get(id);
      if (pending) {
        clearTimeout(pending.timeout);
        pendingRequests.delete(id);
        pending.reject(new Error(msg.error ?? 'Relay error'));
      }
      break;
    }

    case 'pong': {
      const id = msg.id ?? '';
      const pending = pendingRequests.get(id);
      if (pending) {
        clearTimeout(pending.timeout);
        pendingRequests.delete(id);
        pending.resolve(msg as PluginToServerMessage);
      }
      break;
    }

    case 'result': {
      const id = msg.id ?? '';
      const pending = pendingRequests.get(id);
      if (pending) {
        clearTimeout(pending.timeout);
        pendingRequests.delete(id);
        pending.resolve(msg as PluginToServerMessage);
      }
      break;
    }

    default:
      // Unknown message type — ignore
      break;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
