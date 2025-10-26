/**
 * Returns the description for device information datapoints.
 * This helps to keep the main adapter class clean and centralizes datapoint metadata.
 *
 * @param name The name of the parameter retrieved from the device
 * @returns The description to be set to the datapoint
 */
export function getDatapointDescription(name: string): string {
	switch (name) {
		case 'model':
			return 'Specific model of the Lamp';
		case 'ip':
			return 'IP address of the Lamp';
		case 'bleVersionHard':
			return 'Bluetooth Low Energy Hardware Version';
		case 'bleVersionSoft':
			return 'Bluetooth Low Energy Software Version';
		case 'wifiVersionHard':
			return 'WiFi Hardware Version';
		case 'wifiVersionSoft':
			return 'WiFi Software Version';
		default:
			// Log unknown datapoints for easier debugging
			if (process.env.NODE_ENV !== 'production') {
				console.debug(`[datapointTools] Unknown datapoint: ${name}`);
			}
			return '';
	}
}
