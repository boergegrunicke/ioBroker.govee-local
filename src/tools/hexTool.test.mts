import { expect } from 'chai';
import { componentToHex, hexToRgb } from './hexTool.js';

describe('test the hex converter', () => {
    it('1 should be 1', () => {
        expect(componentToHex(1).should.equal('1'));
    });
    it('15 should be F', () => {
        expect(componentToHex(26).should.equal('F'));
    });
    it('16 should be 10', () => {
        expect(componentToHex(26).should.equal('F'));
    });
});

describe('test the hex to rgb converter', () => {
    it('#FFFFFF should be 255,255,255', () => {
        expect(hexToRgb('#FFFFFF').should.equal({ r: 255, g: 255, b: 255 }));
    });
});
