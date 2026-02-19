/**
 * Shared Zod schemas for FigmaFast MCP tools.
 * Extracted from build-scene.ts and edit-tools.ts to eliminate duplication.
 */
import { z } from 'zod';
export declare const FillSchema: z.ZodObject<{
    type: z.ZodEnum<["SOLID", "GRADIENT_LINEAR", "GRADIENT_RADIAL", "GRADIENT_ANGULAR", "GRADIENT_DIAMOND", "IMAGE"]>;
    color: z.ZodOptional<z.ZodString>;
    opacity: z.ZodOptional<z.ZodNumber>;
    visible: z.ZodOptional<z.ZodBoolean>;
    gradientStops: z.ZodOptional<z.ZodArray<z.ZodObject<{
        position: z.ZodNumber;
        color: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        color: string;
        position: number;
    }, {
        color: string;
        position: number;
    }>, "many">>;
    gradientTransform: z.ZodOptional<z.ZodTuple<[z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber], null>, z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber], null>], null>>;
    scaleMode: z.ZodOptional<z.ZodEnum<["FILL", "FIT", "CROP", "TILE"]>>;
}, "strip", z.ZodTypeAny, {
    type: "SOLID" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND" | "IMAGE";
    color?: string | undefined;
    opacity?: number | undefined;
    visible?: boolean | undefined;
    gradientStops?: {
        color: string;
        position: number;
    }[] | undefined;
    gradientTransform?: [[number, number, number], [number, number, number]] | undefined;
    scaleMode?: "FILL" | "FIT" | "CROP" | "TILE" | undefined;
}, {
    type: "SOLID" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND" | "IMAGE";
    color?: string | undefined;
    opacity?: number | undefined;
    visible?: boolean | undefined;
    gradientStops?: {
        color: string;
        position: number;
    }[] | undefined;
    gradientTransform?: [[number, number, number], [number, number, number]] | undefined;
    scaleMode?: "FILL" | "FIT" | "CROP" | "TILE" | undefined;
}>;
export declare const StrokeSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<["SOLID", "GRADIENT_LINEAR", "GRADIENT_RADIAL", "GRADIENT_ANGULAR", "GRADIENT_DIAMOND", "IMAGE"]>>;
    color: z.ZodString;
    weight: z.ZodNumber;
    align: z.ZodOptional<z.ZodEnum<["INSIDE", "OUTSIDE", "CENTER"]>>;
    opacity: z.ZodOptional<z.ZodNumber>;
    dashPattern: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
}, "strip", z.ZodTypeAny, {
    color: string;
    weight: number;
    type?: "SOLID" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND" | "IMAGE" | undefined;
    opacity?: number | undefined;
    align?: "INSIDE" | "OUTSIDE" | "CENTER" | undefined;
    dashPattern?: number[] | undefined;
}, {
    color: string;
    weight: number;
    type?: "SOLID" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND" | "IMAGE" | undefined;
    opacity?: number | undefined;
    align?: "INSIDE" | "OUTSIDE" | "CENTER" | undefined;
    dashPattern?: number[] | undefined;
}>;
export declare const EffectSchema: z.ZodObject<{
    type: z.ZodEnum<["DROP_SHADOW", "INNER_SHADOW", "LAYER_BLUR", "BACKGROUND_BLUR"]>;
    color: z.ZodOptional<z.ZodString>;
    offset: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
    }, {
        x: number;
        y: number;
    }>>;
    radius: z.ZodNumber;
    spread: z.ZodOptional<z.ZodNumber>;
    visible: z.ZodOptional<z.ZodBoolean>;
    opacity: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "DROP_SHADOW" | "INNER_SHADOW" | "LAYER_BLUR" | "BACKGROUND_BLUR";
    radius: number;
    color?: string | undefined;
    opacity?: number | undefined;
    visible?: boolean | undefined;
    offset?: {
        x: number;
        y: number;
    } | undefined;
    spread?: number | undefined;
}, {
    type: "DROP_SHADOW" | "INNER_SHADOW" | "LAYER_BLUR" | "BACKGROUND_BLUR";
    radius: number;
    color?: string | undefined;
    opacity?: number | undefined;
    visible?: boolean | undefined;
    offset?: {
        x: number;
        y: number;
    } | undefined;
    spread?: number | undefined;
}>;
export declare const LineHeightSchema: z.ZodObject<{
    value: z.ZodNumber;
    unit: z.ZodEnum<["PIXELS", "PERCENT", "AUTO"]>;
}, "strip", z.ZodTypeAny, {
    value: number;
    unit: "PIXELS" | "PERCENT" | "AUTO";
}, {
    value: number;
    unit: "PIXELS" | "PERCENT" | "AUTO";
}>;
export declare const SceneNodeSchema: z.ZodType<any>;
export declare const ModifyPropertiesSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    x: z.ZodOptional<z.ZodNumber>;
    y: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    fills: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["SOLID", "GRADIENT_LINEAR", "GRADIENT_RADIAL", "GRADIENT_ANGULAR", "GRADIENT_DIAMOND", "IMAGE"]>;
        color: z.ZodOptional<z.ZodString>;
        opacity: z.ZodOptional<z.ZodNumber>;
        visible: z.ZodOptional<z.ZodBoolean>;
        gradientStops: z.ZodOptional<z.ZodArray<z.ZodObject<{
            position: z.ZodNumber;
            color: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            color: string;
            position: number;
        }, {
            color: string;
            position: number;
        }>, "many">>;
        gradientTransform: z.ZodOptional<z.ZodTuple<[z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber], null>, z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber], null>], null>>;
        scaleMode: z.ZodOptional<z.ZodEnum<["FILL", "FIT", "CROP", "TILE"]>>;
    }, "strip", z.ZodTypeAny, {
        type: "SOLID" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND" | "IMAGE";
        color?: string | undefined;
        opacity?: number | undefined;
        visible?: boolean | undefined;
        gradientStops?: {
            color: string;
            position: number;
        }[] | undefined;
        gradientTransform?: [[number, number, number], [number, number, number]] | undefined;
        scaleMode?: "FILL" | "FIT" | "CROP" | "TILE" | undefined;
    }, {
        type: "SOLID" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND" | "IMAGE";
        color?: string | undefined;
        opacity?: number | undefined;
        visible?: boolean | undefined;
        gradientStops?: {
            color: string;
            position: number;
        }[] | undefined;
        gradientTransform?: [[number, number, number], [number, number, number]] | undefined;
        scaleMode?: "FILL" | "FIT" | "CROP" | "TILE" | undefined;
    }>, "many">>;
    strokes: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodOptional<z.ZodEnum<["SOLID", "GRADIENT_LINEAR", "GRADIENT_RADIAL", "GRADIENT_ANGULAR", "GRADIENT_DIAMOND", "IMAGE"]>>;
        color: z.ZodString;
        weight: z.ZodNumber;
        align: z.ZodOptional<z.ZodEnum<["INSIDE", "OUTSIDE", "CENTER"]>>;
        opacity: z.ZodOptional<z.ZodNumber>;
        dashPattern: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    }, "strip", z.ZodTypeAny, {
        color: string;
        weight: number;
        type?: "SOLID" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND" | "IMAGE" | undefined;
        opacity?: number | undefined;
        align?: "INSIDE" | "OUTSIDE" | "CENTER" | undefined;
        dashPattern?: number[] | undefined;
    }, {
        color: string;
        weight: number;
        type?: "SOLID" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND" | "IMAGE" | undefined;
        opacity?: number | undefined;
        align?: "INSIDE" | "OUTSIDE" | "CENTER" | undefined;
        dashPattern?: number[] | undefined;
    }>, "many">>;
    effects: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["DROP_SHADOW", "INNER_SHADOW", "LAYER_BLUR", "BACKGROUND_BLUR"]>;
        color: z.ZodOptional<z.ZodString>;
        offset: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>>;
        radius: z.ZodNumber;
        spread: z.ZodOptional<z.ZodNumber>;
        visible: z.ZodOptional<z.ZodBoolean>;
        opacity: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "DROP_SHADOW" | "INNER_SHADOW" | "LAYER_BLUR" | "BACKGROUND_BLUR";
        radius: number;
        color?: string | undefined;
        opacity?: number | undefined;
        visible?: boolean | undefined;
        offset?: {
            x: number;
            y: number;
        } | undefined;
        spread?: number | undefined;
    }, {
        type: "DROP_SHADOW" | "INNER_SHADOW" | "LAYER_BLUR" | "BACKGROUND_BLUR";
        radius: number;
        color?: string | undefined;
        opacity?: number | undefined;
        visible?: boolean | undefined;
        offset?: {
            x: number;
            y: number;
        } | undefined;
        spread?: number | undefined;
    }>, "many">>;
    opacity: z.ZodOptional<z.ZodNumber>;
    cornerRadius: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>]>>;
    clipsContent: z.ZodOptional<z.ZodBoolean>;
    visible: z.ZodOptional<z.ZodBoolean>;
    locked: z.ZodOptional<z.ZodBoolean>;
    layoutMode: z.ZodOptional<z.ZodEnum<["HORIZONTAL", "VERTICAL", "NONE"]>>;
    primaryAxisAlignItems: z.ZodOptional<z.ZodEnum<["MIN", "CENTER", "MAX", "SPACE_BETWEEN"]>>;
    counterAxisAlignItems: z.ZodOptional<z.ZodEnum<["MIN", "CENTER", "MAX"]>>;
    itemSpacing: z.ZodOptional<z.ZodNumber>;
    padding: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>]>>;
    layoutSizingHorizontal: z.ZodOptional<z.ZodEnum<["FIXED", "HUG", "FILL"]>>;
    layoutSizingVertical: z.ZodOptional<z.ZodEnum<["FIXED", "HUG", "FILL"]>>;
    characters: z.ZodOptional<z.ZodString>;
    fontSize: z.ZodOptional<z.ZodNumber>;
    fontFamily: z.ZodOptional<z.ZodString>;
    fontWeight: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    textAlignHorizontal: z.ZodOptional<z.ZodEnum<["LEFT", "CENTER", "RIGHT", "JUSTIFIED"]>>;
    textAlignVertical: z.ZodOptional<z.ZodEnum<["TOP", "CENTER", "BOTTOM"]>>;
    textAutoResize: z.ZodOptional<z.ZodEnum<["WIDTH_AND_HEIGHT", "HEIGHT", "NONE", "TRUNCATE"]>>;
    lineHeight: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodObject<{
        value: z.ZodNumber;
        unit: z.ZodEnum<["PIXELS", "PERCENT", "AUTO"]>;
    }, "strip", z.ZodTypeAny, {
        value: number;
        unit: "PIXELS" | "PERCENT" | "AUTO";
    }, {
        value: number;
        unit: "PIXELS" | "PERCENT" | "AUTO";
    }>]>>;
    letterSpacing: z.ZodOptional<z.ZodNumber>;
    textDecoration: z.ZodOptional<z.ZodEnum<["NONE", "UNDERLINE", "STRIKETHROUGH"]>>;
    textCase: z.ZodOptional<z.ZodEnum<["ORIGINAL", "UPPER", "LOWER", "TITLE"]>>;
    swapComponent: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    x?: number | undefined;
    y?: number | undefined;
    name?: string | undefined;
    opacity?: number | undefined;
    visible?: boolean | undefined;
    width?: number | undefined;
    height?: number | undefined;
    fills?: {
        type: "SOLID" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND" | "IMAGE";
        color?: string | undefined;
        opacity?: number | undefined;
        visible?: boolean | undefined;
        gradientStops?: {
            color: string;
            position: number;
        }[] | undefined;
        gradientTransform?: [[number, number, number], [number, number, number]] | undefined;
        scaleMode?: "FILL" | "FIT" | "CROP" | "TILE" | undefined;
    }[] | undefined;
    strokes?: {
        color: string;
        weight: number;
        type?: "SOLID" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND" | "IMAGE" | undefined;
        opacity?: number | undefined;
        align?: "INSIDE" | "OUTSIDE" | "CENTER" | undefined;
        dashPattern?: number[] | undefined;
    }[] | undefined;
    effects?: {
        type: "DROP_SHADOW" | "INNER_SHADOW" | "LAYER_BLUR" | "BACKGROUND_BLUR";
        radius: number;
        color?: string | undefined;
        opacity?: number | undefined;
        visible?: boolean | undefined;
        offset?: {
            x: number;
            y: number;
        } | undefined;
        spread?: number | undefined;
    }[] | undefined;
    cornerRadius?: number | [number, number, number, number] | undefined;
    clipsContent?: boolean | undefined;
    layoutMode?: "HORIZONTAL" | "VERTICAL" | "NONE" | undefined;
    primaryAxisAlignItems?: "CENTER" | "MIN" | "MAX" | "SPACE_BETWEEN" | undefined;
    counterAxisAlignItems?: "CENTER" | "MIN" | "MAX" | undefined;
    itemSpacing?: number | undefined;
    padding?: number | [number, number, number, number] | undefined;
    layoutSizingHorizontal?: "FILL" | "FIXED" | "HUG" | undefined;
    layoutSizingVertical?: "FILL" | "FIXED" | "HUG" | undefined;
    characters?: string | undefined;
    fontSize?: number | undefined;
    fontFamily?: string | undefined;
    fontWeight?: string | number | undefined;
    textAlignHorizontal?: "CENTER" | "LEFT" | "RIGHT" | "JUSTIFIED" | undefined;
    textAlignVertical?: "CENTER" | "TOP" | "BOTTOM" | undefined;
    textAutoResize?: "NONE" | "WIDTH_AND_HEIGHT" | "HEIGHT" | "TRUNCATE" | undefined;
    lineHeight?: number | {
        value: number;
        unit: "PIXELS" | "PERCENT" | "AUTO";
    } | undefined;
    letterSpacing?: number | undefined;
    textDecoration?: "NONE" | "UNDERLINE" | "STRIKETHROUGH" | undefined;
    textCase?: "ORIGINAL" | "UPPER" | "LOWER" | "TITLE" | undefined;
    locked?: boolean | undefined;
    swapComponent?: string | undefined;
}, {
    x?: number | undefined;
    y?: number | undefined;
    name?: string | undefined;
    opacity?: number | undefined;
    visible?: boolean | undefined;
    width?: number | undefined;
    height?: number | undefined;
    fills?: {
        type: "SOLID" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND" | "IMAGE";
        color?: string | undefined;
        opacity?: number | undefined;
        visible?: boolean | undefined;
        gradientStops?: {
            color: string;
            position: number;
        }[] | undefined;
        gradientTransform?: [[number, number, number], [number, number, number]] | undefined;
        scaleMode?: "FILL" | "FIT" | "CROP" | "TILE" | undefined;
    }[] | undefined;
    strokes?: {
        color: string;
        weight: number;
        type?: "SOLID" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND" | "IMAGE" | undefined;
        opacity?: number | undefined;
        align?: "INSIDE" | "OUTSIDE" | "CENTER" | undefined;
        dashPattern?: number[] | undefined;
    }[] | undefined;
    effects?: {
        type: "DROP_SHADOW" | "INNER_SHADOW" | "LAYER_BLUR" | "BACKGROUND_BLUR";
        radius: number;
        color?: string | undefined;
        opacity?: number | undefined;
        visible?: boolean | undefined;
        offset?: {
            x: number;
            y: number;
        } | undefined;
        spread?: number | undefined;
    }[] | undefined;
    cornerRadius?: number | [number, number, number, number] | undefined;
    clipsContent?: boolean | undefined;
    layoutMode?: "HORIZONTAL" | "VERTICAL" | "NONE" | undefined;
    primaryAxisAlignItems?: "CENTER" | "MIN" | "MAX" | "SPACE_BETWEEN" | undefined;
    counterAxisAlignItems?: "CENTER" | "MIN" | "MAX" | undefined;
    itemSpacing?: number | undefined;
    padding?: number | [number, number, number, number] | undefined;
    layoutSizingHorizontal?: "FILL" | "FIXED" | "HUG" | undefined;
    layoutSizingVertical?: "FILL" | "FIXED" | "HUG" | undefined;
    characters?: string | undefined;
    fontSize?: number | undefined;
    fontFamily?: string | undefined;
    fontWeight?: string | number | undefined;
    textAlignHorizontal?: "CENTER" | "LEFT" | "RIGHT" | "JUSTIFIED" | undefined;
    textAlignVertical?: "CENTER" | "TOP" | "BOTTOM" | undefined;
    textAutoResize?: "NONE" | "WIDTH_AND_HEIGHT" | "HEIGHT" | "TRUNCATE" | undefined;
    lineHeight?: number | {
        value: number;
        unit: "PIXELS" | "PERCENT" | "AUTO";
    } | undefined;
    letterSpacing?: number | undefined;
    textDecoration?: "NONE" | "UNDERLINE" | "STRIKETHROUGH" | undefined;
    textCase?: "ORIGINAL" | "UPPER" | "LOWER" | "TITLE" | undefined;
    locked?: boolean | undefined;
    swapComponent?: string | undefined;
}>;
//# sourceMappingURL=schemas.d.ts.map