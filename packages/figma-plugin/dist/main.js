"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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
      exports.hexToRgba = hexToRgba3;
      exports.rgbaToHex = rgbaToHex3;
      function hexToRgba3(hex) {
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

  // ../shared/dist/fonts.js
  var require_fonts = __commonJS({
    "../shared/dist/fonts.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.getFontStyle = getFontStyle2;
      exports.collectFonts = collectFonts2;
      var FALLBACK_FONT = { family: "Inter", style: "Regular" };
      function getFontStyle2(weight) {
        if (typeof weight === "string")
          return weight;
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
      function collectFonts2(spec) {
        const seen = /* @__PURE__ */ new Set();
        const fonts = [];
        function walk(node) {
          var _a;
          if (node.type === "TEXT") {
            const family = (_a = node.fontFamily) != null ? _a : "Inter";
            const style = getFontStyle2(node.fontWeight);
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
    }
  });

  // ../shared/dist/warnings.js
  var require_warnings = __commonJS({
    "../shared/dist/warnings.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.detectIgnoredProperties = detectIgnoredProperties3;
      function detectIgnoredProperties3(nodeType, parentType, properties) {
        const warnings = [];
        if (parentType === "COMPONENT_SET") {
          if ("x" in properties)
            warnings.push("[warning] x is ignored on children of COMPONENT_SET (positions are auto-managed by Figma)");
          if ("y" in properties)
            warnings.push("[warning] y is ignored on children of COMPONENT_SET (positions are auto-managed by Figma)");
        }
        if (nodeType === "TEXT") {
          const layoutProps = ["layoutMode", "itemSpacing", "padding", "primaryAxisAlignItems", "counterAxisAlignItems"];
          for (const prop of layoutProps) {
            if (prop in properties) {
              warnings.push(`[warning] ${prop} is ignored on TEXT nodes (TEXT does not support auto-layout)`);
            }
          }
        }
        if (nodeType !== "TEXT") {
          const textProps = [
            "characters",
            "fontSize",
            "fontFamily",
            "fontWeight",
            "fontStyle",
            "textAlignHorizontal",
            "textAlignVertical",
            "textAutoResize",
            "lineHeight",
            "letterSpacing",
            "textDecoration",
            "textCase",
            "textStyleId"
          ];
          for (const prop of textProps) {
            if (prop in properties) {
              warnings.push(`[warning] ${prop} is ignored on ${nodeType} nodes (only TEXT nodes support text properties)`);
            }
          }
        }
        if (nodeType === "INSTANCE") {
          const structuralProps = ["layoutMode", "children"];
          for (const prop of structuralProps) {
            if (prop in properties) {
              warnings.push(`[warning] ${prop} is ignored on INSTANCE nodes (structure is controlled by the main component)`);
            }
          }
        }
        return warnings;
      }
    }
  });

  // ../shared/dist/index.js
  var require_dist = __commonJS({
    "../shared/dist/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.detectIgnoredProperties = exports.collectFonts = exports.getFontStyle = exports.rgbaToHex = exports.hexToRgba = void 0;
      var colors_js_1 = require_colors();
      Object.defineProperty(exports, "hexToRgba", { enumerable: true, get: function() {
        return colors_js_1.hexToRgba;
      } });
      Object.defineProperty(exports, "rgbaToHex", { enumerable: true, get: function() {
        return colors_js_1.rgbaToHex;
      } });
      var fonts_js_1 = require_fonts();
      Object.defineProperty(exports, "getFontStyle", { enumerable: true, get: function() {
        return fonts_js_1.getFontStyle;
      } });
      Object.defineProperty(exports, "collectFonts", { enumerable: true, get: function() {
        return fonts_js_1.collectFonts;
      } });
      var warnings_js_1 = require_warnings();
      Object.defineProperty(exports, "detectIgnoredProperties", { enumerable: true, get: function() {
        return warnings_js_1.detectIgnoredProperties;
      } });
    }
  });

  // src/scene-builder/fonts.ts
  var import_shared = __toESM(require_dist());
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
  var import_shared2 = __toESM(require_dist());
  var _BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  function _base64Decode(str) {
    const cleaned = str.replace(/[^A-Za-z0-9+/]/g, "");
    const len = cleaned.length;
    const bytes = [];
    for (let i = 0; i < len; i += 4) {
      const c1 = _BASE64_CHARS.indexOf(cleaned[i]);
      const c2 = _BASE64_CHARS.indexOf(cleaned[i + 1]);
      const c3 = i + 2 < len ? _BASE64_CHARS.indexOf(cleaned[i + 2]) : 0;
      const c4 = i + 3 < len ? _BASE64_CHARS.indexOf(cleaned[i + 3]) : 0;
      bytes.push(c1 << 2 | c2 >> 4);
      if (i + 2 < len) bytes.push((c2 & 15) << 4 | c3 >> 2);
      if (i + 3 < len) bytes.push((c3 & 3) << 6 | c4);
    }
    return new Uint8Array(bytes);
  }
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
        case "COMPONENT":
          return figma.createComponent();
        case "COMPONENT_INSTANCE": {
          if (spec.componentId) {
            const localComp = yield figma.getNodeByIdAsync(spec.componentId);
            if (!localComp || localComp.type !== "COMPONENT") {
              throw new Error(`Local component not found: ${spec.componentId}`);
            }
            return localComp.createInstance();
          } else if (spec.componentKey) {
            const imported = yield figma.importComponentByKeyAsync(spec.componentKey);
            return imported.createInstance();
          }
          throw new Error("COMPONENT_INSTANCE requires componentId or componentKey");
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
  function applyFills(node, fills, errors, imagePayloads) {
    try {
      const figmaFills = fills.filter((f) => f.visible !== false).map((fill) => {
        var _a, _b, _c, _d, _e;
        if (fill.type === "SOLID") {
          const rgba = fill.color ? (0, import_shared2.hexToRgba)(fill.color) : { r: 0, g: 0, b: 0, a: 1 };
          return {
            type: "SOLID",
            color: { r: rgba.r, g: rgba.g, b: rgba.b },
            opacity: (_a = fill.opacity) != null ? _a : rgba.a
          };
        }
        if (fill.type === "GRADIENT_LINEAR" || fill.type === "GRADIENT_RADIAL" || fill.type === "GRADIENT_ANGULAR" || fill.type === "GRADIENT_DIAMOND") {
          const stops = ((_b = fill.gradientStops) != null ? _b : []).map((stop) => {
            const c = (0, import_shared2.hexToRgba)(stop.color);
            return { position: stop.position, color: { r: c.r, g: c.g, b: c.b, a: c.a } };
          });
          return {
            type: fill.type,
            gradientStops: stops,
            gradientTransform: (_c = fill.gradientTransform) != null ? _c : [
              [1, 0, 0],
              [0, 1, 0]
            ],
            opacity: (_d = fill.opacity) != null ? _d : 1
          };
        }
        if (fill.type === "IMAGE") {
          if (fill.imageUrl && imagePayloads && imagePayloads[fill.imageUrl]) {
            try {
              const bytes = _base64Decode(imagePayloads[fill.imageUrl]);
              const image = figma.createImage(bytes);
              return {
                type: "IMAGE",
                imageHash: image.hash,
                scaleMode: (_e = fill.scaleMode) != null ? _e : "FILL"
              };
            } catch (imgErr) {
              errors.push(
                `IMAGE fill (${fill.imageUrl}): ${imgErr instanceof Error ? imgErr.message : String(imgErr)}`
              );
            }
          } else if (fill.imageUrl) {
            errors.push(`IMAGE fill: no data for URL ${fill.imageUrl} (download may have failed)`);
          }
          return {
            type: "SOLID",
            color: { r: 0.8, g: 0.8, b: 0.8 },
            opacity: 1
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
        const rgba = (0, import_shared2.hexToRgba)(stroke.color);
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
          const rgba = effect.color ? (0, import_shared2.hexToRgba)(effect.color) : { r: 0, g: 0, b: 0, a: 0.5 };
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
        const style = (0, import_shared.getFontStyle)(spec.fontWeight);
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
        errors.push(
          `applyTextProperties "${(_b = spec.name) != null ? _b : "(unnamed)"}": ${err instanceof Error ? err.message : String(err)}`
        );
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
  function buildComponentSet(spec, parent, idMap, failedFonts, imagePayloads) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d;
      const errors = [];
      if (!spec.children || spec.children.length === 0) {
        errors.push("COMPONENT_SET requires at least one COMPONENT child");
        const placeholder = figma.createFrame();
        placeholder.name = `[ERROR] ${(_a = spec.name) != null ? _a : "ComponentSet"}`;
        placeholder.resize((_b = spec.width) != null ? _b : 100, (_c = spec.height) != null ? _c : 100);
        parent.appendChild(placeholder);
        return { node: placeholder, errors };
      }
      const componentNodes = [];
      for (const childSpec of spec.children) {
        if (childSpec.type !== "COMPONENT") {
          errors.push(`COMPONENT_SET children must be COMPONENT type, got ${childSpec.type} \u2014 wrapping as COMPONENT`);
          childSpec.type = "COMPONENT";
        }
        const childResult = yield buildNode(childSpec, parent, idMap, failedFonts, imagePayloads);
        errors.push(...childResult.errors);
        if (childResult.node.type === "COMPONENT") {
          componentNodes.push(childResult.node);
        }
      }
      if (componentNodes.length === 0) {
        errors.push("No valid COMPONENT children built for COMPONENT_SET");
        const placeholder = figma.createFrame();
        placeholder.name = `[ERROR] ${(_d = spec.name) != null ? _d : "ComponentSet"}`;
        parent.appendChild(placeholder);
        return { node: placeholder, errors };
      }
      const componentSet = figma.combineAsVariants(componentNodes, parent);
      if (spec.name) componentSet.name = spec.name;
      if (spec.componentDescription) componentSet.description = spec.componentDescription;
      if (spec.width !== void 0 && spec.height !== void 0) {
        componentSet.resize(spec.width, spec.height);
      }
      if (spec.x !== void 0) componentSet.x = spec.x;
      if (spec.y !== void 0) componentSet.y = spec.y;
      if (spec.fills && "fills" in componentSet) {
        applyFills(componentSet, spec.fills, errors, imagePayloads);
      }
      if (spec.effects && "effects" in componentSet) {
        applyEffects(componentSet, spec.effects, errors);
      }
      if (spec.cornerRadius !== void 0 && "cornerRadius" in componentSet) {
        applyCornerRadius(componentSet, spec.cornerRadius);
      }
      if (spec.opacity !== void 0) componentSet.opacity = spec.opacity;
      if (spec.clipsContent !== void 0) componentSet.clipsContent = spec.clipsContent;
      if (spec.visible !== void 0) componentSet.visible = spec.visible;
      if (spec.locked !== void 0) componentSet.locked = spec.locked;
      if (spec.layoutMode && spec.layoutMode !== "NONE") {
        applyAutoLayout(componentSet, spec);
      }
      if (spec.id) {
        idMap[spec.id] = componentSet.id;
      }
      return { node: componentSet, errors };
    });
  }
  function buildNode(spec, parent, idMap, failedFonts, imagePayloads) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d;
      if (spec.type === "COMPONENT_SET") {
        return buildComponentSet(spec, parent, idMap, failedFonts, imagePayloads);
      }
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
      if (spec.componentDescription && node.type === "COMPONENT") {
        node.description = spec.componentDescription;
      }
      if (spec.width !== void 0 && spec.height !== void 0) {
        node.resize(spec.width, spec.height);
      } else if (spec.width !== void 0) {
        node.resize(spec.width, node.height || 100);
      } else if (spec.height !== void 0) {
        node.resize(node.width || 100, spec.height);
      }
      if (spec.x !== void 0) node.x = spec.x;
      if (spec.y !== void 0) node.y = spec.y;
      const parentType = parent == null ? void 0 : parent.type;
      const propertyWarnings = (0, import_shared2.detectIgnoredProperties)(spec.type, parentType, spec);
      errors.push(...propertyWarnings);
      if (spec.fills && "fills" in node) {
        applyFills(node, spec.fills, errors, imagePayloads);
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
      if (spec.fillStyleId && "fillStyleId" in node) {
        try {
          node.fillStyleId = spec.fillStyleId;
        } catch (err) {
          errors.push(`fillStyleId: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      if (spec.effectStyleId && "effectStyleId" in node) {
        try {
          node.effectStyleId = spec.effectStyleId;
        } catch (err) {
          errors.push(`effectStyleId: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      if (spec.textStyleId && node.type === "TEXT") {
        try {
          node.textStyleId = spec.textStyleId;
        } catch (err) {
          errors.push(`textStyleId: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      if (spec.layoutMode && spec.layoutMode !== "NONE" && "layoutMode" in node) {
        applyAutoLayout(node, spec);
      }
      parent.appendChild(node);
      if (spec.type === "TEXT" && node.type === "TEXT") {
        yield applyTextProperties(node, spec, failedFonts, errors);
      }
      applySizing(node, spec);
      if (spec.type === "COMPONENT_INSTANCE" && spec.overrides && node.type === "INSTANCE") {
        try {
          const instance = node;
          const propsToSet = {};
          for (const [overrideName, value] of Object.entries(spec.overrides)) {
            for (const key of Object.keys(instance.componentProperties)) {
              const baseName = key.split("#")[0];
              if (baseName === overrideName) {
                propsToSet[key] = value;
                break;
              }
            }
          }
          if (Object.keys(propsToSet).length > 0) {
            instance.setProperties(propsToSet);
          }
        } catch (err) {
          errors.push(`applyOverrides: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      if (spec.id) {
        idMap[spec.id] = node.id;
      }
      if (spec.children && "children" in node) {
        for (const childSpec of spec.children) {
          const childResult = yield buildNode(
            childSpec,
            node,
            idMap,
            failedFonts,
            imagePayloads
          );
          errors.push(...childResult.errors);
        }
      }
      return { node, errors };
    });
  }

  // src/scene-builder/index.ts
  function buildScene(spec, parentId, imagePayloads) {
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
      const fontRefs = (0, import_shared.collectFonts)(spec);
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
        const result = yield buildNode(spec, parent, idMap, failedFonts, imagePayloads);
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
  var import_shared4 = __toESM(require_dist());

  // src/serialize-node.ts
  var import_shared3 = __toESM(require_dist());
  function serializePaint(paint) {
    var _a, _b, _c, _d, _e, _f;
    if (paint.type === "SOLID") {
      return {
        type: "SOLID",
        color: (0, import_shared3.rgbaToHex)({ r: paint.color.r, g: paint.color.g, b: paint.color.b, a: 1 }),
        opacity: (_a = paint.opacity) != null ? _a : 1,
        visible: (_b = paint.visible) != null ? _b : true
      };
    }
    if (paint.type === "GRADIENT_LINEAR" || paint.type === "GRADIENT_RADIAL" || paint.type === "GRADIENT_ANGULAR" || paint.type === "GRADIENT_DIAMOND") {
      return {
        type: paint.type,
        gradientStops: paint.gradientStops.map((stop) => ({
          position: stop.position,
          color: (0, import_shared3.rgbaToHex)({ r: stop.color.r, g: stop.color.g, b: stop.color.b, a: stop.color.a })
        })),
        opacity: (_c = paint.opacity) != null ? _c : 1,
        visible: (_d = paint.visible) != null ? _d : true
      };
    }
    if (paint.type === "IMAGE") {
      return {
        type: "IMAGE",
        imageHash: paint.imageHash,
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
        color: (0, import_shared3.rgbaToHex)({ r: shadow.color.r, g: shadow.color.g, b: shadow.color.b, a: shadow.color.a }),
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
    if (node.type === "COMPONENT") {
      const comp = node;
      result.componentKey = comp.key;
      if (comp.description) result.componentDescription = comp.description;
    }
    if (node.type === "COMPONENT_SET") {
      const compSet = node;
      result.componentKey = compSet.key;
      if (compSet.description) result.componentDescription = compSet.description;
      if (compSet.componentPropertyDefinitions) {
        result.componentPropertyDefinitions = Object.fromEntries(
          Object.entries(compSet.componentPropertyDefinitions).map(([k, v]) => [
            k,
            {
              type: v.type,
              defaultValue: v.defaultValue,
              variantOptions: v.variantOptions
            }
          ])
        );
      }
    }
    if (node.type === "INSTANCE") {
      const instance = node;
      const mainComp = instance.mainComponent;
      if (mainComp) {
        result.mainComponentId = mainComp.id;
        result.mainComponentKey = mainComp.key;
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
  var BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  function base64Encode(bytes) {
    var _a, _b;
    let result = "";
    for (let i = 0; i < bytes.length; i += 3) {
      const b1 = bytes[i], b2 = (_a = bytes[i + 1]) != null ? _a : 0, b3 = (_b = bytes[i + 2]) != null ? _b : 0;
      result += BASE64_CHARS[b1 >> 2] + BASE64_CHARS[(b1 & 3) << 4 | b2 >> 4];
      result += i + 1 < bytes.length ? BASE64_CHARS[(b2 & 15) << 2 | b3 >> 6] : "=";
      result += i + 2 < bytes.length ? BASE64_CHARS[b3 & 63] : "=";
    }
    return result;
  }
  function base64Decode(str) {
    const cleaned = str.replace(/[^A-Za-z0-9+/]/g, "");
    const len = cleaned.length;
    const bytes = [];
    for (let i = 0; i < len; i += 4) {
      const c1 = BASE64_CHARS.indexOf(cleaned[i]);
      const c2 = BASE64_CHARS.indexOf(cleaned[i + 1]);
      const c3 = i + 2 < len ? BASE64_CHARS.indexOf(cleaned[i + 2]) : 0;
      const c4 = i + 3 < len ? BASE64_CHARS.indexOf(cleaned[i + 3]) : 0;
      bytes.push(c1 << 2 | c2 >> 4);
      if (i + 2 < len) bytes.push((c2 & 15) << 4 | c3 >> 2);
      if (i + 3 < len) bytes.push((c3 & 3) << 6 | c4);
    }
    return new Uint8Array(bytes);
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
                color: (0, import_shared4.rgbaToHex)({ r: paint.color.r, g: paint.color.g, b: paint.color.b, a: 1 }),
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
                color: (0, import_shared4.rgbaToHex)({ r: shadow.color.r, g: shadow.color.g, b: shadow.color.b, a: shadow.color.a }),
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
  function applyNodeModifications(nodeId, properties) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d;
      const node = yield figma.getNodeByIdAsync(nodeId);
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`);
      }
      const errors = [];
      const sceneNode = node;
      const parentType = (_a = node.parent) == null ? void 0 : _a.type;
      const warnings = (0, import_shared4.detectIgnoredProperties)(node.type, parentType, properties);
      errors.push(...warnings);
      if (node.type === "TEXT") {
        const textNode = node;
        const fontName = textNode.fontName;
        if (fontName !== figma.mixed) {
          yield figma.loadFontAsync(fontName);
        }
        if (properties.fontFamily || properties.fontWeight) {
          const family = (_b = properties.fontFamily) != null ? _b : fontName !== figma.mixed ? fontName.family : "Inter";
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
        const w = (_c = properties.width) != null ? _c : sceneNode.width;
        const h = (_d = properties.height) != null ? _d : sceneNode.height;
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
      if (properties.fillStyleId && "fillStyleId" in sceneNode) {
        try {
          sceneNode.fillStyleId = properties.fillStyleId;
        } catch (err) {
          errors.push(`fillStyleId: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      if (properties.effectStyleId && "effectStyleId" in sceneNode) {
        try {
          sceneNode.effectStyleId = properties.effectStyleId;
        } catch (err) {
          errors.push(`effectStyleId: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      if (properties.textStyleId && node.type === "TEXT") {
        try {
          node.textStyleId = properties.textStyleId;
        } catch (err) {
          errors.push(`textStyleId: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      if (node.type === "TEXT") {
        const failedFonts = /* @__PURE__ */ new Set();
        yield applyTextProperties(node, properties, failedFonts, errors);
      }
      applySizing(sceneNode, properties);
      if (properties.swapComponent && node.type === "INSTANCE") {
        const targetComp = yield figma.getNodeByIdAsync(properties.swapComponent);
        if (targetComp && targetComp.type === "COMPONENT") {
          node.swapComponent(targetComp);
        } else {
          errors.push(`swapComponent: component not found or not a COMPONENT: ${properties.swapComponent}`);
        }
      }
      return {
        nodeId: sceneNode.id,
        name: sceneNode.name,
        type: sceneNode.type,
        errors
      };
    });
  }
  function handleModifyNode(nodeId, properties) {
    return __async(this, null, function* () {
      const result = yield applyNodeModifications(nodeId, properties);
      try {
        if (typeof figma.commitUndo === "function") {
          figma.commitUndo();
        }
      } catch (e) {
      }
      return result;
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
  function handleConvertToComponent(nodeId) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(nodeId);
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`);
      }
      if (node.type !== "FRAME" && node.type !== "GROUP" && node.type !== "RECTANGLE" && node.type !== "COMPONENT") {
        throw new Error(`Cannot convert ${node.type} to component. Must be a FRAME, GROUP, or RECTANGLE.`);
      }
      if (node.type === "COMPONENT") {
        const comp = node;
        return {
          componentId: comp.id,
          componentKey: comp.key,
          name: comp.name
        };
      }
      const component = figma.createComponent();
      component.name = node.name;
      const sceneNode = node;
      component.resize(sceneNode.width, sceneNode.height);
      component.x = sceneNode.x;
      component.y = sceneNode.y;
      if ("fills" in node) {
        const fills = node.fills;
        if (fills !== figma.mixed) component.fills = fills;
      }
      if ("strokes" in node) {
        component.strokes = node.strokes;
      }
      if ("effects" in node) {
        component.effects = node.effects;
      }
      if ("cornerRadius" in node) {
        const cr = node.cornerRadius;
        if (cr !== figma.mixed) component.cornerRadius = cr;
      }
      if ("opacity" in node) {
        component.opacity = node.opacity;
      }
      if ("clipsContent" in node) {
        component.clipsContent = node.clipsContent;
      }
      if ("layoutMode" in node) {
        const frame = node;
        if (frame.layoutMode !== "NONE") {
          component.layoutMode = frame.layoutMode;
          component.paddingTop = frame.paddingTop;
          component.paddingRight = frame.paddingRight;
          component.paddingBottom = frame.paddingBottom;
          component.paddingLeft = frame.paddingLeft;
          component.itemSpacing = frame.itemSpacing;
          component.primaryAxisAlignItems = frame.primaryAxisAlignItems;
          component.counterAxisAlignItems = frame.counterAxisAlignItems;
        }
      }
      if ("children" in node) {
        const parent = node;
        while (parent.children.length > 0) {
          component.appendChild(parent.children[0]);
        }
      }
      if (node.parent && "children" in node.parent) {
        const parentNode = node.parent;
        const index = parentNode.children.indexOf(sceneNode);
        parentNode.insertChild(index >= 0 ? index : parentNode.children.length, component);
      }
      node.remove();
      return {
        componentId: component.id,
        componentKey: component.key,
        name: component.name
      };
    });
  }
  function handleCombineAsVariants(nodeIds, name) {
    return __async(this, null, function* () {
      const components = [];
      for (const nodeId of nodeIds) {
        const node = yield figma.getNodeByIdAsync(nodeId);
        if (!node) {
          throw new Error(`Node not found: ${nodeId}`);
        }
        if (node.type !== "COMPONENT") {
          throw new Error(`Node ${nodeId} is ${node.type}, not a COMPONENT. Convert it to a component first.`);
        }
        components.push(node);
      }
      const parent = components[0].parent;
      if (!parent || !("children" in parent)) {
        throw new Error("Components must have a valid parent");
      }
      const componentSet = figma.combineAsVariants(components, parent);
      if (name) {
        componentSet.name = name;
      }
      return {
        componentSetId: componentSet.id,
        componentSetKey: componentSet.key,
        name: componentSet.name,
        variantCount: componentSet.children.length
      };
    });
  }
  function handleManageComponentProperties(componentId, action, properties) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(componentId);
      if (!node) {
        throw new Error(`Node not found: ${componentId}`);
      }
      if (node.type !== "COMPONENT" && node.type !== "COMPONENT_SET") {
        throw new Error(`Node ${componentId} is ${node.type}, must be COMPONENT or COMPONENT_SET`);
      }
      const comp = node;
      let modified = 0;
      for (const prop of properties) {
        try {
          if (action === "add") {
            comp.addComponentProperty(prop.name, prop.type, prop.defaultValue);
            modified++;
          } else if (action === "delete") {
            const defs = comp.componentPropertyDefinitions;
            for (const [key, def] of Object.entries(defs)) {
              if (def.type === prop.type && key.startsWith(prop.name)) {
                comp.deleteComponentProperty(key);
                modified++;
                break;
              }
            }
          } else if (action === "update") {
            const defs = comp.componentPropertyDefinitions;
            for (const [key, def] of Object.entries(defs)) {
              if (key.startsWith(prop.name) && def.type === prop.type) {
                comp.editComponentProperty(key, { defaultValue: prop.defaultValue });
                modified++;
                break;
              }
            }
          }
        } catch (err) {
          throw new Error(
            `Failed to ${action} property "${prop.name}": ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
      return {
        componentId: comp.id,
        name: comp.name,
        action,
        propertiesModified: modified
      };
    });
  }
  function handleBooleanOperation(operation, nodeIds) {
    return __async(this, null, function* () {
      if (nodeIds.length < 2) {
        throw new Error(`Boolean operation requires at least 2 nodes, got ${nodeIds.length}`);
      }
      const nodes = [];
      for (const nodeId of nodeIds) {
        const node = yield figma.getNodeByIdAsync(nodeId);
        if (!node) {
          throw new Error(`Node not found: ${nodeId}`);
        }
        nodes.push(node);
      }
      const parent = nodes[0].parent;
      if (!parent || !("children" in parent)) {
        throw new Error("Nodes must have a valid parent to perform boolean operations");
      }
      for (const node of nodes.slice(1)) {
        if (node.parent !== parent) {
          throw new Error("All nodes must share the same parent for boolean operations");
        }
      }
      const parentWithChildren = parent;
      let result;
      switch (operation) {
        case "UNION":
          result = figma.union(nodes, parentWithChildren);
          break;
        case "SUBTRACT":
          result = figma.subtract(nodes, parentWithChildren);
          break;
        case "INTERSECT":
          result = figma.intersect(nodes, parentWithChildren);
          break;
        case "EXCLUDE":
          result = figma.exclude(nodes, parentWithChildren);
          break;
        default:
          throw new Error(`Unknown boolean operation: ${operation}`);
      }
      try {
        if (typeof figma.commitUndo === "function") {
          figma.commitUndo();
        }
      } catch (e) {
      }
      return {
        resultNodeId: result.id,
        name: result.name,
        type: result.type,
        operation,
        inputCount: nodeIds.length
      };
    });
  }
  function handleSetImageFill(nodeId, imageData, scaleMode) {
    return __async(this, null, function* () {
      const bytes = base64Decode(imageData);
      const image = figma.createImage(bytes);
      const node = yield figma.getNodeByIdAsync(nodeId);
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`);
      }
      if (!("fills" in node)) {
        throw new Error(`Node ${nodeId} does not support fills`);
      }
      const resolvedScaleMode = scaleMode != null ? scaleMode : "FILL";
      node.fills = [
        {
          type: "IMAGE",
          imageHash: image.hash,
          scaleMode: resolvedScaleMode
        }
      ];
      return {
        nodeId: node.id,
        name: node.name,
        imageHash: image.hash
      };
    });
  }
  function handleGetImageFill(nodeId, fillIndex) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(nodeId);
      if (!node) throw new Error(`Node not found: ${nodeId}`);
      if (!("fills" in node)) throw new Error(`Node ${nodeId} does not support fills`);
      const fills = node.fills;
      if (fills === figma.mixed || !Array.isArray(fills)) throw new Error(`Node ${nodeId} has mixed fills`);
      const imageFills = fills.filter((f) => f.type === "IMAGE");
      if (imageFills.length === 0) throw new Error(`Node ${nodeId} has no image fills`);
      const idx = fillIndex != null ? fillIndex : 0;
      if (idx >= imageFills.length) throw new Error(`Fill index ${idx} out of range (${imageFills.length} image fills)`);
      const fill = imageFills[idx];
      const image = figma.getImageByHash(fill.imageHash);
      if (!image) throw new Error(`Image not found for hash: ${fill.imageHash}`);
      const bytes = yield image.getBytesAsync();
      const mimeType = detectImageMimeType(bytes);
      const base64 = base64Encode(bytes);
      return {
        base64,
        mimeType,
        imageHash: fill.imageHash,
        scaleMode: fill.scaleMode,
        byteLength: bytes.length,
        totalImageFills: imageFills.length
      };
    });
  }
  function detectImageMimeType(bytes) {
    if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) return "image/png";
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
    if (bytes[0] === 71 && bytes[1] === 73 && bytes[2] === 70) return "image/gif";
    if (bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70) return "image/webp";
    return "image/png";
  }
  function handleCreatePaintStyle(name, fills) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d;
      const style = figma.createPaintStyle();
      style.name = name;
      const errors = [];
      const figmaPaints = [];
      for (const fill of fills) {
        if (fill.type === "SOLID") {
          const rgba = fill.color ? (0, import_shared4.hexToRgba)(fill.color) : { r: 0, g: 0, b: 0, a: 1 };
          figmaPaints.push({
            type: "SOLID",
            color: { r: rgba.r, g: rgba.g, b: rgba.b },
            opacity: (_a = fill.opacity) != null ? _a : rgba.a
          });
        } else if (fill.type === "GRADIENT_LINEAR" || fill.type === "GRADIENT_RADIAL" || fill.type === "GRADIENT_ANGULAR" || fill.type === "GRADIENT_DIAMOND") {
          const stops = ((_b = fill.gradientStops) != null ? _b : []).map((stop) => {
            const c = (0, import_shared4.hexToRgba)(stop.color);
            return { position: stop.position, color: { r: c.r, g: c.g, b: c.b, a: c.a } };
          });
          figmaPaints.push({
            type: fill.type,
            gradientStops: stops,
            gradientTransform: (_c = fill.gradientTransform) != null ? _c : [
              [1, 0, 0],
              [0, 1, 0]
            ],
            opacity: (_d = fill.opacity) != null ? _d : 1
          });
        } else {
          errors.push(`Unsupported fill type for style: ${fill.type}`);
        }
      }
      style.paints = figmaPaints;
      return { id: style.id, name: style.name, key: style.key, errors };
    });
  }
  function handleCreateTextStyle(name, props) {
    return __async(this, null, function* () {
      var _a;
      const style = figma.createTextStyle();
      style.name = name;
      const family = (_a = props.fontFamily) != null ? _a : "Inter";
      const fontStyle = props.fontWeight !== void 0 ? typeof props.fontWeight === "number" ? getFontStyleFromWeight(props.fontWeight) : String(props.fontWeight) : "Regular";
      yield figma.loadFontAsync({ family, style: fontStyle });
      style.fontName = { family, style: fontStyle };
      if (props.fontSize !== void 0) {
        style.fontSize = props.fontSize;
      }
      if (props.lineHeight !== void 0) {
        if (typeof props.lineHeight === "number") {
          style.lineHeight = { value: props.lineHeight, unit: "PIXELS" };
        } else {
          style.lineHeight = props.lineHeight;
        }
      }
      if (props.letterSpacing !== void 0) {
        style.letterSpacing = { value: props.letterSpacing, unit: "PIXELS" };
      }
      if (props.textDecoration !== void 0) {
        style.textDecoration = props.textDecoration;
      }
      if (props.textCase !== void 0) {
        style.textCase = props.textCase;
      }
      return { id: style.id, name: style.name, key: style.key };
    });
  }
  function handleCreateEffectStyle(name, effects) {
    return __async(this, null, function* () {
      const style = figma.createEffectStyle();
      style.name = name;
      const figmaEffects = effects.map((effect) => {
        var _a, _b, _c, _d, _e;
        if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
          const rgba = effect.color ? (0, import_shared4.hexToRgba)(effect.color) : { r: 0, g: 0, b: 0, a: 0.5 };
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
      style.effects = figmaEffects;
      return { id: style.id, name: style.name, key: style.key };
    });
  }
  function handleCreatePage(name) {
    return __async(this, null, function* () {
      const page = figma.createPage();
      page.name = name;
      return { id: page.id, name: page.name };
    });
  }
  function handleRenamePage(pageId, name) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(pageId);
      if (!node) {
        throw new Error(`Page not found: ${pageId}`);
      }
      if (node.type !== "PAGE") {
        throw new Error(`Node ${pageId} is not a PAGE (got ${node.type})`);
      }
      const page = node;
      const oldName = page.name;
      page.name = name;
      return { id: page.id, name, oldName };
    });
  }
  function handleSetCurrentPage(pageId) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(pageId);
      if (!node) {
        throw new Error(`Page not found: ${pageId}`);
      }
      if (node.type !== "PAGE") {
        throw new Error(`Node ${pageId} is not a PAGE (got ${node.type})`);
      }
      const page = node;
      yield figma.setCurrentPageAsync(page);
      return { id: page.id, name: page.name };
    });
  }
  function handleBatchModify(modifications) {
    return __async(this, null, function* () {
      let succeeded = 0;
      let failed = 0;
      const results = [];
      for (const mod of modifications) {
        try {
          const result = yield applyNodeModifications(mod.nodeId, mod.properties);
          results.push(__spreadProps(__spreadValues({}, result), { success: true }));
          succeeded++;
        } catch (err) {
          results.push({
            nodeId: mod.nodeId,
            errors: [err instanceof Error ? err.message : String(err)],
            success: false
          });
          failed++;
        }
      }
      try {
        if (typeof figma.commitUndo === "function") {
          figma.commitUndo();
        }
      } catch (e) {
      }
      return { succeeded, failed, total: modifications.length, results };
    });
  }
  function handleBatchGetNodeInfo(nodeIds, depth) {
    return __async(this, null, function* () {
      const nodes = [];
      const errors = [];
      for (const nodeId of nodeIds) {
        try {
          const node = yield figma.getNodeByIdAsync(nodeId);
          if (!node) {
            errors.push(`Node not found: ${nodeId}`);
            continue;
          }
          nodes.push(serializeNode(node, depth != null ? depth : 1));
        } catch (err) {
          errors.push(`Failed to read ${nodeId}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      return { nodes, errors };
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
  figma.showUI(__html__, { visible: true, width: 300, height: 300 });
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
        buildScene(
          msg.spec,
          msg.parentId,
          msg.imagePayloads
        ).then((result) => {
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
      // ─── Component Tools ──────────────────────────────────────
      case "convert_to_component":
        handleConvertToComponent(msg.nodeId).then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      case "combine_as_variants":
        handleCombineAsVariants(msg.nodeIds, msg.name).then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      case "manage_component_properties":
        handleManageComponentProperties(
          msg.componentId,
          msg.action,
          msg.properties
        ).then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      // ─── Page Management Tools ────────────────────────────────
      case "create_page":
        handleCreatePage(msg.name).then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      case "rename_page":
        handleRenamePage(msg.pageId, msg.name).then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      case "set_current_page":
        handleSetCurrentPage(msg.pageId).then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      // ─── Style Creation Tools ─────────────────────────────────
      case "create_paint_style":
        handleCreatePaintStyle(msg.name, msg.fills).then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      case "create_text_style":
        handleCreateTextStyle(msg.name, {
          fontFamily: msg.fontFamily,
          fontSize: msg.fontSize,
          fontWeight: msg.fontWeight,
          lineHeight: msg.lineHeight,
          letterSpacing: msg.letterSpacing,
          textDecoration: msg.textDecoration,
          textCase: msg.textCase
        }).then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      case "create_effect_style":
        handleCreateEffectStyle(msg.name, msg.effects).then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      // ─── Image Fill Tools ─────────────────────────────────────
      case "set_image_fill":
        handleSetImageFill(msg.nodeId, msg.imageData, msg.scaleMode).then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      case "get_image_fill":
        handleGetImageFill(msg.nodeId, msg.fillIndex).then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      // ─── Boolean Operation Tools ──────────────────────────────
      case "boolean_operation":
        handleBooleanOperation(msg.operation, msg.nodeIds).then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      // ─── Batch Tools ──────────────────────────────────────────
      case "batch_modify":
        handleBatchModify(msg.modifications).then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      case "batch_get_node_info":
        handleBatchGetNodeInfo(msg.nodeIds, msg.depth).then((data) => sendResult(msg.id, data)).catch((err) => sendError(msg.id, err));
        break;
      default:
        console.log(`[FigmaFast] Unknown message type: ${msg.type}`);
        sendError(msg.id, `Unknown command: ${msg.type}`);
        break;
    }
  };
})();
