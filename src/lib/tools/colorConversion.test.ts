import { expect } from 'chai';
import { hslToRgb, kelvinToMired, miredToKelvin, rgbToHsl } from './colorConversion';

describe('colorConversion', () => {
        it('converts rgb to hsl', () => {
                const { hue, saturation, lightness } = rgbToHsl({ r: 255, g: 0, b: 0 });
                expect(hue).to.equal(0);
                expect(saturation).to.equal(100);
                expect(lightness).to.equal(50);
        });

        it('converts hsl to rgb', () => {
                const { r, g, b } = hslToRgb(120, 100, 50);
                expect(r).to.equal(0);
                expect(g).to.equal(255);
                expect(b).to.equal(0);
        });

        it('keeps roundtrip between hsl and rgb close', () => {
                const rgb = { r: 64, g: 128, b: 255 };
                const hsl = rgbToHsl(rgb);
                const roundtrip = hslToRgb(hsl.hue, hsl.saturation, hsl.lightness);
                expect(roundtrip.r).to.equal(64);
                expect(roundtrip.g).to.equal(128);
                expect(roundtrip.b).to.equal(255);
        });

        it('converts kelvin to mired and back', () => {
                const mired = kelvinToMired(5000);
                expect(mired).to.equal(200);
                const kelvin = miredToKelvin(mired);
                expect(kelvin).to.equal(5000);
        });
});
