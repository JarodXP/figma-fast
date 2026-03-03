"use strict";
/**
 * Phase 3: Resilient Relay — Detached Process Tests
 *
 * Tests for relay-process.ts running as a detached child process.
 * Port range: 39400-39499
 *
 * NOTE: These tests spawn the compiled relay-process.js from dist/ws/.
 * Run `npm run build --workspace=packages/mcp-server` before running these tests.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const child_process_1 = require("child_process");
const ws_1 = require("ws");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
// Path to the compiled relay-process.js (built output).
// __dirname when run via vitest = packages/mcp-server/src/__tests__/
// relay-process.js compiles to packages/mcp-server/dist/ws/relay-process.js
const RELAY_PROCESS_PATH = path.resolve(__dirname, '../../dist/ws/relay-process.js');
// Idle timeout for tests (2s instead of 60s default)
const TEST_IDLE_TIMEOUT_MS = 2000;
// Track processes and PID files for cleanup
const spawnedProcesses = [];
const pidFilesToClean = [];
// Helper: wait for N milliseconds
function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
// Helper: wait for a WebSocket to connect
function waitForOpen(ws, timeoutMs = 2000) {
    return new Promise((resolve, reject) => {
        if (ws.readyState === ws_1.WebSocket.OPEN) {
            resolve();
            return;
        }
        const timer = setTimeout(() => reject(new Error(`WS open timeout after ${timeoutMs}ms`)), timeoutMs);
        ws.once('open', () => { clearTimeout(timer); resolve(); });
        ws.once('error', (err) => { clearTimeout(timer); reject(err); });
    });
}
// Helper: wait for a single message on a socket
function nextMessage(socket, timeoutMs = 2000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`nextMessage timeout after ${timeoutMs}ms`)), timeoutMs);
        const onMessage = (raw) => {
            clearTimeout(timer);
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
            clearTimeout(timer);
            socket.off('message', onMessage);
            socket.off('error', onError);
            reject(err);
        };
        socket.on('message', onMessage);
        socket.on('error', onError);
    });
}
// Helper: spawn a detached relay process and wait for 'ready'
function spawnRelay(port, pidFile, idleTimeoutMs = TEST_IDLE_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        const child = (0, child_process_1.fork)(RELAY_PROCESS_PATH, [String(port), String(idleTimeoutMs), pidFile], {
            detached: true,
            stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
        });
        spawnedProcesses.push(child);
        const timer = setTimeout(() => {
            child.off('message', onMessage);
            child.off('error', onError);
            reject(new Error('Relay process did not send ready within timeout'));
        }, 10000);
        const onMessage = (msg) => {
            if (msg.type === 'ready') {
                clearTimeout(timer);
                child.off('message', onMessage);
                child.off('error', onError);
                resolve(child);
            }
        };
        const onError = (err) => {
            clearTimeout(timer);
            child.off('message', onMessage);
            child.off('error', onError);
            reject(err);
        };
        child.on('message', onMessage);
        child.on('error', onError);
    });
}
// Helper: check if a process is running
function isProcessRunning(pid) {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
// Helper: kill a process gracefully, then forcefully
async function killProcess(child) {
    if (child.exitCode !== null || child.signalCode !== null)
        return;
    child.kill('SIGTERM');
    await wait(300);
    if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
    }
}
(0, vitest_1.afterEach)(async () => {
    // Kill all spawned processes
    for (const child of spawnedProcesses) {
        await killProcess(child);
    }
    spawnedProcesses.length = 0;
    // Clean up PID files
    for (const pidFile of pidFilesToClean) {
        try {
            fs.unlinkSync(pidFile);
        }
        catch { /* already gone */ }
    }
    pidFilesToClean.length = 0;
});
// ── TEST-D-001: Relay starts as detached child process ────────────────────────
(0, vitest_1.describe)('TEST-D-001: Relay starts as detached child process', () => {
    (0, vitest_1.it)('forks a separate process that listens on the port', async () => {
        const port = 39401;
        const pidFile = path.join(os.tmpdir(), `figma-fast-test-relay-${port}.pid`);
        pidFilesToClean.push(pidFile);
        // Spawn the relay
        const child = await spawnRelay(port, pidFile);
        const relayPid = child.pid;
        // The relay process should be running
        (0, vitest_1.expect)(isProcessRunning(relayPid)).toBe(true);
        // We should be able to connect to the port
        const ws = new ws_1.WebSocket(`ws://localhost:${port}`);
        try {
            await waitForOpen(ws);
            (0, vitest_1.expect)(ws.readyState).toBe(ws_1.WebSocket.OPEN);
        }
        finally {
            ws.close();
        }
    }, 15000);
});
// ── TEST-D-002: PID file is created on relay startup ─────────────────────────
(0, vitest_1.describe)('TEST-D-002: PID file is created on relay startup', () => {
    (0, vitest_1.it)('writes own PID to the PID file on startup', async () => {
        const port = 39402;
        const pidFile = path.join(os.tmpdir(), `figma-fast-test-relay-${port}.pid`);
        pidFilesToClean.push(pidFile);
        // Ensure PID file does not exist before start
        try {
            fs.unlinkSync(pidFile);
        }
        catch { /* ok */ }
        const child = await spawnRelay(port, pidFile);
        const relayPid = child.pid;
        // PID file should exist
        (0, vitest_1.expect)(fs.existsSync(pidFile)).toBe(true);
        // PID file should contain the relay process PID
        const pidFileContents = fs.readFileSync(pidFile, 'utf8').trim();
        (0, vitest_1.expect)(pidFileContents).toBe(String(relayPid));
    }, 15000);
});
// ── TEST-D-003: Relay auto-exits after idle timeout ───────────────────────────
(0, vitest_1.describe)('TEST-D-003: Relay auto-exits after idle timeout', () => {
    (0, vitest_1.it)('exits and removes PID file after idle timeout with no connections', async () => {
        const port = 39403;
        const pidFile = path.join(os.tmpdir(), `figma-fast-test-relay-${port}.pid`);
        pidFilesToClean.push(pidFile);
        // Start relay with 2s idle timeout
        const child = await spawnRelay(port, pidFile, TEST_IDLE_TIMEOUT_MS);
        const relayPid = child.pid;
        // Relay is running and PID file exists
        (0, vitest_1.expect)(isProcessRunning(relayPid)).toBe(true);
        (0, vitest_1.expect)(fs.existsSync(pidFile)).toBe(true);
        // Wait for idle timeout to elapse + some buffer
        await wait(TEST_IDLE_TIMEOUT_MS + 1000);
        // Relay should have exited
        (0, vitest_1.expect)(isProcessRunning(relayPid)).toBe(false);
        // PID file should be removed
        (0, vitest_1.expect)(fs.existsSync(pidFile)).toBe(false);
    }, 20000); // allow extra time: spawn (~1s) + idle timeout (2s) + buffer
});
// ── TEST-D-004: Relay survives parent process exit ────────────────────────────
(0, vitest_1.describe)('TEST-D-004: Relay survives parent process exit', () => {
    (0, vitest_1.it)('continues running and accepting connections after the spawning process disconnects', async () => {
        const port = 39404;
        const pidFile = path.join(os.tmpdir(), `figma-fast-test-relay-${port}.pid`);
        pidFilesToClean.push(pidFile);
        const child = await spawnRelay(port, pidFile);
        // Connect a second client (simulating MCP process B)
        const ws = new ws_1.WebSocket(`ws://localhost:${port}`);
        await waitForOpen(ws);
        ws.send(JSON.stringify({ type: 'register', clientId: 'client-B', clientName: 'Process B' }));
        const registered = await nextMessage(ws);
        (0, vitest_1.expect)(registered.type).toBe('registered');
        // Disconnect the child's IPC (simulate parent exit by unref + disconnect)
        child.disconnect();
        child.unref();
        // Wait briefly
        await wait(300);
        // The relay should still be running (our WS connection still works)
        ws.send(JSON.stringify({ type: 'ping', id: 'test-survive-id' }));
        // Relay should still be running
        (0, vitest_1.expect)(isProcessRunning(child.pid)).toBe(true);
        ws.close();
    }, 15000);
});
// ── TEST-D-005: Stale PID file is detected and cleaned up ────────────────────
(0, vitest_1.describe)('TEST-D-005: Stale PID file is detected and cleaned up', () => {
    (0, vitest_1.it)('starts a new relay when PID file points to a dead process', async () => {
        const port = 39405;
        const pidFile = path.join(os.tmpdir(), `figma-fast-test-relay-${port}.pid`);
        pidFilesToClean.push(pidFile);
        // Write a stale PID file pointing to a non-existent process
        const stalePid = 99999;
        fs.writeFileSync(pidFile, String(stalePid), 'utf8');
        // Spawn new relay — it should detect stale PID and start fresh
        const child = await spawnRelay(port, pidFile);
        const relayPid = child.pid;
        // PID file should now contain the new relay's PID
        (0, vitest_1.expect)(fs.existsSync(pidFile)).toBe(true);
        const pidContents = fs.readFileSync(pidFile, 'utf8').trim();
        (0, vitest_1.expect)(pidContents).toBe(String(relayPid));
        (0, vitest_1.expect)(pidContents).not.toBe(String(stalePid));
    }, 15000);
});
// ── TEST-D-006: New MCP process connects to existing detached relay ───────────
(0, vitest_1.describe)('TEST-D-006: New MCP process connects to existing detached relay', () => {
    (0, vitest_1.it)('second client registers successfully on already-running relay', async () => {
        const port = 39406;
        const pidFile = path.join(os.tmpdir(), `figma-fast-test-relay-${port}.pid`);
        pidFilesToClean.push(pidFile);
        // Start relay (simulating first MCP process starting it)
        await spawnRelay(port, pidFile);
        // Second MCP client connects directly (relay is already running)
        const ws = new ws_1.WebSocket(`ws://localhost:${port}`);
        await waitForOpen(ws);
        ws.send(JSON.stringify({ type: 'register', clientId: 'client-new', clientName: 'New MCP Process' }));
        const response = await nextMessage(ws);
        (0, vitest_1.expect)(response.type).toBe('registered');
        (0, vitest_1.expect)(response.clientId).toBe('client-new');
        ws.close();
    }, 15000);
});
// ── TEST-D-007: PID file is cleaned up on graceful relay shutdown ─────────────
(0, vitest_1.describe)('TEST-D-007: PID file is cleaned up on graceful relay shutdown', () => {
    (0, vitest_1.it)('removes PID file when relay receives SIGTERM', async () => {
        const port = 39407;
        const pidFile = path.join(os.tmpdir(), `figma-fast-test-relay-${port}.pid`);
        pidFilesToClean.push(pidFile);
        const child = await spawnRelay(port, pidFile);
        const relayPid = child.pid;
        // Verify relay is running with PID file
        (0, vitest_1.expect)(isProcessRunning(relayPid)).toBe(true);
        (0, vitest_1.expect)(fs.existsSync(pidFile)).toBe(true);
        // Send SIGTERM to the relay
        process.kill(relayPid, 'SIGTERM');
        // Wait for graceful shutdown
        await wait(800);
        // PID file should be removed
        (0, vitest_1.expect)(fs.existsSync(pidFile)).toBe(false);
        // Process should have exited
        (0, vitest_1.expect)(isProcessRunning(relayPid)).toBe(false);
    }, 15000);
});
//# sourceMappingURL=relay-detached.test.js.map