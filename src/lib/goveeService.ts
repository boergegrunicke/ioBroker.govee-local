/**
 * GoveeService handles all business logic for device discovery, status updates, and UDP communication.
 * This class is independent from ioBroker.Adapter and can be tested separately.
 */

import * as dgram from 'node:dgram';
import type { GoveeServiceOptions } from './goveeServiceOptions';
import { hexToRgb } from './tools/hexTool';

/**
 * GoveeService handles all business logic for device discovery, status updates, and UDP communication.
 * This class is independent from ioBroker.Adapter and can be tested separately.
 *
 * Usage:
 *   const service = new GoveeService(options);
 *   service.start();
 *   // ...
 *   service.stop();
 */
export class GoveeService {
	private socket: dgram.Socket;
	private options: GoveeServiceOptions;
	private devices: { [ip: string]: string } = {};
	private loggedDevices: string[] = [];
	private searchInterval?: NodeJS.Timeout;
	private refreshInterval?: NodeJS.Timeout;

	static readonly LOCAL_PORT = 4002;
	static readonly SEND_SCAN_PORT = 4001;
	static readonly CONTROL_PORT = 4003;
	static readonly M_CAST = '239.255.255.250';
	/** Network interface to bind UDP socket to. */
	static readonly scanMessage = { msg: { cmd: 'scan', data: { account_topic: 'reserved' } } };
	/** Interval in seconds for device search. */
	static readonly requestStatusMessage = { msg: { cmd: 'devStatus', data: {} } };
	/** Interval in seconds for device status refresh. */

	/**
	 * Create a new GoveeService instance.
	 *
	 * @param options Configuration options for the service.
	 */
	constructor(options: GoveeServiceOptions) {
		this.options = options;
		this.socket = dgram.createSocket({ type: 'udp4' });
	}

	/**
	 * Bind UDP socket and start device search/refresh intervals.
	 */
	public start(): void {
		this.socket.on('message', this.onUdpMessage.bind(this));
		this.socket.on('error', (error) => {
			this.options.logger?.error(`server bind error : ${error.message}`);
		});
		this.socket.bind(
			{ address: this.options.interface, port: GoveeService.LOCAL_PORT },
			this.serverBound.bind(this),
		);
	}

	private serverBound(): void {
		this.socket.setBroadcast(true);
		this.socket.setMulticastTTL(128);
		this.socket.setMulticastInterface(this.options.interface);
		this.socket.addMembership(GoveeService.M_CAST);
		this.options.logger?.debug(
			`UDP listening on ${(this.socket.address() as any).address}:${(this.socket.address() as any).port}`,
		);
		this.searchInterval = setInterval(() => this.sendScan(), this.options.searchInterval * 1000);
		this.refreshInterval = setInterval(
			() => this.refreshAllDevices(),
			this.options.deviceStatusRefreshInterval * 1000,
		);
	}

	/**
	 * Handle incoming UDP messages.
	 *
	 * @param message The message buffer.
	 * @param remote The sender info.
	 */
	private onUdpMessage(message: Buffer, remote: dgram.RemoteInfo): void {
		const messageObject = JSON.parse(message.toString());
		switch (messageObject.msg.cmd) {
			case 'scan': {
				for (const key of Object.keys(messageObject.msg.data)) {
					if (key !== 'device') {
						const deviceName = messageObject.msg.data.device.replace(
							this.options.forbiddenChars ?? /[^a-zA-Z0-9_-]/g,
							'_',
						);
						this.devices[remote.address] = deviceName;
						// Device registration logic can be handled via callback or event
					}
				}
				break;
			}
			case 'devStatus': {
				const sendingDevice = this.devices[remote.address];
				if (sendingDevice) {
					if (this.options.extendedLogging && !this.loggedDevices.includes(remote.address.toString())) {
						this.options.logger?.info(`device status message data: ${JSON.stringify(messageObject)}`);
						this.loggedDevices.push(remote.address.toString());
					}
					// Status update logic can be handled via callback or event
				}
				break;
			}
			default: {
				this.options.logger?.error(`message from: ${remote.address}:${remote.port} - ${message.toString()}`);
			}
		}
	}

