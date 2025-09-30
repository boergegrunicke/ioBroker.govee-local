/**
 * Configuration options for the GoveeService.
 */
export interface GoveeServiceOptions {
	/** Network interface to bind UDP socket to. */
	interface: string;
	/** Interval in seconds for device search. */
	searchInterval: number;
	/** Interval in seconds for device status refresh. */
	deviceStatusRefreshInterval: number;
	/** Enable extended debug/info logging. */
	extendedLogging?: boolean;
	/** RegExp for forbidden characters in device names. */
	forbiddenChars?: RegExp;
	/** Logger object with debug/info/error methods. */
	logger?: { debug: (msg: string) => void; info: (msg: string) => void; error: (msg: string) => void };
}
