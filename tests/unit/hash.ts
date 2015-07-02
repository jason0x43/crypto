import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import * as crypto from 'src/crypto';
import * as script from 'src/providers/script';
import { ascii, base64, hex, utf8 } from 'dojo-core/encoding';

type Suite = { [ key: string ]: any };

function addTests(
	suite: Suite,
	setProvider: (provider: any) => void,
	getHash: (algorithm: string) => crypto.HashFunction,
	provider: string,
	algorithm: string,
	input: string,
	expected: number[]
) {
	let hash: crypto.HashFunction;

	suite[`${provider} - ${algorithm}`] = {
		direct() {
			// clear the provider so we can try out the deferred #hash
			setProvider(undefined);
			hash = getHash(algorithm);
			return hash(input).then(function (result) {
				assert.deepEqual(toArray(result), expected);
			});
		},

		encoded: {
			utf8() {
				return hash(input, utf8).then(function (result) {
					assert.deepEqual(toArray(result), expected);
				});
			},

			ascii() {
				return hash(input, ascii).then(function (result) {
					assert.deepEqual(toArray(result), expected);
				});
			},

			base64() {
				const inputBytes = utf8.encode(input);
				const input64 = base64.decode(inputBytes);
				return hash(input64, base64).then(function (result) {
					assert.deepEqual(toArray(result), expected);
				});
			},

			hex() {
				const inputBytes = utf8.encode(input);
				const inputHex = hex.decode(inputBytes);
				return hash(inputHex, hex).then(function (result) {
					assert.deepEqual(toArray(result), expected);
				});
			}
		},

		stream: {
			'full run': {
				direct() {
					// Clear the provider so we can try out the deferred #create
					setProvider(undefined);
					hash = getHash(algorithm);

					const hasher = hash.create();
					hasher.write(input);
					hasher.close();
					return hasher.digest.then(function (result) {
						assert.deepEqual(toArray(result), expected);
					});
				},

				encoded() {
					const hasher = hash.create(utf8);
					hasher.write(input);
					hasher.close();
					return hasher.digest.then(function (result) {
						assert.deepEqual(toArray(result), expected);
					});
				},

				'after direct hash'() {
					// Get a hash, use it, then call create to test the `realHash` branch
					hash = getHash(algorithm);
					return hash('').then(function () {
						const hasher = hash.create(utf8);
						hasher.write(input);
						hasher.close();
						return hasher.digest.then(function (result) {
							assert.deepEqual(toArray(result), expected);
						});
					});
				}
			},

			start() {
				// Reset the provider so we'll call the wrapper's start
				setProvider(undefined);
				hash = getHash(algorithm);

				// Just check that it doesn't throw
				const hasher = hash.create();
				hasher.start(function () {});
			},

			aborted() {
				// Reset the provider so we'll call the wrapper's abort
				setProvider(undefined);
				hash = getHash(algorithm);

				const hasher = hash.create();
				hasher.abort(new Error('canceled'));
				return hasher.digest.then(
					function (result) {
						assert(false, 'hashature should have rejected');
					}, function (reason) {
						assert.strictEqual(reason.message, 'canceled');
					}
				).then(function () {
					// Call abort a second time to verify that it doesn't throw
					hasher.abort(new Error('ignored'));
				}).then(function () {
					// Call after abort to verify that it doesn't throw
					hasher.close();
				}).then(function () {
					// Call after abort to verify that it doesn't throw
					hasher.write('');
				});
			}
		}
	};
}

function toArray(buffer: crypto.Data): number[] {
	return Array.prototype.slice.call(buffer);
}

const suite: Suite = {
	name: 'hash',

	'invalid algorithm'() {
		crypto.setProvider(undefined);
		assert.throws(function () {
			crypto.getHash('foo');
		}, /^invalid algorithm/);
	}
};

// Test the platform default provider

