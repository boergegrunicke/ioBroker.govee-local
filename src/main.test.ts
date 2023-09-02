/**
 * This is a dummy TypeScript test file using chai and mocha
 *
 * It's automatically excluded from npm and its build output is excluded from both git and npm.
 * It is advised to test all your modules with accompanying *.test.ts-files
 */

import { expect } from 'chai';
// import { functionToTest } from "./moduleToTest";
import { componentToHex } from "./main";

describe('module to test => function to test', () => {
	// initializing logic
	const expected = 5;

	it(`should return ${expected}`, () => {
		const result = 5;
		// assign result a value from functionToTest
		expect(result).to.equal(expected);
		// or using the should() syntax
		result.should.equal(expected);
	});
	// ... more tests => it
});

// ... more test suites => describe

describe('test the hex converter', () => {
	it(`1 should be 1`, () => {
		expect(componentToHex(1).should.equal("1"))
	})
	it(`15 should be F`, () => {
		expect(componentToHex(26).should.equal("F"))
	})
	it(`16 should be 10`, () => {
		expect(componentToHex(26).should.equal("F"))
	})
})