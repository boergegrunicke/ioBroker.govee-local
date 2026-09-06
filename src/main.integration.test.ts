/**
 * Integration tests for GoveeLocal adapter.
 * Tests the integration between the adapter and GoveeService.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { GoveeService } from './lib/goveeService';
import { GoveeLocal } from './main';

describe('GoveeLocal Integration Tests', () => {
    let adapter: GoveeLocal;
    let mockLog: any;
    let mockConfig: any;

    beforeEach(() => {
        mockLog = {
            debug: sinon.spy(),
            info: sinon.spy(),
            error: sinon.spy(),
        };

        mockConfig = {
            interface: '127.0.0.1',
            searchInterval: 10,
            deviceStatusRefreshInterval: 30,
            extendedLogging: false,
        };

        adapter = new GoveeLocal({});
        (adapter as any).log = mockLog;
        (adapter as any).config = mockConfig;
    });

    afterEach(() => {
        if ((adapter as any).goveeService) {
            (adapter as any).goveeService.stop();
        }
    });

    it('should initialize GoveeService with correct options', () => {
        // Mock required adapter methods
        (adapter as any).setObjectNotExists = sinon.stub();
        (adapter as any).subscribeStates = sinon.stub();

        // Trigger onReady
        void (adapter as any).onReady();

        expect((adapter as any).goveeService).to.be.instanceOf(GoveeService);
        const options = (adapter as any).goveeService.options;
        expect(options.interface).to.equal('127.0.0.1');
        expect(options.searchInterval).to.equal(10);
        expect(options.deviceStatusRefreshInterval).to.equal(30);
        expect(options.extendedLogging).to.equal(false);
    });

    it('should handle device discovery events', async () => {
        // Mock adapter methods
        const setObjectStub = sinon.stub();
        const updateStateStub = sinon.stub();
        (adapter as any).setObjectNotExistsAsync = setObjectStub;
        (adapter as any).updateStateAsync = updateStateStub;
        (adapter as any).setObjectNotExists = sinon.stub();
        (adapter as any).subscribeStates = sinon.stub();

        // Initialize service
        await (adapter as any).onReady();

        // Simulate device discovery event
        const discoveryEvent = {
            ip: '192.168.1.100',
            deviceName: 'TestLamp',
        };

        await (adapter as any).handleDeviceDiscovered(discoveryEvent);

        // Verify device structure was created
        expect(setObjectStub.calledWith('TestLamp')).to.be.true;
        expect(setObjectStub.calledWith('TestLamp.deviceInfo')).to.be.true;
        expect(setObjectStub.calledWith('TestLamp.deviceInfo.ip')).to.be.true;
        expect(setObjectStub.calledWith('TestLamp.devStatus')).to.be.true;
        expect(updateStateStub.calledWith('TestLamp.deviceInfo.ip', '192.168.1.100')).to.be.true;
    });

    it('should handle device status update events', async () => {
        // Mock adapter methods
        const setObjectStub = sinon.stub();
        const updateStateStub = sinon.stub();
        (adapter as any).setObjectNotExistsAsync = setObjectStub;
        (adapter as any).updateStateAsync = updateStateStub;

        // Simulate device status update event
        const statusEvent = {
            deviceName: 'TestLamp',
            ip: '192.168.1.100',
            status: {
                onOff: true,
                brightness: 80,
                color: '#FF0000',
                colorTemInKelvin: 3000,
            },
        };

        await (adapter as any).handleDeviceStatusUpdate(statusEvent);

        // Verify all states were created and updated
        expect(setObjectStub.calledWith('TestLamp.devStatus.onOff')).to.be.true;
        expect(setObjectStub.calledWith('TestLamp.devStatus.brightness')).to.be.true;
        expect(setObjectStub.calledWith('TestLamp.devStatus.color')).to.be.true;
        expect(setObjectStub.calledWith('TestLamp.devStatus.colorTemInKelvin')).to.be.true;

        expect(updateStateStub.calledWith('TestLamp.devStatus.onOff', true)).to.be.true;
        expect(updateStateStub.calledWith('TestLamp.devStatus.brightness', 80)).to.be.true;
        expect(updateStateStub.calledWith('TestLamp.devStatus.color', '#FF0000')).to.be.true;
        expect(updateStateStub.calledWith('TestLamp.devStatus.colorTemInKelvin', 3000)).to.be.true;

        // Verify HomeKit-compatible hue/saturation and mired color temperature were derived
        expect(setObjectStub.calledWith('TestLamp.devStatus.hue')).to.be.true;
        expect(setObjectStub.calledWith('TestLamp.devStatus.saturation')).to.be.true;
        expect(setObjectStub.calledWith('TestLamp.devStatus.colorTemperature')).to.be.true;
        expect(updateStateStub.calledWith('TestLamp.devStatus.hue', 0)).to.be.true;
        expect(updateStateStub.calledWith('TestLamp.devStatus.saturation', 100)).to.be.true;
        expect(updateStateStub.calledWith('TestLamp.devStatus.colorTemperature', 333)).to.be.true;
    });

    it('should skip mired color temperature update while device is in RGB color mode', async () => {
        const setObjectStub = sinon.stub();
        const updateStateStub = sinon.stub();
        (adapter as any).setObjectNotExistsAsync = setObjectStub;
        (adapter as any).updateStateAsync = updateStateStub;

        const statusEvent = {
            deviceName: 'TestLamp',
            ip: '192.168.1.100',
            status: {
                onOff: true,
                brightness: 80,
                color: '#00FF00',
                colorTemInKelvin: 0,
            },
        };

        await (adapter as any).handleDeviceStatusUpdate(statusEvent);

        // The object is still created so the state exists ...
        expect(setObjectStub.calledWith('TestLamp.devStatus.colorTemperature')).to.be.true;
        // ... but no meaningless mired value is pushed while colorTemInKelvin is 0
        expect(updateStateStub.calledWith('TestLamp.devStatus.colorTemperature')).to.be.false;
    });

    it('should handle state changes and forward to service', async () => {
        // Mock adapter methods
        (adapter as any).setObjectNotExists = sinon.stub();
        (adapter as any).subscribeStates = sinon.stub();
        (adapter as any).getStateAsync = sinon.stub().resolves({ val: '192.168.1.100' });

        // Initialize service
        await (adapter as any).onReady();

        // Mock the service method
        const handleStateChangeSpy = sinon.spy((adapter as any).goveeService, 'handleStateChange');

        // Simulate state change
        const stateChange = {
            val: true,
            ack: false,
        };

        await (adapter as any).onStateChange('govee-local.0.TestLamp.devStatus.onOff', stateChange);

        expect(handleStateChangeSpy.calledOnce).to.be.true;
        expect(handleStateChangeSpy.getCall(0).args[0]).to.equal('govee-local.0.TestLamp.devStatus.onOff');
        expect(handleStateChangeSpy.getCall(0).args[1]).to.deep.equal(stateChange);
        expect(handleStateChangeSpy.getCall(0).args[2]).to.equal('192.168.1.100');
    });

    it('should forward HomeKit-style color temperature (mired) changes to the service unmodified', async () => {
        (adapter as any).setObjectNotExists = sinon.stub();
        (adapter as any).subscribeStates = sinon.stub();
        (adapter as any).getStateAsync = sinon.stub().resolves({ val: '192.168.1.100' });

        await (adapter as any).onReady();

        const handleStateChangeSpy = sinon.spy((adapter as any).goveeService, 'handleStateChange');

        const stateChange = { val: 200, ack: false };
        await (adapter as any).onStateChange('govee-local.0.TestLamp.devStatus.colorTemperature', stateChange);

        expect(handleStateChangeSpy.calledOnce).to.be.true;
        expect(handleStateChangeSpy.getCall(0).args[0]).to.equal('govee-local.0.TestLamp.devStatus.colorTemperature');
    });

    it('should combine a hue change with the stored saturation and send an RGB color command', async () => {
        (adapter as any).setObjectNotExists = sinon.stub();
        (adapter as any).subscribeStates = sinon.stub();
        (adapter as any).getStateAsync = sinon.stub().callsFake((id: string) => {
            if (id === 'TestLamp.deviceInfo.ip') {
                return Promise.resolve({ val: '192.168.1.100' });
            }
            if (id === 'TestLamp.devStatus.saturation') {
                return Promise.resolve({ val: 100 });
            }
            return Promise.resolve(undefined);
        });

        await (adapter as any).onReady();

        const sendColorCommandSpy = sinon.spy((adapter as any).goveeService, 'sendColorCommand');

        const stateChange = { val: 120, ack: false };
        await (adapter as any).onStateChange('govee-local.0.TestLamp.devStatus.hue', stateChange);

        expect(sendColorCommandSpy.calledOnceWith('192.168.1.100', '#00FF00')).to.be.true;
    });

    it('should combine a saturation change with the stored hue and send an RGB color command', async () => {
        (adapter as any).setObjectNotExists = sinon.stub();
        (adapter as any).subscribeStates = sinon.stub();
        (adapter as any).getStateAsync = sinon.stub().callsFake((id: string) => {
            if (id === 'TestLamp.deviceInfo.ip') {
                return Promise.resolve({ val: '192.168.1.100' });
            }
            if (id === 'TestLamp.devStatus.hue') {
                return Promise.resolve({ val: 240 });
            }
            return Promise.resolve(undefined);
        });

        await (adapter as any).onReady();

        const sendColorCommandSpy = sinon.spy((adapter as any).goveeService, 'sendColorCommand');

        const stateChange = { val: 100, ack: false };
        await (adapter as any).onStateChange('govee-local.0.TestLamp.devStatus.saturation', stateChange);

        expect(sendColorCommandSpy.calledOnceWith('192.168.1.100', '#0000FF')).to.be.true;
    });

    it('should report a washed-out device color as partially saturated', async () => {
        const updateStateStub = sinon.stub();
        (adapter as any).setObjectNotExistsAsync = sinon.stub();
        (adapter as any).updateStateAsync = updateStateStub;

        // A pale pink. Reporting this as saturation 100 (which the HSL model does, because
        // the paleness lives in its lightness component) would show up as a fully saturated
        // red in HomeKit instead of pink.
        await (adapter as any).handleDeviceStatusUpdate({
            deviceName: 'TestLamp',
            ip: '192.168.1.100',
            status: { onOff: true, brightness: 80, color: '#FF8080', colorTemInKelvin: 0 },
        });

        expect(updateStateStub.calledWith('TestLamp.devStatus.hue', 0)).to.be.true;
        expect(updateStateStub.calledWith('TestLamp.devStatus.saturation', 50)).to.be.true;
    });

    it('should report a dimmed but pure device color as fully saturated', async () => {
        const updateStateStub = sinon.stub();
        (adapter as any).setObjectNotExistsAsync = sinon.stub();
        (adapter as any).updateStateAsync = updateStateStub;

        await (adapter as any).handleDeviceStatusUpdate({
            deviceName: 'TestLamp',
            ip: '192.168.1.100',
            status: { onOff: true, brightness: 80, color: '#800000', colorTemInKelvin: 0 },
        });

        expect(updateStateStub.calledWith('TestLamp.devStatus.hue', 0)).to.be.true;
        expect(updateStateStub.calledWith('TestLamp.devStatus.saturation', 100)).to.be.true;
    });

    it('should send full white when saturation is set to 0, not a dimmed gray', async () => {
        (adapter as any).setObjectNotExists = sinon.stub();
        (adapter as any).subscribeStates = sinon.stub();
        (adapter as any).getStateAsync = sinon.stub().callsFake((id: string) => {
            if (id === 'TestLamp.deviceInfo.ip') {
                return Promise.resolve({ val: '192.168.1.100' });
            }
            if (id === 'TestLamp.devStatus.hue') {
                return Promise.resolve({ val: 30 });
            }
            return Promise.resolve(undefined);
        });

        await (adapter as any).onReady();
        const sendColorCommandSpy = sinon.spy((adapter as any).goveeService, 'sendColorCommand');

        await (adapter as any).onStateChange('govee-local.0.TestLamp.devStatus.saturation', { val: 0, ack: false });

        // Output level belongs to the brightness state, so an unsaturated color still goes
        // out at full scale rather than as rgb(128, 128, 128).
        expect(sendColorCommandSpy.calledOnceWith('192.168.1.100', '#FFFFFF')).to.be.true;
    });

    it('should send a half-saturated color at full scale', async () => {
        (adapter as any).setObjectNotExists = sinon.stub();
        (adapter as any).subscribeStates = sinon.stub();
        (adapter as any).getStateAsync = sinon.stub().callsFake((id: string) => {
            if (id === 'TestLamp.deviceInfo.ip') {
                return Promise.resolve({ val: '192.168.1.100' });
            }
            if (id === 'TestLamp.devStatus.saturation') {
                return Promise.resolve({ val: 50 });
            }
            return Promise.resolve(undefined);
        });

        await (adapter as any).onReady();
        const sendColorCommandSpy = sinon.spy((adapter as any).goveeService, 'sendColorCommand');

        await (adapter as any).onStateChange('govee-local.0.TestLamp.devStatus.hue', { val: 0, ack: false });

        expect(sendColorCommandSpy.calledOnceWith('192.168.1.100', '#FF8080')).to.be.true;
    });

    it('should round trip a color set via hue/saturation back to the same states', async () => {
        (adapter as any).setObjectNotExists = sinon.stub();
        (adapter as any).subscribeStates = sinon.stub();
        (adapter as any).getStateAsync = sinon.stub().callsFake((id: string) => {
            if (id === 'TestLamp.deviceInfo.ip') {
                return Promise.resolve({ val: '192.168.1.100' });
            }
            if (id === 'TestLamp.devStatus.saturation') {
                return Promise.resolve({ val: 60 });
            }
            return Promise.resolve(undefined);
        });

        await (adapter as any).onReady();
        const sendColorCommandSpy = sinon.spy((adapter as any).goveeService, 'sendColorCommand');

        await (adapter as any).onStateChange('govee-local.0.TestLamp.devStatus.hue', { val: 210, ack: false });

        // Feed the color that was sent to the lamp back in as the device's reported status,
        // the way a real device echoes it, and check the states land where they started.
        const sentColor = sendColorCommandSpy.getCall(0).args[1];
        const updateStateStub = sinon.stub();
        (adapter as any).setObjectNotExistsAsync = sinon.stub();
        (adapter as any).updateStateAsync = updateStateStub;

        await (adapter as any).handleDeviceStatusUpdate({
            deviceName: 'TestLamp',
            ip: '192.168.1.100',
            status: { onOff: true, brightness: 80, color: sentColor, colorTemInKelvin: 0 },
        });

        expect(updateStateStub.calledWith('TestLamp.devStatus.hue', 210)).to.be.true;
        expect(updateStateStub.calledWith('TestLamp.devStatus.saturation', 60)).to.be.true;
    });

    it('should not send a color command when hue or saturation is not a number', async () => {
        (adapter as any).setObjectNotExists = sinon.stub();
        (adapter as any).subscribeStates = sinon.stub();
        (adapter as any).getStateAsync = sinon.stub().callsFake((id: string) => {
            if (id === 'TestLamp.deviceInfo.ip') {
                return Promise.resolve({ val: '192.168.1.100' });
            }
            return Promise.resolve({ val: 100 });
        });

        await (adapter as any).onReady();
        const sendColorCommandSpy = sinon.spy((adapter as any).goveeService, 'sendColorCommand');

        await (adapter as any).onStateChange('govee-local.0.TestLamp.devStatus.hue', {
            val: 'not-a-number',
            ack: false,
        });

        expect(sendColorCommandSpy.called).to.be.false;
        expect(mockLog.error.called).to.be.true;
    });

    it('should not treat hue or saturation of another adapter path as a color change', async () => {
        (adapter as any).setObjectNotExists = sinon.stub();
        (adapter as any).subscribeStates = sinon.stub();
        (adapter as any).getStateAsync = sinon.stub().resolves({ val: '192.168.1.100' });

        await (adapter as any).onReady();
        const handleStateChangeSpy = sinon.spy((adapter as any).goveeService, 'handleStateChange');
        const sendColorCommandSpy = sinon.spy((adapter as any).goveeService, 'sendColorCommand');

        await (adapter as any).onStateChange('govee-local.0.TestLamp.devStatus.brightness', { val: 50, ack: false });

        expect(sendColorCommandSpy.called).to.be.false;
        expect(handleStateChangeSpy.calledOnce).to.be.true;
    });

    it('should ignore acknowledged state changes', async () => {
        (adapter as any).setObjectNotExists = sinon.stub();
        (adapter as any).subscribeStates = sinon.stub();
        (adapter as any).getStateAsync = sinon.stub().resolves({ val: '192.168.1.100' });

        await (adapter as any).onReady();
        const sendColorCommandSpy = sinon.spy((adapter as any).goveeService, 'sendColorCommand');

        // Values echoed back from the device carry ack = true and must not be sent again,
        // otherwise every status refresh would bounce a command back at the lamp.
        await (adapter as any).onStateChange('govee-local.0.TestLamp.devStatus.hue', { val: 120, ack: true });

        expect(sendColorCommandSpy.called).to.be.false;
    });

    it('should clean up service on unload', () => {
        // Initialize service
        (adapter as any).goveeService = {
            removeAllListeners: sinon.spy(),
            stop: sinon.spy(),
        };
        (adapter as any).updateStateAsync = sinon.stub();

        const callback = sinon.spy();
        (adapter as any).onUnload(callback);

        expect((adapter as any).goveeService.removeAllListeners.calledOnce).to.be.true;
        expect((adapter as any).goveeService.stop.calledOnce).to.be.true;
        expect(callback.calledOnce).to.be.true;
    });
});
