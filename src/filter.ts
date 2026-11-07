import { BsonType, BsonTypeNumeric, IntegerType } from './bson-types.js';
import { DotNotation, DotPathValue } from './dot-notation.js';
import { Expr } from './expr.js';
import { GeoJson, GeoJsonMultiPolygon, GeoJsonPoint, GeoJsonPolygon } from './geo-json.js';
import { DeepPartialButId, Identifiable } from './identifiable.js';
import { JsonSchema } from './json-schema/index.js';
import { DeepPartial } from './types.js';

export declare type AlternativeTypes<T, TPartial extends boolean = false> =
	T extends string
		? RegExp | T
		: T extends object
			? TPartial extends true
				? T extends Identifiable ? DeepPartialButId<T> : DeepPartial<T>
				: T
			: T;

export declare type BitwiseFilter = number /** BinData bit mask */ | ReadonlyArray<number>;

export declare type Condition<T, TPartial extends boolean = false> =
	AlternativeTypes<T, TPartial> | FilterOperators<T>
	| (NonNullable<T> extends ReadonlyArray<infer U> ? AlternativeTypes<U, TPartial> : never);

export declare interface Document {
	[key: string]: any
}

export declare type FilterOperations<T> = T extends Record<string, any> ? {
	[key in keyof T]?: FilterOperators<T[key]>;
} : FilterOperators<T>;

export declare interface FilterOperators<TValue> {
	/** Every value, or every `$elemMatch` condition (all items one or the other), matches an element. */
	$all?: TValue extends ReadonlyArray<infer U> ? ReadonlyArray<U> | ReadonlyArray<{ $elemMatch: Filter<U> }> : never,
	$bitsAllClear?: LeafOperand<TValue, IntegerType, BitwiseFilter>,
	$bitsAllSet?: LeafOperand<TValue, IntegerType, BitwiseFilter>,
	$bitsAnyClear?: LeafOperand<TValue, IntegerType, BitwiseFilter>,
	$bitsAnySet?: LeafOperand<TValue, IntegerType, BitwiseFilter>,
	$elemMatch?: TValue extends ReadonlyArray<infer U> ? Filter<U> : never,
	$eq?: NonNullable<TValue> extends ReadonlyArray<infer U> ? TValue | U : TValue,
	/**
	 * When `true`, `$exists` matches the documents that contain the field,
	 * including documents where the field value is null.
	 */
	$exists?: boolean,
	$geoIntersects?: TValue extends GeoJson ? { $geometry: GeoJson } : never,
	$geoWithin?: TValue extends GeoJsonMultiPolygon | GeoJsonPolygon ? { $geometry: GeoJsonMultiPolygon | GeoJsonPolygon } : TValue extends [number, number] ? { $box: [[number, number], [number, number]] } | { $center: [[number, number], number] } | { $centerSphere: [[number, number], number] } | { $polygon: [number, number][] } : never,
	$gt?: NonNullable<TValue> extends ReadonlyArray<infer U> ? U : TValue,
	$gte?: NonNullable<TValue> extends ReadonlyArray<infer U> ? U : TValue,
	$in?: NonNullable<TValue> extends ReadonlyArray<infer U> ? ReadonlyArray<Pattern<U> | U> | ReadonlyArray<TValue> : ReadonlyArray<Pattern<TValue> | TValue>,
	$lt?: NonNullable<TValue> extends ReadonlyArray<infer U> ? U : TValue,
	$lte?: NonNullable<TValue> extends ReadonlyArray<infer U> ? U : TValue,
	$maxDistance?: TValue extends [number, number] | GeoJsonPoint ? number : never,
	$minDistance?: TValue extends [number, number] | GeoJsonPoint ? number : never,
	$mod?: LeafOperand<TValue, number, [number, number]>,
	/** Unlike `$eq`'s shorthand, `$ne` takes no regular expression: Mongo refuses one. */
	$ne?: NonNullable<TValue> extends ReadonlyArray<infer U> ? TValue | U : TValue,
	$near?: TValue extends [number, number] | GeoJsonPoint ? [number, number] | NearFilter : never,
	$nearSphere?: TValue extends GeoJsonPoint ? NearFilter : never,
	$nin?: NonNullable<TValue> extends ReadonlyArray<infer U> ? ReadonlyArray<Pattern<U> | U> | ReadonlyArray<TValue> : ReadonlyArray<Pattern<TValue> | TValue>,
	$not?: FilterOperators<TValue> | LeafOperand<TValue, string, RegExp>,
	$options?: LeafOperand<TValue, string, string>,
	$regex?: LeafOperand<TValue, string, RegExp | string>,
	$size?: TValue extends ReadonlyArray<any> ? number : never,
	$type?: Array<BsonType | BsonTypeNumeric> | BsonType | BsonTypeNumeric
}

export declare interface NearFilter {
	$geometry: GeoJsonPoint,
	$maxDistance?: number,
	$minDistance?: number
}

export declare interface ObjFilterOperators<TSchema extends object> {
	$and?: ObjFilter<TSchema>[],
	$comment?: Document | string,
	/**
	 * An aggregation expression, the same for every schema. A field reference in it takes any name
	 * (`FieldRef` ends in a `$${string}` catch-all, for `$$ROOT.x`, `$$this` and the like), so
	 * `Expr<TSchema>` would accept no more and no less; it would only build the ~170 operator types again
	 * for each schema a filter is written for, which was the largest share of a filter's type-check cost.
	 * What that bought was the editor suggesting the schema's paths inside `$expr`.
	 */
	$expr?: Expr<object>,
	$jsonSchema?: JsonSchema,
	$nor?: ObjFilter<TSchema>[],
	$or?: ObjFilter<TSchema>[],
	$text?: {
		$caseSensitive?: boolean,
		$diacriticSensitive?: boolean,
		$language?: string,
		$search: string
	},
	$where?: ((this: TSchema) => boolean) | string
}

export type Filter<TSchema> = TSchema extends object ? ObjFilter<TSchema> : Condition<TSchema>;

/**
 * `TOperand` where the field, or an element of it when it is an array, is a `TMatch`: Mongo's leaf
 * operators match an array by any element. Distributes over the field's type, so `undefined` drops out.
 */
type LeafOperand<T, TMatch, TOperand> = T extends ReadonlyArray<infer U>
	? U extends TMatch ? TOperand : never
	: T extends TMatch ? TOperand : never;

export type ObjFilter<TSchema extends object> =
	ObjFilterOperators<TSchema> & {
		[P in DotNotation<TSchema>]?: Condition<DotPathValue<TSchema, P>, true>
	};

/** `RegExp` where `T` is a string, for the operators that take a regular expression in place of a value. */
type Pattern<T> = T extends string ? RegExp : never;
