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
var import_colorConversion = require("./lib/tools/colorConversion");
var import_hexTool = require("./lib/tools/hexTool");
class GoveeLocal extends utils.Adapter {
  static PENDING_HSL_TIMEOUT_MS = 1e4;
  /** Instance of GoveeService for device communication */
  goveeService;
  pendingHslCommands = /* @__PURE__ */ new Map();
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
      void this.handleDeviceDiscovered(data);
    });
    this.goveeService.on("deviceStatusUpdate", (data) => {
      void this.handleDeviceStatusUpdate(data);
    });
    this.goveeService.on("serviceStarted", () => {
      void this.setState("info.connection", { val: true, ack: true });
    });
    this.goveeService.start();
    if (this.config.extendedLogging) {
      this.log.debug("running with extended logging");
    }
    void this.subscribeStates("*.devStatus.*");
  }
  logExtended(message) {
    if (this.config.extendedLogging) {
      this.log.info(message);
    }
  }
  sanitizeKelvinValue(deviceName, incomingKelvin, previousKelvin) {
    const MIN_KELVIN = 1e3;
    const MAX_KELVIN = 1e4;
    const numericKelvin = typeof incomingKelvin === "number" ? incomingKelvin : NaN;
    if (Number.isFinite(numericKelvin) && numericKelvin >= MIN_KELVIN && numericKelvin <= MAX_KELVIN) {
      return Math.round(numericKelvin);
    }
    if (Number.isFinite(previousKelvin) && previousKelvin >= MIN_KELVIN && previousKelvin <= MAX_KELVIN) {
      this.logExtended(
        `Ignoring invalid Kelvin ${incomingKelvin} from ${deviceName}, keeping previous value ${previousKelvin}K`
      );
      return Math.round(previousKelvin);
    }
    if (this.config.extendedLogging) {
      this.log.info(
        `Ignoring invalid Kelvin ${incomingKelvin} from ${deviceName} with no previous value to reuse`
      );
    }
    return void 0;
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
      const [deviceName, stateKey] = [id.split(".")[2], id.split(".")[4]];
      const ipOfDevice = await this.getStateAsync(`${deviceName}.deviceInfo.ip`);
      const receiver = (_a = ipOfDevice == null ? void 0 : ipOfDevice.val) == null ? void 0 : _a.toString();
      if (typeof receiver === "string") {
        switch (stateKey) {
          case "colorTemperature":
            await this.handleColorTemperatureChange(deviceName, state, receiver);
            break;
          case "hue":
          case "saturation":
            await this.handleHslChange(deviceName, stateKey, state, receiver);
            break;
          default:
            this.goveeService.handleStateChange(id, state, receiver);
        }
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
      void this.updateStateAsync("info.connection", false);
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
    var _a, _b;
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
    await this.setObjectNotExistsAsync(`${deviceName}.devStatus.hue`, {
      type: "state",
      common: {
        name: "Hue of the lamp",
        type: "number",
        role: "level.color.hue",
        unit: "\xB0",
        read: true,
        write: true,
        min: 0,
        max: 360
      },
      native: {}
    });
    await this.setObjectNotExistsAsync(`${deviceName}.devStatus.saturation`, {
      type: "state",
      common: {
        name: "Saturation of the lamp",
        type: "number",
        role: "level.color.saturation",
        unit: "%",
        read: true,
        write: true,
        min: 0,
        max: 100
      },
      native: {}
    });
    const { hue, saturation } = (0, import_colorConversion.rgbToHsl)((0, import_hexTool.hexToRgb)(status.color));
    const pendingHsl = this.pendingHslCommands.get(deviceName);
    const now = Date.now();
    const pendingExpired = !pendingHsl || now - pendingHsl.timestamp > GoveeLocal.PENDING_HSL_TIMEOUT_MS;
    const pendingMatches = pendingHsl && Math.round(hue) === Math.round(pendingHsl.hue) && Math.round(saturation) === Math.round(pendingHsl.saturation);
    if (!pendingExpired && !pendingMatches) {
      this.logExtended(
        `Skipping HSL update for ${deviceName} (pending hue=${pendingHsl.hue}, saturation=${pendingHsl.saturation}; device reported hue=${hue.toFixed(2)}, saturation=${saturation.toFixed(2)})`
      );
    } else {
      this.logExtended(
        `Calculated HSL from device color ${status.color}: hue=${hue.toFixed(2)}, saturation=${saturation.toFixed(2)}`
      );
      if (!pendingExpired && pendingMatches) {
        this.pendingHslCommands.delete(deviceName);
      } else if (pendingExpired && pendingHsl) {
        this.pendingHslCommands.delete(deviceName);
      }
      await this.updateStateAsync(`${deviceName}.devStatus.color`, status.color);
      await this.updateStateAsync(`${deviceName}.devStatus.hue`, hue);
      await this.updateStateAsync(`${deviceName}.devStatus.saturation`, saturation);
    }
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
    const previousKelvin = Number(
      (_b = (_a = await this.getStateAsync(`${deviceName}.devStatus.colorTemInKelvin`)) == null ? void 0 : _a.val) != null ? _b : 0
    );
    const kelvinValue = this.sanitizeKelvinValue(deviceName, status.colorTemInKelvin, previousKelvin);
    if (kelvinValue !== void 0) {
      await this.updateStateAsync(`${deviceName}.devStatus.colorTemInKelvin`, kelvinValue);
    }
    await this.setObjectNotExistsAsync(`${deviceName}.devStatus.colorTemperature`, {
      type: "state",
      common: {
        name: "Color temperature in mired (HomeKit compatible)",
        type: "number",
        role: "level.color.temperature",
        unit: "mired",
        read: true,
        write: true,
        min: 140,
        max: 600
      },
      native: {}
    });
    if (kelvinValue !== void 0) {
      await this.updateStateAsync(
        `${deviceName}.devStatus.colorTemperature`,
        (0, import_colorConversion.kelvinToMired)(kelvinValue)
      );
      this.logExtended(
        `Converted Kelvin ${kelvinValue} to mired ${(0, import_colorConversion.kelvinToMired)(kelvinValue)} for device ${deviceName}`
      );
    }
  }
  /**
   * Handles changes for HomeKit-style color temperature (mired) values.
   */
  async handleColorTemperatureChange(deviceName, state, receiver) {
    const miredValue = Number(state.val);
    const kelvin = (0, import_colorConversion.miredToKelvin)(miredValue);
    this.logExtended(
      `Received mired ${miredValue} for ${deviceName}, converted to Kelvin ${kelvin} before sending to ${receiver}`
    );
    this.goveeService.sendColorTempCommand(receiver, kelvin);
    await this.updateStateAsync(`${deviceName}.devStatus.colorTemInKelvin`, kelvin);
  }
  /**
   * Handles hue or saturation changes by converting HSL values to RGB hex commands.
   */
  async handleHslChange(deviceName, stateKey, state, receiver) {
    var _a, _b, _c, _d, _e, _f;
    const hueState = stateKey === "hue" ? Number(state.val) : Number((_b = (_a = await this.getStateAsync(`${deviceName}.devStatus.hue`)) == null ? void 0 : _a.val) != null ? _b : 0);
    const saturationState = stateKey === "saturation" ? Number(state.val) : Number((_d = (_c = await this.getStateAsync(`${deviceName}.devStatus.saturation`)) == null ? void 0 : _c.val) != null ? _d : 0);
    const brightness = Number((_f = (_e = await this.getStateAsync(`${deviceName}.devStatus.brightness`)) == null ? void 0 : _e.val) != null ? _f : 50);
    const lightnessForHsl = Math.max(0, Math.min(100, brightness)) / 2;
    const { r, g, b } = (0, import_colorConversion.hslToRgb)(hueState, saturationState, lightnessForHsl);
    const hexColor = `#${(0, import_hexTool.componentToHex)(r)}${(0, import_hexTool.componentToHex)(g)}${(0, import_hexTool.componentToHex)(b)}`;
    this.pendingHslCommands.set(deviceName, {
      hue: hueState,
      saturation: saturationState,
      timestamp: Date.now()
    });
    this.logExtended(
      `HSL input for ${deviceName}: hue=${hueState}, saturation=${saturationState}, brightness=${brightness} (lightness=${lightnessForHsl}) -> RGB (${r}, ${g}, ${b}) / ${hexColor}`
    );
    this.goveeService.sendColorCommand(receiver, hexColor);
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
