/**
 * A port of Paul Johnstone's MD5 implementation
 * http://pajhome.org.uk/crypt/md5/index.html
 *
 * Copyright (C) Paul Johnston 1999 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 *
 * Original Dojo port by Tom Trenka
 */

import { Endian, HashFunction, MathFunction, addWords, bytesToWords, wordsToBytes } from './base';
import { ByteBuffer } from 'dojo-core/encoding';

//	MD5 rounds functions
const R: MathFunction = function (n, c) {
	return (n << c) | (n >>> (32 - c ));
}
const C: MathFunction = function (q, a, b, x, s, t) {
	return addWords(R(addWords(addWords(a, q), addWords(x, t)), s), b);
}
const FF: MathFunction = function (a, b, c, d, x, s, t) {
	return C((b & c) | (~b & d), a, b, x, s, t);
}
const GG: MathFunction = function (a, b, c, d, x, s, t) {
	return C((b & d) | (c & ~d), a, b, x, s, t);
}
const HH: MathFunction = function (a, b, c, d, x, s, t) {
	return C(b ^ c ^ d, a, b, x, s, t);
}
const II: MathFunction = function (a, b, c, d, x, s, t) {
	return C(c ^ (b | ~d), a, b, x, s, t);
}

/**
 * The core MD5 function
 */
const md5 = <HashFunction> function (bytes: ByteBuffer): ByteBuffer {
	const numBits = bytes.length * 8;
	const words = bytesToWords(bytes, Endian.Little);

	// Pad input
    words[numBits >> 5] |= 0x80 << (numBits % 32);
    words[(((numBits + 64) >>> 9) << 4) + 14] = numBits;

    let a =  1732584193;
    let b = -271733879;
    let c = -1732584194;
    let d =  271733878;

	const numWords = words.length;
    for (let i = 0; i < numWords; i += 16) {
		const olda = a;
		const oldb = b;
		const oldc = c;
		const oldd = d;

		a = FF(a, b, c, d, words[i +  0], 7 , -680876936);
		d = FF(d, a, b, c, words[i +  1], 12, -389564586);
		c = FF(c, d, a, b, words[i +  2], 17,  606105819);
		b = FF(b, c, d, a, words[i +  3], 22, -1044525330);
		a = FF(a, b, c, d, words[i +  4], 7 , -176418897);
		d = FF(d, a, b, c, words[i +  5], 12,  1200080426);
		c = FF(c, d, a, b, words[i +  6], 17, -1473231341);
		b = FF(b, c, d, a, words[i +  7], 22, -45705983);
		a = FF(a, b, c, d, words[i +  8], 7 ,  1770035416);
		d = FF(d, a, b, c, words[i +  9], 12, -1958414417);
		c = FF(c, d, a, b, words[i + 10], 17, -42063);
		b = FF(b, c, d, a, words[i + 11], 22, -1990404162);
		a = FF(a, b, c, d, words[i + 12], 7 ,  1804603682);
		d = FF(d, a, b, c, words[i + 13], 12, -40341101);
		c = FF(c, d, a, b, words[i + 14], 17, -1502002290);
		b = FF(b, c, d, a, words[i + 15], 22,  1236535329);

		a = GG(a, b, c, d, words[i +  1], 5 , -165796510);
		d = GG(d, a, b, c, words[i +  6], 9 , -1069501632);
		c = GG(c, d, a, b, words[i + 11], 14,  643717713);
		b = GG(b, c, d, a, words[i +  0], 20, -373897302);
		a = GG(a, b, c, d, words[i +  5], 5 , -701558691);
		d = GG(d, a, b, c, words[i + 10], 9 ,  38016083);
		c = GG(c, d, a, b, words[i + 15], 14, -660478335);
		b = GG(b, c, d, a, words[i +  4], 20, -405537848);
		a = GG(a, b, c, d, words[i +  9], 5 ,  568446438);
		d = GG(d, a, b, c, words[i + 14], 9 , -1019803690);
		c = GG(c, d, a, b, words[i +  3], 14, -187363961);
		b = GG(b, c, d, a, words[i +  8], 20,  1163531501);
		a = GG(a, b, c, d, words[i + 13], 5 , -1444681467);
		d = GG(d, a, b, c, words[i +  2], 9 , -51403784);
		c = GG(c, d, a, b, words[i +  7], 14,  1735328473);
		b = GG(b, c, d, a, words[i + 12], 20, -1926607734);

		a = HH(a, b, c, d, words[i +  5], 4 , -378558);
		d = HH(d, a, b, c, words[i +  8], 11, -2022574463);
		c = HH(c, d, a, b, words[i + 11], 16,  1839030562);
		b = HH(b, c, d, a, words[i + 14], 23, -35309556);
		a = HH(a, b, c, d, words[i +  1], 4 , -1530992060);
		d = HH(d, a, b, c, words[i +  4], 11,  1272893353);
		c = HH(c, d, a, b, words[i +  7], 16, -155497632);
		b = HH(b, c, d, a, words[i + 10], 23, -1094730640);
		a = HH(a, b, c, d, words[i + 13], 4 ,  681279174);
		d = HH(d, a, b, c, words[i +  0], 11, -358537222);
		c = HH(c, d, a, b, words[i +  3], 16, -722521979);
		b = HH(b, c, d, a, words[i +  6], 23,  76029189);
		a = HH(a, b, c, d, words[i +  9], 4 , -640364487);
		d = HH(d, a, b, c, words[i + 12], 11, -421815835);
		c = HH(c, d, a, b, words[i + 15], 16,  530742520);
		b = HH(b, c, d, a, words[i +  2], 23, -995338651);

		a = II(a, b, c, d, words[i +  0], 6 , -198630844);
		d = II(d, a, b, c, words[i +  7], 10,  1126891415);
		c = II(c, d, a, b, words[i + 14], 15, -1416354905);
		b = II(b, c, d, a, words[i +  5], 21, -57434055);
		a = II(a, b, c, d, words[i + 12], 6 ,  1700485571);
		d = II(d, a, b, c, words[i +  3], 10, -1894986606);
		c = II(c, d, a, b, words[i + 10], 15, -1051523);
		b = II(b, c, d, a, words[i +  1], 21, -2054922799);
		a = II(a, b, c, d, words[i +  8], 6 ,  1873313359);
		d = II(d, a, b, c, words[i + 15], 10, -30611744);
		c = II(c, d, a, b, words[i +  6], 15, -1560198380);
		b = II(b, c, d, a, words[i + 13], 21,  1309151649);
		a = II(a, b, c, d, words[i +  4], 6 , -145523070);
		d = II(d, a, b, c, words[i + 11], 10, -1120210379);
		c = II(c, d, a, b, words[i +  2], 15,  718787259);
		b = II(b, c, d, a, words[i +  9], 21, -343485551);

		a = addWords(a, olda);
		b = addWords(b, oldb);
		c = addWords(c, oldc);
		d = addWords(d, oldd);
	}

	return wordsToBytes([ a, b, c, d ], Endian.Little);
}
md5.blockSize = 512;

export default md5;
