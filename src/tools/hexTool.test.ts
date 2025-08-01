import { expect } from 'chai';
import { componentToHex, hexToRgb } from './hexTool';

describe('componentToHex', () => {
	it('should return "00" for 0', () => {
		expect(componentToHex(0)).to.equal('00');
	});
	it('should return "01" for 1', () => {
		expect(componentToHex(1)).to.equal('01');
	});
	it('should return "0a" for 10', () => {
		expect(componentToHex(10)).to.equal('0a');
	});
	it('should return "0f" for 15', () => {
		expect(componentToHex(15)).to.equal('0f');
	});
	it('should return "10" for 16', () => {
		expect(componentToHex(16)).to.equal('10');
	});
	it('should return "ff" for 255', () => {
		expect(componentToHex(255)).to.equal('ff');
	});
});

describe('hexToRgb', () => {
	it('should convert #FFFFFF to { r: 255, g: 255, b: 255 }', () => {
		expect(hexToRgb('#FFFFFF')).to.deep.equal({ r: 255, g: 255, b: 255 });
	});
	it('should convert #000000 to { r: 0, g: 0, b: 0 }', () => {
		expect(hexToRgb('#000000')).to.deep.equal({ r: 0, g: 0, b: 0 });
	});
	it('should convert #123456 to { r: 18, g: 52, b: 86 }', () => {
		expect(hexToRgb('#123456')).to.deep.equal({ r: 18, g: 52, b: 86 });
	});
	it('should throw for invalid hex string', () => {
		expect(() => hexToRgb('123456')).to.throw('Invalid hex string');
		expect(() => hexToRgb('#FFF')).to.throw('Invalid hex string');
		expect(() => hexToRgb('#GGGGGG')).to.throw('Invalid hex string');
		expect(() => hexToRgb('#12345')).to.throw('Invalid hex string');
	});
});
