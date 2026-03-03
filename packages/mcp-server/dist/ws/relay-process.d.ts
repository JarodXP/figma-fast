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
export {};
//# sourceMappingURL=relay-process.d.ts.map