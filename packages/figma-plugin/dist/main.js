"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // ../shared/dist/colors.js
  var require_colors = __commonJS({
    "../shared/dist/colors.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.hexToRgba = hexToRgba2;
      exports.rgbaToHex = rgbaToHex3;
      function hexToRgba2(hex) {
        let h = hex.replace("#", "");
        if (h.length === 3) {
          h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        }
        const r = parseInt(h.slice(0, 2), 16) / 255;
        const g = parseInt(h.slice(2, 4), 16) / 255;
        const b = parseInt(h.slice(4, 6), 16) / 255;
        const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
        return { r, g, b, a };
      }
      function rgbaToHex3(color) {
        const r = Math.round(color.r * 255);
        const g = Math.round(color.g * 255);
        const b = Math.round(color.b * 255);
        const a = Math.round(color.a * 255);
        const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
        return a === 255 ? hex : hex + a.toString(16).padStart(2, "0");
      }
    }
  });

  // ../shared/dist/index.js
  var require_dist = __commonJS({
    "../shared/dist/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.rgbaToHex = exports.hexToRgba = void 0;
      var colors_js_1 = require_colors();
      Object.defineProperty(exports, "hexToRgba", { enumerable: true, get: function() {
        return colors_js_1.hexToRgba;
      } });
      Object.defineProperty(exports, "rgbaToHex", { enumerable: true, get: function() {
        return colors_js_1.rgbaToHex;
      } });
    }
  });

  // src/scene-builder/fonts.ts
  var FALLBACK_FONT = { family: "Inter", style: "Regular" };
  function getFontStyle(weight) {
    if (typeof weight === "string") return weight;
    switch (weight) {
      case 100:
        return "Thin";
      case 200:
        return "Extra Light";
      case 300:
        return "Light";
      case 400:
        return "Regular";
      case 500:
        return "Medium";
      case 600:
        return "Semi Bold";
      case 700:
        return "Bold";
      case 800:
        return "Extra Bold";
      case 900:
        return "Black";
      default:
        return "Regular";
    }
  }
  function collectFonts(spec) {
    const seen = /* @__PURE__ */ new Set();
    const fonts = [];
    function walk(node) {
      var _a;
      if (node.type === "TEXT") {
        const family = (_a = node.fontFamily) != null ? _a : "Inter";
        const style = getFontStyle(node.fontWeight);
        const key = `${family}::${style}`;
        if (!seen.has(key)) {
          seen.add(key);
          fonts.push({ family, style });
        }
      }
      if (node.children) {
        for (const child of node.children) {
          walk(child);
        }
      }
    }
    walk(spec);
    const fallbackKey = `${FALLBACK_FONT.family}::${FALLBACK_FONT.style}`;
    if (!seen.has(fallbackKey)) {
      fonts.push(FALLBACK_FONT);
    }
    return fonts;
  }
  function preloadFonts(fonts) {
    return __async(this, null, function* () {
      const failed = [];
      yield Promise.all(
        fonts.map((font) => __async(null, null, function* () {
          try {
            yield figma.loadFontAsync(font);
          } catch (e) {
            console.warn(`[FigmaFast] Font not available: ${font.family} ${font.style}`);
            failed.push(font);
          }
        }))
      );
      return failed;
    });
  }

  // src/scene-builder/build-node.ts
  var import_shared = __toESM(require_dist());
  function createNode(spec) {
    return __async(this, null, function* () {
      switch (spec.type) {
        case "FRAME":
          return figma.createFrame();
        case "RECTANGLE":
          return figma.createRectangle();
        case "ELLIPSE":
          return figma.createEllipse();
        case "TEXT":
          return figma.createText();
        case "POLYGON":
          return figma.createPolygon();
        case "STAR":
          return figma.createStar();
        case "LINE":
          return figma.createLine();
        case "VECTOR":
          return figma.createVector();
        case "COMPONENT_INSTANCE": {
          if (!spec.componentKey) {
            throw new Error("COMPONENT_INSTANCE requires componentKey");
          }
          const component = yield figma.importComponentByKeyAsync(spec.componentKey);
          return component.createInstance();
        }
        case "GROUP": {
          const frame = figma.createFrame();
          frame.fills = [];
          frame.clipsContent = false;
          return frame;
        }
        default:
          throw new Error(`Unknown node type: ${spec.type}`);
      }
    });
  }
  function applyFills(node, fills, errors) {
    try {
      const figmaFills = fills.filter((f) => f.visible !== false).map((fill) => {
        var _a, _b, _c, _d;
        if (fill.type === "SOLID") {
          const rgba = fill.color ? (0, import_shared.hexToRgba)(fill.color) : { r: 0, g: 0, b: 0, a: 1 };
          return {
            type: "SOLID",
            color: { r: rgba.r, g: rgba.g, b: rgba.b },
            opacity: (_a = fill.opacity) != null ? _a : rgba.a
          };
        }
        if (fill.type === "GRADIENT_LINEAR" || fill.type === "GRADIENT_RADIAL" || fill.type === "GRADIENT_ANGULAR" || fill.type === "GRADIENT_DIAMOND") {
          const stops = ((_b = fill.gradientStops) != null ? _b : []).map((stop) => {
            const c = (0, import_shared.hexToRgba)(stop.color);
            return { position: stop.position, color: { r: c.r, g: c.g, b: c.b, a: c.a } };
          });
          return {
            type: fill.type,
            gradientStops: stops,
            gradientTransform: (_c = fill.gradientTransform) != null ? _c : [[1, 0, 0], [0, 1, 0]],
            opacity: (_d = fill.opacity) != null ? _d : 1
          };
        }
        return {
          type: "SOLID",
          color: { r: 0.8, g: 0.8, b: 0.8 },
          opacity: 1
        };
      });
      node.fills = figmaFills;
    } catch (err) {
      errors.push(`applyFills: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  function applyStrokes(node, strokes, errors) {
    try {
      const figmaStrokes = strokes.map((stroke) => {
        var _a;
        const rgba = (0, import_shared.hexToRgba)(stroke.color);
        return {
          type: "SOLID",
          color: { r: rgba.r, g: rgba.g, b: rgba.b },
          opacity: (_a = stroke.opacity) != null ? _a : rgba.a
        };
      });
      node.strokes = figmaStrokes;
      if (strokes.length > 0) {
        if (strokes[0].weight !== void 0) {
          node.strokeWeight = strokes[0].weight;
        }
        if (strokes[0].align) {
          node.strokeAlign = strokes[0].align;
        }
        if (strokes[0].dashPattern) {
          node.dashPattern = strokes[0].dashPattern;
        }
      }
    } catch (err) {
      errors.push(`applyStrokes: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  function applyEffects(node, effects, errors) {
    try {
      const figmaEffects = effects.map((effect) => {
        var _a, _b, _c, _d, _e;
        if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
          const rgba = effect.color ? (0, import_shared.hexToRgba)(effect.color) : { r: 0, g: 0, b: 0, a: 0.5 };
          const alpha = (_a = effect.opacity) != null ? _a : rgba.a;
          return {
            type: effect.type,
            color: { r: rgba.r, g: rgba.g, b: rgba.b, a: alpha },
            offset: (_b = effect.offset) != null ? _b : { x: 0, y: 4 },
            radius: effect.radius,
            spread: (_c = effect.spread) != null ? _c : 0,
            visible: (_d = effect.visible) != null ? _d : true,
            blendMode: "NORMAL"
          };
        }
        return {
          type: effect.type,
          radius: effect.radius,
          visible: (_e = effect.visible) != null ? _e : true
        };
      });
      node.effects = figmaEffects;
    } catch (err) {
      errors.push(`applyEffects: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  function applyCornerRadius(node, radius) {
    if (typeof radius === "number") {
      node.cornerRadius = radius;
    } else {
      if ("topLeftRadius" in node) {
        node.topLeftRadius = radius[0];
        node.topRightRadius = radius[1];
        node.bottomRightRadius = radius[2];
        node.bottomLeftRadius = radius[3];
      } else {
        node.cornerRadius = radius[0];
      }
    }
  }
  function applyAutoLayout(node, spec) {
    if (!spec.layoutMode || spec.layoutMode === "NONE") return;
    node.layoutMode = spec.layoutMode;
    if (spec.padding !== void 0) {
      if (typeof spec.padding === "number") {
        node.paddingTop = spec.padding;
        node.paddingRight = spec.padding;
        node.paddingBottom = spec.padding;
        node.paddingLeft = spec.padding;
      } else {
        node.paddingTop = spec.padding[0];
        node.paddingRight = spec.padding[1];
        node.paddingBottom = spec.padding[2];
        node.paddingLeft = spec.padding[3];
      }
    }
    if (spec.itemSpacing !== void 0) {
      node.itemSpacing = spec.itemSpacing;
    }
    if (spec.primaryAxisAlignItems) {
      node.primaryAxisAlignItems = spec.primaryAxisAlignItems;
    }
    if (spec.counterAxisAlignItems) {
      node.counterAxisAlignItems = spec.counterAxisAlignItems;
    }
  }
  function applyTextProperties(node, spec, failedFonts, errors) {
    return __async(this, null, function* () {
      var _a, _b;
      try {
        const family = (_a = spec.fontFamily) != null ? _a : "Inter";
        const style = getFontStyle(spec.fontWeight);
        const fontKey = `${family}::${style}`;
        if (failedFonts.has(fontKey)) {
          node.fontName = { family: "Inter", style: "Regular" };
          errors.push(`Font "${family} ${style}" not available, using Inter Regular`);
        } else {
          node.fontName = { family, style };
        }
        if (spec.fontSize !== void 0) {
          node.fontSize = spec.fontSize;
        }
        if (spec.textAutoResize) {
          node.textAutoResize = spec.textAutoResize;
        }
        if (spec.characters !== void 0) {
          node.characters = spec.characters;
        }
        if (spec.textAlignHorizontal) {
          node.textAlignHorizontal = spec.textAlignHorizontal;
        }
        if (spec.textAlignVertical) {
          node.textAlignVertical = spec.textAlignVertical;
        }
        if (spec.lineHeight !== void 0) {
          if (typeof spec.lineHeight === "number") {
            node.lineHeight = { value: spec.lineHeight, unit: "PIXELS" };
          } else {
            node.lineHeight = spec.lineHeight;
          }
        }
        if (spec.letterSpacing !== void 0) {
          node.letterSpacing = { value: spec.letterSpacing, unit: "PIXELS" };
        }
        if (spec.textDecoration) {
          node.textDecoration = spec.textDecoration;
        }
        if (spec.textCase) {
          node.textCase = spec.textCase;
        }
      } catch (err) {
        errors.push(`applyTextProperties "${(_b = spec.name) != null ? _b : "(unnamed)"}": ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  }
  function applySizing(node, spec) {
    if (spec.layoutSizingHorizontal && "layoutSizingHorizontal" in node) {
      node.layoutSizingHorizontal = spec.layoutSizingHorizontal;
    }
    if (spec.layoutSizingVertical && "layoutSizingVertical" in node) {
      node.layoutSizingVertical = spec.layoutSizingVertical;
    }
  }
  function buildNode(spec, parent, idMap, failedFonts) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d;
      const errors = [];
      let node;
      try {
        node = yield createNode(spec);
      } catch (err) {
        const msg = `Failed to create ${spec.type} "${(_a = spec.name) != null ? _a : "(unnamed)"}": ${err instanceof Error ? err.message : String(err)}`;
        errors.push(msg);
        const placeholder = figma.createFrame();
        placeholder.name = `[ERROR] ${(_b = spec.name) != null ? _b : spec.type}`;
        placeholder.resize((_c = spec.width) != null ? _c : 100, (_d = spec.height) != null ? _d : 100);
        parent.appendChild(placeholder);
        return { node: placeholder, errors };
      }
      if (spec.name) node.name = spec.name;
      if (spec.width !== void 0 && spec.height !== void 0) {
        node.resize(spec.width, spec.height);
      } else if (spec.width !== void 0) {
        node.resize(spec.width, node.height || 100);
      } else if (spec.height !== void 0) {
        node.resize(node.width || 100, spec.height);
      }
      if (spec.x !== void 0) node.x = spec.x;
      if (spec.y !== void 0) node.y = spec.y;
      if (spec.fills && "fills" in node) {
        applyFills(node, spec.fills, errors);
      }
      if (spec.strokes && "strokes" in node) {
        applyStrokes(node, spec.strokes, errors);
      }
      if (spec.effects && "effects" in node) {
        applyEffects(node, spec.effects, errors);
      }
      if (spec.cornerRadius !== void 0 && "cornerRadius" in node) {
        applyCornerRadius(node, spec.cornerRadius);
      }
      if (spec.opacity !== void 0 && "opacity" in node) {
        node.opacity = spec.opacity;
      }
      if (spec.clipsContent !== void 0 && "clipsContent" in node) {
        node.clipsContent = spec.clipsContent;
      }
      if (spec.visible !== void 0) node.visible = spec.visible;
      if (spec.locked !== void 0) node.locked = spec.locked;
      if (spec.layoutMode && spec.layoutMode !== "NONE" && "layoutMode" in node) {
        applyAutoLayout(node, spec);
      }
      parent.appendChild(node);
      if (spec.type === "TEXT" && node.type === "TEXT") {
        yield applyTextProperties(node, spec, failedFonts, errors);
      }
      applySizing(node, spec);
      if (spec.id) {
        idMap[spec.id] = node.id;
      }
      if (spec.children && "children" in node) {
        for (const childSpec of spec.children) {
          const childResult = yield buildNode(childSpec, node, idMap, failedFonts);
          errors.push(...childResult.errors);
        }
      }
      return { node, errors };
    });
  }

  // src/scene-builder/index.ts
  function buildScene(spec, parentId) {
    return __async(this, null, function* () {
      const startTime = Date.now();
      const idMap = {};
      const errors = [];
      let parent;
      if (parentId) {
        const found = yield figma.getNodeByIdAsync(parentId);
        if (!found) {
          return {
            success: false,
            rootNodeId: "",
            nodeIdMap: {},
            nodeCount: 0,
            errors: [`Parent node not found: ${parentId}`],
            fontSubstitutions: [],
            durationMs: Date.now() - startTime
          };
        }
        if (!("children" in found)) {
          return {
            success: false,
            rootNodeId: "",
            nodeIdMap: {},
            nodeCount: 0,
            errors: [`Parent node ${parentId} cannot have children`],
            fontSubstitutions: [],
            durationMs: Date.now() - startTime
          };
        }
        parent = found;
      } else {
        parent = figma.currentPage;
      }
      const fontRefs = collectFonts(spec);
      const failedFontRefs = yield preloadFonts(fontRefs);
      const failedFonts = new Set(failedFontRefs.map((f) => `${f.family}::${f.style}`));
      const fontSubstitutions = failedFontRefs.map((f) => `${f.family} ${f.style} \u2192 Inter Regular`);
      try {
        if (typeof figma.commitUndo === "function") {
          figma.commitUndo();
        }
      } catch (e) {
      }
      let rootNodeId = "";
      try {
        const result = yield buildNode(spec, parent, idMap, failedFonts);
        rootNodeId = result.node.id;
        errors.push(...result.errors);
      } catch (err) {
        errors.push(`Fatal build error: ${err instanceof Error ? err.message : String(err)}`);
      }
      try {
        if (typeof figma.commitUndo === "function") {
          figma.commitUndo();
        }
      } catch (e) {
      }
      if (rootNodeId) {
        try {
          const rootNode = yield figma.getNodeByIdAsync(rootNodeId);
          if (rootNode) {
            figma.viewport.scrollAndZoomIntoView([rootNode]);
          }
        } catch (e) {
        }
      }
      const nodeCount = Object.keys(idMap).length;
      return {
        success: rootNodeId !== "",
        rootNodeId,
        nodeIdMap: idMap,
        nodeCount,
        errors,
        fontSubstitutions,
        durationMs: Date.now() - startTime
      };
    });
  }

  // src/handlers.ts
  var import_shared3 = __toESM(require_dist());

  // src/serialize-node.ts
  var import_shared2 = __toESM(require_dist());
  function serializePaint(paint) {
    var _a, _b, _c, _d, _e, _f;
    if (paint.type === "SOLID") {
      return {
        type: "SOLID",
        color: (0, import_shared2.rgbaToHex)({ r: paint.color.r, g: paint.color.g, b: paint.color.b, a: 1 }),
        opacity: (_a = paint.opacity) != null ? _a : 1,
        visible: (_b = paint.visible) != null ? _b : true
      };
    }
    if (paint.type === "GRADIENT_LINEAR" || paint.type === "GRADIENT_RADIAL" || paint.type === "GRADIENT_ANGULAR" || paint.type === "GRADIENT_DIAMOND") {
      return {
        type: paint.type,
        gradientStops: paint.gradientStops.map((stop) => ({
          position: stop.position,
          color: (0, import_shared2.rgbaToHex)({ r: stop.color.r, g: stop.color.g, b: stop.color.b, a: stop.color.a })
        })),
        opacity: (_c = paint.opacity) != null ? _c : 1,
        visible: (_d = paint.visible) != null ? _d : true
      };
    }
    if (paint.type === "IMAGE") {
      return {
        type: "IMAGE",
        scaleMode: paint.scaleMode,
        opacity: (_e = paint.opacity) != null ? _e : 1,
        visible: (_f = paint.visible) != null ? _f : true
      };
    }
    return { type: paint.type };
  }
  function serializeEffect(effect) {
    var _a;
    if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
      const shadow = effect;
      return {
        type: shadow.type,
        color: (0, import_shared2.rgbaToHex)({ r: shadow.color.r, g: shadow.color.g, b: shadow.color.b, a: shadow.color.a }),
        offset: shadow.offset,
        radius: shadow.radius,
        spread: (_a = shadow.spread) != null ? _a : 0,
        visible: shadow.visible
      };
    }
    return {
      type: effect.type,
      radius: effect.radius,
      visible: effect.visible
    };
  }
  function serializeNode(node, depth) {
    const result = {
      id: node.id,
      name: node.name,
      type: node.type
    };
    if ("x" in node) result.x = node.x;
    if ("y" in node) result.y = node.y;
    if ("width" in node) result.width = node.width;
    if ("height" in node) result.height = node.height;
    if ("fills" in node) {
      const fills = node.fills;
      if (fills !== figma.mixed && Array.isArray(fills)) {
        result.fills = fills.map(serializePaint);
      }
    }
    if ("strokes" in node) {
      const strokes = node.strokes;
      if (Array.isArray(strokes) && strokes.length > 0) {
        result.strokes = strokes.map(serializePaint);
        if ("strokeWeight" in node) {
          const weight = node.strokeWeight;
          if (weight !== figma.mixed) {
            result.strokeWeight = weight;
          }
        }
        if ("strokeAlign" in node) {
          result.strokeAlign = node.strokeAlign;
        }
      }
    }
    if ("effects" in node) {
      const effects = node.effects;
      if (Array.isArray(effects) && effects.length > 0) {
        result.effects = effects.map(serializeEffect);
      }
    }
    if ("cornerRadius" in node) {
      const cr = node.cornerRadius;
      if (cr !== figma.mixed) {
        result.cornerRadius = cr;
      } else if ("topLeftRadius" in node) {
        const rcm = node;
        result.cornerRadius = [rcm.topLeftRadius, rcm.topRightRadius, rcm.bottomRightRadius, rcm.bottomLeftRadius];
      }
    }
    if ("opacity" in node) result.opacity = node.opacity;
    if ("visible" in node) result.visible = node.visible;
    if ("locked" in node) result.locked = node.locked;
    if ("layoutMode" in node) {
      const frame = node;
      if (frame.layoutMode !== "NONE") {
        result.layoutMode = frame.layoutMode;
        result.primaryAxisAlignItems = frame.primaryAxisAlignItems;
        result.counterAxisAlignItems = frame.counterAxisAlignItems;
        result.itemSpacing = frame.itemSpacing;
        result.paddingTop = frame.paddingTop;
        result.paddingRight = frame.paddingRight;
        result.paddingBottom = frame.paddingBottom;
        result.paddingLeft = frame.paddingLeft;
      }
    }
    if ("layoutSizingHorizontal" in node) {
      result.layoutSizingHorizontal = node.layoutSizingHorizontal;
    }
    if ("layoutSizingVertical" in node) {
      result.layoutSizingVertical = node.layoutSizingVertical;
    }
    if ("clipsContent" in node) {
      result.clipsContent = node.clipsContent;
    }
    if (node.type === "TEXT") {
      const textNode = node;
      result.characters = textNode.characters;
      result.fontSize = textNode.fontSize;
      result.textAlignHorizontal = textNode.textAlignHorizontal;
      result.textAlignVertical = textNode.textAlignVertical;
      result.textAutoResize = textNode.textAutoResize;
      const fontName = textNode.fontName;
      if (fontName !== figma.mixed) {
        result.fontFamily = fontName.family;
        result.fontWeight = fontName.style;
      }
    }
    if ("children" in node) {
      const parent = node;
      if (depth > 0) {
        result.children = parent.children.map((child) => serializeNode(child, depth - 1));
      } else {
        result.children = parent.children.map((child) => ({
          id: child.id,
          name: child.name,
          type: child.type
        }));
      }
    }
    return result;
  }

  // src/handlers.ts
  function base64Encode(bytes) {
    var _a, _b;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let result = "";
    for (let i = 0; i < bytes.length; i += 3) {
      const b1 = bytes[i], b2 = (_a = bytes[i + 1]) != null ? _a : 0, b3 = (_b = bytes[i + 2]) != null ? _b : 0;
      result += chars[b1 >> 2] + chars[(b1 & 3) << 4 | b2 >> 4];
      result += i + 1 < bytes.length ? chars[(b2 & 15) << 2 | b3 >> 6] : "=";
      result += i + 2 < bytes.length ? chars[b3 & 63] : "=";
    }
    return result;
  }
  function handleGetDocumentInfo() {
    return __async(this, null, function* () {
      const pages = figma.root.children.map((page) => ({
        id: page.id,
        name: page.name,
        childCount: page.children.length
      }));
      const currentPage = figma.currentPage;
      const topLevelFrames = currentPage.children.map((child) => ({
        id: child.id,
        name: child.name,
        type: child.type
      }));
      return {
        name: figma.root.name,
        currentPageId: currentPage.id,
        currentPageName: currentPage.name,
        pages,
        topLevelFrames
      };
    });
  }
  function handleGetNodeInfo(nodeId, depth) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(nodeId);
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`);
      }
      return serializeNode(node, depth != null ? depth : 1);
    });
  }
  function handleGetSelection() {
    return __async(this, null, function* () {
      const selection = figma.currentPage.selection;
      return {
        count: selection.length,
        nodes: selection.map((node) => serializeNode(node, 0))
      };
    });
  }
  function handleGetStyles() {
    return __async(this, null, function* () {
      const [paintStyles, textStyles, effectStyles] = yield Promise.all([
        figma.getLocalPaintStylesAsync(),
        figma.getLocalTextStylesAsync(),
        figma.getLocalEffectStylesAsync()
      ]);
      return {
        paintStyles: paintStyles.map((style) => {
          const paints = style.paints.map((paint) => {
            var _a;
            if (paint.type === "SOLID") {
              return {
                type: "SOLID",
                color: (0, import_shared3.rgbaToHex)({ r: paint.color.r, g: paint.color.g, b: paint.color.b, a: 1 }),
                opacity: (_a = paint.opacity) != null ? _a : 1
              };
            }
            return { type: paint.type };
          });
          return {
            id: style.id,
            name: style.name,
            key: style.key,
            paints
          };
        }),
        textStyles: textStyles.map((style) => ({
          id: style.id,
          name: style.name,
          key: style.key,
          fontFamily: style.fontName.family,
          fontStyle: style.fontName.style,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
          textDecoration: style.textDecoration,
          textCase: style.textCase
        })),
        effectStyles: effectStyles.map((style) => ({
          id: style.id,
          name: style.name,
          key: style.key,
          effects: style.effects.map((effect) => {
            var _a;
            if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
              const shadow = effect;
              return {
                type: shadow.type,
                color: (0, import_shared3.rgbaToHex)({ r: shadow.color.r, g: shadow.color.g, b: shadow.color.b, a: shadow.color.a }),
                offset: shadow.offset,
                radius: shadow.radius,
                spread: (_a = shadow.spread) != null ? _a : 0
              };
            }
            return { type: effect.type, radius: effect.radius };
          })
        }))
      };
    });
  }
  function handleGetLocalComponents() {
    return __async(this, null, function* () {
      const components = figma.root.findAllWithCriteria({ types: ["COMPONENT"] });
      return {
        count: components.length,
        components: components.map((comp) => {
          const component = comp;
          return {
            id: component.id,
            name: component.name,
            key: component.key,
            description: component.description
          };
        })
      };
    });
  }
  function handleExportNode(nodeId, format, scale) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(nodeId);
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`);
      }
      if (!("exportAsync" in node)) {
        throw new Error(`Node ${nodeId} does not support export`);
      }
      const exportFormat = (format || "PNG").toUpperCase();
      const exportNode = node;
      const bytes = yield exportNode.exportAsync({
        format: exportFormat,
        constraint: { type: "SCALE", value: scale || 1 }
      });
      const base64 = base64Encode(bytes);
      return {
        base64,
        format: exportFormat,
        width: exportNode.width,
        height: exportNode.height,
        byteLength: bytes.length
      };
    });
  }
  function handleModifyNode(nodeId, properties) {
    return __async(this, null, function* () {
      var _a, _b, _c;
      const node = yield figma.getNodeByIdAsync(nodeId);
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`);
      }
      const errors = [];
      const sceneNode = node;
      if (node.type === "TEXT") {
        const textNode = node;
        const fontName = textNode.fontName;
        if (fontName !== figma.mixed) {
          yield figma.loadFontAsync(fontName);
        }
        if (properties.fontFamily || properties.fontWeight) {
          const family = (_a = properties.fontFamily) != null ? _a : fontName !== figma.mixed ? fontName.family : "Inter";
          const style = properties.fontWeight ? typeof properties.fontWeight === "number" ? getFontStyleFromWeight(properties.fontWeight) : String(properties.fontWeight) : fontName !== figma.mixed ? fontName.style : "Regular";
          try {
            yield figma.loadFontAsync({ family, style });
          } catch (e) {
            errors.push(`Failed to load font: ${family} ${style}`);
          }
        }
      }
      if (properties.name !== void 0) {
        sceneNode.name = properties.name;
      }
      if (properties.width !== void 0 || properties.height !== void 0) {
        const w = (_b = properties.width) != null ? _b : sceneNode.width;
        const h = (_c = properties.height) != null ? _c : sceneNode.height;
        sceneNode.resize(w, h);
      }
      if (properties.x !== void 0) sceneNode.x = properties.x;
      if (properties.y !== void 0) sceneNode.y = properties.y;
      if (properties.fills && "fills" in sceneNode) {
        applyFills(sceneNode, properties.fills, errors);
      }
      if (properties.strokes && "strokes" in sceneNode) {
        applyStrokes(sceneNode, properties.strokes, errors);
      }
      if (properties.effects && "effects" in sceneNode) {
        applyEffects(sceneNode, properties.effects, errors);
      }
      if (properties.cornerRadius !== void 0 && "cornerRadius" in sceneNode) {
        applyCornerRadius(sceneNode, properties.cornerRadius);
      }
      if (properties.opacity !== void 0 && "opacity" in sceneNode) {
        sceneNode.opacity = properties.opacity;
      }
      if (properties.clipsContent !== void 0 && "clipsContent" in sceneNode) {
        sceneNode.clipsContent = properties.clipsContent;
      }
      if (properties.visible !== void 0) sceneNode.visible = properties.visible;
      if (properties.locked !== void 0) sceneNode.locked = properties.locked;
      if (properties.layoutMode && "layoutMode" in sceneNode) {
        applyAutoLayout(sceneNode, properties);
      }
      if (node.type === "TEXT") {
        const failedFonts = /* @__PURE__ */ new Set();
        yield applyTextProperties(node, properties, failedFonts, errors);
      }
      applySizing(sceneNode, properties);
      try {
        if (typeof figma.commitUndo === "function") {
          figma.commitUndo();
        }
      } catch (e) {
      }
      return {
        nodeId: sceneNode.id,
        name: sceneNode.name,
        type: sceneNode.type,
        errors
      };
    });
  }
  function handleDeleteNodes(nodeIds) {
    return __async(this, null, function* () {
      let deleted = 0;
      const errors = [];
      for (const nodeId of nodeIds) {
        try {
          const node = yield figma.getNodeByIdAsync(nodeId);
          if (!node) {
            errors.push(`Node not found: ${nodeId}`);
            continue;
          }
          node.remove();
          deleted++;
        } catch (err) {
          errors.push(`Failed to delete ${nodeId}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      try {
        if (typeof figma.commitUndo === "function") {
          figma.commitUndo();
        }
      } catch (e) {
      }
      return { deleted, requested: nodeIds.length, errors };
    });
  }
  function handleMoveNode(nodeId, x, y, parentId, index) {
    return __async(this, null, function* () {
      var _a;
      const node = yield figma.getNodeByIdAsync(nodeId);
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`);
      }
      const sceneNode = node;
      if (parentId) {
        const newParent = yield figma.getNodeByIdAsync(parentId);
        if (!newParent) {
          throw new Error(`Parent node not found: ${parentId}`);
        }
        if (!("children" in newParent)) {
          throw new Error(`Target parent ${parentId} cannot have children`);
        }
        const parentWithChildren = newParent;
        const insertIndex = index != null ? index : parentWithChildren.children.length;
        parentWithChildren.insertChild(insertIndex, sceneNode);
      }
      if (x !== void 0) sceneNode.x = x;
      if (y !== void 0) sceneNode.y = y;
      try {
        if (typeof figma.commitUndo === "function") {
          figma.commitUndo();
        }
      } catch (e) {
      }
      return {
        nodeId: sceneNode.id,
        name: sceneNode.name,
        x: sceneNode.x,
        y: sceneNode.y,
        parentId: (_a = sceneNode.parent) == null ? void 0 : _a.id
      };
    });
  }
  function handleCloneNode(nodeId) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(nodeId);
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`);
      }
      if (!("clone" in node)) {
        throw new Error(`Node ${nodeId} does not support cloning`);
      }
      const cloned = node.clone();
      try {
        if (typeof figma.commitUndo === "function") {
          figma.commitUndo();
        }
      } catch (e) {
      }
      return {
        originalId: nodeId,
        newNodeId: cloned.id,
        name: cloned.name,
        type: cloned.type
      };
    });
  }
  function getFontStyleFromWeight(weight) {
    switch (weight) {
      case 100:
        return "Thin";
      case 200:
        return "Extra Light";
      case 300:
        return "Light";
      case 400:
        return "Regular";
      case 500:
        return "Medium";
      case 600:
        return "Semi Bold";
      case 700:
        return "Bold";
      case 800:
        return "Extra Bold";
      case 900:
        return "Black";
      default:
        return "Regular";
    }
  }

  // src/main.ts
  figma.showUI(__html__, { visible: true, width: 300, height: 200 });
  function sendResult(id, data) {
    figma.ui.postMessage({ type: "result", id, success: true, data });
  }
  function sendError(id, err) {
    figma.ui.postMessage({
      type: "result",
      id,
      success: false,
      error: err instanceof Error ? err.message : String(err)
    });
  }
  figma.ui.onmessage = (msg) => {
    switch (msg.type) {
      case "ping":
        figma.ui.postMessage({ type: "pong", id: msg.id });
        break;
      case "build_scene":
        buildScene(msg.spec, msg.parentId).then((result) => {
          figma.ui.postMessage({
            type: "result",
            id: msg.id,
            success: result.success,
            data: result
          });
        }).catch((err) => sendError(msg.id, err));
        break;
      // ─── Read Tools ──────────────────────────────────────────
      case "get_document_info":
        handleGetDocumentInfo().then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      case "get_node_info":
        handleGetNodeInfo(msg.nodeId, msg.depth).then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      case "get_selection":
        handleGetSelection().then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      case "get_styles":
        handleGetStyles().then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      case "get_local_components":
        handleGetLocalComponents().then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      case "export_node":
        handleExportNode(msg.nodeId, msg.format, msg.scale).then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      // ─── Edit Tools ──────────────────────────────────────────
      case "modify_node":
        handleModifyNode(msg.nodeId, msg.properties).then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      case "delete_nodes":
        handleDeleteNodes(msg.nodeIds).then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      case "move_node":
        handleMoveNode(
          msg.nodeId,
          msg.x,
          msg.y,
          msg.parentId,
          msg.index
        ).then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      case "clone_node":
        handleCloneNode(msg.nodeId).then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      default:
        console.log(`[FigmaFast] Unknown message type: ${msg.type}`);
        sendError(msg.id, `Unknown command: ${msg.type}`);
        break;
    }
  };
})();
