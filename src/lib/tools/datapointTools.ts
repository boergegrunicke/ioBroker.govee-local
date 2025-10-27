/**
 * Returns the description for device information datapoints.
 * This helps to keep the main adapter class clean and centralizes datapoint metadata.
 *
 * @param name The name of the parameter retrieved from the device
 * @returns The description to be set to the datapoint
 */
const datapointDescriptions: Record<string, string> = {
	model: 'Specific model of the Lamp',
	ip: 'IP address of the Lamp',
	bleVersionHard: 'Bluetooth Low Energy Hardware Version',
	bleVersionSoft: 'Bluetooth Low Energy Software Version',
	wifiVersionHard: 'WiFi Hardware Version',
	wifiVersionSoft: 'WiFi Software Version',
};

/**
 * Returns the description for device information datapoints.
 * This helps to keep the main adapter class clean and centralizes datapoint metadata.
 *
 * @param name The name of the parameter retrieved from the device
 * @returns The description to be set to the datapoint
 */
export function getDatapointDescription(name: string): string {
	const desc = datapointDescriptions[name];
	if (desc !== undefined) {
		return desc;
	}
	if (process.env.NODE_ENV !== 'production') {
		console.debug(`[datapointTools] Unknown datapoint: ${name}`);
	}
	return '';
}
