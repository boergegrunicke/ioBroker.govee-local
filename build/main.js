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
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var main_exports = {};
__export(main_exports, {
  componentToHex: () => componentToHex,
  hexToRgb: () => hexToRgb
});
module.exports = __toCommonJS(main_exports);
var utils = __toESM(require("@iobroker/adapter-core"));
var dgram = __toESM(require("node:dgram"));
const LOCAL_PORT = 4002;
const SEND_SCAN_PORT = 4001;
const CONTROL_PORT = 4003;
const M_CAST = "239.255.255.250";
const server = dgram.createSocket("udp4");
const client = dgram.createSocket("udp4");
const scanMessage = { msg: { cmd: "scan", data: { account_topic: "reserved" } } };
const requestStatusMessage = { msg: { cmd: "devStatus", data: {} } };
let searchInterval;
const intervals = {};
const loggedDevices = [];
class GoveeLocal extends utils.Adapter {
  constructor(options = {}) {
    super({
      ...options,
      name: "govee-local"
    });
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  async onReady() {
    server.on("message", this.onUdpMessage.bind(this));
    server.on("error", (error) => {
      this.log.error("server bind error : " + error.message);
      this.setStateChanged("info.connection", { val: false, ack: true });
    });
    server.bind(LOCAL_PORT, this.serverBound.bind(this));
    this.subscribeStates("govee-local.*.devStatus.*");
  }
  async serverBound() {
    server.setBroadcast(true);
    server.setMulticastTTL(128);
    server.addMembership(M_CAST);
    this.setStateChanged("info.connection", { val: true, ack: true });
    this.log.debug("UDP listening on " + server.address().address + ":" + server.address().port);
    const result = this.setInterval(this.sendScan.bind(this), this.config.searchInterval * 1e3);
    if (result !== void 0) {
      searchInterval = result;
    }
  }
  async onUdpMessage(message, remote) {
    const messageObject = JSON.parse(message.toString());
    switch (messageObject.msg.cmd) {
      case "scan":
        for (const key of Object.keys(messageObject.msg.data)) {
          if (key != "device") {
            const deviceName = messageObject.msg.data.device.replace(this.FORBIDDEN_CHARS, "_");
            this.setObjectNotExists(deviceName, {
              type: "device",
              common: {
                name: messageObject.msg.data.sku,
                role: "group"
              },
              native: {}
            });
            this.setObjectNotExists(`${deviceName}.deviceInfo.${key}`, {
              type: "state",
              common: {
                name: getDatapointDescription(key),
                type: "string",
                role: "state",
                read: true,
                write: false
              },
              native: {}
            });
            this.setState(`${deviceName}.deviceInfo.${key}`, {
              val: messageObject.msg.data[key],
              ack: true
            });
          }
        }
        if (!(messageObject.msg.data.device in intervals)) {
          const result = this.setInterval(
            () => this.requestDeviceStatus(messageObject.msg.data.ip),
            this.config.deviceStatusRefreshInterval * 1e3
          );
          if (result !== void 0) {
            intervals[messageObject.msg.data.device] = result;
          }
        }
        break;
      case "devStatus":
        this.log.info("devStatus : ... from " + remote.address);
        this.log.info(`${this.name}.${this.instance}.*.deviceInfo.ip`);
        const devices = await this.getStatesAsync(`${this.name}.${this.instance}.*.deviceInfo.ip`);
        if (this.config.extendedLogging && !loggedDevices.includes(remote.address.toString())) {
          this.log.info(`deivce status message data: ${JSON.stringify(messageObject)}`);
          loggedDevices.push(remote.address.toString());
        }
        break;
        for (const key in devices) {
          if (devices[key].val == remote.address) {
            const sendingDevice = key.split(".")[2].replace(this.FORBIDDEN_CHARS, "_");
            const devStatusMessageObject = JSON.parse(message.toString());
            this.setObjectNotExists(`${sendingDevice}.devStatus.onOff`, {
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
            this.setState(`${sendingDevice}.devStatus.onOff`, {
              val: devStatusMessageObject.msg.data.onOff == 1,
              ack: true
            });
            this.setObjectNotExists(`${sendingDevice}.devStatus.brightness`, {
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
            this.setState(`${sendingDevice}.devStatus.brightness`, {
              val: devStatusMessageObject.msg.data.brightness,
              ack: true
            });
            this.setObjectNotExists(`${sendingDevice}.devStatus.color`, {
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
            this.setState(`${sendingDevice}.devStatus.color`, {
              val: "#" + componentToHex(devStatusMessageObject.msg.data.color.r) + componentToHex(devStatusMessageObject.msg.data.color.g) + componentToHex(devStatusMessageObject.msg.data.color.b),
              ack: true
            });
            this.setObjectNotExists(`${sendingDevice}.devStatus.colorTemInKelvin`, {
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
            this.setState(`${sendingDevice}.devStatus.colorTemInKelvin`, {
              val: devStatusMessageObject.msg.data.colorTemInKelvin,
              ack: true
            });
          }
        }
        break;
      default:
        this.log.error("message from: " + remote.address + ":" + remote.port + " - " + message);
    }
  }
  requestDeviceStatus(receiver) {
    console.log("request device status " + receiver);
    const requestDeviceStatusBuffer = Buffer.from(JSON.stringify(requestStatusMessage));
    client.send(requestDeviceStatusBuffer, 0, requestDeviceStatusBuffer.length, CONTROL_PORT, receiver);
  }
  async sendScan() {
    const scanMessageBuffer = Buffer.from(JSON.stringify(scanMessage));
    client.send(scanMessageBuffer, 0, scanMessageBuffer.length, SEND_SCAN_PORT, M_CAST);
  }
  onUnload(callback) {
    try {
      this.clearInterval(searchInterval);
      Object.entries(intervals).forEach(([_, interval]) => this.clearInterval(interval));
      client.close();
      server.close();
      this.setState("info.connection", { val: false, ack: true });
      callback();
    } catch (e) {
      callback();
    }
  }
  async onStateChange(id, state) {
    var _a, _b;
    this.log.info("state changed : " + id + " new state : " + (state == null ? void 0 : state.val) + " ack? " + (state == null ? void 0 : state.ack));
    if (state && !state.ack && state.val) {
      const ipOfDevice = await this.getStateAsync(id.split(".")[2] + ".deviceInfo.ip");
      if (ipOfDevice) {
        const receiver = (_a = ipOfDevice.val) == null ? void 0 : _a.toString();
        switch (id.split(".")[4]) {
          case "onOff":
            const turnMessage = { msg: { cmd: "turn", data: { value: state.val ? 1 : 0 } } };
            const turnMessageBuffer = Buffer.from(JSON.stringify(turnMessage));
            client.send(turnMessageBuffer, 0, turnMessageBuffer.length, CONTROL_PORT, receiver);
            break;
          case "brightness":
            const brightnessMessage = { msg: { cmd: "brightness", data: { value: state.val } } };
            const brightnessMessageBuffer = Buffer.from(JSON.stringify(brightnessMessage));
            client.send(brightnessMessageBuffer, 0, brightnessMessageBuffer.length, CONTROL_PORT, receiver);
            break;
          case "colorTemInKelvin":
            const colorTempMessage = { msg: { cmd: "colorTemInKelvin", data: { value: state.val } } };
            const colorTempMessageBuffer = Buffer.from(JSON.stringify(colorTempMessage));
            client.send(colorTempMessageBuffer, 0, colorTempMessageBuffer.length, CONTROL_PORT, receiver);
            break;
          case "color":
            const rgb = hexToRgb((_b = state.val) == null ? void 0 : _b.toString());
            const colorMessage = { msg: { cmd: "colorwc", data: { color: rgb } } };
            const colorMessageBuffer = Buffer.from(JSON.stringify(colorMessage));
            client.send(colorMessageBuffer, 0, colorMessageBuffer.length, CONTROL_PORT, receiver);
            break;
        }
      } else {
        this.log.error("device not found");
      }
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
function componentToHex(c) {
  const hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}
function hexToRgb(hexString) {
  if (!/^#[0-9a-f]{6}$/i.test(hexString)) {
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
//# sourceMappingURL=main.js.map
