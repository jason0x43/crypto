import { ByteBuffer, utf8 } from 'dojo-core/encoding';
import Promise from 'dojo-core/Promise';
import { HashFunction, bytesToWords, wordsToBytes } from './base';
import { Data } from '../../crypto';

interface Int64 {
	high: number,
	low: number
}

function int64(high: number, low: number): Int64 {
	return { high, low }
}

/**
 * Copies a value.
 */
function copy(dst: Int64, src: Int64): void {
	dst.high = src.high;
	dst.low = src.low;
}

/**
 * Right-rotates a value.
 */
function rotateRight(dst: Int64, src: Int64, shift: number) {
	dst.low = (src.low >>> shift) | (src.high << (32 - shift));
	dst.high = (src.high >>> shift) | (src.low << (32 - shift));
}

/**
 * Reverses the dwords of the source and then rotates right by shift.
 */
function reverseRotateRight(dst: Int64, src: Int64, shift: number) {
	dst.low = (src.high >>> shift) | (src.low << (32 - shift));
	dst.high = (src.low >>> shift) | (src.high << (32 - shift));
}

/**
 * Bitwise-shifts right a 64-bit number by shift.
 */
function shiftRight(dst: Int64, src: Int64, shift: number) {
	dst.low = (src.low >>> shift) | (src.high << (32 - shift));
	dst.high = (src.high >>> shift);
}

/**
 * Adds two 64-bit numbers
 */
function add(dst: Int64, x: Int64, y: Int64) {
	var w0 = (x.low & 0xffff) + (y.low & 0xffff);
	var w1 = (x.low >>> 16) + (y.low >>> 16) + (w0 >>> 16);
	var w2 = (x.high & 0xffff) + (y.high & 0xffff) + (w1 >>> 16);
	var w3 = (x.high >>> 16) + (y.high >>> 16) + (w2 >>> 16);
	dst.low = (w0 & 0xffff) | (w1 << 16);
	dst.high = (w2 & 0xffff) | (w3 << 16);
}

/**
 * Adds four 64-bit numbers
 */
function add4(dst: Int64, a: Int64, b: Int64, c: Int64, d: Int64){
	var w0 = (a.low & 0xffff) + (b.low & 0xffff) + (c.low & 0xffff) + (d.low & 0xffff);
	var w1 = (a.low >>> 16) + (b.low >>> 16) + (c.low >>> 16) + (d.low >>> 16) + (w0 >>> 16);
	var w2 = (a.high & 0xffff) + (b.high & 0xffff) + (c.high & 0xffff) + (d.high & 0xffff) + (w1 >>> 16);
	var w3 = (a.high >>> 16) + (b.high >>> 16) + (c.high >>> 16) + (d.high >>> 16) + (w2 >>> 16);
	dst.low = (w0 & 0xffff) | (w1 << 16);
	dst.high = (w2 & 0xffff) | (w3 << 16);
}

/**
 * Adds five 64-bit numbers
 */
function add5(dst: Int64, a: Int64, b: Int64, c: Int64, d: Int64, e: Int64) {
	var w0 = (a.low & 0xffff) + (b.low & 0xffff) + (c.low & 0xffff) + (d.low & 0xffff) + (e.low & 0xffff);
	var w1 = (a.low >>> 16) + (b.low >>> 16) + (c.low >>> 16) + (d.low >>> 16) + (e.low >>> 16) + (w0 >>> 16);
	var w2 = (a.high & 0xffff) + (b.high & 0xffff) + (c.high & 0xffff) + (d.high & 0xffff) + (e.high & 0xffff) + (w1 >>> 16);
	var w3 = (a.high >>> 16) + (b.high >>> 16) + (c.high >>> 16) + (d.high >>> 16) + (e.high >>> 16) + (w2 >>> 16);
	dst.low = (w0 & 0xffff) | (w1 << 16);
	dst.high = (w2 & 0xffff) | (w3 << 16);
}

