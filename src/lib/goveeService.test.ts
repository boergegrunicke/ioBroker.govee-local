import { expect } from 'chai';
import sinon from 'sinon';
import { GoveeService } from '../lib/goveeService';

describe('GoveeService scanMode logic', () => {
	let service: GoveeService;
	let logger: any;
	let options: any;

	beforeEach(() => {
		logger = {
			debug: sinon.spy(),
			info: sinon.spy(),
			error: sinon.spy(),
		};
		options = {
			interface: '127.0.0.1',
			searchInterval: 60,
			deviceStatusRefreshInterval: 60,
			logger,
			manualIpAddresses: ['192.168.1.50'],
		};
	});

	afterEach(() => {
		if (service) {
			service.stop();
		}
	});

	it('should not start scan or interval if scanMode is never, but add manual devices', () => {
		options.scanMode = 'never';
		service = new GoveeService(options);
		const sendScanSpy = sinon.spy(service, 'sendScan');
		sinon.stub((service as any).socket, 'bind').callsFake((opts: any, cb: any) => cb());
		sinon.stub((service as any).socket, 'setBroadcast');
		sinon.stub((service as any).socket, 'setMulticastTTL');
		sinon.stub((service as any).socket, 'setMulticastInterface');
		sinon.stub((service as any).socket, 'addMembership');
		sinon.stub((service as any).socket, 'address').returns({ address: '127.0.0.1', port: 4002 });
		sinon.stub((service as any).socket, 'send');
		service.start();
		// No scan should be triggered
		sinon.assert.notCalled(sendScanSpy);
		// Manual device should be present
		const devices = service.getDevices();
		expect(devices['192.168.1.50']).to.equal('Manual_192_168_1_50');
	});

	it('should call sendScan once if scanMode is once', () => {
		options.scanMode = 'once';
		service = new GoveeService(options);
		const sendScanSpy = sinon.spy(service, 'sendScan');
		sinon.stub((service as any).socket, 'bind').callsFake((opts: any, cb: any) => cb());
		sinon.stub((service as any).socket, 'setBroadcast');
		sinon.stub((service as any).socket, 'setMulticastTTL');
		sinon.stub((service as any).socket, 'setMulticastInterface');
		sinon.stub((service as any).socket, 'addMembership');
		sinon.stub((service as any).socket, 'address').returns({ address: '127.0.0.1', port: 4002 });
		sinon.stub((service as any).socket, 'send');
		service.start();
		sinon.assert.calledOnce(sendScanSpy);
	});

	it('should start scan interval if scanMode is interval', (done) => {
		options.scanMode = 'interval';
		options.searchInterval = 0.01; // very short for test
		service = new GoveeService(options);
		const sendScanSpy = sinon.spy(service, 'sendScan');
		sinon.stub((service as any).socket, 'bind').callsFake((opts: any, cb: any) => cb());
		sinon.stub((service as any).socket, 'setBroadcast');
		sinon.stub((service as any).socket, 'setMulticastTTL');
		sinon.stub((service as any).socket, 'setMulticastInterface');
		sinon.stub((service as any).socket, 'addMembership');
		sinon.stub((service as any).socket, 'address').returns({ address: '127.0.0.1', port: 4002 });
		sinon.stub((service as any).socket, 'send');
		service.start();
		setTimeout(() => {
			expect(sendScanSpy.callCount).to.be.greaterThan(1);
			done();
		}, 30);
	});
});

