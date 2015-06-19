import { HashFunction } from './base.ts';

export default function hmac(hash: HashFunction, data: ByteBuffer, key: Key): ByteBuffer {
	// Prepare the key
	let wa = key.data;
	if (wa.length > 16 * 32) {
		wa = hash(wa);
	}

	// Set up the pads
	const numWords = hash.blocksize / 32;
	const ipad = new Array(numWords);
	const opad = new Array(numWords);

	for (let i = 0; i < numWords; i++) {
		ipad[i] = wa[i] ^ 0x36363636;
		opad[i] = wa[i] ^ 0x5c5c5c5c;
	}

	// Make the final digest
	var r1 = hash(ipad.concat(data));
	var r2 = hash(opad.concat(r1));

	return r2;
};
