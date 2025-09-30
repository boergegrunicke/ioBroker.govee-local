
/**
 * Converts a number (0-255) to a two-digit hexadecimal string.
 * @param c The number to convert.
 * @returns Hex string (e.g. '0A', 'FF').
 */
export function componentToHex(c: number): string {
	const hex = c.toString(16).toUpperCase();
	return hex.padStart(2, '0');
}

/**
 * Converts a hex color string (e.g. '#FFAABB') to an RGB object.
 * @param hex The hex color string.
 * @returns An object with r, g, b properties.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
	// Remove leading # if present
	hex = hex.replace(/^#/, '');
	if (hex.length === 3) {
		hex = hex
			.split('')
			.map((x) => x + x)
			.join('');
	}
	const num = parseInt(hex, 16);
	return {
		r: (num >> 16) & 255,
		g: (num >> 8) & 255,
		b: num & 255,
	};
}
