/**
 * Dot notation that includes numeric array indices and properly maps for use in object keys. A value Mongo
 * stores whole (a Date, an ObjectId, a Buffer) or a schema object is a path itself but has none below it.
 */

// DotNotation: Supports $ (if enabled), object keys, and arrays
export type DotNotation<
	T extends object,
	TAllowPlaceholder extends boolean = false,
	TPrefix extends string = '',
	TDepth extends number[] = [],
	TVisited extends readonly object[] = []
> =
	TDepth['length'] extends 9
		? never
		: T extends readonly (infer U)[]
			? (
				| `${TPrefix}${number}`
				| (NonNullable<U> extends infer EU extends object
					? IsVisited<EU, TVisited> extends true
						? never
						: (
							| DotNotation<EU, TAllowPlaceholder, `${TPrefix}${number}.`, [...TDepth, 1], [...TVisited, EU]>
							| DotNotation<EU, TAllowPlaceholder, `${TPrefix}`, [...TDepth, 1], [...TVisited, EU]>
							| (TAllowPlaceholder extends true
								? (
									| DotNotation<EU, TAllowPlaceholder, `${TPrefix}$.`, [...TDepth, 1], [...TVisited, EU]>
									| DotNotation<EU, TAllowPlaceholder, `${TPrefix}$[${string}].`, [...TDepth, 1], [...TVisited, EU]>
									| DotNotation<EU, TAllowPlaceholder, `${TPrefix}$[].`, [...TDepth, 1], [...TVisited, EU]>
								)
								: never)
						)
					: never)
				| (TAllowPlaceholder extends true ? `${TPrefix}$[${string}]` | `${TPrefix}$` : never)
			)
			: IsLeaf<T> extends true
				? never
				: {
					[K in keyof T & string]:
					T[K] extends (...args: any[]) => any
						? never
						: (
							| `${TPrefix}${K}`
							| (NonNullable<T[K]> extends infer V extends object
								? IsVisited<V, TVisited> extends true
									? never
									: DotNotation<V, TAllowPlaceholder, `${TPrefix}${K}.`, [...TDepth, 1], [...TVisited, V]>
								: never)
						)
				}[keyof T & string];

/** Resolves a dot-notated path to the corresponding type, including array indexing */
// DotPathValue: Resolves value type of a dot path, optionally handling $ in arrays
export type DotPathValue<
	T,
	TPath extends string,
	TAllowPlaceholder extends boolean = false,
	TCheckInArray extends boolean = false,
	TIsInArray extends boolean = false,
	TDepth extends number[] = []
> =
	TDepth['length'] extends 9
		? never
		: TPath extends `${infer Key}.${infer Rest}`
			? T extends readonly (infer U)[]
				? Key extends `${number}`
					? DotPathValue<U, Rest, TAllowPlaceholder, TCheckInArray, TIsInArray, [...TDepth, 1]>
					: TAllowPlaceholder extends true
						? Key extends `$[${string}]` | `$[]` | `$`
							? DotPathValue<U, Rest, TAllowPlaceholder, TCheckInArray, true, [...TDepth, 1]>
							: never
						// A query reaches into each element of an array for a key that isn't an index.
						: DotPathValue<U, TPath, TAllowPlaceholder, TCheckInArray, true, [...TDepth, 1]>
				: T extends unknown
					? Key extends keyof T
						? DotPathValue<NonNullable<T[Key]>, Rest, TAllowPlaceholder, TCheckInArray, TIsInArray, [...TDepth, 1]>
						: T extends object
							? T[keyof T] extends infer V
								? V extends object
									? DotPathValue<V, Rest, TAllowPlaceholder, TCheckInArray, TIsInArray, [...TDepth, 1]>
									: never
								: never
							: never
					: never
			: T extends readonly (infer U)[]
				? U extends unknown
					? TPath extends `${number}`
						? TIsInArray extends true ? TCheckInArray extends true ? U[] : U : U
						: TAllowPlaceholder extends true
							? TPath extends `$[${string}]` | `$[]` | `$`
								? TCheckInArray extends true ? U[] : U
								: TPath extends keyof U
									? TCheckInArray extends true ? U[TPath][] : U[TPath]
									: never
							: TPath extends keyof U
								? TCheckInArray extends true ? U[TPath][] : U[TPath]
								: never
					: never
				: T extends unknown
					? TPath extends keyof T
						? TIsInArray extends true ? TCheckInArray extends true ? T[TPath][] : T[TPath] : T[TPath]
						: never
					: never;

/**
 * @internal Whether DotNotation stops at a value: a field holding one is a path itself, with no paths below
 * it, and given as the document type it has no paths at all. Only the types in {@link Leaf} are leaves, so
 * an embedded document keeps its paths whatever methods it has.
 */
// `any` is no leaf, though it extends every one. Tested as `unknown extends T`: DotNotation's `T extends object`
// would reduce the usual `1 & T` to never, and `0 extends 1 & T` would never match.
type IsLeaf<T> = unknown extends T ? false : [T] extends [Leaf] ? true : false;

/**
 * @internal Checks if T is structurally equal to any type in the TVisited tuple.
 * Uses mutual assignability ([T] extends [V] and [V] extends [T]) so structural subtypes
 * (e.g. B = { x: number, y: string } extending A = { x: number }) do not trigger a
 * false-positive cycle.
 */
type IsVisited<T, TVisited extends readonly unknown[]> =
	TVisited extends readonly [infer First, ...infer Rest]
		? [T] extends [First]
			? [First] extends [T]
				? true
				: IsVisited<T, Rest>
			: IsVisited<T, Rest>
		: false;

/**
 * @internal The values DotNotation lists no paths below.
 *
 * - Values Mongo stores whole: dates, regular expressions, binary data, and every BSON class (`ObjectId`,
 *   `Decimal128`, `Long`, `Binary`, `Timestamp`...), which carry `_bsontype`. Their members aren't fields.
 * - Schema objects, recognised by Zod's `_zod` or the Standard Schema `~standard`, which any of them may be
 *   passed as where their inferred type belongs. Walking a Zod schema's internals alone runs to hundreds of
 *   thousands of types, for paths that mean nothing to a query.
 * - `Map` and `Set`, which have no dotted paths either.
 */
type Leaf =
	| ArrayBuffer
	| Date
	| Map<unknown, unknown>
	| RegExp
	| Set<unknown>
	| Uint8Array
	| { readonly '~standard': unknown }
	| { readonly _bsontype: string }
	| { readonly _zod: unknown };

export type OnlyFieldsOfTypeDotNotation<
	T extends object,
	TFieldType,
	TAllowPlaceholder extends boolean = false,
	TCheckInArray extends boolean = false,
	TAssignableType = never
> = {
	[P in DotNotation<T, TAllowPlaceholder> as NonNullable<DotPathValue<T, P, TAllowPlaceholder, TCheckInArray>> extends TFieldType ? P : never]?:
	[TAssignableType] extends [never]
		? DotPathValue<T, P, TAllowPlaceholder, TCheckInArray>
		: TAssignableType;
};
