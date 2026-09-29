import { RewrapArray, UnwrapArray } from './array.js';
import { IntegerType, NumericType } from './bson-types.js';
import { DotNotation, DotPathValue, OnlyFieldsOfTypeDotNotation } from './dot-notation.js';
import { Condition, Filter } from './filter.js';
import { Identifiable, PartialButId } from './identifiable.js';
import { EnhancedOmit } from './types.js';

export declare type ArrayFilter<T> = T extends object ? {
	[P in DotNotation<T, true> as P extends `${string}.$[${string}].${infer Rest}`
		? Rest extends `${string}$${string}` ? never : `${string}.${Rest}`
		: never]?: Condition<DotPathValue<T, P, true>>
} : never;

export declare type FieldsAndValues<
	TSchema extends object,
	TAllowPlaceholder extends boolean = false,
	TCheckInArray extends boolean = false
> = Readonly<{
	[P in DotNotation<EnhancedOmit<TSchema, '_id'>, TAllowPlaceholder>]?:
	DotPathValue<EnhancedOmit<TSchema, '_id'>, P, TAllowPlaceholder, TCheckInArray> extends infer Value
		? UnwrapArray<Value> extends infer Unwrapped
			? Unwrapped extends Identifiable
				? RewrapArray<Value, PartialButId<Unwrapped>>
				: Value
			: never
		: never;
}>;

export declare type PullAllOperator<T extends object> = {
	[P in DotNotation<T> as DotPathValue<T, P> extends ReadonlyArray<any> | undefined ? P : never]?:
	NonNullable<DotPathValue<T, P>> extends ReadonlyArray<infer Item>
		? Item extends Identifiable
			? ReadonlyArray<PartialButId<Item>> : ReadonlyArray<Item>
		: never;
};

export declare type PullOperator<T extends object> = {
	[P in DotNotation<T> as DotPathValue<T, P> extends ReadonlyArray<any> | undefined ? P : never]?:
	NonNullable<DotPathValue<T, P>> extends ReadonlyArray<infer Item>
		? Filter<Item>
		: never;
};

export declare type PushOperator<T extends object> = {
	[P in DotNotation<T> as DotPathValue<T, P> extends ReadonlyArray<any> | undefined ? P : never]?:
	NonNullable<DotPathValue<T, P>> extends ReadonlyArray<infer Item>
		? Item extends Identifiable
			? PartialButId<Item> | { $each: PartialButId<Item>[], $position?: number, $slice?: number, $sort?: -1 | 1 | Partial<Record<DotNotation<PartialButId<Item>>, -1 | 1>> }
			: Item | {
				$each: Item[],
				$position?: number,
				$slice?: number,
				$sort?: Item extends object ? -1 | 1 | Partial<Record<DotNotation<Item>, -1 | 1>> : -1 | 1
			}
		: never;
};

export declare type SetFields<T extends object> = {
	[P in DotNotation<T> as DotPathValue<T, P> extends ReadonlyArray<any> | undefined ? P : never]?:
	NonNullable<DotPathValue<T, P>> extends ReadonlyArray<infer Item>
		? Item extends Identifiable
			? PartialButId<Item> | { $each: ReadonlyArray<PartialButId<Item>> }
			: Item | { $each: ReadonlyArray<Item> }
		: never;
};

export declare interface Update<TSchema extends object> {
	$addToSet?: SetFields<TSchema>,
	$bit?: OnlyFieldsOfTypeDotNotation<TSchema, NumericType, true, false, {
		and: IntegerType
	} | {
		or: IntegerType
	} | {
		xor: IntegerType
	}>,
	$currentDate?: OnlyFieldsOfTypeDotNotation<TSchema, Date, true, false, true | { $type: 'date' | 'timestamp' }>,
	$inc?: OnlyFieldsOfTypeDotNotation<TSchema, NumericType | NumericType[], true, false, NumericType | undefined>,
	$max?: FieldsAndValues<TSchema, true, false>,
	$min?: FieldsAndValues<TSchema, true, false>,
	$mul?: OnlyFieldsOfTypeDotNotation<TSchema, NumericType | NumericType[], true, false, NumericType | undefined>,
	$pop?: OnlyFieldsOfTypeDotNotation<TSchema, ReadonlyArray<any>, false, false, -1 | 1>,
	$pull?: PullOperator<TSchema>,
	$pullAll?: PullAllOperator<TSchema>,
	$push?: PushOperator<TSchema>,
	$rename?: Record<string, string>,
	$set?: FieldsAndValues<TSchema, true, false>,
	$setOnInsert?: FieldsAndValues<TSchema>,
	$unset?: UnsetFields<TSchema>
}

export type UnsetFields<T extends object> = {
	[P in DotNotation<T, true> as undefined extends DotPathValue<T, P, true> ? P : never]?: 1 | '' | boolean | undefined;
};
