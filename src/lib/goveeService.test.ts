import { expect } from 'chai';
import sinon from 'sinon';
import { GoveeService } from './goveeService';
import type { GoveeServiceOptions } from './goveeServiceOptions';

describe('GoveeService', () => {
	let service: GoveeService;
	let options: GoveeServiceOptions;
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

	it('should call logger.error on unknown message', () => {
		const msg = { msg: { cmd: 'unknown', data: {} } };
		const buf = Buffer.from(JSON.stringify(msg));
		(service as any).onUdpMessage(buf, { address: '1.2.3.4', port: 1234 } as any);
		expect(logger.error.calledWithMatch('message from:')).to.be.true;
	});

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

	describe('Service Lifecycle', () => {
		it('should transition service status correctly during start', (done) => {
			const statusUpdates: string[] = [];
			let finished = false;
			service.on('serviceStatusUpdate', (data) => {
				statusUpdates.push(data.status);
				if (!finished && statusUpdates.includes('starting') && statusUpdates.includes('running')) {
					finished = true;
					expect(statusUpdates).to.include('starting');
					expect(statusUpdates).to.include('running');
					done();
				}
			});
			service.start();
		});

		it('should handle start/stop cycles', (done) => {
			let statusCount = 0;
			service.on('serviceStatusUpdate', (data) => {
				if (data.status === 'running') {
					statusCount++;
					if (statusCount === 1) {
						service.stop();
					} else if (statusCount === 2) {
						expect((service as any).serviceStatus).to.equal('running');
						done();
					}
				}
				if (data.status === 'stopped' && statusCount === 1) {
					service.start();
				}
			});
			service.start();
		});
	});
});
