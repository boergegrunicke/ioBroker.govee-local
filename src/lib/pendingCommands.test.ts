import { expect } from 'chai';
import { PendingCommands } from './pendingCommands';

interface TestStatus {
    onOff: boolean;
    brightness: number;
}

describe('PendingCommands', () => {
    const ip = '192.168.1.100';
    let time: number;
    let tracker: PendingCommands<TestStatus>;

    beforeEach(() => {
        time = 0;
        tracker = new PendingCommands<TestStatus>(2000, () => time);
    });

    it('should pass a status through unchanged when no command is pending', () => {
        expect(tracker.filter(ip, { onOff: false, brightness: 50 })).to.deep.equal({ onOff: false, brightness: 50 });
    });

    it('should withhold a contradicting value while the command is pending', () => {
        tracker.expect(ip, 'onOff', true);
        time = 1999;

        expect(tracker.filter(ip, { onOff: false, brightness: 50 })).to.deep.equal({ brightness: 50 });
    });

    it('should pass the expected value through once the device confirms it', () => {
        tracker.expect(ip, 'onOff', true);

        expect(tracker.filter(ip, { onOff: true, brightness: 50 })).to.deep.equal({ onOff: true, brightness: 50 });
    });

    it('should stop tracking a command once it is confirmed', () => {
        tracker.expect(ip, 'onOff', true);
        tracker.filter(ip, { onOff: true, brightness: 50 });

        // A later change on the device itself (e.g. via the Govee app) must come through immediately
        expect(tracker.filter(ip, { onOff: false, brightness: 50 })).to.deep.equal({ onOff: false, brightness: 50 });
    });

    it('should accept the reported value after the timeout, so an ignored command does not hide the real state', () => {
        tracker.expect(ip, 'onOff', true);
        time = 2000;

        expect(tracker.filter(ip, { onOff: false, brightness: 50 })).to.deep.equal({ onOff: false, brightness: 50 });
    });

    it('should stop tracking a command once it has expired', () => {
        tracker.expect(ip, 'onOff', true);
        time = 2000;
        tracker.filter(ip, { onOff: false, brightness: 50 });
        time = 0;

        expect(tracker.filter(ip, { onOff: false, brightness: 50 })).to.deep.equal({ onOff: false, brightness: 50 });
    });

    it('should restart the timeout when a new command for the same field is sent', () => {
        tracker.expect(ip, 'brightness', 30);
        time = 1500;
        tracker.expect(ip, 'brightness', 60);
        time = 3000;

        expect(tracker.filter(ip, { onOff: true, brightness: 30 })).to.deep.equal({ onOff: true });
    });

    it('should track devices independently', () => {
        tracker.expect(ip, 'onOff', true);

        expect(tracker.filter('192.168.1.101', { onOff: false, brightness: 50 })).to.deep.equal({
            onOff: false,
            brightness: 50,
        });
    });
});
