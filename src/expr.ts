import { BsonType, BsonTypeNumeric } from './bson-types.js';
import { DotNotation, DotPathValue } from './dot-notation.js';

export type ArrayExpr<TInput extends object> =
	| Array<unknown>
	| FieldRef<TInput>
	| { $arrayElemAt: [ArrayExpr<TInput>, NumericExpr<TInput>] }
	| { $arrayToObject: ArrayExpr<TInput> }
	| { $concatArrays: ArrayExpr<TInput>[] }
	| { $filter: { as?: string, cond: BooleanExpr<TInput>, input: ArrayExpr<TInput>, limit?: NumericExpr<TInput> } }
	| { $first: ArrayExpr<TInput> }
	| { $indexOfArray: [ArrayExpr<TInput>, Expr<TInput>, NumericExpr<TInput>?, NumericExpr<TInput>?] }
	| { $last: ArrayExpr<TInput> }
	| { $literal: Array<unknown> }
	| { $map: { as?: string, in: Expr<TInput>, input: ArrayExpr<TInput> } }
	| { $objectToArray: Expr<TInput> }
	| { $range: [NumericExpr<TInput>, NumericExpr<TInput>, NumericExpr<TInput>?] }
	| { $reduce: { in: Expr<TInput>, initialValue: Expr<TInput>, input: ArrayExpr<TInput> } }
	| { $reverseArray: ArrayExpr<TInput> }
	| { $setDifference: [ArrayExpr<TInput>, ArrayExpr<TInput>] }
	| { $setIntersection: [ArrayExpr<TInput>, ArrayExpr<TInput>, ...ArrayExpr<TInput>[]] }
	| { $setUnion: ArrayExpr<TInput>[] }
	| { $slice: [ArrayExpr<TInput>, NumericExpr<TInput>, NumericExpr<TInput>?] }
	| { $sortArray: { input: ArrayExpr<TInput>, sortBy: -1 | 1 | Record<string, -1 | 1> } }
	| { $split: [StringExpr<TInput>, StringExpr<TInput>] }
	| { $zip: { defaults?: ArrayExpr<TInput>, inputs: ArrayExpr<TInput>[], useLongestLength?: boolean } };

export type BooleanExpr<TInput extends object> =
	| boolean
	| FieldRef<TInput>
	| { $allElementsTrue: [ArrayExpr<TInput>] }
	| { $and: Expr<TInput>[] }
	| { $anyElementTrue: [ArrayExpr<TInput>] }
	| { $eq: [Expr<TInput>, Expr<TInput>] }
	| { $gt: [Expr<TInput>, Expr<TInput>] }
	| { $gte: [Expr<TInput>, Expr<TInput>] }
	| { $in: [Expr<TInput>, ArrayExpr<TInput>] }
	| { $isArray: Expr<TInput> }
	| { $isNumber: Expr<TInput> }
	| { $literal: boolean }
	| { $lt: [Expr<TInput>, Expr<TInput>] }
	| { $lte: [Expr<TInput>, Expr<TInput>] }
	| { $ne: [Expr<TInput>, Expr<TInput>] }
	| { $not: [Expr<TInput>] }
	| { $or: Expr<TInput>[] }
	| { $regexMatch: { input: StringExpr<TInput>, options?: StringExpr<TInput>, regex: StringExpr<TInput> } }
	| { $setEquals: [ArrayExpr<TInput>, ArrayExpr<TInput>] }
	| { $setIsSubset: [ArrayExpr<TInput>, ArrayExpr<TInput>] }
	| { $toBool: Expr<TInput> };

export type ConditionalExpr<TInput extends object> =
	| { $cond: [Expr<TInput>, Expr<TInput>, Expr<TInput>] | { else: Expr<TInput>, if: Expr<TInput>, then: Expr<TInput> } }
	| { $ifNull: [Expr<TInput>, Expr<TInput>, ...Expr<TInput>[]] }
	| { $switch: { branches: { case: Expr<TInput>, then: Expr<TInput> }[], default?: Expr<TInput> } };