	/**
	 * Send device status request to all known devices.
	 */
	public refreshAllDevices(): void {
		for (const ip in this.devices) {
			this.requestDeviceStatus(ip);
		}
	}

	/**
	 * Send device status request to a specific device.
	 *
	 * @param receiver The IP address or hostname of the device.
	 */
	public requestDeviceStatus(receiver: string): void {
		const requestDeviceStatusBuffer = Buffer.from(JSON.stringify(GoveeService.requestStatusMessage));
		this.socket.send(
			requestDeviceStatusBuffer,
			0,
			requestDeviceStatusBuffer.length,
			GoveeService.CONTROL_PORT,
			receiver,
		);
	}

	/**
	 * Send scan message to the UDP multicast address.
	 */
	public sendScan(): void {
		const scanMessageBuffer = Buffer.from(JSON.stringify(GoveeService.scanMessage));
		this.socket.send(
			scanMessageBuffer,
			0,
			scanMessageBuffer.length,
			GoveeService.SEND_SCAN_PORT,
			GoveeService.M_CAST,
		);
	}

	/**
	 * Stop all intervals and close the socket.
	 */
	public stop(): void {
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
	public getDevices(): { [ip: string]: string } {
		return this.devices;
	}

	/**
	 * Handles a state change and sends the appropriate command to the device.
	 *
	 * @param id The state ID
	 * @param state The new state object
	 * @param receiver The device IP as string
	 */
	public handleStateChange(id: string, state: ioBroker.State, receiver: string): void {
		const stateKey = id.split('.')[4];
		switch (stateKey) {
			case 'onOff':
				this.sendTurnCommand(receiver, !!state.val);
				break;
			case 'brightness':
				this.sendBrightnessCommand(receiver, Number(state.val));
				break;
			case 'colorTemInKelvin':
				this.sendColorTempCommand(receiver, Number(state.val));
				break;
			case 'color': {
				const colorValue = state.val?.toString();
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
	public sendTurnCommand(receiver: string, value: boolean): void {
		const turnMessage = { msg: { cmd: 'turn', data: { value: value ? 1 : 0 } } };
		const turnMessageBuffer = Buffer.from(JSON.stringify(turnMessage));
		this.socket.send(turnMessageBuffer, 0, turnMessageBuffer.length, GoveeService.CONTROL_PORT, receiver);
	}

	/**
	 * Send a brightness command to a device.
	 *
	 * @param receiver IP address or hostname
	 * @param value Brightness value
	 */
	public sendBrightnessCommand(receiver: string, value: number): void {
		const brightnessMessage = { msg: { cmd: 'brightness', data: { value } } };
		const brightnessMessageBuffer = Buffer.from(JSON.stringify(brightnessMessage));
		this.socket.send(
			brightnessMessageBuffer,
			0,
			brightnessMessageBuffer.length,
			GoveeService.CONTROL_PORT,
			receiver,
		);
	}

	/**
	 * Send a color temperature command to a device.
	 *
	 * @param receiver IP address or hostname
	 * @param kelvin Color temperature in Kelvin
	 */
	public sendColorTempCommand(receiver: string, kelvin: number): void {
		const colorTempMessageBuffer = Buffer.from(
			JSON.stringify({
				msg: {
					cmd: 'colorwc',
					data: { color: { r: 0, g: 0, b: 0 }, colorTemInKelvin: kelvin },
				},
			}),
		);
		this.socket.send(colorTempMessageBuffer, 0, colorTempMessageBuffer.length, GoveeService.CONTROL_PORT, receiver);
	}

	/**
	 * Send a color command to a device.
	 *
	 * @param receiver IP address or hostname
	 * @param hexColor Color as hex string (e.g. #FFAABB)
	 */
	public sendColorCommand(receiver: string, hexColor: string): void {
		const rgb = hexToRgb(hexColor);
		const colorMessage = { msg: { cmd: 'colorwc', data: { color: rgb } } };
		const colorMessageBuffer = Buffer.from(JSON.stringify(colorMessage));
		this.socket.send(colorMessageBuffer, 0, colorMessageBuffer.length, GoveeService.CONTROL_PORT, receiver);
	}
}
