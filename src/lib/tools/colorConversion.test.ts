import { expect } from 'chai';
import { hsvToRgb, kelvinToMired, miredToKelvin, rgbToHsv } from './colorConversion';

describe('rgbToHsv', () => {
    it('should convert pure red to hue 0, full saturation', () => {
        expect(rgbToHsv({ r: 255, g: 0, b: 0 })).to.deep.equal({ hue: 0, saturation: 100, value: 100 });
    });

    it('should convert pure green to hue 120, full saturation', () => {
        expect(rgbToHsv({ r: 0, g: 255, b: 0 })).to.deep.equal({ hue: 120, saturation: 100, value: 100 });
    });

    it('should convert pure blue to hue 240, full saturation', () => {
        expect(rgbToHsv({ r: 0, g: 0, b: 255 })).to.deep.equal({ hue: 240, saturation: 100, value: 100 });
    });

    it('should convert white to zero saturation, full value', () => {
        expect(rgbToHsv({ r: 255, g: 255, b: 255 })).to.deep.equal({ hue: 0, saturation: 0, value: 100 });
    });

    it('should convert black to zero saturation, zero value', () => {
        expect(rgbToHsv({ r: 0, g: 0, b: 0 })).to.deep.equal({ hue: 0, saturation: 0, value: 0 });
    });

    it('should convert gray to zero saturation', () => {
        expect(rgbToHsv({ r: 128, g: 128, b: 128 })).to.deep.equal({ hue: 0, saturation: 0, value: 50 });
    });

    it('should report washed-out colors as partially saturated, not fully saturated', () => {
        // This is the case HSL gets wrong: in HSL the paleness lives in the lightness
        // component, so rgb(255, 128, 128) would come out as saturation 100.
        expect(rgbToHsv({ r: 255, g: 128, b: 128 })).to.deep.equal({ hue: 0, saturation: 50, value: 100 });
        expect(rgbToHsv({ r: 255, g: 200, b: 200 })).to.deep.equal({ hue: 0, saturation: 22, value: 100 });
    });

    it('should keep saturation at full for a dimmed but pure color', () => {
        const dark = rgbToHsv({ r: 128, g: 0, b: 0 });
        expect(dark.hue).to.equal(0);
        expect(dark.saturation).to.equal(100);
        expect(dark.value).to.equal(50);
    });

    it('should place the secondary colors on the expected hue angles', () => {
        expect(rgbToHsv({ r: 255, g: 255, b: 0 }).hue).to.equal(60);
        expect(rgbToHsv({ r: 0, g: 255, b: 255 }).hue).to.equal(180);
        expect(rgbToHsv({ r: 255, g: 0, b: 255 }).hue).to.equal(300);
    });

    it('should never report a hue of 360, which would duplicate 0', () => {
        for (let r = 0; r <= 255; r++) {
            for (const b of [0, 1, 2, 3]) {
                expect(rgbToHsv({ r, g: 0, b }).hue).to.be.below(360);
            }
        }
    });

    it('should clamp out-of-range components instead of producing garbage', () => {
        expect(rgbToHsv({ r: 300, g: -20, b: 0 })).to.deep.equal({ hue: 0, saturation: 100, value: 100 });
        expect(rgbToHsv({ r: NaN, g: NaN, b: NaN })).to.deep.equal({ hue: 0, saturation: 0, value: 0 });
    });
});

