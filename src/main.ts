/*
 * Created with @iobroker/create-adapter v2.3.0
 */

import * as utils from '@iobroker/adapter-core';
import { GoveeService, type DeviceDiscoveryEvent, type DeviceStatusEvent } from './lib/goveeService';

export class GoveeLocal extends utils.Adapter {
	private goveeService!: GoveeService;
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
		void this.setObjectNotExists('info.connection', {
			type: 'state',
			common: {
				name: 'Device discovery running',
				type: 'boolean',
				role: 'indicator.connected',
				read: true,
				write: false,
			},
			native: {},
		});
		// Initialize GoveeService with adapter config and logger
		this.goveeService = new GoveeService({
			interface: this.config.interface,
			searchInterval: this.config.searchInterval,
			deviceStatusRefreshInterval: this.config.deviceStatusRefreshInterval,
			extendedLogging: this.config.extendedLogging,
			forbiddenChars: /[^a-zA-Z0-9_-]/g,
			logger: {
				debug: (msg) => this.log.debug(msg),
				info: (msg) => this.log.info(msg),
				error: (msg) => this.log.error(msg),
			},
		});

		// Set up event listeners
		this.goveeService.on('deviceDiscovered', (data) => {
			void this.handleDeviceDiscovered(data);
		});

		this.goveeService.on('deviceStatusUpdate', (data) => {
			void this.handleDeviceStatusUpdate(data);
		});
		this.goveeService.start();

		if (this.config.extendedLogging) {
			this.log.debug('running with extended logging');
		}

		void this.subscribeStates('*.devStatus.*');
		return Promise.resolve();
	}

	/**
	 * Is called if a subscribed state changes
	 *
	 * @param id The ID of the changed state.
	 * @param state The new state object or null/undefined.
	 */
	private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
		if (state && !state.ack) {
			const ipOfDevice = await this.getStateAsync(`${id.split('.')[2]}.deviceInfo.ip`);
			const receiver = ipOfDevice?.val?.toString();
			if (typeof receiver === 'string') {
				this.goveeService.handleStateChange(id, state, receiver);
			} else {
				this.log.error('device not found or IP is not a string');
			}
		}
		return Promise.resolve();
	}
	/**
	 * Called when adapter shuts down - callback must be called under any circumstances!
	 *
	 * @param callback Callback function after unload process.
	 */
	private onUnload(callback: () => void): void {
		try {
			if (this.goveeService) {
				this.goveeService.removeAllListeners();
				this.goveeService.stop();
			}
			void this.updateStateAsync('info.connection', false);
			callback();
		} catch (e: any) {
			this.log.error(e.message);
			callback();
		}
	}

	private async updateStateAsync(fullName: string, state: any, acknowledged = true): Promise<void> {
		const currentState = await this.getStateAsync(fullName);
		if (currentState != state) {
			void this.setState(fullName, {
				val: state,
				ack: acknowledged,
			});
		}
	}

	/**
	 * Handle device discovery event.
	 *
	 * @param event The device discovery event data.
	 */
	private async handleDeviceDiscovered(event: DeviceDiscoveryEvent): Promise<void> {
		const { ip, deviceName } = event;

		// Create device folder
		await this.setObjectNotExistsAsync(deviceName, {
			type: 'folder',
			common: {
				name: deviceName,
			},
			native: {},
		});

		// Create deviceInfo folder
		await this.setObjectNotExistsAsync(`${deviceName}.deviceInfo`, {
			type: 'folder',
			common: {
				name: 'Device Info',
			},
			native: {},
		});

		// Create IP address state
		await this.setObjectNotExistsAsync(`${deviceName}.deviceInfo.ip`, {
			type: 'state',
			common: {
				name: 'IP address of the Lamp',
				type: 'string',
				role: 'info.ip',
				read: true,
				write: false,
			},
			native: {},
		});
		await this.updateStateAsync(`${deviceName}.deviceInfo.ip`, ip);

		// Create devStatus folder
		await this.setObjectNotExistsAsync(`${deviceName}.devStatus`, {
			type: 'folder',
			common: {
				name: 'Device Status',
			},
			native: {},
		});

		this.log.info(`Device discovered: ${deviceName} at ${ip}`);
	}

	/**
	 * Handle device status update event.
	 *
	 * @param event The device status update event data.
	 */
	private async handleDeviceStatusUpdate(event: DeviceStatusEvent): Promise<void> {
		const { deviceName, status } = event;

		// Create and update onOff state
		await this.setObjectNotExistsAsync(`${deviceName}.devStatus.onOff`, {
			type: 'state',
			common: {
				name: 'On / Off state of the lamp',
				type: 'boolean',
				role: 'switch',
				read: true,
				write: true,
			},
			native: {},
		});
		await this.updateStateAsync(`${deviceName}.devStatus.onOff`, status.onOff);

		// Create and update brightness state
		await this.setObjectNotExistsAsync(`${deviceName}.devStatus.brightness`, {
			type: 'state',
			common: {
				name: 'Brightness of the light',
				type: 'number',
				role: 'level.dimmer',
				read: true,
				write: true,
			},
			native: {},
		});
		await this.updateStateAsync(`${deviceName}.devStatus.brightness`, status.brightness);

		// Create and update color state
		await this.setObjectNotExistsAsync(`${deviceName}.devStatus.color`, {
			type: 'state',
			common: {
				name: 'Current showing color of the lamp',
				type: 'string',
				role: 'level.color.rgb',
				read: true,
				write: true,
			},
			native: {},
		});
		await this.updateStateAsync(`${deviceName}.devStatus.color`, status.color);

		// Create and update color temperature state
		await this.setObjectNotExistsAsync(`${deviceName}.devStatus.colorTemInKelvin`, {
			type: 'state',
			common: {
				name: 'If staying in white light, the color temperature',
				type: 'number',
				role: 'level.color.temperature',
				read: true,
				write: true,
			},
			native: {},
		});
		await this.updateStateAsync(`${deviceName}.devStatus.colorTemInKelvin`, status.colorTemInKelvin);
	}
}

if (require.main !== module) {
	// Exportiere eine Factory-Funktion für ioBroker, aber die Klasse ist jetzt auch als ES6-Export verfügbar
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new GoveeLocal(options);
} else {
	// otherwise start the instance directly
	(() => new GoveeLocal())();
}
