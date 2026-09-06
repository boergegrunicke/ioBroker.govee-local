'use strict';

// Makes ts-node ignore warnings, so mocha --watch does work
process.env.TS_NODE_IGNORE_WARNINGS = 'TRUE';
// Sets the correct tsconfig for testing
process.env.TS_NODE_PROJECT = 'tsconfig.json';
// Make ts-node respect the "include" key in tsconfig.json
process.env.TS_NODE_FILES = 'TRUE';

// Don't silently swallow unhandled rejections
process.on('unhandledRejection', (e) => {
	throw e;
});

// enable the should interface with sinon
// and load chai-as-promised and sinon-chai by default
const chai = require('chai');
const sinonChai = require('sinon-chai').default || require('sinon-chai');

chai.should();
chai.use(sinonChai);

// Stub @iobroker/adapter-core so main.ts can be unit-tested directly.
// The real package resolves iobroker.js-controller at import time and calls
// process.exit(10) if it can't find it, which is fatal for a plain mocha run:
// this repo doesn't (and shouldn't need to) depend on a real js-controller
// install just to unit-test the adapter class. Tests that construct GoveeLocal
// override whichever adapter methods they need afterwards, so this stub only
// has to provide safe no-op defaults plus EventEmitter behaviour for `.on()`.
const { EventEmitter } = require('node:events');

class MockAdapter extends EventEmitter {
	constructor() {
		super();
		this.config = {};
		this.log = {
			debug() {},
			info() {},
			warn() {},
			error() {},
		};
		this.FORBIDDEN_CHARS = /[^a-zA-Z0-9_-]/g;
	}
	setObjectNotExists() {}
	async setObjectNotExistsAsync() {}
	async getStateAsync() {}
	async setState() {}
	subscribeStates() {}
	setInterval(callback, ms) {
		return setInterval(callback, ms);
	}
	clearInterval(timer) {
		return clearInterval(timer);
	}
}

const adapterCorePath = require.resolve('@iobroker/adapter-core');
require.cache[adapterCorePath] = {
	id: adapterCorePath,
	filename: adapterCorePath,
	loaded: true,
	exports: { Adapter: MockAdapter },
};
