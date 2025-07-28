/**
 * Konvertiert eine Zahl (<255) in einen zweistelligen Hex-String für Farbwerte.
 *
 * @param c Die Zahl, die konvertiert werden soll (0-255)
 * @returns Der Hex-Wert als String
 */
export function componentToHex(c: number): string {
	const hex = c.toString(16);
	return hex.length == 1 ? `0${hex}` : hex;
}

/**
 * Wandelt einen Hex-Farbstring (#RRGGBB) in ein Color-Objekt um.
 *
 * @param hexString Hex-Farbwert als String (Format: #RRGGBB)
 * @returns Ein Objekt mit den Farbwerten r, g und b
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
 * Farbobjekt mit Werten für Rot, Grün und Blau
 */
type Color = {
	r: number;
	g: number;
	b: number;
};
