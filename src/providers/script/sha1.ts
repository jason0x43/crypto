/*
 * A port of Paul Johnstone's SHA1 implementation
 *
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 *
 * Dojo port by Tom Trenka
 */

import { ByteBuffer } from 'dojo-core/encoding';
import { HashFunction, MathFunction, addWords, bytesToWords, wordsToBytes } from './base';

const MASK = 0xFF;

const R: MathFunction = function (n, c) {
	return (n << c) | (n >>> (32 - c));
}
const FT: MathFunction = function (t, b, c, d) {
	if (t < 20) {
		return (b & c) | (~b & d);
	}
	if (t < 40) {
		return b ^ c ^ d;
	}
	if (t < 60) {
		return (b & c) | (b & d) | (c & d);
	}
	return b ^ c ^ d;
}
const KT: MathFunction = function (t) {
	return (t < 20) ? 1518500249 : (t < 40) ? 1859775393 : (t < 60) ? -1894007588 : -899497514;
}

const sha1 = <HashFunction> function (bytes: ByteBuffer): ByteBuffer {
	const numBits = bytes.length * 8;
	const words = bytesToWords(bytes);

	// Pad the input
	words[numBits >> 5] |= 0x80 << (24 - numBits % 32);
	words[((numBits + 64 >> 9) << 4) + 15] = numBits;

	const w = new Array(80);
	let a =  1732584193;
	let b = -271733879;
	let c = -1732584194;
	let d =  271733878;
	let e = -1009589776;

	const numWords = words.length;
	for (let i = 0; i < numWords; i += 16) {
		const olda = a;
		const oldb = b;
		const oldc = c;
		const oldd = d;
		const olde = e;

		for (let j = 0; j < 80; j++) {
			if (j < 16) {
				w[j] = words[i + j];
			}
			else {
				w[j] = R(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
			}

			const t = addWords(addWords(R(a, 5), FT(j, b, c, d)), addWords(addWords(e, w[j]), KT(j)));
			e = d; 
			d = c;
			c = R(b, 30);
			b = a;
			a = t;
		}

		a = addWords(a, olda);
		b = addWords(b, oldb);
		c = addWords(c, oldc);
		d = addWords(d, oldd);
		e = addWords(e, olde);
	}

	return wordsToBytes([ a, b, c, d, e ]);
}
sha1.blockSize = 512;

export default sha1;
