import { expect } from 'chai';
import sinon from 'sinon';
import { GoveeService } from '../lib/goveeService';
import type { GoveeServiceOptions } from '../lib/goveeServiceOptions';

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
});
