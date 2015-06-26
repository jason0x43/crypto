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

// constant K array
const K = [
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
	0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
	0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

/**
 * Calculate a hash based on 32-bit words
 *
 * @param data - The data to hash
 * @param hash - The initial hash value
 */
function sha32(bytes: ByteBuffer, hash: number[]): ByteBuffer {
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
