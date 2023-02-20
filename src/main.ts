/*
 * Created with @iobroker/create-adapter v2.3.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from '@iobroker/adapter-core';
import * as dgram from 'node:dgram';

// Load your modules here, e.g.:
// import * as fs from "fs";

const LOCAL_PORT = 4002;
const SEND_SCAN_PORT = 4001;
//const CONTROL_PORT = 4003;
const M_CAST = '239.255.255.250';

const server = dgram.createSocket('udp4');
const client = dgram.createSocket('udp4');

const scanMessage = { msg: { cmd: 'scan', data: { account_topic: 'reserved' } } };

let searchInterval: ioBroker.Interval;

class GoveeLocal extends utils.Adapter {
	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: 'govee-local',
		});
		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		// this.on('objectChange', this.onObjectChange.bind(this));
		// this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	private async onReady(): Promise<void> {
		server.on('message', this.onUdpMessage.bind(this));

		server.bind(LOCAL_PORT, this.serverBound.bind(this));
		this.log.info('called server.bind()');
	}

	private async serverBound(): Promise<void> {
		server.setBroadcast(true);
		server.setMulticastTTL(128);
		server.addMembership(M_CAST);
		this.log.info('UDP listening on ' + server.address().address + ':' + server.address().port);

		if (this.config.searchInterval == undefined) {
			this.config.searchInterval = 1000;
		}
		this.log.info('search interval is ' + this.config.searchInterval);
		searchInterval = this.setInterval(this.sendScan.bind(this), this.config.searchInterval);
		this.log.info('registered interval for searching');
		// this.sendScan();
	}

	private async onUdpMessage(message: Buffer, remote: dgram.RemoteInfo): Promise<void> {
		this.log.info('message from: ' + remote.address + ':' + remote.port + ' - ' + message);
	}

	private async sendScan(): Promise<void> {
		const scanMessageBuffer = Buffer.from(JSON.stringify(scanMessage));
		client.send(scanMessageBuffer, 0, scanMessageBuffer.length, SEND_SCAN_PORT, M_CAST);
		//this.log.info('send message ' + scanMessageBuffer);
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 */
	private onUnload(callback: () => void): void {
		try {
			this.clearInterval(searchInterval);
			client.close();
			server.close();
			callback();
		} catch (e) {
			callback();
		}
	}

	/**
	 * Is called if a subscribed state changes
	 */
	private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}
}

if (require.main !== module) {
	// Export the constructor in compact mode
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new GoveeLocal(options);
} else {
	// otherwise start the instance directly
	(() => new GoveeLocal())();
}
