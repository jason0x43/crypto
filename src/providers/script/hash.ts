import * as crypto from 'crypto';
import Promise from 'dojo-core/Promise';
import { ByteBuffer, Codec, utf8 } from 'dojo-core/encoding';
import { Data, Hasher, HashFunction } from '../../crypto';
import { sha256 } from './sha32';

/**
 * A mapping of crypto algorithm names to their node equivalents
 */
const ALGORITHMS = {
	md5: true,
	sha1: true,
	sha256: sha256
};

/**
 * Hashes a chunk of data.
 */
function hash(algorithm: string, data: Data, codec: Codec): Promise<ByteBuffer> {
	if (typeof data === 'string') {
		data = codec.encode(data);
	}
	return Promise.resolve(ALGORITHMS[algorithm](data));
}

// Cache a resolved Promise to return from the stream methods.
const resolvedPromise = Promise.resolve();

/**
 * An object that can be used to hash a stream of data.
 */
class ScriptHasher<T extends Data> implements Hasher<T> {
	constructor(algorithm: string, codec: Codec) {
		Object.defineProperty(this, '_hash', {
			configurable: true,
			value: ALGORITHMS[algorithm]
		});
		Object.defineProperty(this, '_codec', { value: codec });
		Object.defineProperty(this, '_buffer', {
			configurable: true,
			value: []
		});
		Object.defineProperty(this, 'digest', {
			enumerable: true,
			value: new Promise((resolve, reject) => {
				Object.defineProperty(this, '_resolve', { value: resolve });
				Object.defineProperty(this, '_reject', { value: reject });
			})
		});
	}

	private _buffer: ByteBuffer;
	private _codec: Codec;
	private _hash: (data: ByteBuffer) => ByteBuffer;
	private _reject: (reason: Error) => void;
	private _resolve: (value: any) => void;

	digest: Promise<ByteBuffer>;

	abort(reason?: Error): Promise<void> {
		if (this._hash) {
			// Release the reference to the internal buffer and reject the digest
			Object.defineProperty(this, '_buffer', { value: undefined });
			this._reject(reason);
		}
		return resolvedPromise;
	}

	close(): Promise<void> {
		if (this._hash) {
			this._resolve(this._hash(this._buffer));
			// Release the reference to the buffer
			Object.defineProperty(this, '_buffer', { value: undefined });
		}
		return resolvedPromise;
	}

	start(error: (error: Error) => void): Promise<void> {
		// Nothing to do to start a hash
		return resolvedPromise;
	}

	write(chunk: T): Promise<void> {
		if (this._hash) {
			if (typeof chunk === 'string') {
				this._buffer.push(this._codec.encode(chunk));
			}
			else {
				this._buffer.push(chunk);
			}
		}
		return resolvedPromise;
	}
}

export default function getHash(algorithm: string): HashFunction {
	const hasher = <HashFunction> function (data: Data, codec: Codec = utf8): Promise<ByteBuffer> {
		return hash(algorithm, data, codec);
	};
	hasher.create = function<T extends Data> (codec: Codec = utf8): Hasher<T> {
		return new ScriptHasher<T>(algorithm, codec);
	};
	hasher.algorithm = algorithm;

	return hasher;
}