// constant K array
const K = [
	int64(0x428a2f98, 0xd728ae22), int64(0x71374491, 0x23ef65cd), int64(0xb5c0fbcf, 0xec4d3b2f), int64(0xe9b5dba5, 0x8189dbbc), 
	int64(0x3956c25b, 0xf348b538), int64(0x59f111f1, 0xb605d019), int64(0x923f82a4, 0xaf194f9b), int64(0xab1c5ed5, 0xda6d8118), 
	int64(0xd807aa98, 0xa3030242), int64(0x12835b01, 0x45706fbe), int64(0x243185be, 0x4ee4b28c), int64(0x550c7dc3, 0xd5ffb4e2), 
	int64(0x72be5d74, 0xf27b896f), int64(0x80deb1fe, 0x3b1696b1), int64(0x9bdc06a7, 0x25c71235), int64(0xc19bf174, 0xcf692694), 
	int64(0xe49b69c1, 0x9ef14ad2), int64(0xefbe4786, 0x384f25e3), int64(0x0fc19dc6, 0x8b8cd5b5), int64(0x240ca1cc, 0x77ac9c65), 
	int64(0x2de92c6f, 0x592b0275), int64(0x4a7484aa, 0x6ea6e483), int64(0x5cb0a9dc, 0xbd41fbd4), int64(0x76f988da, 0x831153b5), 
	int64(0x983e5152, 0xee66dfab), int64(0xa831c66d, 0x2db43210), int64(0xb00327c8, 0x98fb213f), int64(0xbf597fc7, 0xbeef0ee4), 
	int64(0xc6e00bf3, 0x3da88fc2), int64(0xd5a79147, 0x930aa725), int64(0x06ca6351, 0xe003826f), int64(0x14292967, 0x0a0e6e70), 
	int64(0x27b70a85, 0x46d22ffc), int64(0x2e1b2138, 0x5c26c926), int64(0x4d2c6dfc, 0x5ac42aed), int64(0x53380d13, 0x9d95b3df), 
	int64(0x650a7354, 0x8baf63de), int64(0x766a0abb, 0x3c77b2a8), int64(0x81c2c92e, 0x47edaee6), int64(0x92722c85, 0x1482353b), 
	int64(0xa2bfe8a1, 0x4cf10364), int64(0xa81a664b, 0xbc423001), int64(0xc24b8b70, 0xd0f89791), int64(0xc76c51a3, 0x0654be30), 
	int64(0xd192e819, 0xd6ef5218), int64(0xd6990624, 0x5565a910), int64(0xf40e3585, 0x5771202a), int64(0x106aa070, 0x32bbd1b8), 
	int64(0x19a4c116, 0xb8d2d0c8), int64(0x1e376c08, 0x5141ab53), int64(0x2748774c, 0xdf8eeb99), int64(0x34b0bcb5, 0xe19b48a8), 
	int64(0x391c0cb3, 0xc5c95a63), int64(0x4ed8aa4a, 0xe3418acb), int64(0x5b9cca4f, 0x7763e373), int64(0x682e6ff3, 0xd6b2b8a3), 
	int64(0x748f82ee, 0x5defb2fc), int64(0x78a5636f, 0x43172f60), int64(0x84c87814, 0xa1f0ab72), int64(0x8cc70208, 0x1a6439ec), 
	int64(0x90befffa, 0x23631e28), int64(0xa4506ceb, 0xde82bde9), int64(0xbef9a3f7, 0xb2c67915), int64(0xc67178f2, 0xe372532b), 
	int64(0xca273ece, 0xea26619c), int64(0xd186b8c7, 0x21c0c207), int64(0xeada7dd6, 0xcde0eb1e), int64(0xf57d4f7f, 0xee6ed178), 
	int64(0x06f067aa, 0x72176fba), int64(0x0a637dc5, 0xa2c898a6), int64(0x113f9804, 0xbef90dae), int64(0x1b710b35, 0x131c471b), 
	int64(0x28db77f5, 0x23047d84), int64(0x32caab7b, 0x40c72493), int64(0x3c9ebe0a, 0x15c9bebc), int64(0x431d67c4, 0x9c100d4c), 
	int64(0x4cc5d4be, 0xcb3e42b6), int64(0x597f299c, 0xfc657e2a), int64(0x5fcb6fab, 0x3ad6faec), int64(0x6c44198c, 0x4a475817)
];

/**
 * Calculate a hash based on 64-bit words
 *
 * @param data - The data to hash
 * @param hash - The initial hash value
 */
