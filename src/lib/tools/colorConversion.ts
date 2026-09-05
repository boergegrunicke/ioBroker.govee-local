/**
 * Converts an RGB color to HSV (Hue-Saturation-Value), the model behind HomeKit's
 * Hue / Saturation / Brightness characteristics.
 *
 * HSV is used here rather than HSL on purpose: the adapter exposes hue and saturation
 * alongside the device's own brightness state, which is exactly an HSB triple. HSL would
 * report a washed-out color such as rgb(255, 128, 128) as fully saturated, because in HSL
 * the paleness is carried by the lightness component that this adapter does not expose.
 *
 * @param rgb The RGB color to convert.
 * @param rgb.r Red component (0-255).
 * @param rgb.g Green component (0-255).
 * @param rgb.b Blue component (0-255).
 * @returns An object with hue (0-360), saturation (0-100) and value (0-100).
 */
export function rgbToHsv(rgb: { r: number; g: number; b: number }): {
    hue: number;
    saturation: number;
    value: number;
} {
    const r = clampComponent(rgb.r) / 255;
    const g = clampComponent(rgb.g) / 255;
    const b = clampComponent(rgb.b) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let hue = 0;
    if (delta !== 0) {
        switch (max) {
            case r:
                hue = ((g - b) / delta) % 6;
                break;
            case g:
                hue = (b - r) / delta + 2;
                break;
            default:
                hue = (r - g) / delta + 4;
        }
        hue *= 60;
        if (hue < 0) {
            hue += 360;
        }
    }

    return {
        hue: Math.round(hue) % 360,
        saturation: Math.round((max === 0 ? 0 : delta / max) * 100),
        value: Math.round(max * 100),
    };
}

/**
 * Converts an HSV color to RGB. Hue wraps around 360 degrees; saturation and value are
 * percentages (0-100) and are clamped into that range.
 *
 * @param hue Hue in degrees.
 * @param saturation Saturation in percent.
 * @param value Value (brightness of the color itself) in percent.
 * @returns An object with r, g, b properties (0-255).
 */
export function hsvToRgb(hue: number, saturation: number, value: number): { r: number; g: number; b: number } {
    const sector = (((hue % 360) + 360) % 360) / 60;
    const s = clampPercent(saturation) / 100;
    const v = clampPercent(value) / 100;

    const chroma = v * s;
    const secondary = chroma * (1 - Math.abs((sector % 2) - 1));
    const offset = v - chroma;

    let r = 0;
    let g = 0;
    let b = 0;
    if (sector < 1) {
        r = chroma;
        g = secondary;
    } else if (sector < 2) {
        r = secondary;
        g = chroma;
    } else if (sector < 3) {
        g = chroma;
        b = secondary;
    } else if (sector < 4) {
        g = secondary;
        b = chroma;
    } else if (sector < 5) {
        r = secondary;
        b = chroma;
    } else {
        r = chroma;
        b = secondary;
    }

    return {
        r: Math.round((r + offset) * 255),
        g: Math.round((g + offset) * 255),
        b: Math.round((b + offset) * 255),
    };
}

/**
 * Clamps a single RGB component into the valid 0-255 range, treating non-numeric input as 0.
 *
 * @param component The raw component value.
 * @returns The component clamped to 0-255.
 */
function clampComponent(component: number): number {
    if (!Number.isFinite(component)) {
        return 0;
    }
    return Math.min(Math.max(component, 0), 255);
}

/**
 * Clamps a percentage into the valid 0-100 range, treating non-numeric input as 0.
 *
 * @param percent The raw percentage value.
 * @returns The percentage clamped to 0-100.
 */
function clampPercent(percent: number): number {
    if (!Number.isFinite(percent)) {
        return 0;
    }
    return Math.min(Math.max(percent, 0), 100);
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
