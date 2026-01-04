/**
 * GoveeService handles all business logic for device discovery, status updates, and UDP communication.
 * This class is independent from ioBroker.Adapter and can be tested separately.
 */

import * as dgram from 'node:dgram';
import { EventEmitter } from 'node:events';
import type { GoveeServiceOptions } from './goveeServiceOptions';
import { componentToHex, hexToRgb } from './tools/hexTool';
import { isValidIpAddress } from './tools/ipValidation';

/**
 * Device discovery event data.
 */
export interface DeviceDiscoveryEvent {
	/** The IP address of the discovered device. */
	ip: string;
	/** The sanitized device name. */
	deviceName: string;
	/** The device model. */
	deviceModel: string;
}

/**
 * Device status update event data.
 */
export interface DeviceStatusEvent {
	/** The sanitized device name. */
	deviceName: string;
	/** The IP address of the device. */
	ip: string;
	/** The current status of the device. */
	status: {
		/** Current on/off state. */
		onOff: boolean;
		/** Current brightness level. */
		brightness: number;
		/** Current color as hex string. */
		color: string;
		/** Current color temperature in Kelvin. */
		colorTemInKelvin: number;
	};
}

/**
 * GoveeService handles all business logic for device discovery, status updates, and UDP communication.
 * This class is independent from ioBroker.Adapter and can be tested separately.
 *
 * Events:
 *   - 'deviceDiscovered': Emitted when a new device is found
 *   - 'deviceStatusUpdate': Emitted when device status is updated
 *
 * Usage:
 *   const service = new GoveeService(options);
 *   service.on('deviceDiscovered', (data) => { ... });
 *   service.on('deviceStatusUpdate', (data) => { ... });
 *   service.start();
 *   // ...
 *   service.stop();
 */
export class GoveeService extends EventEmitter {
	private socket: dgram.Socket;
	private options: GoveeServiceOptions;
	private devices: { [ip: string]: string } = {};
	private loggedDevices: string[] = [];
	private lastStatusLog: { [ip: string]: string } = {};
	private searchInterval?: NodeJS.Timeout;
	private refreshInterval?: NodeJS.Timeout;
	private scanMode: 'interval' | 'once' | 'never' = 'interval';

	static readonly LOCAL_PORT = 4002;
	static readonly SEND_SCAN_PORT = 4001;
	static readonly CONTROL_PORT = 4003;
	static readonly M_CAST = '239.255.255.250';
	static readonly scanMessage = { msg: { cmd: 'scan', data: { account_topic: 'reserved' } } };
	static readonly requestStatusMessage = { msg: { cmd: 'devStatus', data: {} } };

	/**
	 * Create a new GoveeService instance.
	 *
	 * @param options Configuration options for the service.
	 */
	constructor(options: GoveeServiceOptions) {
		super();
		this.options = options;
		this.socket = dgram.createSocket({ type: 'udp4' });
		// Get scanMode from options, fallback to interval
		const providedScanMode = options.scanMode;

		if (providedScanMode === 'once' || providedScanMode === 'never') {
			this.scanMode = providedScanMode;
		} else {
			this.scanMode = 'interval';
		}
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

		// Add manual IP addresses if provided
		if (this.options.manualIpAddresses && this.options.manualIpAddresses.length > 0) {
			this.addManualDevices(this.options.manualIpAddresses);
		}

		// Start discovery according to scanMode
		this.options.logger?.debug(`Device discovery mode: "${this.scanMode}"`);

		if (this.scanMode === 'interval') {
			this.searchInterval = setInterval(() => this.sendScan(), this.options.searchInterval * 1000);
		} else if (this.scanMode === 'once') {
			this.sendScan();
		}

		this.refreshInterval = setInterval(
			() => this.refreshAllDevices(),
			this.options.deviceStatusRefreshInterval * 1000,
		);

		// Emit serviceStarted event after successful startup
		this.emit('serviceStarted');
	}