export type DateExpr<TInput extends object> =
	| Date
	| FieldRef<TInput>
	| { $dateAdd: { amount: NumericExpr<TInput>, startDate: DateExpr<TInput>, timezone?: StringExpr<TInput>, unit: StringExpr<TInput> } }
	| { $dateFromParts: { day?: NumericExpr<TInput>, hour?: NumericExpr<TInput>, millisecond?: NumericExpr<TInput>, minute?: NumericExpr<TInput>, month?: NumericExpr<TInput>, second?: NumericExpr<TInput>, timezone?: StringExpr<TInput>, year: NumericExpr<TInput> } }
	| { $dateFromParts: { isoDayOfWeek?: NumericExpr<TInput>, isoWeek?: NumericExpr<TInput>, isoWeekYear: NumericExpr<TInput>, timezone?: StringExpr<TInput> } }
	| { $dateFromString: { dateString: StringExpr<TInput>, format?: StringExpr<TInput>, onError?: Expr<TInput>, onNull?: Expr<TInput>, timezone?: StringExpr<TInput> } }
	| { $dateSubtract: { amount: NumericExpr<TInput>, startDate: DateExpr<TInput>, timezone?: StringExpr<TInput>, unit: StringExpr<TInput> } }
	| { $dateTrunc: { binSize?: NumericExpr<TInput>, date: DateExpr<TInput>, startOfWeek?: StringExpr<TInput>, timezone?: StringExpr<TInput>, unit: StringExpr<TInput> } }
	| { $literal: Date }
	| { $toDate: Expr<TInput> };

export interface DatePartsExpr<TInput extends object> {
	$dateToParts: { date: DateExpr<TInput>, iso8601?: BooleanExpr<TInput>, timezone?: StringExpr<TInput> }
}

export interface DateTimezoneExpr<TInput extends object> {
	date: DateExpr<TInput>,
	timezone?: StringExpr<TInput>
}

export type Expr<T extends object> =
	| ArrayExpr<T>
	| BooleanExpr<T>
	| ConditionalExpr<T>
	| DateExpr<T>
	| DatePartsExpr<T>
	| NumericExpr<T>
	| ObjectExpr<T>
	| StringExpr<T>
	| TypeExpr<T>
	| VariableExpr<T>;

export type FieldPaths<T extends object> = DotNotation<T> extends infer U ? U & string : never;

export type FieldRef<T extends object> = `$${FieldPaths<T>}` | (`$${string}` & {});

/** Infers the output type of an expression value using the existing Expr category types.
 *  - `{ $literal: T }` → `T` (passthrough constant)
 *  - `"$field"` field ref → resolves to the TInput field type
 *  - `NumericExpr` operator → `number`
 *  - `StringExpr` operator → `string`
 *  - `BooleanExpr` operator → `boolean`
 *  - `DateExpr` operator → `Date`
 *  - `ArrayExpr` operator → `unknown[]`
 *  - Anything else → `unknown`
 */
export type InferExprType<TInput extends object, TExpr> =
	TExpr extends { $literal: infer V } ? V
		: TExpr extends `$${infer K}` ? InferFieldRef<TInput, K>
			: TExpr extends number ? number
				: TExpr extends NumericExpr<TInput> ? number
					: TExpr extends StringExpr<TInput> ? string
						: TExpr extends BooleanExpr<TInput> ? boolean
							: TExpr extends DateExpr<TInput> ? Date
								: TExpr extends ArrayExpr<TInput> ? unknown[]
									: unknown;

/** @internal Resolves a `$field` reference string to its TInput field type, including dot-notation paths. */
type InferFieldRef<TInput extends object, TKey extends string> =
	TKey extends keyof TInput
		? NonNullable<TInput[TKey]>
		: DotPathValue<TInput, TKey> extends infer V
			? [V] extends [never] ? unknown : NonNullable<V>
			: unknown;

