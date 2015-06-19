export interface HashFunction {
	(data: ByteBuffer): ByteBuffer;
	blocksize: number;
}
/**
 * Add a pair binary words, with rollover
 */
export function addWords(a: number, b: number): number {
	const l = (a & 0xFFFF) + (b & 0xFFFF);
	const m = (a >> 16) + (b >> 16) + (l >> 16);
	return (m << 16) | (l & 0xFFFF);
}

// TODO: The byte/word conversions should use native typed array classes if available.

/**
 * Convert an array of bytes to an array of 32-bit words. Words are assumed to be encoded in big-endian format (high
 * bytes are at lower indices).
 */
export function bytesToWords(bytes: number[]): number[] {
	const numWords = bytes.length / 4;
	const words = new Array(numWords);
	for (let i = 0; i < numWords; i++) {
		words[i] =
			(bytes[4 * i    ] << 24) |
			(bytes[4 * i + 1] << 16) |
			(bytes[4 * i + 2] <<  8) |
			bytes[4 * i + 3];
	}
	return words;
}

/**
 * Convert an array of bytes to an array of 64-bit words. Words are assumed to be encoded in big-endian format (high
 * bytes are at lower indices).
 */
export function bytesToDoublewords(bytes: number[]): number[] {
	const numWords = bytes.length / 8;
	const words = new Array(numWords);
	for (let i = 0; i < numWords; i++) {
		words[i] =
			(bytes[4 * i    ] << 56) |
			(bytes[4 * i + 1] << 48) |
			(bytes[4 * i + 2] << 40) |
			(bytes[4 * i + 3] << 32) |
			(bytes[4 * i + 4] << 24) |
			(bytes[4 * i + 5] << 16) |
			(bytes[4 * i + 6] <<  8) |
			bytes[4 * i + 7];
	}
	return words;
}

/**
 * Convert an array of 32-bit words to an array of bytes. Words are encoded in big-endian format (high bytes are at
 * lower indices).
 */
export function wordsToBytes(words: number[]): number[] {
	const numWords = words.length;
	const bytes = new Array(numWords * 4);
	for (let i = 0; i < numWords; i++) {
		const word = words[i];
		bytes[4 * i    ] = (word >> 24) & 0x0FF;
		bytes[4 * i + 1] = (word >> 16) & 0x0FF;
		bytes[4 * i + 2] = (word >>  8) & 0x0FF;
		bytes[4 * i + 3] = word & 0x0FF;
	}
	return bytes;
}

/**
 * Convert an array of 64-bit words to an array of bytes. Words are encoded in big-endian format (high bytes are at
 * lower indices).
 */
export function doublewordsToBytes(words: number[]): number[] {
	const numWords = words.length;
	const bytes = new Array(numWords * 8);
	for (let i = 0; i < numWords; i++) {
		const word = words[i];
		bytes[4 * i    ] = (word >> 56) & 0x0FF;
		bytes[4 * i + 1] = (word >> 48) & 0x0FF;
		bytes[4 * i + 2] = (word >> 40) & 0x0FF;
		bytes[4 * i + 3] = (word >> 32) & 0x0FF;
		bytes[4 * i   4] = (word >> 24) & 0x0FF;
		bytes[4 * i + 5] = (word >> 16) & 0x0FF;
		bytes[4 * i + 6] = (word >>  8) & 0x0FF;
		bytes[4 * i + 7] = word & 0x0FF;
	}
	return bytes;
}
