import { ByteBuffer, utf8 } from 'dojo-core/encoding';
import Promise from 'dojo-core/Promise';
import { HashFunction, addWords as add, bytesToWords, wordsToBytes } from './base';
import { Data } from '../../crypto';

// the encoding functions
function S (X: number, n: number): number { return ( X >>> n ) | (X << (32 - n)); }
function R (X: number, n: number): number { return ( X >>> n ); }
function Ch(x: number, y: number, z: number): number  { return ((x & y) ^ ((~x) & z)); }
function Maj(x: number, y: number, z: number): number { return ((x & y) ^ (x & z) ^ (y & z)); }
function Sigma0(x: number): number { return (S(x,  2) ^ S(x, 13) ^ S(x, 22)); }
function Sigma1(x: number): number { return (S(x,  6) ^ S(x, 11) ^ S(x, 25)); }
function Gamma0(x: number): number { return (S(x,  7) ^ S(x, 18) ^ R(x,  3)); }
function Gamma1(x: number): number { return (S(x, 17) ^ S(x, 19) ^ R(x, 10)); }

interface Int64 {
	high: number,
	low: number
}

function int64(high: number, low: number): Int64 {
	return { high, low }
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
 * Calculate a hash based on 32-bit words
 *
 * @param data - The data to hash
 * @param hash - The initial hash value
 */
function sha64(bytes: ByteBuffer, hash: number[]): ByteBuffer {
	let numBits = bytes.length * 8;
	const words = bytesToWords(bytes);

	// Clone the initial hash
	hash = hash.slice();

	// Pad the input
	words[numBits >> 5] |= 0x80 << (24 - numBits % 32);
	words[((numBits + 64 >> 9) << 4) + 15] = numBits;

	const w = new Array(64);

	// Do the digest
	let numWords = words.length;
	for (let i = 0; i < numWords; i += 16) {
		let a = hash[0];
		let b = hash[1];
		let c = hash[2];
		let d = hash[3];
		let e = hash[4];
		let f = hash[5];
		let g = hash[6];
		let h = hash[7];

		for (let j = 0; j < 64; j++) {
			if (j < 16){
				w[j] = words[j + i];
			}
			else { 
				w[j] = add(add(add(Gamma1(w[j - 2]), w[j - 7]), Gamma0(w[j - 15])), w[j - 16]);
			}

			const T1 = add(add(add(add(h, Sigma1(e)), Ch(e, f, g)), K[j]), w[j]);
			const T2 = add(Sigma0(a), Maj(a, b, c));

			h = g;
			g = f;
			f = e;
			e = add(d, T1);
			d = c;
			c = b;
			b = a;
			a = add(T1, T2);
		}

		hash[0] = add(a, hash[0]);
		hash[1] = add(b, hash[1]);
		hash[2] = add(c, hash[2]);
		hash[3] = add(d, hash[3]);
		hash[4] = add(e, hash[4]);
		hash[5] = add(f, hash[5]);
		hash[6] = add(g, hash[6]);
		hash[7] = add(h, hash[7]);
	}

	return wordsToBytes(hash);
}

const HASH_224: number[] = [
	0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939,
	0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4
];
const sha224 = <HashFunction> function (data: ByteBuffer): ByteBuffer {
	var hash = sha32(data, HASH_224);
	return hash.slice(0, hash.length - 2);
};
sha224.blockSize = 512;
export { sha224 };

const HASH_256: number[] = [
	0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
	0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
];
const sha256 = <HashFunction> function (data: ByteBuffer): ByteBuffer {
	return sha32(data, HASH_256);
}
sha256.blockSize = 512;
export { sha256 };

