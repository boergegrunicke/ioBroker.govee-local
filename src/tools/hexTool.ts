/**
 * Converts a number (<255) to a two-digit hex string for color values.
 *
 * @param c The number to convert (0-255)
 * @returns The hex value as a string
 */
export function componentToHex(c: number): string {
	return c.toString(16).padStart(2, '0');
}

/**
 * Converts a hex color string (#RRGGBB) to a Color object.
 *
 * @param hexString Hex color value as string (format: #RRGGBB)
 * @returns An object with the color values r, g, and b
 */
export function hexToRgb(hexString: string): Color {
	if (!/^#[0-9a-fA-F]{6}$/i.test(hexString)) {
		throw new Error('Invalid hex string');
	}
	return {
		r: parseInt(hexString.slice(1, 3), 16),
		g: parseInt(hexString.slice(3, 5), 16),
		b: parseInt(hexString.slice(5, 7), 16),
	};
}

/**
 * Color object with values for red, green, and blue
 */
type Color = {
	r: number;
	g: number;
	b: number;
};
