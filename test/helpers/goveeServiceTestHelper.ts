/**
 * Test helper utilities for GoveeService tests
 * Reduces code duplication and centralizes mock setup
 */

import sinon from 'sinon';
import type { GoveeService } from '../../src/lib/goveeService';

/**
 * Provides utilities for setting up mocks and stubs in GoveeService tests
 */
export class GoveeServiceTestHelper {
	/**
	 * Stub all UDP socket methods to prevent actual network calls
	 * Call this in beforeEach() to set up a service for testing
	 *
	 * @param service The GoveeService instance to stub
	 */
	static stubSocketMethods(service: GoveeService): void {
		const socket = (service as any).socket;
		sinon.stub(socket, 'bind').callsFake((opts: any, cb: any) => {
			cb();
		});
		sinon.stub(socket, 'setBroadcast');
		sinon.stub(socket, 'setMulticastTTL');
		sinon.stub(socket, 'setMulticastInterface');
		sinon.stub(socket, 'addMembership');
		sinon.stub(socket, 'address').returns({ address: '127.0.0.1', port: 4002 });
		sinon.stub(socket, 'send');
	}

	/**
	 * Stub socket methods with async bind (for testing async flows)
	 * The bind callback is invoked asynchronously with setImmediate
	 *
	 * @param service The GoveeService instance to stub
	 */
	static stubSocketMethodsAsync(service: GoveeService): void {
		const socket = (service as any).socket;
		sinon.stub(socket, 'bind').callsFake((opts: any, cb: any) => {
			setImmediate(() => cb());
		});
		sinon.stub(socket, 'setBroadcast');
		sinon.stub(socket, 'setMulticastTTL');
		sinon.stub(socket, 'setMulticastInterface');
		sinon.stub(socket, 'addMembership');
		sinon.stub(socket, 'address').returns({ address: '127.0.0.1', port: 4002 });
		sinon.stub(socket, 'send');
	}

	/**
	 * Create a mock logger object with spy methods
	 * Useful for verifying logging behavior
	 *
	 * @returns Mock logger with debug, info, and error methods
	 */
	static createMockLogger(): any {
		return {
			debug: sinon.spy(),
			info: sinon.spy(),
			error: sinon.spy(),
		};
	}

	/**
	 * Create default GoveeService options for testing
	 *
	 * @param overrides Optional partial options to override defaults
	 * @returns Complete options object
	 */
	static createDefaultOptions(overrides: any = {}): any {
		return {
			interface: '127.0.0.1',
			searchInterval: 60,
			deviceStatusRefreshInterval: 60,
			logger: this.createMockLogger(),
			...overrides,
		};
	}

	/**
	 * Create a UDP message buffer from a message object
	 *
	 * @param msg The message object to convert
	 * @returns Buffer containing the JSON-encoded message
	 */
	static createMessageBuffer(msg: any): Buffer {
		return Buffer.from(JSON.stringify(msg));
	}

	/**
	 * Simulate a UDP message arrival on the service
	 * Useful for testing message handling without actual network
	 *
	 * @param service The GoveeService instance
	 * @param msg The message object to simulate
	 * @param address The source IP address (default: 1.2.3.4)
	 * @param port The source port (default: 1234)
	 */
	static simulateUdpMessage(service: GoveeService, msg: any, address: string = '1.2.3.4', port: number = 1234): void {
		const buf = this.createMessageBuffer(msg);
		(service as any).onUdpMessage(buf, { address, port } as any);
	}

	/**
	 * Clean up all stubs and spies after a test
	 * Can be called in afterEach()
	 */
	static cleanup(): void {
		sinon.restore();
	}
}
