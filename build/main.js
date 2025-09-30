"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var main_exports = {};
__export(main_exports, {
  GoveeLocal: () => GoveeLocal,
  getDatapointDescription: () => getDatapointDescription
});
module.exports = __toCommonJS(main_exports);
var utils = __toESM(require("@iobroker/adapter-core"));
var import_goveeService = require("./lib/goveeService");
class GoveeLocal extends utils.Adapter {
  goveeService;
  constructor(options = {}) {
    super({
      ...options,
      name: "govee-local"
    });
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {
    void this.setObjectNotExists("info.connection", {
      type: "state",
      common: {
        name: "Device discovery running",
        type: "boolean",
        role: "indicator.connected",
        read: true,
        write: false
      },
      native: {}
    });
    this.goveeService = new import_goveeService.GoveeService({
      interface: this.config.interface,
      searchInterval: this.config.searchInterval,
      deviceStatusRefreshInterval: this.config.deviceStatusRefreshInterval,
      extendedLogging: this.config.extendedLogging,
      forbiddenChars: /[^a-zA-Z0-9_-]/g,
      logger: {
        debug: (msg) => this.log.debug(msg),
        info: (msg) => this.log.info(msg),
        error: (msg) => this.log.error(msg)
      }
    });
    this.goveeService.start();
    if (this.config.extendedLogging) {
      this.log.debug("running with extended logging");
    }
    void this.subscribeStates("*.devStatus.*");
    return Promise.resolve();
  }
  /**
   * Is called if a subscribed state changes
   * @param id The ID of the changed state.
   * @param state The new state object or null/undefined.
   */
  async onStateChange(_id, _state) {
    return Promise.resolve();
  }
  /**
   * Called when adapter shuts down - callback must be called under any circumstances!
   * @param callback Callback function after unload process.
   */
  onUnload(callback) {
    try {
      if (this.goveeService) {
        this.goveeService.stop();
      }
      void this.updateStateAsync("info.connection", false);
      callback();
    } catch (e) {
      this.log.error(e.message);
      callback();
    }
  }
  async updateStateAsync(fullName, state, acknowledged = true) {
    const currentState = await this.getStateAsync(fullName);
    if (currentState != state) {
      void this.setState(fullName, {
        val: state,
        ack: acknowledged
      });
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new GoveeLocal(options);
} else {
  (() => new GoveeLocal())();
}
function getDatapointDescription(name) {
  switch (name) {
    case "model":
      return "Specific model of the Lamp";
    case "ip":
      return "IP address of the Lamp";
    case "bleVersionHard":
      return "Bluetooth Low Energy Hardware Version";
    case "bleVersionSoft":
      return "Bluetooth Low Energy Software Version";
    case "wifiVersionHard":
      return "WiFi Hardware Version";
    case "wifiVersionSoft":
      return "WiFi Software Version";
    default:
      return "";
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GoveeLocal,
  getDatapointDescription
});
//# sourceMappingURL=main.js.map
