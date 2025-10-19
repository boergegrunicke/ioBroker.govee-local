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
		const spy = sinon.spy(GoveeService.prototype, 'constructor' as any);

		// Mock required adapter methods
		(adapter as any).setObjectNotExists = sinon.stub();
		(adapter as any).subscribeStates = sinon.stub();

		// Trigger onReady
		void (adapter as any).onReady();

		expect(spy.called).to.be.true;
		const callArgs = spy.getCall(0).args[0];
		expect(callArgs.interface).to.equal('127.0.0.1');
		expect(callArgs.searchInterval).to.equal(10);
		expect(callArgs.deviceStatusRefreshInterval).to.equal(30);
		expect(callArgs.extendedLogging).to.equal(false);

		spy.restore();
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
