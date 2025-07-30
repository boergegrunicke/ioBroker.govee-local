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

// Lade chai-as-promised und sinon-chai für expect-Assertions
const chai = require('chai');
chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised').default);
