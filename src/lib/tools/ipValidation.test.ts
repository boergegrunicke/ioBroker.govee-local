import { expect } from 'chai';
import { filterValidIpAddresses, isValidIpAddress, validateIpAddresses } from './ipValidation';

describe('IP Validation Tools', () => {
	describe('isValidIpAddress', () => {
		it('should accept valid IPv4 addresses', () => {
			const validIps = [
				'0.0.0.0',
				'127.0.0.1',
				'192.168.1.1',
				'255.255.255.255',
				'10.0.0.1',
				'172.16.0.1',
				'8.8.8.8',
				'1.2.3.4',
			];

			validIps.forEach((ip) => {
				expect(isValidIpAddress(ip)).to.be.true;
			});
		});

		it('should reject invalid IPv4 addresses', () => {
			const invalidIps = [
				'not-an-ip',
				'999.999.999.999',
				'192.168.1',
				'192.168.1.256',
				'hello world',
				'192.168.1.1.1',
				'abc.def.ghi.jkl',
				'192.168.-1.1',
				'256.1.1.1',
				'1.256.1.1',
				'1.1.256.1',
				'1.1.1.256',
				'',
				'   ',
				'192.168.1.',
				'.192.168.1.1',
				'192..168.1.1',
			];

			invalidIps.forEach((ip) => {
				expect(isValidIpAddress(ip)).to.be.false;
			});
		});

		it('should handle edge cases', () => {
			expect(isValidIpAddress('0.0.0.0')).to.be.true;
			expect(isValidIpAddress('255.255.255.255')).to.be.true;
			expect(isValidIpAddress('192.168.001.001')).to.be.true; // Leading zeros are allowed
		});
	});

	describe('filterValidIpAddresses', () => {
		it('should filter out invalid IP addresses', () => {
			const mixedIps = ['192.168.1.1', 'invalid', '10.0.0.1', '999.999.999.999', '172.16.0.5'];
			const result = filterValidIpAddresses(mixedIps);

			expect(result).to.have.lengthOf(3);
			expect(result).to.include('192.168.1.1');
			expect(result).to.include('10.0.0.1');
			expect(result).to.include('172.16.0.5');
		});

		it('should trim whitespace by default', () => {
			const ipsWithWhitespace = ['  192.168.1.1  ', '\t10.0.0.1\n', '  172.16.0.5'];
			const result = filterValidIpAddresses(ipsWithWhitespace);

			expect(result).to.have.lengthOf(3);
			expect(result).to.include('192.168.1.1');
			expect(result).to.include('10.0.0.1');
			expect(result).to.include('172.16.0.5');
		});

		it('should skip empty entries', () => {
			const ipsWithEmpty = ['192.168.1.1', '', '   ', '10.0.0.1'];
			const result = filterValidIpAddresses(ipsWithEmpty);

			expect(result).to.have.lengthOf(2);
			expect(result).to.include('192.168.1.1');
			expect(result).to.include('10.0.0.1');
		});

		it('should not trim whitespace when disabled', () => {
			const ipsWithWhitespace = ['  192.168.1.1  ', '10.0.0.1'];
			const result = filterValidIpAddresses(ipsWithWhitespace, false);

			expect(result).to.have.lengthOf(1);
			expect(result).to.include('10.0.0.1');
		});

		it('should return empty array for all invalid inputs', () => {
			const invalidIps = ['invalid', 'not-an-ip', '999.999.999.999'];
			const result = filterValidIpAddresses(invalidIps);

			expect(result).to.be.an('array').that.is.empty;
		});
	});

	describe('validateIpAddresses', () => {
		it('should separate valid and invalid IP addresses', () => {
			const mixedIps = ['192.168.1.1', 'invalid', '10.0.0.1', '999.999.999.999', '172.16.0.5'];
			const result = validateIpAddresses(mixedIps);

			expect(result.valid).to.have.lengthOf(3);
			expect(result.valid).to.include('192.168.1.1');
			expect(result.valid).to.include('10.0.0.1');
			expect(result.valid).to.include('172.16.0.5');

			expect(result.invalid).to.have.lengthOf(2);
			expect(result.invalid).to.include('invalid');
			expect(result.invalid).to.include('999.999.999.999');
		});

		it('should trim whitespace in both valid and invalid arrays', () => {
			const ipsWithWhitespace = ['  192.168.1.1  ', '  invalid  ', '\t10.0.0.1\n'];
			const result = validateIpAddresses(ipsWithWhitespace);

			expect(result.valid).to.include('192.168.1.1');
			expect(result.valid).to.include('10.0.0.1');
			expect(result.invalid).to.include('invalid');
		});

		it('should skip empty entries in both arrays', () => {
			const ipsWithEmpty = ['192.168.1.1', '', '   ', 'invalid'];
			const result = validateIpAddresses(ipsWithEmpty);

			expect(result.valid).to.have.lengthOf(1);
			expect(result.invalid).to.have.lengthOf(1);
		});

		it('should handle all valid IPs', () => {
			const validIps = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];
			const result = validateIpAddresses(validIps);

			expect(result.valid).to.have.lengthOf(3);
			expect(result.invalid).to.be.an('array').that.is.empty;
		});

		it('should handle all invalid IPs', () => {
			const invalidIps = ['invalid', 'not-an-ip', '999.999.999.999'];
			const result = validateIpAddresses(invalidIps);

			expect(result.valid).to.be.an('array').that.is.empty;
			expect(result.invalid).to.have.lengthOf(3);
		});

		it('should not trim when disabled', () => {
			const ipsWithWhitespace = ['  192.168.1.1  ', 'invalid', '10.0.0.1'];
			const result = validateIpAddresses(ipsWithWhitespace, false);

			expect(result.valid).to.have.lengthOf(1);
			expect(result.valid).to.include('10.0.0.1');
			expect(result.invalid).to.have.lengthOf(2);
		});
	});
});
