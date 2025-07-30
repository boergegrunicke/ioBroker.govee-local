import { expect } from 'chai';
import { componentToHex, hexToRgb } from './hexTool';

describe('componentToHex', () => {
	it('should convert 1 to "01"', () => {
		expect(componentToHex(1)).to.equal('01');
	});
	it('should convert 15 to "0f"', () => {
		expect(componentToHex(15)).to.equal('0f');
	});
	it('should convert 16 to "10"', () => {
		expect(componentToHex(16)).to.equal('10');
	});
	it('should convert 255 to "ff"', () => {
		expect(componentToHex(255)).to.equal('ff');
	});
	it('should convert 0 to "00"', () => {
		expect(componentToHex(0)).to.equal('00');
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
	});
});
