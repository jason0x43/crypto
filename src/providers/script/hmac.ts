import { ByteBuffer, utf8 } from 'dojo-core/encoding';
import { HashFunction } from './base';
import { Key } from '../../crypto';

export default function hmac(hash: HashFunction, data: ByteBuffer, key: ByteBuffer): ByteBuffer {
	// Prepare the key
	if (key.length > 16 * 32) {
		key = hash(key);
	}

	// Set up the pads
	const numWords = Math.ceil(hash.blockSize / 32);
	console.log('hash:', hash);
	console.log('numWords: ' + numWords);
	const ipad = new Array(numWords);
	const opad = new Array(numWords);

	for (let i = 0; i < numWords; i++) {
		ipad[i] = key[i] ^ 0x36363636;
		opad[i] = key[i] ^ 0x5c5c5c5c;
	}

	// Make the final digest
	var r1 = hash(ipad.concat(data));
	var r2 = hash(opad.concat(r1));

	return r2;
};
