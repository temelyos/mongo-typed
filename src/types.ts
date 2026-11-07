/** TypeScript Omit (Exclude to be specific) does not work for objects with an "any" indexed type, and breaks discriminated unions */
export declare type EnhancedOmit<TRecordOrUnion, TKeyUnion> =
	string extends keyof TRecordOrUnion
		? TRecordOrUnion
		: TRecordOrUnion extends any
			? Pick<TRecordOrUnion, Exclude<keyof TRecordOrUnion, TKeyUnion>>
			: never;

export type And<
	TCond1 extends boolean,
	TCond2 extends boolean,
	TTrue = true,
	TFalse = false
> = TCond1 extends true
	? TCond2 extends true
		? TTrue
		: TFalse
	: TFalse;

export type Assert<T extends true> = T;

export type DeepPartial<T> =
	// Values Mongo stores whole: a partial Date or RegExp is no Date or RegExp at all.
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	T extends Date | Function | RegExp | Uint8Array
		? T
		: T extends Array<infer U>
			? Array<DeepPartial<U>>
			: T extends ReadonlyArray<infer U>
				? ReadonlyArray<DeepPartial<U>>
				: T extends Map<infer K, infer V>
					? Map<DeepPartial<K>, DeepPartial<V>>
					: T extends Set<infer U>
						? Set<DeepPartial<U>>
						: T extends object
							? { [K in keyof T]?: DeepPartial<T[K]> }
							: T;

// Utility types for compile-time assertions
export type Equals<TExpected, TActual> =
	(<V>() => V extends TExpected ? 1 : 2) extends
	(<V>() => V extends TActual ? 1 : 2) ? true : false;

export type Includes<TUnion, TValue> = TValue extends TUnion ? true : false;

export type MaybeReadonlyArray<T> = Array<T> | ReadonlyArray<T>;

export type Not<T extends boolean> = T extends true ? false : true;

export type OnlyOneKey<T> = {
	[K in keyof T]: { [P in K]: T[P] } & Partial<Record<Exclude<keyof T, K>, never>>
}[keyof T];

export type RemoveFunctions<T extends object> = {
	[K in keyof T as T[K] extends (...args: any[]) => any ? never : K]: T[K]
};
