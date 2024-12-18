/**
 * Convert number (<255) to two digit hex for colorcode
 *
 * @param c - The input int
 * @returns the hex value as string
 */
export function componentToHex(c: number): string {
    const hex = c.toString(16);
    return hex.length == 1 ? `0${hex}` : hex;
}

/**
 * Condert a hex color, given as a string to an instance of Color
 *
 * @param hexString - The input color as a string
 * @returns the resulting color object
 */
export function hexToRgb(hexString: string): Color {
    // Check if the hex string is valid
    if (!/^#[0-9a-fA-F]{6}$/i.test(hexString)) {
        throw new Error('Invalid hex string');
    }

    return {
        r: parseInt(hexString.slice(1, 3), 16),
        g: parseInt(hexString.slice(3, 5), 16),
        b: parseInt(hexString.slice(5, 7), 16),
    };
}
type Color = {
    r: number;
    g: number;
    b: number;
};
