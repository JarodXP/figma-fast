"use strict";
/**
 * relay-process.ts -- Standalone relay entry point for detached process mode.
 *
 * This script is spawned as a detached child process by server.ts when no relay
 * is running. It starts a WsRelay, manages its own lifecycle, and exits cleanly
 * when idle or when receiving shutdown signals.
 *
 * Arguments (all optional, positional):
 *   argv[2]  port               (default: FIGMA_FAST_PORT env or 3056)
 *   argv[3]  idleTimeoutMs      (default: FIGMA_FAST_RELAY_IDLE_TIMEOUT env or 60000)
 *   argv[4]  pidFilePath        (default: <tmpdir>/figma-fast-relay.pid)
 *
 * IPC: sends { type: 'ready' } to parent once the relay is listening.
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
const relay_js_1 = require("./relay.js");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
// ── Parse arguments ───────────────────────────────────────────────────────────
const port = parseInt(process.argv[2] ?? process.env['FIGMA_FAST_PORT'] ?? '3056', 10);
const idleTimeoutMs = parseInt(process.argv[3] ?? process.env['FIGMA_FAST_RELAY_IDLE_TIMEOUT'] ?? '60000', 10);
const pidFilePath = process.argv[4] ??
    process.env['FIGMA_FAST_PID_FILE'] ??
    path.join(os.tmpdir(), `figma-fast-relay-${port}.pid`);
// ── State ─────────────────────────────────────────────────────────────────────
const relay = new relay_js_1.WsRelay(port);
let idleTimer = null;
let connectionCount = 0;
// ── PID file helpers ──────────────────────────────────────────────────────────
function writePidFile() {
    try {
        fs.writeFileSync(pidFilePath, String(process.pid), 'utf8');
        console.error(`[FigmaFast] Relay process: PID file written: ${pidFilePath} (PID ${process.pid})`);
    }
    catch (err) {
        console.error('[FigmaFast] Relay process: failed to write PID file:', err);
    }
}
function removePidFile() {
    try {
        if (fs.existsSync(pidFilePath)) {
            fs.unlinkSync(pidFilePath);
            console.error(`[FigmaFast] Relay process: PID file removed: ${pidFilePath}`);
        }
    }
    catch (err) {
        console.error('[FigmaFast] Relay process: failed to remove PID file:', err);
    }
}
// ── Idle timeout management ───────────────────────────────────────────────────
function startIdleTimer() {
    if (idleTimer !== null)
        return;
    console.error(`[FigmaFast] Relay process: idle — will exit in ${idleTimeoutMs}ms if no connections`);
    idleTimer = setTimeout(() => {
        console.error('[FigmaFast] Relay process: idle timeout elapsed, shutting down');
        shutdown(0);
    }, idleTimeoutMs);
}
function cancelIdleTimer() {
    if (idleTimer !== null) {
        clearTimeout(idleTimer);
        idleTimer = null;
    }
}
// ── Connection tracking ───────────────────────────────────────────────────────
/**
 * Called by the relay when a connection is established or closed.
 * We hook into this via polling the relay's clientRegistry and pluginSocket,
 * but WsRelay does not expose connection lifecycle hooks directly.
 * Instead we use a polling approach to track whether anyone is connected.
 */
function startConnectionPolling() {
    const POLL_INTERVAL_MS = 500;
    const poll = () => {
        const clientCount = relay.clientRegistry.size;
        const hasPlugin = relay.currentPluginSocket !== null;
        const newCount = clientCount + (hasPlugin ? 1 : 0);
        if (newCount !== connectionCount) {
            const wasEmpty = connectionCount === 0;
            connectionCount = newCount;
            if (connectionCount === 0 && !wasEmpty) {
                // Everyone just disconnected — start idle timer
                startIdleTimer();
            }
            else if (connectionCount > 0) {
                // Someone connected — cancel idle timer
                cancelIdleTimer();
            }
        }
        // Schedule next poll (only if relay is still running)
        setTimeout(poll, POLL_INTERVAL_MS);
    };
    setTimeout(poll, POLL_INTERVAL_MS);
}
// ── Graceful shutdown ─────────────────────────────────────────────────────────
let isShuttingDown = false;
async function shutdown(exitCode) {
    if (isShuttingDown)
        return;
    isShuttingDown = true;
    console.error('[FigmaFast] Relay process: shutting down...');
    cancelIdleTimer();
    try {
        await relay.close();
    }
    catch (err) {
        console.error('[FigmaFast] Relay process: error during close:', err);
    }
    removePidFile();
    process.exit(exitCode);
}
process.on('SIGTERM', () => {
    console.error('[FigmaFast] Relay process: received SIGTERM');
    void shutdown(0);
});
process.on('SIGINT', () => {
    console.error('[FigmaFast] Relay process: received SIGINT');
    void shutdown(0);
});
// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    // Check for and clean up stale PID file
    if (fs.existsSync(pidFilePath)) {
        const existingPid = parseInt(fs.readFileSync(pidFilePath, 'utf8').trim(), 10);
        if (!isNaN(existingPid)) {
            const isAlive = (() => {
                try {
                    process.kill(existingPid, 0);
                    return true;
                }
                catch {
                    return false;
                }
            })();
            if (isAlive) {
                console.error(`[FigmaFast] Relay process: another relay is running (PID ${existingPid}), exiting`);
                process.exit(0);
            }
            else {
                console.error(`[FigmaFast] Relay process: removing stale PID file (dead PID ${existingPid})`);
                removePidFile();
            }
        }
    }
    // Retry loop: the in-process relay in the parent MCP server may be occupying the port.
    // Wait for it to release (parent exits) before binding.
    const MAX_RETRIES = 20;
    const RETRY_DELAY_MS = 500;
    let started = false;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            await relay.start();
            started = true;
            break;
        }
        catch (err) {
            const nodeErr = err;
            if (nodeErr.code === 'EADDRINUSE') {
                if (attempt === 0) {
                    console.error(`[FigmaFast] Relay process: port ${port} in use, waiting for it to be released...`);
                }
                await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
                continue;
            }
            console.error('[FigmaFast] Relay process: failed to start:', err);
            process.exit(1);
        }
    }
    if (!started) {
        console.error(`[FigmaFast] Relay process: port ${port} still in use after ${MAX_RETRIES} retries, exiting`);
        process.exit(0);
    }
    writePidFile();
    // Start idle timer immediately — no connections yet
    startIdleTimer();
    // Start connection polling to manage idle timer
    startConnectionPolling();
    console.error(`[FigmaFast] Relay process: listening on port ${port} (PID ${process.pid})`);
    // Notify parent process that relay is ready
    if (process.send) {
        process.send({ type: 'ready' });
    }
}
void main();
//# sourceMappingURL=relay-process.js.map