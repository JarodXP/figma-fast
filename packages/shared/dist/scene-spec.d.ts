/**
 * Declarative scene specification types for FigmaFast.
 * SceneNode is THE core type — everything revolves around this.
 */
export type NodeType = 'FRAME' | 'TEXT' | 'RECTANGLE' | 'ELLIPSE' | 'GROUP' | 'COMPONENT' | 'COMPONENT_SET' | 'COMPONENT_INSTANCE' | 'POLYGON' | 'STAR' | 'LINE' | 'VECTOR';
export type FillType = 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND' | 'IMAGE';
export interface GradientStop {
    position: number;
    color: string;
}
export interface Fill {
    type: FillType;
    color?: string;
    opacity?: number;
    visible?: boolean;
    gradientStops?: GradientStop[];
    gradientTransform?: [[number, number, number], [number, number, number]];
    imageRef?: string;
    scaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE';
}
export type StrokeAlign = 'INSIDE' | 'OUTSIDE' | 'CENTER';
export interface Stroke {
    type?: FillType;
    color: string;
    weight: number;
    align?: StrokeAlign;
    opacity?: number;
    dashPattern?: number[];
}
export type EffectType = 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
export interface Effect {
    type: EffectType;
    color?: string;
    offset?: {
        x: number;
        y: number;
    };
    radius: number;
    spread?: number;
    visible?: boolean;
    opacity?: number;
}
export type LayoutMode = 'HORIZONTAL' | 'VERTICAL' | 'NONE';
export type PrimaryAxisAlign = 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
export type CounterAxisAlign = 'MIN' | 'CENTER' | 'MAX';
export type LayoutSizing = 'FIXED' | 'HUG' | 'FILL';
export type TextAutoResize = 'WIDTH_AND_HEIGHT' | 'HEIGHT' | 'NONE' | 'TRUNCATE';
export type TextAlignHorizontal = 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
export type TextAlignVertical = 'TOP' | 'CENTER' | 'BOTTOM';
export type TextDecoration = 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
export type TextCase = 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
export interface LineHeight {
    value: number;
    unit: 'PIXELS' | 'PERCENT' | 'AUTO';
}
export interface SceneNode {
    /** Client-assigned ID for follow-up references */
    id?: string;
    type: NodeType;
    name?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fills?: Fill[];
    strokes?: Stroke[];
    effects?: Effect[];
    opacity?: number;
    cornerRadius?: number | [number, number, number, number];
    clipsContent?: boolean;
    layoutMode?: LayoutMode;
    primaryAxisAlignItems?: PrimaryAxisAlign;
    counterAxisAlignItems?: CounterAxisAlign;
    itemSpacing?: number;
    padding?: number | [number, number, number, number];
    layoutSizingHorizontal?: LayoutSizing;
    layoutSizingVertical?: LayoutSizing;
    characters?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: number | string;
    fontStyle?: string;
    textAlignHorizontal?: TextAlignHorizontal;
    textAlignVertical?: TextAlignVertical;
    textAutoResize?: TextAutoResize;
    lineHeight?: number | LineHeight;
    letterSpacing?: number;
    textDecoration?: TextDecoration;
    textCase?: TextCase;
    componentKey?: string;
    overrides?: Record<string, Partial<SceneNode>>;
    componentDescription?: string;
    children?: SceneNode[];
    visible?: boolean;
    locked?: boolean;
}
//# sourceMappingURL=scene-spec.d.ts.map