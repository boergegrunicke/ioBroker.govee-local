"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all) {
__defProp(target, name, { get: all[name], enumerable: true });
}
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from)) {
if (!__hasOwnProp.call(to, key) && key !== except) {
__defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
}
}
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
  const hex = c.toString(16);
  return hex.length == 1 ? `0${  hex}` : hex;
}
function hexToRgb(hexString) {
  if (!/^#[0-9a-fA-F]{6}$/i.test(hexString)) {
    throw new Error("Invalid hex string");
  }
  return {
    r: parseInt(hexString.slice(1, 3), 16),
    g: parseInt(hexString.slice(3, 5), 16),
    b: parseInt(hexString.slice(5, 7), 16)
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  componentToHex,
  hexToRgb
});
//# sourceMappingURL=hexTool.js.map
