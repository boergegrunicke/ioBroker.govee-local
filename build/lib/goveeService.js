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
var goveeService_exports = {};
__export(goveeService_exports, {
  GoveeService: () => GoveeService
});
module.exports = __toCommonJS(goveeService_exports);
var dgram = __toESM(require("node:dgram"));
var import_node_events = require("node:events");
var import_hexTool = require("./tools/hexTool");
var import_ipValidation = require("./tools/ipValidation");
class GoveeService extends import_node_events.EventEmitter {
  socket;
  options;
  devices = {};
  loggedDevices = [];
  lastStatusLog = {};
  searchInterval;
  refreshInterval;
  scanMode = "interval";
  static LOCAL_PORT = 4002;
  static SEND_SCAN_PORT = 4001;
  static CONTROL_PORT = 4003;
  static M_CAST = "239.255.255.250";
  static scanMessage = { msg: { cmd: "scan", data: { account_topic: "reserved" } } };
  static requestStatusMessage = { msg: { cmd: "devStatus", data: {} } };
  /**
   * Create a new GoveeService instance.
   *
   * @param options Configuration options for the service.
   */
  constructor(options) {
    super();
    this.options = options;
    this.socket = dgram.createSocket({ type: "udp4" });
    const providedScanMode = options.scanMode;
    if (providedScanMode === "once" || providedScanMode === "never") {
      this.scanMode = providedScanMode;
    } else {
      this.scanMode = "interval";
    }
  }
  /**
   * Bind UDP socket and start device search/refresh intervals.
   */
  start() {
    this.socket.on("message", this.onUdpMessage.bind(this));
    this.socket.on("error", (error) => {
      var _a;
      (_a = this.options.logger) == null ? void 0 : _a.error(`server bind error : ${error.message}`);
    });
    this.socket.bind(
      { address: this.options.interface, port: GoveeService.LOCAL_PORT },
      this.serverBound.bind(this)
    );
  }
  serverBound() {
    var _a;
    this.socket.setBroadcast(true);
    this.socket.setMulticastTTL(128);
    this.socket.setMulticastInterface(this.options.interface);
    this.socket.addMembership(GoveeService.M_CAST);
    if (this.options.manualIpAddresses && this.options.manualIpAddresses.length > 0) {
      this.addManualDevices(this.options.manualIpAddresses);
    }
    (_a = this.options.logger) == null ? void 0 : _a.debug(`Device discovery mode: "${this.scanMode}"`);
    if (this.scanMode === "interval") {
      this.searchInterval = setInterval(() => this.sendScan(), this.options.searchInterval * 1e3);
    } else if (this.scanMode === "once") {
      this.sendScan();
    }
    this.refreshInterval = setInterval(
      () => this.refreshAllDevices(),
      this.options.deviceStatusRefreshInterval * 1e3
    );
    this.emit("serviceStarted");
  }
  /**
   * Handle incoming UDP messages.
   *
   * @param message The message buffer.
   * @param remote The sender info.
   */
  onUdpMessage(message, remote) {
    var _a, _b, _c, _d, _e;
    let messageObject;
    try {
      messageObject = JSON.parse(message.toString());
    } catch (err) {
      (_a = this.options.logger) == null ? void 0 : _a.error(
        `Malformed UDP message from ${remote.address}:${remote.port}: ${err instanceof Error ? err.message : String(err)}`
      );
      throw err;
    }
    switch (messageObject.msg.cmd) {
      case "scan": {
        if (messageObject.msg.data.device) {
          const deviceName = messageObject.msg.data.device.replace(
            (_b = this.options.forbiddenChars) != null ? _b : /[^a-zA-Z0-9_-]/g,
            "_"
          );
          this.devices[remote.address] = deviceName;
          if (this.options.extendedLogging && !this.loggedDevices.includes(remote.address.toString())) {
            (_c = this.options.logger) == null ? void 0 : _c.info(
              `Discovered device: ${deviceName} at ${remote.address} (model: ${messageObject.msg.data.sku})`
            );
            this.loggedDevices.push(remote.address.toString());
          }
          this.emit("deviceDiscovered", {
            ip: remote.address,
            deviceName,
            deviceModel: messageObject.msg.data.sku
          });
        }
        break;
      }
      case "devStatus": {
        const sendingDevice = this.devices[remote.address];
        if (sendingDevice) {
          if (this.options.extendedLogging) {
            const statusString = JSON.stringify(messageObject);
            if (this.lastStatusLog[remote.address] !== statusString) {
              (_d = this.options.logger) == null ? void 0 : _d.info(`device status message data: ${statusString}`);
              this.lastStatusLog[remote.address] = statusString;
            }
          }
          this.emitDeviceStatusUpdate(sendingDevice, remote.address, messageObject);
        }
        break;
      }
      default: {
        (_e = this.options.logger) == null ? void 0 : _e.debug(`message from: ${remote.address}:${remote.port} - ${message.toString()}`);
      }
    }
  }
  /**
   * Send device status request to all known devices.
   */
  refreshAllDevices() {
    for (const ip in this.devices) {
      this.requestDeviceStatus(ip);
    }
  }
  /**
   * Send device status request to a specific device.
   *
   * @param receiver The IP address or hostname of the device.
   */
  requestDeviceStatus(receiver) {
    var _a;
    const requestDeviceStatusBuffer = Buffer.from(JSON.stringify(GoveeService.requestStatusMessage));
    if (this.options.extendedLogging) {
      (_a = this.options.logger) == null ? void 0 : _a.info(
        `Sending status request to ${receiver}: ${JSON.stringify(GoveeService.requestStatusMessage)}`
      );
    }
    this.socket.send(
      requestDeviceStatusBuffer,
      0,
      requestDeviceStatusBuffer.length,
      GoveeService.CONTROL_PORT,
      receiver
    );
  }
  /**
   * Send scan message to the UDP multicast address.
   */
  sendScan() {
    var _a;
    if (this.options.extendedLogging) {
      (_a = this.options.logger) == null ? void 0 : _a.debug("sending scan message");
    }
    const scanMessageBuffer = Buffer.from(JSON.stringify(GoveeService.scanMessage));
    this.socket.send(
      scanMessageBuffer,
      0,
      scanMessageBuffer.length,
      GoveeService.SEND_SCAN_PORT,
      GoveeService.M_CAST
    );
  }
  /**
   * Add manual devices by IP address without discovery.
   * These devices will be added to the device list and can be controlled.
   *
   * @param ipAddresses Array of IP addresses to add as manual devices.
   */
  addManualDevices(ipAddresses) {
    var _a, _b;
    for (const ip of ipAddresses) {
      if (!ip || ip.trim().length === 0) {
        continue;
      }
      const trimmedIp = ip.trim();
      if (!(0, import_ipValidation.isValidIpAddress)(trimmedIp)) {
        (_a = this.options.logger) == null ? void 0 : _a.error(`Invalid IP address format: "${trimmedIp}" - skipping this entry`);
        continue;
      }
      const deviceName = `Manual_${trimmedIp.replace(/\./g, "_")}`;
      this.devices[trimmedIp] = deviceName;
      (_b = this.options.logger) == null ? void 0 : _b.info(`Added manual device: ${deviceName} at ${trimmedIp}`);
      this.emit("deviceDiscovered", {
        ip: trimmedIp,
        deviceName
      });
      this.requestDeviceStatus(trimmedIp);
    }
  }
  /**
   * Stop all intervals and close the socket.
   */
  stop() {
    var _a;
    (_a = this.options.logger) == null ? void 0 : _a.debug("Stopping GoveeService and closing UDP socket.");
    if (this.searchInterval) {
      clearInterval(this.searchInterval);
    }
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.socket.close();
  }
  /**
   * Get all known devices.
   */
  getDevices() {
    return this.devices;
  }
  /**
   * Handles a state change and sends the appropriate command to the device.
   *
   * @param id The state ID
   * @param state The new state object
   * @param receiver The device IP as string
   */
  handleStateChange(id, state, receiver) {
    var _a;
    const stateKey = id.split(".")[4];
    switch (stateKey) {
      case "onOff":
        this.sendTurnCommand(receiver, !!state.val);
        break;
      case "brightness":
        this.sendBrightnessCommand(receiver, Number(state.val));
        break;
      case "colorTemInKelvin":
        this.sendColorTempCommand(receiver, Number(state.val));
        break;
      case "color": {
        const colorValue = (_a = state.val) == null ? void 0 : _a.toString();
        if (colorValue) {
          this.sendColorCommand(receiver, colorValue);
        }
        break;
      }
    }
  }
  /**
   * Send a turn on/off command to a device.
   *
   * @param receiver IP address or hostname
   * @param value true for on, false for off
   */
  sendTurnCommand(receiver, value) {
    var _a;
    const turnMessage = { msg: { cmd: "turn", data: { value: value ? 1 : 0 } } };
    const turnMessageBuffer = Buffer.from(JSON.stringify(turnMessage));
    if (this.options.extendedLogging) {
      (_a = this.options.logger) == null ? void 0 : _a.info(`Sending turn command to ${receiver}: ${JSON.stringify(turnMessage)}`);
    }
    this.socket.send(turnMessageBuffer, 0, turnMessageBuffer.length, GoveeService.CONTROL_PORT, receiver);
  }
  /**
   * Send a brightness command to a device.
   *
   * @param receiver IP address or hostname
   * @param value Brightness value
   */
  sendBrightnessCommand(receiver, value) {
    var _a;
    const brightnessMessage = { msg: { cmd: "brightness", data: { value } } };
    const brightnessMessageBuffer = Buffer.from(JSON.stringify(brightnessMessage));
    if (this.options.extendedLogging) {
      (_a = this.options.logger) == null ? void 0 : _a.info(
        `Sending brightness command to ${receiver}: ${JSON.stringify(brightnessMessage)}`
      );
    }
    this.socket.send(
      brightnessMessageBuffer,
      0,
      brightnessMessageBuffer.length,
      GoveeService.CONTROL_PORT,
      receiver
    );
  }
  /**
   * Send a color temperature command to a device.
   *
   * @param receiver IP address or hostname
   * @param kelvin Color temperature in Kelvin
   */
  sendColorTempCommand(receiver, kelvin) {
    var _a;
    const colorTempMessageBuffer = Buffer.from(
      JSON.stringify({
        msg: {
          cmd: "colorwc",
          data: { color: { r: 0, g: 0, b: 0 }, colorTemInKelvin: kelvin }
        }
      })
    );
    if (this.options.extendedLogging) {
      (_a = this.options.logger) == null ? void 0 : _a.info(
        `Sending color temperature command to ${receiver}: ${JSON.stringify({ kelvin })}`
      );
    }
    this.socket.send(colorTempMessageBuffer, 0, colorTempMessageBuffer.length, GoveeService.CONTROL_PORT, receiver);
  }
  /**
   * Send a color command to a device.
   *
   * @param receiver IP address or hostname
   * @param hexColor Color as hex string (e.g. #FFAABB)
   */
  sendColorCommand(receiver, hexColor) {
    var _a;
    const rgb = (0, import_hexTool.hexToRgb)(hexColor);
    const colorMessage = { msg: { cmd: "colorwc", data: { color: rgb } } };
    const colorMessageBuffer = Buffer.from(JSON.stringify(colorMessage));
    if (this.options.extendedLogging) {
      (_a = this.options.logger) == null ? void 0 : _a.info(`Sending color command to ${receiver}: ${JSON.stringify(colorMessage)}`);
    }
    this.socket.send(colorMessageBuffer, 0, colorMessageBuffer.length, GoveeService.CONTROL_PORT, receiver);
  }
  /**
   * Emit device status update event with parsed status data.
   *
   * @param deviceName The device name.
   * @param ip The device IP address.
   * @param messageObject The parsed message object containing device status.
   */
  emitDeviceStatusUpdate(deviceName, ip, messageObject) {
    const deviceData = messageObject.msg.data;
    let colorString = "#000000";
    if (deviceData.color && typeof deviceData.color === "object") {
      const r = typeof deviceData.color.r === "number" ? deviceData.color.r : 0;
      const g = typeof deviceData.color.g === "number" ? deviceData.color.g : 0;
      const b = typeof deviceData.color.b === "number" ? deviceData.color.b : 0;
      colorString = `#${(0, import_hexTool.componentToHex)(r)}${(0, import_hexTool.componentToHex)(g)}${(0, import_hexTool.componentToHex)(b)}`;
    }
    this.emit("deviceStatusUpdate", {
      deviceName,
      ip,
      status: {
        onOff: deviceData.onOff === 1,
        brightness: deviceData.brightness,
        color: colorString,
        colorTemInKelvin: deviceData.colorTemInKelvin
      }
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GoveeService
});
//# sourceMappingURL=goveeService.js.map
