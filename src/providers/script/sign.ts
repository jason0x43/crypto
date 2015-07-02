import * as crypto from 'crypto';
import Promise, { State } from 'dojo-core/Promise';
import { ByteBuffer, Codec, utf8 } from 'dojo-core/encoding';
import { Data, Key, Signer, SignFunction } from '../../crypto';
import { HashFunction } from './base';
import hmac from './hmac';

declare var require: Function;

/**
 * A mapping of crypto algorithm names to their node equivalents
 */
const ALGORITHMS = {
	hmac: hmac
};

const resolvedPromise = Promise.resolve();

function loadHash(algorithm: string): Promise<HashFunction> {
	// TODO: sanitize algorithm name
	return new Promise((resolve, reject) => {
		try {
			require([ './' + algorithm ], function (hash: any) {
				if (hash.default) {
					resolve(hash.default);
				}
				else {
					resolve(hash[algorithm]);
				}
			});
		}
		catch (error) {
			reject(error);
		}
	});
}

/**
 * Generates a signature for a chunk of data.
 *
 * The algorithm parameter is currently ignored.
 */
function sign(algorithm: string, key: Key, data: Data, codec: Codec): Promise<ByteBuffer> {
	const hashAlgorithm = key.algorithm;
	return loadHash(hashAlgorithm).then(function (hash) {
		const keyData: ByteBuffer = typeof key.data === 'string' ?
			utf8.encode(<string> key.data) : <ByteBuffer> key.data;
		const byteData: ByteBuffer = typeof data === 'string' ?
			codec.encode(<string> data) : <ByteBuffer> data;
		return hmac(hash, byteData, keyData);
	});
}

/**
 * An object that can be used to generate a signature for a stream of data.
 */
class ScriptSigner<T extends Data> implements Signer<T> {
	/**
	 * The algorithm is currently ignored as 'hmac' is the only supported algorithm.
	 */
	constructor(algorithm: string, key: Key, codec: Codec) {
		Object.defineProperty(this, '_hash', {
			configurable: true,
			value: loadHash(key.algorithm)
		});
		Object.defineProperty(this, '_codec', { value: codec });
		Object.defineProperty(this, '_key', {
			value: typeof key.data === 'string' ? utf8.encode(<string> key.data) : <ByteBuffer> key.data
		});

		Object.defineProperty(this, '_buffer', { value: [] });
		Object.defineProperty(this, 'signature', {
			value: new Promise((resolve, reject) => {
				Object.defineProperty(this, '_resolve', { value: resolve });
				Object.defineProperty(this, '_reject', { value: reject });
			})
		});
	}

	private _buffer: number[];
	private _codec: Codec;
	private _encoding: string;
	private _hash: Promise<HashFunction>;
	private _key: ByteBuffer;
	private _reject: (reason: Error) => void;
	private _resolve: (value: any) => void;

	signature: Promise<ByteBuffer>;

	abort(reason?: Error): Promise<any> {
		if (this.signature.state === State.Rejected) {
			return this.signature
		}
		else {
			this._reject(reason);
			return resolvedPromise;
		}
	}

	close(): Promise<any> {
		if (this.signature.state === State.Rejected) {
			return this.signature
		}
		else {
			return this._hash.then((hash) => {
				try {
					console.log('hashing', this._buffer);
					this._resolve(hmac(hash, this._buffer, this._key));
				}
				catch (error) {
					this._reject(error);
				}
			});
		}
	}

	start(error: (error: Error) => void): Promise<any> {
		if (this.signature.state === State.Rejected) {
			return this.signature
		}
		else {
			return resolvedPromise;
		}
	}

	write(chunk: T): Promise<any> {
		if (this.signature.state === State.Rejected) {
			return this.signature;
		}

		if (typeof chunk === 'string') {
			let chunkString: string = <any> chunk;
			this._buffer = this._buffer.concat(this._codec.encode(chunkString));
		}
		else {
			let chunkBuffer: number[] = <any> chunk;
			this._buffer = this._buffer.concat(chunkBuffer);
		}

		return resolvedPromise;
	}
}

export default function getSign(algorithm: string): SignFunction {
	if (!(algorithm in ALGORITHMS)) {
		throw new Error('invalid algorithm; available algorithms are [ \'' + Object.keys(ALGORITHMS).join('\', \'') + '\' ]');
	}

	const signFunction = <SignFunction> function (key: Key, data: Data, codec: Codec = utf8): Promise<ByteBuffer> {
		return sign(algorithm, key, data, codec);
	};
	signFunction.create = function<T extends Data> (key: Key, codec: Codec = utf8): Signer<T> {
		return new ScriptSigner<T>(algorithm, key, codec);
	};

	return signFunction;
}
