/**
 * Notation:
 *   - A "word" is a 32-bit interger
 *   - A "doubleword" is a 64-bit integer
 */
import { ByteBuffer } from 'dojo-core/encoding';

export interface HashFunction {
	(data: ByteBuffer): ByteBuffer;
	blockSize: number;
}

export interface MathFunction {
	(...inputs: number[]): number
}

/**
 * Add a pair of words, with rollover
 */
export function addWords(a: number, b: number): number {
	const l = (a & 0xFFFF) + (b & 0xFFFF);
	const m = (a >> 16) + (b >> 16) + (l >> 16);
	return (m << 16) | (l & 0xFFFF);
}

export enum Endian {
	Little = 0,
	Big = 1
}

// TODO: The byte/word conversions should use native typed array classes if available.

/**
 * Convert an array of bytes to an array of 32-bit words. Words are assumed to be encoded in little-endian format (low
 * bytes are at lower indices).
 */
export function bytesToWords(bytes: ByteBuffer, endian = Endian.Big): number[] {
	const numWords = Math.ceil(bytes.length / 4);
	const words = new Array(numWords);

	const s0 = (24 * endian) -  0;
	const s1 = (24 * endian) -  8;
	const s2 = (24 * endian) - 16;
	const s3 = (24 * endian) - 24;

	for (let i = 0; i < numWords; i++) {
		const j = 4 * i;
		words[i] = 
			(bytes[j]     << s0) |
			(bytes[j + 1] << s1) |
			(bytes[j + 2] << s2) |
			(bytes[j + 3] << s3);
	}
	return words;
}

/**
 * Convert an array of bytes to an array of 64-bit words. Words are assumed to be encoded in big-endian format (high
 * bytes are at lower indices).
 */
export function bytesToDoublewords(bytes: number[], endian = Endian.Big): number[] {
	const numWords = bytes.length / 8;
	const words = new Array(numWords);

	const s0 = (56 * endian) -  0;
	const s1 = (56 * endian) -  8;
	const s2 = (56 * endian) - 16;
	const s3 = (56 * endian) - 24;
	const s4 = (56 * endian) - 32;
	const s5 = (56 * endian) - 40;
	const s6 = (56 * endian) - 48;
	const s7 = (56 * endian) - 56;

	for (let i = 0; i < numWords; i++) {
		const j = 4 * i;
		words[i] =
			(bytes[j]     << s0) |
			(bytes[j + 1] << s1) |
			(bytes[j + 2] << s2) |
			(bytes[j + 3] << s3) |
			(bytes[j + 4] << s4) |
			(bytes[j + 5] << s5) |
			(bytes[j + 6] << s6) |
			(bytes[j + 7] << s7);
	}
	return words;
}

/**
 * Convert an array of 32-bit words to an array of bytes. Words are encoded in big-endian format (high bytes are at
 * lower indices).
 */
export function wordsToBytes(words: number[], endian = Endian.Big): number[] {
	const numWords = words.length;
	const bytes = new Array(numWords * 4);

	const s0 = (24 * endian) -  0;
	const s1 = (24 * endian) -  8;
	const s2 = (24 * endian) - 16;
	const s3 = (24 * endian) - 24;

	for (let i = 0; i < numWords; i++) {
		const word = words[i];
		const j = 4 * i;
		bytes[j]     = (word >> s0) & 0x0FF;
		bytes[j + 1] = (word >> s1) & 0x0FF;
		bytes[j + 2] = (word >> s2) & 0x0FF;
		bytes[j + 3] = (word >> s3) & 0x0FF;
	}
	return bytes;
}

/**
 * Convert an array of 64-bit words to an array of bytes. Words are encoded in big-endian format (high bytes are at
 * lower indices).
 */
export function doublewordsToBytes(words: number[], endian = Endian.Big): number[] {
	const numWords = words.length;
	const bytes = new Array(numWords * 8);

	const s0 = (56 * endian) -  0;
	const s1 = (56 * endian) -  8;
	const s2 = (56 * endian) - 16;
	const s3 = (56 * endian) - 24;
	const s4 = (56 * endian) - 32;
	const s5 = (56 * endian) - 40;
	const s6 = (56 * endian) - 48;
	const s7 = (56 * endian) - 56;

	for (let i = 0; i < numWords; i++) {
		const word = words[i];
		const j = 4 * i;
		bytes[j]     = (word >> s0) & 0x0FF;
		bytes[j + 1] = (word >> s1) & 0x0FF;
		bytes[j + 2] = (word >> s2) & 0x0FF;
		bytes[j + 3] = (word >> s3) & 0x0FF;
		bytes[j + 4] = (word >> s4) & 0x0FF;
		bytes[j + 5] = (word >> s5) & 0x0FF;
		bytes[j + 6] = (word >> s6) & 0x0FF;
		bytes[j + 7] = (word >> s7) & 0x0FF;
	}
	return bytes;
}
