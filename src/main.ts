/*
 * Created with @iobroker/create-adapter v2.3.0
 */

import * as utils from '@iobroker/adapter-core';
import { GoveeService, type DeviceDiscoveryEvent, type DeviceStatusEvent } from './lib/goveeService';
import { hslToRgb, kelvinToMired, rgbToHsl } from './lib/tools/colorConversion';
import { componentToHex, hexToRgb } from './lib/tools/hexTool';

/**
 * Main adapter class for ioBroker Govee Local.
 * Handles initialization, event wiring, and communication with GoveeService.
 */
export class GoveeLocal extends utils.Adapter {
    /**
     * Lightness used when converting a hue/saturation change back to RGB.
     * 50 is the midpoint of the HSL model where colors reach full saturation; overall
     * brightness is controlled separately via the device's own brightness command.
     */
    private static readonly FULL_COLOR_LIGHTNESS = 50;
    /** Instance of GoveeService for device communication */
    private goveeService!: GoveeService;
    /**
     * Adapter constructor. Registers lifecycle event handlers.
     *
     * @param options Optional adapter options to override defaults.
     */
    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'govee-local',
        });
        // Register event handlers for adapter lifecycle
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // Uncomment if you want to handle object changes or messages:
        // this.on('objectChange', this.onObjectChange.bind(this));
        // this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Called when databases are connected and adapter received configuration.
     * Initializes GoveeService and sets up event listeners for device events.
     */
    private onReady(): void {
        // Create connection indicator state if it doesn't exist
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

        // Create state for discovered devices
        void this.setObjectNotExists('info.discoveredDevices', {
            type: 'state',
            common: {
                name: 'List of discovered devices',
                type: 'string',
                role: 'json',
                read: true,
                write: false,
                desc: 'JSON object with IP addresses and device names of all discovered devices',
            },
            native: {},
        });

        // Initialize GoveeService with adapter config and logger
        this.goveeService = new GoveeService({
            interface: this.config.interface,
            searchInterval: this.config.searchInterval,
            deviceStatusRefreshInterval: this.config.deviceStatusRefreshInterval,
            extendedLogging: this.config.extendedLogging,
            forbiddenChars: this.FORBIDDEN_CHARS,
            manualIpAddresses: this.config.manualIpTable,
            scanMode: this.config.scanMode,
            setInterval: (callback: () => void, ms: number) => this.setInterval(callback, ms),
            clearInterval: (timeout: unknown) => this.clearInterval(timeout as ioBroker.Interval | undefined),
            logger: {
                debug: msg => this.log.debug(msg),
                info: msg => this.log.info(msg),
                error: msg => this.log.error(msg),
            },
        });

        // Listen for device discovery and status update events
        this.goveeService.on('deviceDiscovered', data => {
            this.handleDeviceDiscovered(data).catch((err: unknown) => {
                this.log.error(`Error handling device discovery: ${err instanceof Error ? err.message : String(err)}`);
            });
        });

        this.goveeService.on('deviceStatusUpdate', data => {
            this.handleDeviceStatusUpdate(data).catch((err: unknown) => {
                this.log.error(
                    `Error handling device status update: ${err instanceof Error ? err.message : String(err)}`,
                );
            });
        });

        // Listen for serviceStarted event to set connection state to true
        this.goveeService.on('serviceStarted', () => {
            void this.setState('info.connection', { val: true, ack: true });
        });

        // Start device discovery and status polling
        this.goveeService.start();

        if (this.config.extendedLogging) {
            this.log.debug('running with extended logging');
        }

        // Subscribe to all device status state changes
        this.subscribeStates('*.devStatus.*');
    }

    /**
     * Called if a subscribed state changes (e.g. user toggles a switch in ioBroker UI).
     * Forwards the change to the GoveeService for device communication.
     *
     * @param id The ID of the changed state.
     * @param state The new state object or null/undefined.
     */
    private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
        if (state && !state.ack) {
            const deviceName = id.split('.')[2];
            const stateKey = id.split('.')[4];
            // Extract device name from state ID and get its IP address
            const ipOfDevice = await this.getStateAsync(`${deviceName}.deviceInfo.ip`);
            const receiver = ipOfDevice?.val?.toString();
            if (typeof receiver === 'string') {
                if (stateKey === 'hue' || stateKey === 'saturation') {
                    await this.handleHueSaturationChange(deviceName, stateKey, state, receiver);
                } else {
                    // Forward the state change to the GoveeService
                    this.goveeService.handleStateChange(id, state, receiver);
                }
            } else {
                this.log.error('device not found or IP is not a string');
            }
        }
    }

    /**
     * Handles a hue or saturation change by combining it with the sibling state and
     * sending the resulting color as an RGB command. Lightness is fixed at a saturated
     * midpoint; overall brightness is controlled separately via the brightness state.
     *
     * @param deviceName The sanitized device name.
     * @param changedKey Which of the two states triggered the change.
     * @param state The new state value.
     * @param receiver The device IP address.
     */
    private async handleHueSaturationChange(
        deviceName: string,
        changedKey: 'hue' | 'saturation',
        state: ioBroker.State,
        receiver: string,
    ): Promise<void> {
        const otherKey = changedKey === 'hue' ? 'saturation' : 'hue';
        const otherState = await this.getStateAsync(`${deviceName}.devStatus.${otherKey}`);
        const hue = Number(changedKey === 'hue' ? state.val : (otherState?.val ?? 0));
        const saturation = Number(changedKey === 'saturation' ? state.val : (otherState?.val ?? 0));

        const { r, g, b } = hslToRgb(hue, saturation, GoveeLocal.FULL_COLOR_LIGHTNESS);
        this.goveeService.sendColorCommand(receiver, `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`);
    }

    /**
     * Called when the adapter shuts down. Cleans up resources and stops services.
     *
     * @param callback Callback function after unload process.
     */
    private onUnload(callback: () => void): void {
        try {
            if (this.goveeService) {
                this.goveeService.removeAllListeners();
                this.goveeService.stop();
            }
            // Set connection state to false
            void this.updateStateAsync('info.connection', false).catch((err: unknown) => {
                this.log.error(
                    `Failed to update connection state during unload: ${err instanceof Error ? err.message : String(err)}`,
                );
            });
            callback();
        } catch (e: unknown) {
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
    private async updateStateAsync(fullName: string, state: any, acknowledged = true): Promise<void> {
        const currentState = await this.getStateAsync(fullName);
        if (currentState?.val !== state) {
            void this.setState(fullName, {
                val: state,
                ack: acknowledged,
            });
        }
    }

    /**
     * Handles device discovery event from GoveeService.
     * Creates all necessary objects and states for the new device.
     *
     * @param event The device discovery event data.
     */
    private async handleDeviceDiscovered(event: DeviceDiscoveryEvent): Promise<void> {
        const { ip, deviceName, deviceModel } = event;

        // Create device folder
        await this.setObjectNotExistsAsync(deviceName, {
            type: 'device',
            common: {
                name: deviceModel,
                role: 'group',
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

        // Update the list of discovered devices
        await this.updateDiscoveredDevicesList();
    }

    /**
     * Updates the info.discoveredDevices state with the current list of all discovered devices.
     */
    private async updateDiscoveredDevicesList(): Promise<void> {
        const devices = this.goveeService.getDevices();
        await this.setState('info.discoveredDevices', {
            val: JSON.stringify(devices, null, 2),
            ack: true,
        });
    }

    /**
     * Handles device status update event from GoveeService.
     * Creates and updates all relevant states for the device.
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

        // Create and update hue state (HomeKit compatible)
        await this.setObjectNotExistsAsync(`${deviceName}.devStatus.hue`, {
            type: 'state',
            common: {
                name: 'Hue of the lamp (HomeKit compatible)',
                type: 'number',
                role: 'level.color.hue',
                unit: '°',
                min: 0,
                max: 360,
                read: true,
                write: true,
            },
            native: {},
        });

        // Create and update saturation state (HomeKit compatible)
        await this.setObjectNotExistsAsync(`${deviceName}.devStatus.saturation`, {
            type: 'state',
            common: {
                name: 'Saturation of the lamp (HomeKit compatible)',
                type: 'number',
                role: 'level.color.saturation',
                unit: '%',
                min: 0,
                max: 100,
                read: true,
                write: true,
            },
            native: {},
        });

        const { hue, saturation } = rgbToHsl(hexToRgb(status.color));
        await this.updateStateAsync(`${deviceName}.devStatus.hue`, hue);
        await this.updateStateAsync(`${deviceName}.devStatus.saturation`, saturation);

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

        // Create and update color temperature in mired (HomeKit compatible)
        await this.setObjectNotExistsAsync(`${deviceName}.devStatus.colorTemperature`, {
            type: 'state',
            common: {
                name: 'Color temperature of the lamp in mired (HomeKit compatible)',
                type: 'number',
                role: 'level.color.temperature',
                unit: 'mired',
                read: true,
                write: true,
            },
            native: {},
        });
        // Govee devices report colorTemInKelvin as 0 while in RGB color mode; a mired value
        // is only meaningful while the lamp is actually in white/temperature mode.
        if (status.colorTemInKelvin > 0) {
            await this.updateStateAsync(
                `${deviceName}.devStatus.colorTemperature`,
                kelvinToMired(status.colorTemInKelvin),
            );
        }
    }
}

// Export factory function for ioBroker or start instance directly
if (require.main !== module) {
    // Export factory function for ioBroker, also available as ES6 export
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new GoveeLocal(options);
} else {
    // Otherwise start the instance directly
    (() => new GoveeLocal())();
}
