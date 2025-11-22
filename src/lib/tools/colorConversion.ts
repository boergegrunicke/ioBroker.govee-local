/**
 * Converts RGB values to HSL.
 * Returns hue in degrees (0-360), saturation and lightness in percent (0-100).
 */
export function rgbToHsl(rgb: { r: number; g: number; b: number }): {
        hue: number;
        saturation: number;
        lightness: number;
} {
        const r = Math.max(0, Math.min(255, rgb.r)) / 255;
        const g = Math.max(0, Math.min(255, rgb.g)) / 255;
        const b = Math.max(0, Math.min(255, rgb.b)) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                        case r:
                                h = (g - b) / d + (g < b ? 6 : 0);
                                break;
                        case g:
                                h = (b - r) / d + 2;
                                break;
                        case b:
                                h = (r - g) / d + 4;
                                break;
                }
                h /= 6;
        }

        return {
                hue: Math.round(h * 360),
                saturation: Math.round(s * 100),
                lightness: Math.round(l * 100),
        };
}

/**
 * Converts HSL values (hue 0-360, saturation and lightness 0-100) to RGB (0-255).
 */
export function hslToRgb(hue: number, saturation: number, lightness: number): {
        r: number;
        g: number;
        b: number;
} {
        const h = ((hue % 360) + 360) % 360 / 360;
        const s = Math.max(0, Math.min(100, saturation)) / 100;
        const l = Math.max(0, Math.min(100, lightness)) / 100;

        if (s === 0) {
                const val = Math.round(l * 255);
                return { r: val, g: val, b: val };
        }

        const hueToRgb = (p: number, q: number, t: number): number => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        const r = hueToRgb(p, q, h + 1 / 3);
        const g = hueToRgb(p, q, h);
        const b = hueToRgb(p, q, h - 1 / 3);

        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

/**
 * Converts a color temperature value in Kelvin to mired (micro reciprocal degrees).
 */
export function kelvinToMired(kelvin: number): number {
        return Math.round(1000000 / Math.max(1, kelvin));
}

/**
 * Converts a color temperature value in mired (micro reciprocal degrees) to Kelvin.
 */
export function miredToKelvin(mired: number): number {
        return Math.round(1000000 / Math.max(1, mired));
}