	/**
	 * Handle incoming UDP messages.
	 *
	 * @param message The message buffer.
	 * @param remote The sender info.
	 */
	private onUdpMessage(message: Buffer, remote: dgram.RemoteInfo): void {
		let messageObject: { msg: { cmd: string; data: any } };
		try {
			messageObject = JSON.parse(message.toString());
		} catch (err) {
			this.options.logger?.error(
				`Malformed UDP message from ${remote.address}:${remote.port}: ${err instanceof Error ? err.message : String(err)}`,
			);
			throw err;
		}
		switch (messageObject.msg.cmd) {
			case 'scan': {
				if (messageObject.msg.data.device) {
					const deviceName = messageObject.msg.data.device.replace(
						this.options.forbiddenChars ?? /[^a-zA-Z0-9_-]/g,
						'_',
					);
					this.devices[remote.address] = deviceName;
					if (this.options.extendedLogging && !this.loggedDevices.includes(remote.address.toString())) {
						this.options.logger?.info(
							`Discovered device: ${deviceName} at ${remote.address} (model: ${messageObject.msg.data.sku})`,
						);
						this.loggedDevices.push(remote.address.toString());
					}
					this.emit('deviceDiscovered', {
						ip: remote.address,
						deviceName: deviceName,
						deviceModel: messageObject.msg.data.sku,
					} as DeviceDiscoveryEvent);
				}
				break;
			}
			case 'devStatus': {
				const sendingDevice = this.devices[remote.address];
				if (sendingDevice) {
					if (this.options.extendedLogging) {
						const statusString = JSON.stringify(messageObject);
						if (this.lastStatusLog[remote.address] !== statusString) {
							this.options.logger?.info(`device status message data: ${statusString}`);
							this.lastStatusLog[remote.address] = statusString;
						}
					}
					this.emitDeviceStatusUpdate(sendingDevice, remote.address, messageObject);
				}
				break;
			}
			default: {
				this.options.logger?.debug(`message from: ${remote.address}:${remote.port} - ${message.toString()}`);
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
                if (this.options.extendedLogging) {
                        this.options.logger?.info(
                                `Sending status request to ${receiver}: ${JSON.stringify(GoveeService.requestStatusMessage)}`,
                        );
                }
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
                if (this.options.extendedLogging) {
                        this.options.logger?.debug('sending scan message');
                }
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
	 * Add manual devices by IP address without discovery.
	 * These devices will be added to the device list and can be controlled.
	 *
	 * @param ipAddresses Array of IP addresses to add as manual devices.
	 */
	public addManualDevices(ipAddresses: string[]): void {
		for (const ip of ipAddresses) {
			if (!ip || ip.trim().length === 0) {
				continue;
			}
			const trimmedIp = ip.trim();

			// Validate IP address format
			if (!isValidIpAddress(trimmedIp)) {
				this.options.logger?.error(`Invalid IP address format: "${trimmedIp}" - skipping this entry`);
				continue;
			}

			// Generate a device name based on the IP address
			const deviceName = `Manual_${trimmedIp.replace(/\./g, '_')}`;
			this.devices[trimmedIp] = deviceName;
			this.options.logger?.info(`Added manual device: ${deviceName} at ${trimmedIp}`);

			// Emit discovery event for manual device
			this.emit('deviceDiscovered', {
				ip: trimmedIp,
				deviceName: deviceName,
			} as DeviceDiscoveryEvent);

			// Request initial status
			this.requestDeviceStatus(trimmedIp);
		}
	}

	/**
	 * Stop all intervals and close the socket.
	 */
	public stop(): void {
		this.options.logger?.debug('Stopping GoveeService and closing UDP socket.');
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
                if (this.options.extendedLogging) {
                        this.options.logger?.info(`Sending turn command to ${receiver}: ${JSON.stringify(turnMessage)}`);
                }
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
                if (this.options.extendedLogging) {
                        this.options.logger?.info(
                                `Sending brightness command to ${receiver}: ${JSON.stringify(brightnessMessage)}`,
                        );
                }
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
                if (this.options.extendedLogging) {
                        this.options.logger?.info(
                                `Sending color temperature command to ${receiver}: ${JSON.stringify({ kelvin })}`,
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
        public sendColorCommand(receiver: string, hexColor: string): void {
                const rgb = hexToRgb(hexColor);
                const colorMessage = { msg: { cmd: 'colorwc', data: { color: rgb } } };
                const colorMessageBuffer = Buffer.from(JSON.stringify(colorMessage));
                if (this.options.extendedLogging) {
                        this.options.logger?.info(`Sending color command to ${receiver}: ${JSON.stringify(colorMessage)}`);
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
	private emitDeviceStatusUpdate(deviceName: string, ip: string, messageObject: any): void {
		const deviceData = messageObject.msg.data;
		// Robust: Fallback for missing or invalid color data
		let colorString = '#000000';
		if (deviceData.color && typeof deviceData.color === 'object') {
			const r = typeof deviceData.color.r === 'number' ? deviceData.color.r : 0;
			const g = typeof deviceData.color.g === 'number' ? deviceData.color.g : 0;
			const b = typeof deviceData.color.b === 'number' ? deviceData.color.b : 0;
			colorString = `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
		}
		this.emit('deviceStatusUpdate', {
			deviceName: deviceName,
			ip: ip,
			status: {
				onOff: deviceData.onOff === 1,
				brightness: deviceData.brightness,
				color: colorString,
				colorTemInKelvin: deviceData.colorTemInKelvin,
			},
		} as DeviceStatusEvent);
	}
}
