/*
 * Created with @iobroker/create-adapter v2.3.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from '@iobroker/adapter-core';
import * as dgram from 'node:dgram';
import { componentToHex, hexToRgb } from './tools/hexTool.js';

// Load your modules here, e.g.:

const LOCAL_PORT = 4002;
const SEND_SCAN_PORT = 4001;
const CONTROL_PORT = 4003;
const M_CAST = '239.255.255.250';

const socket = dgram.createSocket({ type: 'udp4' });

const scanMessage = { msg: { cmd: 'scan', data: { account_topic: 'reserved' } } };
const requestStatusMessage = { msg: { cmd: 'devStatus', data: {} } };

let searchInterval: ioBroker.Interval;
let refreshInterval: ioBroker.Interval;

const devices: { [ip: string]: string } = {};

const loggedDevices = [] as string[];

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
        await this.setObjectNotExists('info.connection', {
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
        socket.on('message', this.onUdpMessage.bind(this));
        socket.on('error', error => {
            this.log.error(`server bind error : ${error.message}`);
            this.setStateChanged('info.connection', { val: false, ack: true });
        });

        if (this.config.extendedLogging) {
            this.log.debug('running with extended logging');
        }

        socket.bind({ address: this.config.interface, port: LOCAL_PORT }, this.serverBound.bind(this));
        this.subscribeStates('*.devStatus.*');
    }

    /**
     * handles when udp socket is up
     * configure multicast membership
     * start periodic scan for devices
     */
    private serverBound(): void {
        socket.setBroadcast(true);
        socket.setMulticastTTL(128);
        socket.setMulticastInterface(this.config.interface);
        socket.addMembership(M_CAST);
        this.setStateChanged('info.connection', { val: true, ack: true });
        this.log.debug(`UDP listening on ${socket.address().address}:${socket.address().port}`);

        const deviceSearchInterval = this.setInterval(this.sendScan.bind(this), this.config.searchInterval * 1000);
        if (deviceSearchInterval) {
            searchInterval = deviceSearchInterval;
        }

        const deviceRefreshInterval = this.setInterval(
            this.refreshAllDevices.bind(this),
            this.config.deviceStatusRefreshInterval * 1000,
        );
        if (deviceRefreshInterval) {
            refreshInterval = deviceRefreshInterval;
        }
    }

    /**
     * handle icoming messages on the udp socket
     *
     * @param message the message itself
     * @param remote the sender of the message
     */
    private async onUdpMessage(message: Buffer, remote: dgram.RemoteInfo): Promise<void> {
        const messageObject = JSON.parse(message.toString());
        switch (messageObject.msg.cmd) {
            case 'scan':
                for (const key of Object.keys(messageObject.msg.data)) {
                    if (key != 'device') {
                        const deviceName = messageObject.msg.data.device.replace(this.FORBIDDEN_CHARS, '_');
                        devices[remote.address] = deviceName;
                        await this.setObjectNotExists(deviceName, {
                            type: 'device',
                            common: {
                                name: messageObject.msg.data.sku,
                                role: 'group',
                            },
                            native: {},
                        });
                        await this.setObjectNotExists(`${deviceName}.deviceInfo.${key}`, {
                            type: 'state',
                            common: {
                                name: getDatapointDescription(key),
                                type: 'string',
                                role: 'state',
                                read: true,
                                write: false,
                            },
                            native: {},
                        });
                        await this.setState(`${deviceName}.deviceInfo.${key}`, {
                            val: messageObject.msg.data[key],
                            ack: true,
                        });
                    }
                }
                break;
            case 'devStatus': {
                const sendingDevice = devices[remote.address];
                if (sendingDevice) {
                    // const devices = await this.getStatesAsync(`${this.name}.${this.instance}.*.deviceInfo.ip`);
                    if (this.config.extendedLogging && !loggedDevices.includes(remote.address.toString())) {
                        this.log.info(`deivce status message data: ${JSON.stringify(messageObject)}`);
                        loggedDevices.push(remote.address.toString());
                    }
                    const devStatusMessageObject = JSON.parse(message.toString());
                    await this.setObjectNotExists(`${sendingDevice}.devStatus.onOff`, {
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
                    await this.setState(`${sendingDevice}.devStatus.onOff`, {
                        val: devStatusMessageObject.msg.data.onOff == 1,
                        ack: true,
                    });
                    await this.setObjectNotExists(`${sendingDevice}.devStatus.brightness`, {
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
                    await this.setState(`${sendingDevice}.devStatus.brightness`, {
                        val: devStatusMessageObject.msg.data.brightness,
                        ack: true,
                    });
                    await this.setObjectNotExists(`${sendingDevice}.devStatus.color`, {
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
                    await this.setState(`${sendingDevice}.devStatus.color`, {
                        val: `#${componentToHex(devStatusMessageObject.msg.data.color.r)}${componentToHex(
                            devStatusMessageObject.msg.data.color.g,
                        )}${componentToHex(devStatusMessageObject.msg.data.color.b)}`,
                        ack: true,
                    });
                    await this.setObjectNotExists(`${sendingDevice}.devStatus.colorTemInKelvin`, {
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
                    await this.setState(`${sendingDevice}.devStatus.colorTemInKelvin`, {
                        val: devStatusMessageObject.msg.data.colorTemInKelvin,
                        ack: true,
                    });
                }
                break;
            }
            default:
                this.log.error(`message from: ${remote.address}:${remote.port} - ${message.toString()}`);
        }
    }

    private refreshAllDevices(): void {
        for (const ip in devices) {
            this.requestDeviceStatus(ip);
        }
    }

    /**
     * sends the device status request to one specific device
     *
     * @param receiver the ip ( / hsotname ) of the device that should be queried
     */
    private requestDeviceStatus(receiver: string): void {
        const requestDeviceStatusBuffer = Buffer.from(JSON.stringify(requestStatusMessage));
        socket.send(requestDeviceStatusBuffer, 0, requestDeviceStatusBuffer.length, CONTROL_PORT, receiver);
    }

    /**
     * send the scan message to the udp multicast address
     */
    private sendScan(): void {
        const scanMessageBuffer = Buffer.from(JSON.stringify(scanMessage));
        socket.send(scanMessageBuffer, 0, scanMessageBuffer.length, SEND_SCAN_PORT, M_CAST);
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     *
     * @param callback - To be executed when this method finished
     */
    private async onUnload(callback: () => void): Promise<void> {
        try {
            this.clearInterval(searchInterval);
            this.clearInterval(refreshInterval);
            socket.close();
            await this.setState('info.connection', { val: false, ack: true });
            callback();
        } catch (e: any) {
            this.log.error(e.message);
            callback();
        }
    }

    /**
     * Is called if a subscribed state changes
     *
     * @param id - The id of the changed datapoint
     * @param state - the state of the datapoint
     */
    private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
        if (state && !state.ack) {
            const ipOfDevice = await this.getStateAsync(`${id.split('.')[2]}.deviceInfo.ip`);
            if (ipOfDevice) {
                const receiver = ipOfDevice.val?.toString();
                switch (id.split('.')[4]) {
                    case 'onOff': {
                        const turnMessage = { msg: { cmd: 'turn', data: { value: state.val ? 1 : 0 } } };
                        const turnMessageBuffer = Buffer.from(JSON.stringify(turnMessage));
                        socket.send(turnMessageBuffer, 0, turnMessageBuffer.length, CONTROL_PORT, receiver);
                        break;
                    }
                    case 'brightness': {
                        const brightnessMessage = { msg: { cmd: 'brightness', data: { value: state.val } } };
                        const brightnessMessageBuffer = Buffer.from(JSON.stringify(brightnessMessage));
                        socket.send(brightnessMessageBuffer, 0, brightnessMessageBuffer.length, CONTROL_PORT, receiver);
                        break;
                    }
                    case 'colorTemInKelvin': {
                        const colorTempMessageBuffer = Buffer.from(
                            JSON.stringify({
                                msg: {
                                    cmd: 'colorwc',
                                    data: { color: { r: '0', g: '0', b: '0' }, colorTemInKelvin: state.val },
                                },
                            }),
                        );
                        socket.send(colorTempMessageBuffer, 0, colorTempMessageBuffer.length, CONTROL_PORT, receiver);
                        break;
                    }
                    case 'color': {
                        const colorValue = state.val?.toString();
                        if (colorValue) {
                            const rgb = hexToRgb(colorValue);
                            const colorMessage = { msg: { cmd: 'colorwc', data: { color: rgb } } };
                            const colorMessageBuffer = Buffer.from(JSON.stringify(colorMessage));
                            socket.send(colorMessageBuffer, 0, colorMessageBuffer.length, CONTROL_PORT, receiver);
                        }
                        break;
                    }
                }
            } else {
                this.log.error('device not found');
            }
        }
    }
}
// Use a function to export the constructor
export function createInstance(options: Partial<utils.AdapterOptions<undefined, undefined>> | undefined): GoveeLocal {
    return new GoveeLocal(options);
}

// Directly start the instance if the module is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    // Run the instance directly
    new GoveeLocal();
}

/**
 * This method returns the description for device information datapoints
 * to unbloat the upper methods.
 * tanslations would be great here
 *
 * @param name the name of the parameter retrieved from the device
 * @returns the description, that should be set to the datapoint
 */
function getDatapointDescription(name: string): string {
    switch (name) {
        case 'model':
            return 'Specific model of the Lamp';
        case 'ip':
            return 'IP address of the Lamp';
        case 'bleVersionHard':
            return 'Bluetooth Low Energy Hardware Version';
        case 'bleVersionSoft':
            return 'Bluetooth Low Energy Software Version';
        case 'wifiVersionHard':
            return 'WiFi Hardware Version';
        case 'wifiVersionSoft':
            return 'WiFi Software Version';
        default:
            return '';
    }
}
