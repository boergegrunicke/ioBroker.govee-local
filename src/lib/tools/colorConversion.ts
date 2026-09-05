/**
 * Converts an RGB color to HSL (Hue-Saturation-Lightness).
 * Hue is returned in degrees (0-360), saturation and lightness as percentages (0-100).
 *
 * @param rgb The RGB color to convert.
 * @param rgb.r Red component (0-255).
 * @param rgb.g Green component (0-255).
 * @param rgb.b Blue component (0-255).
 * @returns An object with hue, saturation and lightness properties.
 */
export function rgbToHsl(rgb: { r: number; g: number; b: number }): {
    hue: number;
    saturation: number;
    lightness: number;
} {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lightness = (max + min) / 2;

    let hue = 0;
    let saturation = 0;

    if (max !== min) {
        const delta = max - min;
        saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
        switch (max) {
            case r:
                hue = (g - b) / delta + (g < b ? 6 : 0);
                break;
            case g:
                hue = (b - r) / delta + 2;
                break;
            default:
                hue = (r - g) / delta + 4;
        }
        hue /= 6;
    }

    return {
        hue: Math.round(hue * 360),
        saturation: Math.round(saturation * 100),
        lightness: Math.round(lightness * 100),
    };
}

/**
 * Converts an HSL color to RGB. Hue wraps around 360 degrees; saturation and lightness are percentages (0-100).
 *
 * @param hue Hue in degrees.
 * @param saturation Saturation in percent.
 * @param lightness Lightness in percent.
 * @returns An object with r, g, b properties (0-255).
 */
export function hslToRgb(hue: number, saturation: number, lightness: number): { r: number; g: number; b: number } {
    const h = (((hue % 360) + 360) % 360) / 360;
    const s = saturation / 100;
    const l = lightness / 100;

    if (s === 0) {
        const value = Math.round(l * 255);
        return { r: value, g: value, b: value };
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    return {
        r: Math.round(hueToRgbComponent(p, q, h + 1 / 3) * 255),
        g: Math.round(hueToRgbComponent(p, q, h) * 255),
        b: Math.round(hueToRgbComponent(p, q, h - 1 / 3) * 255),
    };
}

/**
 * Helper for hslToRgb: resolves a single RGB component from the p/q intermediates.
 *
 * @param p Lower intermediate value.
 * @param q Upper intermediate value.
 * @param t Hue offset for the component, in the range around 0-1.
 * @returns The resolved component in the range 0-1.
 */
function hueToRgbComponent(p: number, q: number, t: number): number {
    let normalizedT = t;
    if (normalizedT < 0) {
        normalizedT += 1;
    }
    if (normalizedT > 1) {
        normalizedT -= 1;
    }
    if (normalizedT < 1 / 6) {
        return p + (q - p) * 6 * normalizedT;
    }
    if (normalizedT < 1 / 2) {
        return q;
    }
    if (normalizedT < 2 / 3) {
        return p + (q - p) * (2 / 3 - normalizedT) * 6;
    }
    return p;
}

/**
 * Converts a color temperature in Kelvin to mired (micro reciprocal degrees), the unit HomeKit uses.
 *
 * @param kelvin Color temperature in Kelvin. Must be greater than 0.
 * @returns Color temperature in mired.
 */
export function kelvinToMired(kelvin: number): number {
    return Math.round(1_000_000 / kelvin);
}

/**
 * Converts a color temperature in mired (micro reciprocal degrees) to Kelvin.
 *
 * @param mired Color temperature in mired. Must be greater than 0.
 * @returns Color temperature in Kelvin.
 */
export function miredToKelvin(mired: number): number {
    return Math.round(1_000_000 / mired);
}