addTests(suite, crypto.setProvider.bind(crypto), crypto.getHash.bind(crypto), 'default',
	'md5',
	'The rain in Spain falls mainly on the plain.',
	[
		0x39, 0x48, 0x71, 0x6D, 0x56, 0x75, 0x32, 0xD9,
		0xAE, 0xE3, 0x3C, 0x7D, 0x2F, 0x34, 0xB9, 0x70
	]
);
addTests(suite, crypto.setProvider.bind(crypto), crypto.getHash.bind(crypto), 'default',
	'sha1',
	'abc',
	[
		0xA9, 0x99, 0x3E, 0x36, 0x47, 0x06, 0x81, 0x6A,
		0xBA, 0x3E, 0x25, 0x71, 0x78, 0x50, 0xC2, 0x6C,
		0x9C, 0xD0, 0xD8, 0x9D
	]
);
addTests(suite, crypto.setProvider.bind(crypto), crypto.getHash.bind(crypto), 'default',
	'sha256',
	'abc',
	[
		0xBA, 0x78, 0x16, 0xBF, 0x8F, 0x01, 0xCF, 0xEA,
		0x41, 0x41, 0x40, 0xDE, 0x5D, 0xAE, 0x22, 0x23,
		0xB0, 0x03, 0x61, 0xA3, 0x96, 0x17, 0x7A, 0x9C,
		0xB4, 0x10, 0xFF, 0x61, 0xF2, 0x00, 0x15, 0xAD
	]
);

// Test the script provider specifically

addTests(suite, () => null, script.getHash.bind(script), 'script',
	'sha224',
	'abc',
	[
		0x23, 0x09, 0x7D, 0x22, 0x34, 0x05, 0xD8, 0x22,
		0x86, 0x42, 0xA4, 0x77, 0xBD, 0xA2, 0x55, 0xB3,
		0x2A, 0xAD, 0xBC, 0xE4, 0xBD, 0xA0, 0xB3, 0xF7,
		0xE3, 0x6C, 0x9D, 0xA7
	]
);
addTests(suite, () => null, script.getHash.bind(script), 'script',
	'sha384',
	'abc',
	[
		0xCB, 0x00, 0x75, 0x3F, 0x45, 0xA3, 0x5E, 0x8B,
		0xB5, 0xA0, 0x3D, 0x69, 0x9A, 0xC6, 0x50, 0x07,
		0x27, 0x2C, 0x32, 0xAB, 0x0E, 0xDE, 0xD1, 0x63,
		0x1A, 0x8B, 0x60, 0x5A, 0x43, 0xFF, 0x5B, 0xED,
		0x80, 0x86, 0x07, 0x2B, 0xA1, 0xE7, 0xCC, 0x23,
		0x58, 0xBA, 0xEC, 0xA1, 0x34, 0xC8, 0x25, 0xA7
	]
);
addTests(suite, () => null, script.getHash.bind(script), 'script',
	'sha512',
	'abc',
	[
		0xDD, 0xAF, 0x35, 0xA1, 0x93, 0x61, 0x7A, 0xBA,
		0xCC, 0x41, 0x73, 0x49, 0xAE, 0x20, 0x41, 0x31,
		0x12, 0xE6, 0xFA, 0x4E, 0x89, 0xA9, 0x7E, 0xA2,
		0x0A, 0x9E, 0xEE, 0xE6, 0x4B, 0x55, 0xD3, 0x9A, 
		0x21, 0x92, 0x99, 0x2A, 0x27, 0x4F, 0xC1, 0xA8,
		0x36, 0xBA, 0x3C, 0x23, 0xA3, 0xFE, 0xEB, 0xBD,
		0x45, 0x4D, 0x44, 0x23, 0x64, 0x3C, 0xE8, 0x0E,
		0x2A, 0x9A, 0xC9, 0x4F, 0xA5, 0x4C, 0xA4, 0x9F
	]
);

registerSuite(suite);
