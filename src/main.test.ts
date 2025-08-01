/**
 * This is a dummy TypeScript test file using chai and mocha
 *
 * It's automatically excluded from npm and its build output is excluded from both git and npm.
 * It is advised to test all your modules with accompanying *.test.ts-files
 */

import { expect } from 'chai';
import { getDatapointDescription, GoveeLocal } from './main';

describe('getDatapointDescription', () => {
	it('should return correct descriptions for known keys', () => {
		expect(getDatapointDescription('model')).to.equal('Specific model of the Lamp');
		expect(getDatapointDescription('ip')).to.equal('IP address of the Lamp');
		expect(getDatapointDescription('bleVersionHard')).to.equal('Bluetooth Low Energy Hardware Version');
		expect(getDatapointDescription('bleVersionSoft')).to.equal('Bluetooth Low Energy Software Version');
		expect(getDatapointDescription('wifiVersionHard')).to.equal('WiFi Hardware Version');
		expect(getDatapointDescription('wifiVersionSoft')).to.equal('WiFi Software Version');
	});
	it('should return empty string for unknown keys', () => {
		expect(getDatapointDescription('unknown')).to.equal('');
	});
});

describe('GoveeLocal', () => {
	it('should construct without error and have config fields', () => {
		const instance = new GoveeLocal({});
		expect(instance).to.be.an('object');
		// Simuliere eine vollständige Konfiguration
		instance.config = {
			interface: '127.0.0.1',
			extendedLogging: false,
			searchInterval: 10,
			deviceStatusRefreshInterval: 30,
		};
		expect(instance.config.interface).to.equal('127.0.0.1');
		expect(instance.config.searchInterval).to.equal(10);
		expect(instance.config.deviceStatusRefreshInterval).to.equal(30);
	});
});
