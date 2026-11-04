/**
 * Tracks values sent to devices until a status report confirms them.
 *
 * A status report can still reflect the state from before a command, either because the
 * status request crossed the command on the network or because the device needs a moment
 * to apply it. Without tracking, such a stale report would overwrite the value the user
 * just set and the state would briefly jump back.
 */
export class PendingCommands<T extends object> {
    private readonly pending = new Map<string, { value: unknown; expiresAt: number }>();

    /**
     * Create a new tracker.
     *
     * @param timeoutMs How long a differing reported value is withheld after a command.
     * @param now Clock returning the current time in milliseconds (injectable for tests).
     */
    constructor(
        private readonly timeoutMs: number,
        private readonly now: () => number = () => Date.now(),
    ) {}

    /**
     * Remember a value that was just sent to a device.
     *
     * @param ip The device IP address.
     * @param field The status field the command changes.
     * @param value The value the device is expected to report.
     */
    public expect<K extends keyof T>(ip: string, field: K, value: T[K]): void {
        this.pending.set(this.key(ip, field), { value, expiresAt: this.now() + this.timeoutMs });
    }

    /**
     * Remove fields from a status report that contradict a command still awaiting confirmation.
     * A field is confirmed once the device reports the expected value; after the timeout the
     * reported value is accepted again, so a command the device ignored does not hide its state.
     *
     * @param ip The device IP address.
     * @param status The status as reported by the device.
     * @returns The status without fields that are still awaiting confirmation.
     */
    public filter(ip: string, status: T): Partial<T> {
        const result: Partial<T> = {};
        for (const field of Object.keys(status) as (keyof T)[]) {
            const key = this.key(ip, field);
            const entry = this.pending.get(key);
            if (entry && entry.value !== status[field] && this.now() < entry.expiresAt) {
                continue;
            }
            this.pending.delete(key);
            result[field] = status[field];
        }
        return result;
    }

    private key(ip: string, field: keyof T): string {
        return `${ip}/${String(field)}`;
    }
}
