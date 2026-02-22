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
  GoveeLocal: () => GoveeLocal
});
module.exports = __toCommonJS(main_exports);
var utils = __toESM(require("@iobroker/adapter-core"));
var import_goveeService = require("./lib/goveeService");
class GoveeLocal extends utils.Adapter {
  /** Instance of GoveeService for device communication */
  goveeService;
  /**
   * Adapter constructor. Registers lifecycle event handlers.
   *
   * @param options Optional adapter options to override defaults.
   */
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
   * Called when databases are connected and adapter received configuration.
   * Initializes GoveeService and sets up event listeners for device events.
   */
  onReady() {
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
    void this.setObjectNotExists("info.discoveredDevices", {
      type: "state",
      common: {
        name: "List of discovered devices",
        type: "string",
        role: "json",
        read: true,
        write: false,
        desc: "JSON object with IP addresses and device names of all discovered devices"
      },
      native: {}
    });
    this.goveeService = new import_goveeService.GoveeService({
      interface: this.config.interface,
      searchInterval: this.config.searchInterval,
      deviceStatusRefreshInterval: this.config.deviceStatusRefreshInterval,
      extendedLogging: this.config.extendedLogging,
      forbiddenChars: this.FORBIDDEN_CHARS,
      manualIpAddresses: this.config.manualIpTable,
      scanMode: this.config.scanMode,
      logger: {
        debug: (msg) => this.log.debug(msg),
        info: (msg) => this.log.info(msg),
        error: (msg) => this.log.error(msg)
      }
    });
    this.goveeService.on("deviceDiscovered", (data) => {
      this.handleDeviceDiscovered(data).catch((err) => {
        this.log.error(`Error handling device discovery: ${err instanceof Error ? err.message : String(err)}`);
      });
    });
    this.goveeService.on("deviceStatusUpdate", (data) => {
      this.handleDeviceStatusUpdate(data).catch((err) => {
        this.log.error(
          `Error handling device status update: ${err instanceof Error ? err.message : String(err)}`
        );
      });
    });
    this.goveeService.on("serviceStarted", () => {
      void this.setState("info.connection", { val: true, ack: true });
    });
    this.goveeService.start();
    if (this.config.extendedLogging) {
      this.log.debug("running with extended logging");
    }
    this.subscribeStates("*.devStatus.*");
  }
  /**
   * Called if a subscribed state changes (e.g. user toggles a switch in ioBroker UI).
   * Forwards the change to the GoveeService for device communication.
   *
   * @param id The ID of the changed state.
   * @param state The new state object or null/undefined.
   */
  async onStateChange(id, state) {
    var _a;
    if (state && !state.ack) {
      const ipOfDevice = await this.getStateAsync(`${id.split(".")[2]}.deviceInfo.ip`);
      const receiver = (_a = ipOfDevice == null ? void 0 : ipOfDevice.val) == null ? void 0 : _a.toString();
      if (typeof receiver === "string") {
        this.goveeService.handleStateChange(id, state, receiver);
      } else {
        this.log.error("device not found or IP is not a string");
      }
    }
  }
  /**
   * Called when the adapter shuts down. Cleans up resources and stops services.
   *
   * @param callback Callback function after unload process.
   */
  onUnload(callback) {
    try {
      if (this.goveeService) {
        this.goveeService.removeAllListeners();
        this.goveeService.stop();
      }
      void this.updateStateAsync("info.connection", false).catch((err) => {
        this.log.error(
          `Failed to update connection state during unload: ${err instanceof Error ? err.message : String(err)}`
        );
      });
      callback();
    } catch (e) {
      this.log.error(e instanceof Error ? e.message : String(e));
      callback();
    }
  }
  /**
   * Updates a state only if the value has changed.
   *
   * @param fullName Full object path
   * @param state New value
   * @param acknowledged Whether the value is acknowledged (default: true)
   */
  async updateStateAsync(fullName, state, acknowledged = true) {
    const currentState = await this.getStateAsync(fullName);
    if ((currentState == null ? void 0 : currentState.val) !== state) {
      void this.setState(fullName, {
        val: state,
        ack: acknowledged
      });
    }
  }
  /**
   * Handles device discovery event from GoveeService.
   * Creates all necessary objects and states for the new device.
   *
   * @param event The device discovery event data.
   */
  async handleDeviceDiscovered(event) {
    const { ip, deviceName, deviceModel } = event;
    await this.setObjectNotExistsAsync(deviceName, {
      type: "device",
      common: {
        name: deviceModel,
        role: "group"
      },
      native: {}
    });
    await this.setObjectNotExistsAsync(`${deviceName}.deviceInfo`, {
      type: "folder",
      common: {
        name: "Device Info"
      },
      native: {}
    });
    await this.setObjectNotExistsAsync(`${deviceName}.deviceInfo.ip`, {
      type: "state",
      common: {
        name: "IP address of the Lamp",
        type: "string",
        role: "info.ip",
        read: true,
        write: false
      },
      native: {}
    });
    await this.updateStateAsync(`${deviceName}.deviceInfo.ip`, ip);
    await this.setObjectNotExistsAsync(`${deviceName}.devStatus`, {
      type: "folder",
      common: {
        name: "Device Status"
      },
      native: {}
    });
    await this.updateDiscoveredDevicesList();
  }
  /**
   * Updates the info.discoveredDevices state with the current list of all discovered devices.
   */
  async updateDiscoveredDevicesList() {
    const devices = this.goveeService.getDevices();
    await this.setState("info.discoveredDevices", {
      val: JSON.stringify(devices, null, 2),
      ack: true
    });
  }
  /**
   * Handles device status update event from GoveeService.
   * Creates and updates all relevant states for the device.
   *
   * @param event The device status update event data.
   */
  async handleDeviceStatusUpdate(event) {
    const { deviceName, status } = event;
    await this.setObjectNotExistsAsync(`${deviceName}.devStatus.onOff`, {
      type: "state",
      common: {
        name: "On / Off state of the lamp",
        type: "boolean",
        role: "switch",
        read: true,
        write: true
      },
      native: {}
    });
    await this.updateStateAsync(`${deviceName}.devStatus.onOff`, status.onOff);
    await this.setObjectNotExistsAsync(`${deviceName}.devStatus.brightness`, {
      type: "state",
      common: {
        name: "Brightness of the light",
        type: "number",
        role: "level.dimmer",
        read: true,
        write: true
      },
      native: {}
    });
    await this.updateStateAsync(`${deviceName}.devStatus.brightness`, status.brightness);
    await this.setObjectNotExistsAsync(`${deviceName}.devStatus.color`, {
      type: "state",
      common: {
        name: "Current showing color of the lamp",
        type: "string",
        role: "level.color.rgb",
        read: true,
        write: true
      },
      native: {}
    });
    await this.updateStateAsync(`${deviceName}.devStatus.color`, status.color);
    await this.setObjectNotExistsAsync(`${deviceName}.devStatus.colorTemInKelvin`, {
      type: "state",
      common: {
        name: "If staying in white light, the color temperature",
        type: "number",
        role: "level.color.temperature",
        read: true,
        write: true
      },
      native: {}
    });
    await this.updateStateAsync(`${deviceName}.devStatus.colorTemInKelvin`, status.colorTemInKelvin);
  }
}
if (require.main !== module) {
  module.exports = (options) => new GoveeLocal(options);
} else {
  (() => new GoveeLocal())();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GoveeLocal
});
//# sourceMappingURL=main.js.map