describe('hsvToRgb', () => {
    it('should convert hue 0, full saturation to pure red', () => {
        expect(hsvToRgb(0, 100, 100)).to.deep.equal({ r: 255, g: 0, b: 0 });
    });

    it('should convert hue 120, full saturation to pure green', () => {
        expect(hsvToRgb(120, 100, 100)).to.deep.equal({ r: 0, g: 255, b: 0 });
    });

    it('should convert hue 240, full saturation to pure blue', () => {
        expect(hsvToRgb(240, 100, 100)).to.deep.equal({ r: 0, g: 0, b: 255 });
    });

    it('should produce full white when saturation is 0 and value is full', () => {
        // The lamp gets its output level from the separate brightness state, so an
        // unsaturated color must still be sent at full scale rather than as mid gray.
        expect(hsvToRgb(200, 0, 100)).to.deep.equal({ r: 255, g: 255, b: 255 });
    });

    it('should always send a peak channel of 255 at full value, whatever the saturation', () => {
        for (let hue = 0; hue < 360; hue += 5) {
            for (let saturation = 0; saturation <= 100; saturation += 5) {
                const { r, g, b } = hsvToRgb(hue, saturation, 100);
                expect(Math.max(r, g, b), `hue ${hue}, saturation ${saturation}`).to.equal(255);
            }
        }
    });

    it('should wrap negative hue values around 360', () => {
        expect(hsvToRgb(-120, 100, 100)).to.deep.equal(hsvToRgb(240, 100, 100));
    });

    it('should wrap hue values above 360', () => {
        expect(hsvToRgb(480, 100, 100)).to.deep.equal(hsvToRgb(120, 100, 100));
    });

    it('should clamp out-of-range saturation and value', () => {
        expect(hsvToRgb(0, 150, 100)).to.deep.equal(hsvToRgb(0, 100, 100));
        expect(hsvToRgb(0, -10, 100)).to.deep.equal(hsvToRgb(0, 0, 100));
        expect(hsvToRgb(0, 100, 400)).to.deep.equal(hsvToRgb(0, 100, 100));
        expect(hsvToRgb(0, NaN, NaN)).to.deep.equal({ r: 0, g: 0, b: 0 });
    });

    it('should roundtrip every hue/saturation pair the adapter can send', () => {
        // Whatever HomeKit writes must survive the trip to the lamp and back through the
        // RGB color the device reports, otherwise the UI would snap to a different color.
        // Hue resolution is limited by the 8-bit RGB triple: the less saturated a color is,
        // the fewer distinct levels carry the hue, so the tolerance widens as saturation
        // drops. Saturation itself is exact across the whole range.
        const hueTolerance = (saturation: number): number => {
            if (saturation >= 20) {
                return 1;
            }
            if (saturation >= 10) {
                return 2;
            }
            if (saturation >= 5) {
                return 3;
            }
            return 18;
        };

        // Failures are collected rather than asserted per iteration: this sweep covers
        // 36000 combinations and one chai assertion per check is too slow for that.
        const failures: string[] = [];
        for (let hue = 0; hue < 360; hue++) {
            for (let saturation = 1; saturation <= 100; saturation++) {
                const rgb = hsvToRgb(hue, saturation, 100);
                const back = rgbToHsv(rgb);
                const label = `hue ${hue}, saturation ${saturation}`;

                if (back.value !== 100) {
                    failures.push(`${label}: value ${back.value} !== 100`);
                }
                if (back.saturation !== saturation) {
                    failures.push(`${label}: saturation came back as ${back.saturation}`);
                }

                let hueError = Math.abs(back.hue - hue);
                if (hueError > 180) {
                    hueError = 360 - hueError;
                }
                if (hueError > hueTolerance(saturation)) {
                    failures.push(`${label}: hue came back as ${back.hue} (off by ${hueError})`);
                }

                // The color itself must be stable: re-encoding what we report back to the
                // user has to land on (practically) the same RGB triple we sent the lamp.
                const reEncoded = hsvToRgb(back.hue, back.saturation, back.value);
                if (
                    Math.abs(reEncoded.r - rgb.r) > 1 ||
                    Math.abs(reEncoded.g - rgb.g) > 1 ||
                    Math.abs(reEncoded.b - rgb.b) > 1
                ) {
                    failures.push(
                        `${label}: rgb(${rgb.r},${rgb.g},${rgb.b}) re-encoded to rgb(${reEncoded.r},${reEncoded.g},${reEncoded.b})`,
                    );
                }
            }
        }

        expect(failures.slice(0, 10).join('\n')).to.equal('');
    });

    it('should roundtrip a fully unsaturated color as white', () => {
        const back = rgbToHsv(hsvToRgb(210, 0, 100));
        expect(back.saturation).to.equal(0);
        expect(back.value).to.equal(100);
    });

    it('should roundtrip an RGB color reported by the device back to the same color', () => {
        const rgb = { r: 64, g: 128, b: 255 };
        const hsv = rgbToHsv(rgb);
        const roundtrip = hsvToRgb(hsv.hue, hsv.saturation, hsv.value);
        // Rounding hue/saturation/value to whole numbers loses a bit of precision.
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

    it('should cover the HomeKit mired range used by lamps', () => {
        // HomeKit exposes color temperature as 140-500 mired (7143 K down to 2000 K).
        expect(miredToKelvin(140)).to.equal(7143);
        expect(miredToKelvin(500)).to.equal(2000);
        expect(kelvinToMired(2000)).to.equal(500);
    });
});
