"use strict";
/**
 * Ping tool — tests end-to-end connectivity with the Figma plugin.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPingTool = registerPingTool;
const server_js_1 = require("../ws/server.js");
function registerPingTool(server) {
    server.tool('ping', 'Test connectivity with the Figma plugin. Returns pong if the plugin is connected and responsive.', {}, async () => {
        if (!(0, server_js_1.isPluginConnected)()) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Figma plugin is not connected. Open the FigmaFast plugin in Figma.',
                    },
                ],
                isError: true,
            };
        }
        const start = Date.now();
        try {
            const response = await (0, server_js_1.sendToPlugin)({ type: 'ping' }, 10_000);
            const rtt = Date.now() - start;
            if (response.type === 'pong') {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `pong (${rtt}ms round-trip)`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `Unexpected response type: ${response.type}`,
                    },
                ],
                isError: true,
            };
        }
        catch (err) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Ping failed: ${err instanceof Error ? err.message : String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=ping.js.map