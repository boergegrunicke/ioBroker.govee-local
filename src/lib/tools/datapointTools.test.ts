import { expect } from 'chai';
import { getDatapointDescription } from './datapointTools';

describe('getDatapointDescription', () => {
	it('should return the correct description for known datapoints', () => {
		expect(getDatapointDescription('model')).to.equal('Specific model of the Lamp');
		expect(getDatapointDescription('ip')).to.equal('IP address of the Lamp');
		expect(getDatapointDescription('bleVersionHard')).to.equal('Bluetooth Low Energy Hardware Version');
		expect(getDatapointDescription('bleVersionSoft')).to.equal('Bluetooth Low Energy Software Version');
		expect(getDatapointDescription('wifiVersionHard')).to.equal('WiFi Hardware Version');
		expect(getDatapointDescription('wifiVersionSoft')).to.equal('WiFi Software Version');
	});

	it('should return an empty string for unknown datapoints', () => {
		expect(getDatapointDescription('unknown')).to.equal('');
		expect(getDatapointDescription('')).to.equal('');
		expect(getDatapointDescription('serialNumber')).to.equal('');
	});

	it('should be case-sensitive', () => {
		expect(getDatapointDescription('Model')).to.equal('');
		expect(getDatapointDescription('IP')).to.equal('');
	});
});
