import { expect } from 'chai';
import { hslToRgb, kelvinToMired, miredToKelvin, rgbToHsl } from './colorConversion';

describe('rgbToHsl', () => {
    it('should convert pure red to hue 0, full saturation', () => {
        expect(rgbToHsl({ r: 255, g: 0, b: 0 })).to.deep.equal({ hue: 0, saturation: 100, lightness: 50 });
    });

    it('should convert pure green to hue 120, full saturation', () => {
        expect(rgbToHsl({ r: 0, g: 255, b: 0 })).to.deep.equal({ hue: 120, saturation: 100, lightness: 50 });
    });

    it('should convert pure blue to hue 240, full saturation', () => {
        expect(rgbToHsl({ r: 0, g: 0, b: 255 })).to.deep.equal({ hue: 240, saturation: 100, lightness: 50 });
    });

    it('should convert white to zero saturation, full lightness', () => {
        expect(rgbToHsl({ r: 255, g: 255, b: 255 })).to.deep.equal({ hue: 0, saturation: 0, lightness: 100 });
    });

    it('should convert black to zero saturation, zero lightness', () => {
        expect(rgbToHsl({ r: 0, g: 0, b: 0 })).to.deep.equal({ hue: 0, saturation: 0, lightness: 0 });
    });

    it('should convert gray to zero saturation', () => {
        expect(rgbToHsl({ r: 128, g: 128, b: 128 })).to.deep.equal({ hue: 0, saturation: 0, lightness: 50 });
    });
});

describe('hslToRgb', () => {
    it('should convert hue 0, full saturation, mid lightness to pure red', () => {
        expect(hslToRgb(0, 100, 50)).to.deep.equal({ r: 255, g: 0, b: 0 });
    });

    it('should convert hue 120, full saturation, mid lightness to pure green', () => {
        expect(hslToRgb(120, 100, 50)).to.deep.equal({ r: 0, g: 255, b: 0 });
    });

    it('should convert hue 240, full saturation, mid lightness to pure blue', () => {
        expect(hslToRgb(240, 100, 50)).to.deep.equal({ r: 0, g: 0, b: 255 });
    });

    it('should ignore hue when saturation is 0', () => {
        expect(hslToRgb(200, 0, 50)).to.deep.equal({ r: 128, g: 128, b: 128 });
    });

    it('should wrap negative hue values around 360', () => {
        expect(hslToRgb(-120, 100, 50)).to.deep.equal(hslToRgb(240, 100, 50));
    });

    it('should wrap hue values above 360', () => {
        expect(hslToRgb(480, 100, 50)).to.deep.equal(hslToRgb(120, 100, 50));
    });

    it('should keep a roundtrip between rgb and hsl close to the original color', () => {
        const rgb = { r: 64, g: 128, b: 255 };
        const hsl = rgbToHsl(rgb);
        const roundtrip = hslToRgb(hsl.hue, hsl.saturation, hsl.lightness);
        // Rounding hue/saturation/lightness to whole numbers loses a bit of precision.
        expect(roundtrip.r).to.be.closeTo(rgb.r, 2);
        expect(roundtrip.g).to.be.closeTo(rgb.g, 2);
        expect(roundtrip.b).to.be.closeTo(rgb.b, 2);
    });
});

describe('kelvinToMired / miredToKelvin', () => {
    it('should convert kelvin to mired', () => {
        expect(kelvinToMired(5000)).to.equal(200);
        expect(kelvinToMired(2700)).to.equal(370);
    });

    it('should convert mired to kelvin', () => {
        expect(miredToKelvin(200)).to.equal(5000);
        expect(miredToKelvin(370)).to.equal(2703);
    });

    it('should roundtrip kelvin through mired and back', () => {
        expect(miredToKelvin(kelvinToMired(4000))).to.equal(4000);
    });
});
