import { expect } from 'chai';
import { componentToHex, hexToRgb } from './hexTool';

describe('componentToHex', () => {
	it('should return two-digit uppercase hex for 0-255', () => {
		expect(componentToHex(0)).to.equal('00');
		expect(componentToHex(1)).to.equal('01');
		expect(componentToHex(10)).to.equal('0A');
		expect(componentToHex(15)).to.equal('0F');
		expect(componentToHex(16)).to.equal('10');
		expect(componentToHex(255)).to.equal('FF');
	});

	it('should always return a string of length 2', () => {
		for (let i = 0; i <= 255; i++) {
			expect(componentToHex(i)).to.have.lengthOf(2);
		}
	});
});

describe('hexToRgb', () => {
	it('should convert 6-digit hex to RGB', () => {
		expect(hexToRgb('#FFAABB')).to.deep.equal({ r: 255, g: 170, b: 187 });
		expect(hexToRgb('00FF00')).to.deep.equal({ r: 0, g: 255, b: 0 });
	});

	it('should convert 3-digit hex to RGB', () => {
		expect(hexToRgb('#FAB')).to.deep.equal({ r: 255, g: 170, b: 187 });
		expect(hexToRgb('0F0')).to.deep.equal({ r: 0, g: 255, b: 0 });
	});

	it('should handle hex with or without #', () => {
		expect(hexToRgb('#123456')).to.deep.equal({ r: 18, g: 52, b: 86 });
		expect(hexToRgb('123456')).to.deep.equal({ r: 18, g: 52, b: 86 });
	});

	it('should return 0 for invalid hex', () => {
		expect(hexToRgb('')).to.deep.equal({ r: 0, g: 0, b: 0 });
		expect(hexToRgb('zzzzzz')).to.deep.equal({ r: 0, g: 0, b: 0 });
	});
});
