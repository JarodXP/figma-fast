"use strict";
/**
 * Style creation MCP tools — create local paint, text, and effect styles in Figma.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerStyleTools = registerStyleTools;
const zod_1 = require("zod");
const server_js_1 = require("../ws/server.js");
const schemas_js_1 = require("../schemas.js");
const NOT_CONNECTED = {
    content: [
        {
            type: 'text',
            text: 'Figma plugin is not connected. Open the FigmaFast plugin in Figma.',
        },
    ],
    isError: true,
};
const TIMEOUT = 30_000;
// ─── Tool Registration ─────────────────────────────────────────
function registerStyleTools(server) {
    // ─── create_paint_style ──────────────────────────────────────
    server.tool('create_paint_style', 'Create a local paint style (color/gradient) in the Figma file. Returns the style ID which can be used with fillStyleId on any node. Use get_styles to see existing styles.', {
        name: zod_1.z.string().describe('Name for the new paint style'),
        fills: zod_1.z.array(schemas_js_1.FillSchema).min(1).describe('Fill definitions for the paint style'),
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'create_paint_style',
                name: params.name,
                fills: params.fills,
            }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                const data = response.data;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Created paint style ${data.name} (id: ${data.id}, key: ${data.key})`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `create_paint_style failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
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
                        text: `create_paint_style failed: ${err instanceof Error ? err.message : String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // ─── create_text_style ───────────────────────────────────────
    server.tool('create_text_style', 'Create a local text style in the Figma file. Returns the style ID for use with textStyleId.', {
        name: zod_1.z.string().describe('Name for the new text style'),
        fontFamily: zod_1.z.string().optional().describe('Font family name (default: Inter)'),
        fontSize: zod_1.z.number().optional().describe('Font size in pixels'),
        fontWeight: zod_1.z
            .union([zod_1.z.number(), zod_1.z.string()])
            .optional()
            .describe('Font weight as number (400, 700) or string ("Bold", "Regular")'),
        lineHeight: zod_1.z
            .union([zod_1.z.number(), schemas_js_1.LineHeightSchema])
            .optional()
            .describe('Line height in pixels (number) or as LineHeight object'),
        letterSpacing: zod_1.z.number().optional().describe('Letter spacing in pixels'),
        textDecoration: zod_1.z.enum(['NONE', 'UNDERLINE', 'STRIKETHROUGH']).optional().describe('Text decoration'),
        textCase: zod_1.z.enum(['ORIGINAL', 'UPPER', 'LOWER', 'TITLE']).optional().describe('Text case transformation'),
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'create_text_style',
                name: params.name,
                fontFamily: params.fontFamily,
                fontSize: params.fontSize,
                fontWeight: params.fontWeight,
                lineHeight: params.lineHeight,
                letterSpacing: params.letterSpacing,
                textDecoration: params.textDecoration,
                textCase: params.textCase,
            }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                const data = response.data;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Created text style ${data.name} (id: ${data.id}, key: ${data.key})`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `create_text_style failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
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
                        text: `create_text_style failed: ${err instanceof Error ? err.message : String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // ─── create_effect_style ─────────────────────────────────────
    server.tool('create_effect_style', 'Create a local effect style in the Figma file. Returns the style ID for use with effectStyleId.', {
        name: zod_1.z.string().describe('Name for the new effect style'),
        effects: zod_1.z.array(schemas_js_1.EffectSchema).min(1).describe('Effect definitions for the style'),
    }, async (params) => {
        if (!(0, server_js_1.isPluginConnected)())
            return NOT_CONNECTED;
        try {
            const response = await (0, server_js_1.sendToPlugin)({
                type: 'create_effect_style',
                name: params.name,
                effects: params.effects,
            }, TIMEOUT);
            if (response.type === 'result' && response.success) {
                const data = response.data;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Created effect style ${data.name} (id: ${data.id}, key: ${data.key})`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `create_effect_style failed: ${response.type === 'result' ? response.error : 'Unexpected response'}`,
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
                        text: `create_effect_style failed: ${err instanceof Error ? err.message : String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=style-tools.js.map