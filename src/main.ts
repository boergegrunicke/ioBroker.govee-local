/*
 * Created with @iobroker/create-adapter v2.3.0
 */

import * as utils from '@iobroker/adapter-core';
import { GoveeService } from './lib/goveeService';

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
	 * @param _id The ID of the changed state.
	 * @param _state The new state object or null/undefined.
	 */
	private async onStateChange(_id: string, _state: ioBroker.State | null | undefined): Promise<void> {
		// TODO: Implement state change handling using GoveeService if needed
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
}

if (require.main !== module) {
	// Exportiere eine Factory-Funktion für ioBroker, aber die Klasse ist jetzt auch als ES6-Export verfügbar
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new GoveeLocal(options);
} else {
	// otherwise start the instance directly
	(() => new GoveeLocal())();
}