export type NumericExpr<TInput extends object> =
	| number
	| NumericFieldRef<TInput>
	| { $abs: NumericExpr<TInput> }
	| { $acos: NumericExpr<TInput> }
	| { $acosh: NumericExpr<TInput> }
	| { $add: (DateExpr<TInput> | NumericExpr<TInput>)[] }
	| { $asin: NumericExpr<TInput> }
	| { $asinh: NumericExpr<TInput> }
	| { $atan2: [NumericExpr<TInput>, NumericExpr<TInput>] }
	| { $atan: NumericExpr<TInput> }
	| { $atanh: NumericExpr<TInput> }
	| { $ceil: NumericExpr<TInput> }
	| { $cmp: [Expr<TInput>, Expr<TInput>] }
	| { $convert: { input: Expr<TInput>, onError?: Expr<TInput>, onNull?: Expr<TInput>, to: BsonType | BsonTypeNumeric } }
	| { $cos: NumericExpr<TInput> }
	| { $cosh: NumericExpr<TInput> }
	| { $dateDiff: { endDate: DateExpr<TInput>, startDate: DateExpr<TInput>, startOfWeek?: StringExpr<TInput>, timezone?: StringExpr<TInput>, unit: StringExpr<TInput> } }
	| { $dayOfMonth: DateExpr<TInput> | DateTimezoneExpr<TInput> }
	| { $dayOfWeek: DateExpr<TInput> | DateTimezoneExpr<TInput> }
	| { $dayOfYear: DateExpr<TInput> | DateTimezoneExpr<TInput> }
	| { $degreesToRadians: NumericExpr<TInput> }
	| { $divide: [NumericExpr<TInput>, NumericExpr<TInput>] }
	| { $exp: NumericExpr<TInput> }
	| { $floor: NumericExpr<TInput> }
	| { $hour: DateExpr<TInput> | DateTimezoneExpr<TInput> }
	| { $indexOfBytes: [StringExpr<TInput>, StringExpr<TInput>, NumericExpr<TInput>?, NumericExpr<TInput>?] }
	| { $indexOfCP: [StringExpr<TInput>, StringExpr<TInput>, NumericExpr<TInput>?, NumericExpr<TInput>?] }
	| { $isoDayOfWeek: DateExpr<TInput> | DateTimezoneExpr<TInput> }
	| { $isoWeek: DateExpr<TInput> | DateTimezoneExpr<TInput> }
	| { $isoWeekYear: DateExpr<TInput> | DateTimezoneExpr<TInput> }
	| { $literal: number }
	| { $ln: NumericExpr<TInput> }
	| { $log10: NumericExpr<TInput> }
	| { $log: [NumericExpr<TInput>, NumericExpr<TInput>] } // [value, base]
	| { $millisecond: DateExpr<TInput> | DateTimezoneExpr<TInput> }
	| { $minute: DateExpr<TInput> | DateTimezoneExpr<TInput> }
	| { $mod: [NumericExpr<TInput>, NumericExpr<TInput>] }
	| { $month: DateExpr<TInput> | DateTimezoneExpr<TInput> }
	| { $multiply: NumericExpr<TInput>[] }
	| { $pow: [NumericExpr<TInput>, NumericExpr<TInput>] }
	| { $radiansToDegrees: NumericExpr<TInput> }
	| { $rand: Record<string, never> }
	| { $round: [NumericExpr<TInput>, NumericExpr<TInput>] | NumericExpr<TInput> }
	| { $second: DateExpr<TInput> | DateTimezoneExpr<TInput> }
	| { $sin: NumericExpr<TInput> }
	| { $sinh: NumericExpr<TInput> }
	| { $size: ArrayExpr<TInput> }
	| { $sqrt: NumericExpr<TInput> }
	| { $strcasecmp: [StringExpr<TInput>, StringExpr<TInput>] }
	| { $strLenBytes: StringExpr<TInput> }
	| { $strLenCP: StringExpr<TInput> }
	| { $subtract: [DateExpr<TInput>, DateExpr<TInput>] }
	| { $subtract: [DateExpr<TInput> | NumericExpr<TInput>, NumericExpr<TInput>] }
	| { $tan: NumericExpr<TInput> }
	| { $tanh: NumericExpr<TInput> }
	| { $toDecimal: Expr<TInput> }
	| { $toDouble: Expr<TInput> }
	| { $toInt: Expr<TInput> }
	| { $toLong: Expr<TInput> }
	| { $trunc: [NumericExpr<TInput>, NumericExpr<TInput>] | NumericExpr<TInput> }
	| { $week: DateExpr<TInput> | DateTimezoneExpr<TInput> }
	| { $year: DateExpr<TInput> | DateTimezoneExpr<TInput> };

