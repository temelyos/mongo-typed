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
	$all?: TValue extends ReadonlyArray<infer U> ? ReadonlyArray<U> : never,
	$bitsAllClear?: TValue extends IntegerType ? BitwiseFilter : never,
	$bitsAllSet?: TValue extends IntegerType ? BitwiseFilter : never,
	$bitsAnyClear?: TValue extends IntegerType ? BitwiseFilter : never,
	$bitsAnySet?: TValue extends IntegerType ? BitwiseFilter : never,
	$elemMatch?: TValue extends ReadonlyArray<infer U> ? Filter<U> : never,
	$eq?: NonNullable<TValue> extends ReadonlyArray<infer U> ? TValue | U : TValue,
	/**
	 * When `true`, `$exists` matches the documents that contain the field,
	 * including documents where the field value is null.
	 */
	$exists?: boolean,
	$expr?: Expr<TValue extends object ? TValue : object>,
	$geoIntersects?: TValue extends GeoJson ? { $geometry: GeoJson } : never,
	$geoWithin?: TValue extends GeoJsonMultiPolygon | GeoJsonPolygon ? { $geometry: GeoJsonMultiPolygon | GeoJsonPolygon } : TValue extends [number, number] ? { $box: [[number, number], [number, number]] } | { $center: [[number, number], number] } | { $centerSphere: [[number, number], number] } | { $polygon: [number, number][] } : never,
	$gt?: NonNullable<TValue> extends ReadonlyArray<infer U> ? U : TValue,
	$gte?: NonNullable<TValue> extends ReadonlyArray<infer U> ? U : TValue,
	$in?: NonNullable<TValue> extends ReadonlyArray<infer U> ? ReadonlyArray<TValue> | ReadonlyArray<U> : ReadonlyArray<TValue>,
	$lt?: NonNullable<TValue> extends ReadonlyArray<infer U> ? U : TValue,
	$lte?: NonNullable<TValue> extends ReadonlyArray<infer U> ? U : TValue,
	$maxDistance?: TValue extends [number, number] | GeoJsonPoint ? number : never,
	$minDistance?: TValue extends [number, number] | GeoJsonPoint ? number : never,
	$mod?: TValue extends number ? [number, number] : never,
	$ne?: NonNullable<TValue> extends ReadonlyArray<infer U> ? AlternativeTypes<TValue> | AlternativeTypes<U> : AlternativeTypes<TValue>,
	$near?: TValue extends [number, number] | GeoJsonPoint ? [number, number] | NearFilter : never,
	$nearSphere?: TValue extends GeoJsonPoint ? NearFilter : never,
	$nin?: NonNullable<TValue> extends ReadonlyArray<infer U> ? ReadonlyArray<TValue> | ReadonlyArray<U> : ReadonlyArray<TValue>,
	$not?: TValue extends string ? FilterOperators<TValue> | RegExp : FilterOperators<TValue>,
	$options?: TValue extends string ? string : never,
	$regex?: TValue extends string ? RegExp | string : never,
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
	$expr?: Expr<TSchema>,
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

export type ObjFilter<TSchema extends object> =
	ObjFilterOperators<TSchema> & {
		[P in DotNotation<TSchema>]?: Condition<DotPathValue<TSchema, P>, true>
	};
