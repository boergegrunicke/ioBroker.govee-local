/**
 * Utility functions for IP address validation.
 */

/**
 * Validates if a string is a valid IPv4 address.
 *
 * @param ip The IP address string to validate.
 * @returns true if valid IPv4 address, false otherwise.
 *
 * @example
 * ```typescript
 * isValidIpAddress('192.168.1.1'); // true
 * isValidIpAddress('255.255.255.255'); // true
 * isValidIpAddress('256.1.1.1'); // false
 * isValidIpAddress('not-an-ip'); // false
 * ```
 */
export function isValidIpAddress(ip: string): boolean {
	// IPv4 pattern: four octets (0-255) separated by dots
	const ipv4Pattern =
		/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
	return ipv4Pattern.test(ip);
}

/**
 * Filters an array of IP addresses, returning only valid ones.
 * Invalid entries are skipped silently.
 *
 * @param ipAddresses Array of IP address strings to filter.
 * @param trimWhitespace If true, trims whitespace from each entry before validation (default: true).
 * @returns Array containing only valid IP addresses.
 *
 * @example
 * ```typescript
 * filterValidIpAddresses(['192.168.1.1', 'invalid', '10.0.0.1']); // ['192.168.1.1', '10.0.0.1']
 * filterValidIpAddresses(['  192.168.1.1  ', '']); // ['192.168.1.1']
 * ```
 */
export function filterValidIpAddresses(ipAddresses: string[], trimWhitespace = true): string[] {
	const validIps: string[] = [];

	for (const ip of ipAddresses) {
		if (!ip || (trimWhitespace && ip.trim().length === 0)) {
			continue;
		}

		const processedIp = trimWhitespace ? ip.trim() : ip;

		if (isValidIpAddress(processedIp)) {
			validIps.push(processedIp);
		}
	}

	return validIps;
}

/**
 * Validates and sanitizes an array of IP addresses.
 * Returns an object with valid IPs and invalid entries.
 *
 * @param ipAddresses Array of IP address strings to validate.
 * @param trimWhitespace If true, trims whitespace from each entry before validation (default: true).
 * @returns Object containing arrays of valid and invalid IP addresses.
 *
 * @example
 * ```typescript
 * const result = validateIpAddresses(['192.168.1.1', 'invalid', '10.0.0.1']);
 * // result.valid: ['192.168.1.1', '10.0.0.1']
 * // result.invalid: ['invalid']
 * ```
 */
export function validateIpAddresses(
	ipAddresses: string[],
	trimWhitespace = true,
): { valid: string[]; invalid: string[] } {
	const valid: string[] = [];
	const invalid: string[] = [];

	for (const ip of ipAddresses) {
		if (!ip || (trimWhitespace && ip.trim().length === 0)) {
			continue;
		}

		const processedIp = trimWhitespace ? ip.trim() : ip;

		if (isValidIpAddress(processedIp)) {
			valid.push(processedIp);
		} else {
			invalid.push(processedIp);
		}
	}

	return { valid, invalid };
}
