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
const LOCAL_PORT = 4002;
const SEND_SCAN_PORT = 4001;
const M_CAST = "239.255.255.250";
const server = dgram.createSocket("udp4");
const client = dgram.createSocket("udp4");
const scanMessage = { msg: { cmd: "scan", data: { account_topic: "reserved" } } };
let searchInterval;
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
    server.bind(LOCAL_PORT, this.serverBound.bind(this));
    this.log.info("called server.bind()");
  }
  async serverBound() {
    server.setBroadcast(true);
    server.setMulticastTTL(128);
    server.addMembership(M_CAST);
    this.log.info("UDP listening on " + server.address().address + ":" + server.address().port);
    if (this.config.searchInterval == void 0) {
      this.config.searchInterval = 1e3;
    }
    this.log.info("search interval is " + this.config.searchInterval);
    searchInterval = this.setInterval(this.sendScan.bind(this), this.config.searchInterval);
    this.log.info("registered interval for searching");
  }
  async onUdpMessage(message, remote) {
    this.log.info("message from: " + remote.address + ":" + remote.port + " - " + message);
  }
  async sendScan() {
    const scanMessageBuffer = Buffer.from(JSON.stringify(scanMessage));
    client.send(scanMessageBuffer, 0, scanMessageBuffer.length, SEND_SCAN_PORT, M_CAST);
  }
  onUnload(callback) {
    try {
      this.clearInterval(searchInterval);
      client.close();
      server.close();
      callback();
    } catch (e) {
      callback();
    }
  }
  onStateChange(id, state) {
    if (state) {
      this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
    } else {
      this.log.info(`state ${id} deleted`);
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new GoveeLocal(options);
} else {
  (() => new GoveeLocal())();
}
//# sourceMappingURL=main.js.map
