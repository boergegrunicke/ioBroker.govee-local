"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var hexTool_exports = {};
__export(hexTool_exports, {
  componentToHex: () => componentToHex,
  hexToRgb: () => hexToRgb
});
module.exports = __toCommonJS(hexTool_exports);
function componentToHex(c) {
  const hex = c.toString(16).toUpperCase();
  return hex.padStart(2, "0");
}
function hexToRgb(hex) {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex.split("").map((x) => x + x).join("");
  }
  const num = parseInt(hex, 16);
  return {
    r: num >> 16 & 255,
    g: num >> 8 & 255,
    b: num & 255
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  componentToHex,
  hexToRgb
});
//# sourceMappingURL=hexTool.js.map