/**
 * @internal Numeric field reference inside {@link NumericExpr} (e.g. `{ $abs: '$price' }`).
 *
 * Type safety is UNCHANGED vs. the previous `` (`$${string}` & {}) | `$${TypedPaths<TInput, number>}` ``:
 * both forms include the `` (`$${string}` & {}) `` catch-all arm, so the accepted/rejected value set is
 * identical — any `` `$${string}` `` was (and still is) accepted; numeric-typing of the ref was never enforced.
 *
 * Using {@link FieldRef} (path enumeration only) instead of {@link TypedPaths} (per-path value re-walk to
 * filter for `number`) removes ~328K type instantiations — `Expr` is checked on every `ObjFilter` relate, so
 * this dominated filter-type-check cost. See `npm run type-perf`.
 *
 * TRADE-OFF: editor AUTOCOMPLETE now suggests all field paths here, not only numeric-typed ones. This is a
 * suggestion-only change, not a type-checking change. To restore numeric-only suggestions, revert to
 * `` (`$${string}` & {}) | `$${TypedPaths<TInput, number>}` `` — but that reinstates the ~328K cost.
 */
type NumericFieldRef<TInput extends object> = FieldRef<TInput>;

export type ObjectExpr<TInput extends object> =
	| { $getField: StringExpr<TInput> | { field: StringExpr<TInput>, input?: Expr<TInput> } }
	| { $mergeObjects: ArrayExpr<TInput> }
	| { $regexFind: { input: StringExpr<TInput>, options?: StringExpr<TInput>, regex: StringExpr<TInput> } }
	| { $regexFindAll: { input: StringExpr<TInput>, options?: StringExpr<TInput>, regex: StringExpr<TInput> } };

export type StringExpr<TInput extends object> =
	| FieldRef<TInput>
	| (string & {})
	| { $concat: StringExpr<TInput>[] }
	| { $dateToString: { date: DateExpr<TInput>, format?: StringExpr<TInput>, onNull?: Expr<TInput>, timezone?: StringExpr<TInput> } }
	| { $literal: string }
	| { $ltrim: { chars?: StringExpr<TInput>, input: StringExpr<TInput> } }
	| { $replaceAll: { find: StringExpr<TInput>, input: StringExpr<TInput>, replacement: StringExpr<TInput> } }
	| { $replaceOne: { find: StringExpr<TInput>, input: StringExpr<TInput>, replacement: StringExpr<TInput> } }
	| { $rtrim: { chars?: StringExpr<TInput>, input: StringExpr<TInput> } }
	| { $substr: [StringExpr<TInput>, NumericExpr<TInput>, NumericExpr<TInput>] }
	| { $substrBytes: [StringExpr<TInput>, NumericExpr<TInput>, NumericExpr<TInput>] }
	| { $substrCP: [StringExpr<TInput>, NumericExpr<TInput>, NumericExpr<TInput>] }
	| { $toLower: StringExpr<TInput> }
	| { $toString: Expr<TInput> }
	| { $toUpper: StringExpr<TInput> }
	| { $trim: { chars?: StringExpr<TInput>, input: StringExpr<TInput> } };

/** Field ref filtered to paths whose value extends TValue. */
export type TypedFieldRef<TInput extends object, TValue> = `$${TypedPaths<TInput, TValue>}`;

type TypedPaths<TInput extends object, TValue> = {
	[K in FieldPaths<TInput>]: NonNullable<DotPathValue<TInput, K>> extends TValue ? K : never
}[FieldPaths<TInput>];

export type TypeExpr<TInput extends object> =
	| { $toObjectId: Expr<TInput> }
	| { $type: Expr<TInput> };

export type VariableExpr<TInput extends object> =
	| { $let: { in: Expr<TInput>, vars: Record<string, Expr<TInput>> } }
	| { $map: { as: string, in: Expr<TInput>, input: ArrayExpr<TInput> } }
	| { $reduce: { in: Expr<TInput>, initialValue: Expr<TInput>, input: ArrayExpr<TInput> } };
