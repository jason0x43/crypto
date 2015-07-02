import { ByteBuffer, utf8 } from 'dojo-core/encoding';
import { Endian, HashFunction, bytesToWords } from './base';
import { Key } from '../../crypto';

export default function hmac(hash: HashFunction, data: ByteBuffer, key: ByteBuffer): ByteBuffer {
	// Prepare the key
	if (key.length > 4 * 16 * 32) {
		key = hash(key);
	}

	// Set up the pads
	const numBytes = Math.ceil(hash.blockSize / 32) * 4;
	const ipad = new Array(numBytes);
	const opad = new Array(numBytes);

	for (let i = 0; i < numBytes; i++) {
		ipad[i] = key[i] ^ 0x36;
		opad[i] = key[i] ^ 0x5c;
	}

	// Make the final digest
	var r1 = hash(ipad.concat(data));
	var r2 = hash(opad.concat(r1));

	return r2;
};