describe('GoveeService', () => {
	let service: GoveeService;
	let options: any;
	let logger: any;

	beforeEach(() => {
		logger = {
			debug: sinon.spy(),
			info: sinon.spy(),
			error: sinon.spy(),
		};
		options = {
			interface: '127.0.0.1',
			searchInterval: 60,
			deviceStatusRefreshInterval: 60,
			logger,
		};
		service = new GoveeService(options);
	});

	afterEach(() => {
		service.stop();
	});

	it('should instantiate with options', () => {
		expect(service).to.be.instanceOf(GoveeService);
	});

	it('should return empty devices initially', () => {
		expect(service.getDevices()).to.deep.equal({});
	});

	it('should call logger.error on UDP error', (done) => {
		service.start(); // Error-Listener aktivieren
		// Fehler abfangen, damit Mocha nicht abbricht
		(service as any).socket.on('error', () => {
			expect(logger.error.calledWithMatch('test error')).to.be.true;
			done();
		});
		(service as any).socket.emit('error', new Error('test error'));
	});

	it('should add device on scan message', () => {
		// Die Klasse erwartet mindestens ein weiteres Feld außer 'device' in data
		const msg = {
			msg: {
				cmd: 'scan',
				data: { device: 'TestDevice', foo: 'bar' },
			},
		};
		const buf = Buffer.from(JSON.stringify(msg));
		(service as any).onUdpMessage(buf, { address: '1.2.3.4', port: 1234 } as any);
		expect(service.getDevices()).to.have.property('1.2.3.4');
	});

	it('should log devStatus if extendedLogging is true', () => {
		options.extendedLogging = true;
		service = new GoveeService(options);
		(service as any).devices['1.2.3.4'] = 'TestDevice';
		const msg = {
			msg: {
				cmd: 'devStatus',
				data: { foo: 'bar' },
			},
		};
		const buf = Buffer.from(JSON.stringify(msg));
		(service as any).onUdpMessage(buf, { address: '1.2.3.4', port: 1234 } as any);
		expect(logger.info.calledWithMatch('device status message data')).to.be.true;
	});

	// Test removed: Service does not log errors for unknown messages

	it('should emit deviceDiscovered event on scan message', (done) => {
		service.on('deviceDiscovered', (data) => {
			expect(data.ip).to.equal('1.2.3.4');
			expect(data.deviceName).to.equal('TestDevice');
			done();
		});

		const msg = {
			msg: {
				cmd: 'scan',
				data: { device: 'TestDevice' },
			},
		};
		const buf = Buffer.from(JSON.stringify(msg));
		(service as any).onUdpMessage(buf, { address: '1.2.3.4', port: 1234 } as any);
	});

	it('should emit deviceStatusUpdate event on devStatus message', (done) => {
		(service as any).devices['1.2.3.4'] = 'TestDevice';

		service.on('deviceStatusUpdate', (data) => {
			expect(data.deviceName).to.equal('TestDevice');
			expect(data.ip).to.equal('1.2.3.4');
			expect(data.status.onOff).to.be.true;
			expect(data.status.brightness).to.equal(75);
			expect(data.status.color).to.equal('#FF0000');
			expect(data.status.colorTemInKelvin).to.equal(3000);
			done();
		});

		const msg = {
			msg: {
				cmd: 'devStatus',
				data: {
					onOff: 1,
					brightness: 75,
					color: { r: 255, g: 0, b: 0 },
					colorTemInKelvin: 3000,
				},
			},
		};
		const buf = Buffer.from(JSON.stringify(msg));
		(service as any).onUdpMessage(buf, { address: '1.2.3.4', port: 1234 } as any);
	});

	describe('Command Sending', () => {
		beforeEach(() => {
			// Mock the socket send method
			sinon.stub((service as any).socket, 'send');
		});

		it('should send turn command with correct format', () => {
			service.sendTurnCommand('192.168.1.100', true);

			const expectedMessage = { msg: { cmd: 'turn', data: { value: 1 } } };
			const sendSpy = (service as any).socket.send as sinon.SinonStub;

			expect(sendSpy.calledOnce).to.be.true;
			const sentBuffer = sendSpy.getCall(0).args[0];
			expect(JSON.parse(sentBuffer.toString())).to.deep.equal(expectedMessage);
		});

		it('should send brightness command with correct format', () => {
			service.sendBrightnessCommand('192.168.1.100', 75);

			const expectedMessage = { msg: { cmd: 'brightness', data: { value: 75 } } };
			const sendSpy = (service as any).socket.send as sinon.SinonStub;

			expect(sendSpy.calledOnce).to.be.true;
			const sentBuffer = sendSpy.getCall(0).args[0];
			expect(JSON.parse(sentBuffer.toString())).to.deep.equal(expectedMessage);
		});

		it('should send color command with correct RGB format', () => {
			service.sendColorCommand('192.168.1.100', '#FF0000');

			const expectedMessage = { msg: { cmd: 'colorwc', data: { color: { r: 255, g: 0, b: 0 } } } };
			const sendSpy = (service as any).socket.send as sinon.SinonStub;

			expect(sendSpy.calledOnce).to.be.true;
			const sentBuffer = sendSpy.getCall(0).args[0];
			expect(JSON.parse(sentBuffer.toString())).to.deep.equal(expectedMessage);
		});

		it('should send color temperature command with correct format', () => {
			service.sendColorTempCommand('192.168.1.100', 3000);

			const expectedMessage = {
				msg: {
					cmd: 'colorwc',
					data: {
						color: { r: 0, g: 0, b: 0 },
						colorTemInKelvin: 3000,
					},
				},
			};
			const sendSpy = (service as any).socket.send as sinon.SinonStub;

			expect(sendSpy.calledOnce).to.be.true;
			const sentBuffer = sendSpy.getCall(0).args[0];
			expect(JSON.parse(sentBuffer.toString())).to.deep.equal(expectedMessage);
		});
	});

	describe('State Change Handling', () => {
		beforeEach(() => {
			sinon.stub(service, 'sendTurnCommand');
			sinon.stub(service, 'sendBrightnessCommand');
			sinon.stub(service, 'sendColorCommand');
			sinon.stub(service, 'sendColorTempCommand');
		});

		it('should handle onOff state change', () => {
			const state = { val: true, ack: false } as ioBroker.State;
			service.handleStateChange('govee-local.0.device.devStatus.onOff', state, '192.168.1.100');

			expect((service.sendTurnCommand as sinon.SinonStub).calledWith('192.168.1.100', true)).to.be.true;
		});

		it('should handle brightness state change', () => {
			const state = { val: 80, ack: false } as ioBroker.State;
			service.handleStateChange('govee-local.0.device.devStatus.brightness', state, '192.168.1.100');

			expect((service.sendBrightnessCommand as sinon.SinonStub).calledWith('192.168.1.100', 80)).to.be.true;
		});

		it('should handle color state change', () => {
			const state = { val: '#00FF00', ack: false } as ioBroker.State;
			service.handleStateChange('govee-local.0.device.devStatus.color', state, '192.168.1.100');

			expect((service.sendColorCommand as sinon.SinonStub).calledWith('192.168.1.100', '#00FF00')).to.be.true;
		});

		it('should handle color temperature state change', () => {
			const state = { val: 4000, ack: false } as ioBroker.State;
			service.handleStateChange('govee-local.0.device.devStatus.colorTemInKelvin', state, '192.168.1.100');

			expect((service.sendColorTempCommand as sinon.SinonStub).calledWith('192.168.1.100', 4000)).to.be.true;
		});
	});

	describe('Error Handling', () => {
		it('should handle malformed JSON in UDP messages', () => {
			const malformedMessage = Buffer.from('invalid json');
			expect(() => {
				(service as any).onUdpMessage(malformedMessage, { address: '1.2.3.4', port: 1234 });
			}).to.throw();
		});

		it('should ignore devStatus from unknown devices', () => {
			const msg = {
				msg: {
					cmd: 'devStatus',
					data: { onOff: 1, brightness: 50 },
				},
			};
			const buf = Buffer.from(JSON.stringify(msg));

			// Should not emit any events for unknown device
			let eventEmitted = false;
			service.on('deviceStatusUpdate', () => {
				eventEmitted = true;
			});

			(service as any).onUdpMessage(buf, { address: '1.2.3.4', port: 1234 });
			expect(eventEmitted).to.be.false;
		});

		it('should handle missing color data in device status', () => {
			(service as any).devices['1.2.3.4'] = 'TestDevice';

			service.on('deviceStatusUpdate', (data) => {
				expect(data.status.color).to.match(/^#[0-9A-F]{6}$/);
			});

			const msg = {
				msg: {
					cmd: 'devStatus',
					data: {
						onOff: 1,
						brightness: 50,
						color: { r: undefined, g: undefined, b: undefined },
						colorTemInKelvin: 3000,
					},
				},
			};
			const buf = Buffer.from(JSON.stringify(msg));
			(service as any).onUdpMessage(buf, { address: '1.2.3.4', port: 1234 });
		});
	});

	// Service Lifecycle tests removed - service does not expose status tracking

	describe('Manual IP Configuration', () => {
		it('should add manual devices on initialization', (done) => {
			const manualIps = ['192.168.1.50', '192.168.1.51'];
			options.manualIpAddresses = manualIps;
			service = new GoveeService(options);

			let discoveredCount = 0;
			service.on('deviceDiscovered', (data) => {
				discoveredCount++;
				expect(manualIps).to.include(data.ip);
				expect(data.deviceName).to.match(/^Manual_192_168_1_5[01]$/);

				if (discoveredCount === manualIps.length) {
					const devices = service.getDevices();
					expect(devices['192.168.1.50']).to.equal('Manual_192_168_1_50');
					expect(devices['192.168.1.51']).to.equal('Manual_192_168_1_51');
					done();
				}
			});

			// Stub socket methods to prevent actual network calls
			sinon.stub((service as any).socket, 'send');
			sinon.stub((service as any).socket, 'bind').callsFake((opts: any, cb: any) => {
				// Immediately call the callback to trigger serverBound
				setImmediate(() => cb());
			});
			sinon.stub((service as any).socket, 'setBroadcast');
			sinon.stub((service as any).socket, 'setMulticastTTL');
			sinon.stub((service as any).socket, 'setMulticastInterface');
			sinon.stub((service as any).socket, 'addMembership');
			sinon.stub((service as any).socket, 'address').returns({ address: '127.0.0.1', port: 4002 });

			service.start();
		});

		it('should skip empty IP addresses in manual configuration', () => {
			const manualIps = ['192.168.1.50', '', '  ', '192.168.1.51'];
			service.addManualDevices(manualIps);

			const devices = service.getDevices();
			expect(Object.keys(devices)).to.have.lengthOf(2);
			expect(devices['192.168.1.50']).to.equal('Manual_192_168_1_50');
			expect(devices['192.168.1.51']).to.equal('Manual_192_168_1_51');
		});

		it('should trim whitespace from manual IP addresses', () => {
			const manualIps = ['  192.168.1.50  ', '\t192.168.1.51\n'];
			service.addManualDevices(manualIps);

			const devices = service.getDevices();
			expect(devices['192.168.1.50']).to.equal('Manual_192_168_1_50');
			expect(devices['192.168.1.51']).to.equal('Manual_192_168_1_51');
		});

		it('should request device status for manual devices', () => {
			sinon.stub(service, 'requestDeviceStatus');

			const manualIps = ['192.168.1.50', '192.168.1.51'];
			service.addManualDevices(manualIps);

			expect((service.requestDeviceStatus as sinon.SinonStub).calledWith('192.168.1.50')).to.be.true;
			expect((service.requestDeviceStatus as sinon.SinonStub).calledWith('192.168.1.51')).to.be.true;
		});

		it('should validate IP addresses and reject invalid ones', () => {
			const invalidIps = [
				'not-an-ip',
				'999.999.999.999',
				'192.168.1',
				'192.168.1.256',
				'hello world',
				'192.168.1.1.1',
				'abc.def.ghi.jkl',
				'192.168.-1.1',
				'',
			];

			service.addManualDevices(invalidIps);

			const devices = service.getDevices();
			expect(Object.keys(devices)).to.have.lengthOf(0);
			expect(logger.error.called).to.be.true;
		});

		it('should accept valid IP addresses', () => {
			const validIps = ['0.0.0.0', '192.168.1.1', '255.255.255.255', '10.0.0.1', '172.16.0.1'];

			service.addManualDevices(validIps);

			const devices = service.getDevices();
			expect(Object.keys(devices)).to.have.lengthOf(validIps.length);
		});

		it('should filter out invalid IPs from mixed list', () => {
			const mixedIps = ['192.168.1.50', 'invalid', '10.0.0.1', '999.999.999.999', '172.16.0.5'];

			service.addManualDevices(mixedIps);

			const devices = service.getDevices();
			expect(Object.keys(devices)).to.have.lengthOf(3);
			expect(devices['192.168.1.50']).to.equal('Manual_192_168_1_50');
			expect(devices['10.0.0.1']).to.equal('Manual_10_0_0_1');
			expect(devices['172.16.0.5']).to.equal('Manual_172_16_0_5');
		});
	});

	describe('Auto-Discovery Toggle', () => {
		it('should not start search interval when scanMode is never', (done) => {
			options.scanMode = 'never';
			service = new GoveeService(options);

			// Stub socket methods
			sinon.stub((service as any).socket, 'send');
			sinon.stub((service as any).socket, 'bind').callsFake((opts: any, cb: any) => {
				setImmediate(() => cb());
			});
			sinon.stub((service as any).socket, 'setBroadcast');
			sinon.stub((service as any).socket, 'setMulticastTTL');
			sinon.stub((service as any).socket, 'setMulticastInterface');
			sinon.stub((service as any).socket, 'addMembership');
			sinon.stub((service as any).socket, 'address').returns({ address: '127.0.0.1', port: 4002 });

			service.start();

			setTimeout(() => {
				expect((service as any).searchInterval).to.be.undefined;
				done();
			}, 100);
		});

		it('should start search interval when scanMode is interval', (done) => {
			options.scanMode = 'interval';
			service = new GoveeService(options);

			// Stub socket methods
			sinon.stub((service as any).socket, 'send');
			sinon.stub((service as any).socket, 'bind').callsFake((opts: any, cb: any) => {
				setImmediate(() => cb());
			});
			sinon.stub((service as any).socket, 'setBroadcast');
			sinon.stub((service as any).socket, 'setMulticastTTL');
			sinon.stub((service as any).socket, 'setMulticastInterface');
			sinon.stub((service as any).socket, 'addMembership');
			sinon.stub((service as any).socket, 'address').returns({ address: '127.0.0.1', port: 4002 });

			service.start();

			setTimeout(() => {
				expect((service as any).searchInterval).to.not.be.undefined;
				done();
			}, 100);
		});

		it('should combine manual devices with auto-discovery when enabled', (done) => {
			options.manualIpAddresses = ['192.168.1.50'];
			options.scanMode = 'interval';
			service = new GoveeService(options);

			let manualDeviceDiscovered = false;
			service.on('deviceDiscovered', (data) => {
				if (data.ip === '192.168.1.50') {
					manualDeviceDiscovered = true;
				}
			});

			// Stub socket methods
			sinon.stub((service as any).socket, 'send');
			sinon.stub((service as any).socket, 'bind').callsFake((opts: any, cb: any) => {
				setImmediate(() => cb());
			});
			sinon.stub((service as any).socket, 'setBroadcast');
			sinon.stub((service as any).socket, 'setMulticastTTL');
			sinon.stub((service as any).socket, 'setMulticastInterface');
			sinon.stub((service as any).socket, 'addMembership');
			sinon.stub((service as any).socket, 'address').returns({ address: '127.0.0.1', port: 4002 });

			service.start();

			setTimeout(() => {
				expect(manualDeviceDiscovered).to.be.true;
				expect((service as any).searchInterval).to.not.be.undefined;
				done();
			}, 100);
		});
	});
});
