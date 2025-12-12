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
var ipValidation_exports = {};
__export(ipValidation_exports, {
  filterValidIpAddresses: () => filterValidIpAddresses,
  isValidIpAddress: () => isValidIpAddress,
  validateIpAddresses: () => validateIpAddresses
});
module.exports = __toCommonJS(ipValidation_exports);
function isValidIpAddress(ip) {
  const ipv4Pattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Pattern.test(ip);
}
function filterValidIpAddresses(ipAddresses, trimWhitespace = true) {
  const validIps = [];
  for (const ip of ipAddresses) {
    if (!ip || trimWhitespace && ip.trim().length === 0) {
      continue;
    }
    const processedIp = trimWhitespace ? ip.trim() : ip;
    if (isValidIpAddress(processedIp)) {
      validIps.push(processedIp);
    }
  }
  return validIps;
}
function validateIpAddresses(ipAddresses, trimWhitespace = true) {
  const valid = [];
  const invalid = [];
  for (const ip of ipAddresses) {
    if (!ip || trimWhitespace && ip.trim().length === 0) {
      continue;
    }
    const processedIp = trimWhitespace ? ip.trim() : ip;
    if (isValidIpAddress(processedIp)) {
      valid.push(processedIp);
    } else {
      invalid.push(processedIp);
    }
  }
  return { valid, invalid };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  filterValidIpAddresses,
  isValidIpAddress,
  validateIpAddresses
});
//# sourceMappingURL=ipValidation.js.map