function sha64(bytes: ByteBuffer, _hash: number[]): ByteBuffer {
	let numBits = bytes.length * 8;
	const words = bytesToWords(bytes);

	//	prep the hash
	const hash: Int64[] = [];
	for (let i = 0, count = _hash.length; i < count; i += 2) {
		hash.push(int64(_hash[i], _hash[i + 1]));
	}

	//	initialize our variables
	const T1 = int64(0,0);
	const T2 = int64(0,0);
	const a = int64(0,0);
	const b = int64(0,0);
	const c = int64(0,0);
	const d = int64(0,0);
	const e = int64(0,0);
	const f = int64(0,0);
	const g = int64(0,0);
	const h = int64(0,0);
	const s0 = int64(0,0);
	const s1 = int64(0,0);
	const Ch = int64(0,0);
	const Maj = int64(0,0);
	const r1 = int64(0,0);
	const r2 = int64(0,0);
	const r3 = int64(0,0);

	const w = new Array(80);
	for (let i = 0; i < 80; i++) {
		w[i] = int64(0, 0);
	}

	// Pad the input
	words[numBits >> 5] |= 0x80 << (24 - numBits % 32);
	words[((numBits + 128 >> 10) << 5) + 31] = numBits;

	let numWords = words.length;
	for (let i = 0; i < numWords; i += 32) {
		copy(a, hash[0]);
		copy(b, hash[1]);
		copy(c, hash[2]);
		copy(d, hash[3]);
		copy(e, hash[4]);
		copy(f, hash[5]);
		copy(g, hash[6]);
		copy(h, hash[7]);

		for (let j = 0; j < 16; j++) {
			w[j].high = words[i + 2 * j];
			w[j].low = words[i + 2 * j + 1];
		}

		for (let j = 16; j < 80; j++) {
			//sigma1
			rotateRight(r1, w[j - 2], 19);
			reverseRotateRight(r2, w[j - 2], 29);
			shiftRight(r3, w[j - 2], 6);
			s1.low = r1.low ^ r2.low ^ r3.low;
			s1.high = r1.high ^ r2.high ^ r3.high;

			//sigma0
			rotateRight(r1, w[j - 15], 1);
			rotateRight(r2, w[j - 15], 8);
			shiftRight(r3, w[j - 15], 7);
			s0.low = r1.low ^ r2.low ^ r3.low;
			s0.high = r1.high ^ r2.high ^ r3.high;

			add4(w[j], s1, w[j - 7], s0, w[j - 16]);
		}

		for (let j = 0; j < 80; j++) {
			//Ch
			Ch.low = (e.low & f.low) ^ (~e.low & g.low);
			Ch.high = (e.high & f.high) ^ (~e.high & g.high);

			//Sigma1
			rotateRight(r1, e, 14);
			rotateRight(r2, e, 18);
			reverseRotateRight(r3, e, 9);
			s1.low = r1.low ^ r2.low ^ r3.low;
			s1.high = r1.high ^ r2.high ^ r3.high;

			//Sigma0
			rotateRight(r1, a, 28);
			reverseRotateRight(r2, a, 2);
			reverseRotateRight(r3, a, 7);
			s0.low = r1.low ^ r2.low ^ r3.low;
			s0.high = r1.high ^ r2.high ^ r3.high;

			//Maj
			Maj.low = (a.low & b.low) ^ (a.low & c.low) ^ (b.low & c.low);
			Maj.high = (a.high & b.high) ^ (a.high & c.high) ^ (b.high & c.high);

			add5(T1, h, s1, Ch, K[j], w[j]);
			add(T2, s0, Maj);

			copy(h, g);
			copy(g, f);
			copy(f, e);
			add(e, d, T1);
			copy(d, c);
			copy(c, b);
			copy(b, a);
			add(a, T1, T2);
		}

		add(hash[0], hash[0], a);
		add(hash[1], hash[1], b);
		add(hash[2], hash[2], c);
		add(hash[3], hash[3], d);
		add(hash[4], hash[4], e);
		add(hash[5], hash[5], f);
		add(hash[6], hash[6], g);
		add(hash[7], hash[7], h);
	}

	//	convert the final hash back to 32 - bit words
	var ret: number[] = [];
	for (var i = 0, count = hash.length; i < count; i++) {
		ret[i * 2] = hash[i].high;
		ret[i * 2 + 1] = hash[i].low;
	}
	return wordsToBytes(ret);
};

const HASH_384 = [
	0xcbbb9d5d, 0xc1059ed8, 0x629a292a, 0x367cd507, 0x9159015a, 0x3070dd17, 0x152fecd8, 0xf70e5939,
	0x67332667, 0xffc00b31, 0x8eb44a87, 0x68581511, 0xdb0c2e0d, 0x64f98fa7, 0x47b5481d, 0xbefa4fa4
];
const sha384 = <HashFunction> function (data: ByteBuffer): ByteBuffer {
	var hash = sha64(data, HASH_384);
	return hash.slice(0, hash.length - 16);
};
sha384.blockSize = 1024;
export { sha384 };

const HASH_512: number[] = [
	0x6a09e667, 0xf3bcc908, 0xbb67ae85, 0x84caa73b, 0x3c6ef372, 0xfe94f82b, 0xa54ff53a, 0x5f1d36f1,
	0x510e527f, 0xade682d1, 0x9b05688c, 0x2b3e6c1f, 0x1f83d9ab, 0xfb41bd6b, 0x5be0cd19, 0x137e2179
];
const sha512 = <HashFunction> function (data: ByteBuffer): ByteBuffer {
	return sha64(data, HASH_512);
}
sha512.blockSize = 1024;
export { sha512 };
