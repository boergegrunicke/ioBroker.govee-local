"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var utils = __toESM(require("@iobroker/adapter-core"));
var dgram = __toESM(require("node:dgram"));
var import_hexTool = require("./tools/hexTool");
const LOCAL_PORT = 4002;
const SEND_SCAN_PORT = 4001;
const CONTROL_PORT = 4003;
const M_CAST = "239.255.255.250";
const socket = dgram.createSocket({ type: "udp4" });
const scanMessage = { msg: { cmd: "scan", data: { account_topic: "reserved" } } };
const requestStatusMessage = { msg: { cmd: "devStatus", data: {} } };
let searchInterval;
let refreshInterval;
const devices = {};
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
    this.setObjectNotExists("info.connection", {
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
    socket.on("message", this.onUdpMessage.bind(this));
    socket.on("error", (error) => {
      this.log.error("server bind error : " + error.message);
      this.setStateChanged("info.connection", { val: false, ack: true });
    });
    if (this.config.extendedLogging) {
      this.log.debug("running with extended logging");
    }
    socket.bind({ address: this.config.interface, port: LOCAL_PORT }, this.serverBound.bind(this));
    this.subscribeStates("*.devStatus.*");
  }
  async serverBound() {
    socket.setBroadcast(true);
    socket.setMulticastTTL(128);
    socket.setMulticastInterface(this.config.interface);
    socket.addMembership(M_CAST);
    this.setStateChanged("info.connection", { val: true, ack: true });
    this.log.debug("UDP listening on " + socket.address().address + ":" + socket.address().port);
    const deviceSearchInterval = this.setInterval(this.sendScan.bind(this), this.config.searchInterval * 1e3);
    if (deviceSearchInterval) {
      searchInterval = deviceSearchInterval;
    }
    const deviceRefreshInterval = this.setInterval(
      this.refreshAllDevices.bind(this),
      this.config.deviceStatusRefreshInterval * 1e3
    );
    if (deviceRefreshInterval) {
      refreshInterval = deviceRefreshInterval;
    }
  }
  async onUdpMessage(message, remote) {
    const messageObject = JSON.parse(message.toString());
    switch (messageObject.msg.cmd) {
      case "scan":
        for (const key of Object.keys(messageObject.msg.data)) {
          if (key != "device") {
            const deviceName = messageObject.msg.data.device.replace(this.FORBIDDEN_CHARS, "_");
            devices[remote.address] = deviceName;
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
        break;
      case "devStatus":
        const sendingDevice = devices[remote.address];
        if (sendingDevice) {
          if (this.config.extendedLogging && !loggedDevices.includes(remote.address.toString())) {
            this.log.info(`deivce status message data: ${JSON.stringify(messageObject)}`);
            loggedDevices.push(remote.address.toString());
          }
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
            val: "#" + (0, import_hexTool.componentToHex)(devStatusMessageObject.msg.data.color.r) + (0, import_hexTool.componentToHex)(devStatusMessageObject.msg.data.color.g) + (0, import_hexTool.componentToHex)(devStatusMessageObject.msg.data.color.b),
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
        break;
      default:
        this.log.error("message from: " + remote.address + ":" + remote.port + " - " + message);
    }
  }
  async refreshAllDevices() {
    for (const ip in devices) {
      this.requestDeviceStatus(ip);
    }
  }
  requestDeviceStatus(receiver) {
    const requestDeviceStatusBuffer = Buffer.from(JSON.stringify(requestStatusMessage));
    socket.send(requestDeviceStatusBuffer, 0, requestDeviceStatusBuffer.length, CONTROL_PORT, receiver);
  }
  async sendScan() {
    const scanMessageBuffer = Buffer.from(JSON.stringify(scanMessage));
    socket.send(scanMessageBuffer, 0, scanMessageBuffer.length, SEND_SCAN_PORT, M_CAST);
  }
  onUnload(callback) {
    try {
      this.clearInterval(searchInterval);
      this.clearInterval(refreshInterval);
      socket.close();
      this.setState("info.connection", { val: false, ack: true });
      callback();
    } catch (e) {
      this.log.error(e.message);
      callback();
    }
  }
  async onStateChange(id, state) {
    var _a, _b;
    if (state && !state.ack) {
      const ipOfDevice = await this.getStateAsync(id.split(".")[2] + ".deviceInfo.ip");
      if (ipOfDevice) {
        const receiver = (_a = ipOfDevice.val) == null ? void 0 : _a.toString();
        switch (id.split(".")[4]) {
          case "onOff":
            const turnMessage = { msg: { cmd: "turn", data: { value: state.val ? 1 : 0 } } };
            const turnMessageBuffer = Buffer.from(JSON.stringify(turnMessage));
            socket.send(turnMessageBuffer, 0, turnMessageBuffer.length, CONTROL_PORT, receiver);
            break;
          case "brightness":
            const brightnessMessage = { msg: { cmd: "brightness", data: { value: state.val } } };
            const brightnessMessageBuffer = Buffer.from(JSON.stringify(brightnessMessage));
            socket.send(brightnessMessageBuffer, 0, brightnessMessageBuffer.length, CONTROL_PORT, receiver);
            break;
          case "colorTemInKelvin":
            const colorTempMessageBuffer = Buffer.from(
              JSON.stringify({
                msg: {
                  cmd: "colorwc",
                  data: { color: { r: "0", g: "0", b: "0" }, colorTemInKelvin: state.val }
                }
              })
            );
            socket.send(colorTempMessageBuffer, 0, colorTempMessageBuffer.length, CONTROL_PORT, receiver);
            break;
          case "color":
            const colorValue = (_b = state.val) == null ? void 0 : _b.toString();
            if (colorValue) {
              const rgb = (0, import_hexTool.hexToRgb)(colorValue);
              const colorMessage = { msg: { cmd: "colorwc", data: { color: rgb } } };
              const colorMessageBuffer = Buffer.from(JSON.stringify(colorMessage));
              socket.send(colorMessageBuffer, 0, colorMessageBuffer.length, CONTROL_PORT, receiver);
            }
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
//# sourceMappingURL=main.js.map
