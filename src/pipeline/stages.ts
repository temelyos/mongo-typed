import { DotNotation } from '../dot-notation.js';
import { DocumentExpr, Expr, ExprOrDocument, FieldRef, InferExprType, NumericExpr } from '../expr.js';
import { Document, Filter } from '../filter.js';
import { GeoJsonPoint } from '../geo-json.js';
import { ObjSort } from '../sort.js';

export { ObjSort } from '../sort.js';

// ---------------------------------------------------------------------------
// Accumulator expressions (valid in $group, $bucket, $bucketAuto, $setWindowFields)
// ---------------------------------------------------------------------------

export type AccumulatorExpr<TInput extends object> =
	| { $addToSet: ExprOrDocument<TInput> }
	| { $avg: Expr<TInput> | Expr<TInput>[] }
	| { $bottom: { output: ExprOrDocument<TInput>, sortBy: Record<string, -1 | 1> } }
	| { $bottomN: { n: NumericExpr<TInput>, output: ExprOrDocument<TInput>, sortBy: Record<string, -1 | 1> } }
	| { $count: Record<string, never> }
	| { $first: ExprOrDocument<TInput> }
	| { $firstN: { input: ExprOrDocument<TInput>, n: NumericExpr<TInput> } }
	| { $last: ExprOrDocument<TInput> }
	| { $lastN: { input: ExprOrDocument<TInput>, n: NumericExpr<TInput> } }
	| { $max: Expr<TInput> | Expr<TInput>[] }
	| { $maxN: { input: Expr<TInput>, n: NumericExpr<TInput> } }
	| { $mergeObjects: ExprOrDocument<TInput> }
	| { $min: Expr<TInput> | Expr<TInput>[] }
	| { $minN: { input: Expr<TInput>, n: NumericExpr<TInput> } }
	| { $push: ExprOrDocument<TInput> }
	| { $stdDevPop: Expr<TInput> | Expr<TInput>[] }
	| { $stdDevSamp: Expr<TInput> | Expr<TInput>[] }
	| { $sum: Expr<TInput> | Expr<TInput>[] }
	| { $top: { output: ExprOrDocument<TInput>, sortBy: Record<string, -1 | 1> } }
	| { $topN: { n: NumericExpr<TInput>, output: ExprOrDocument<TInput>, sortBy: Record<string, -1 | 1> } };

/** Inferred output type of an $addFields / $set stage — maps each spec key to its expression return type; a `$$REMOVE` key is dropped. */
export type AddFieldsOutput<TInput extends object, TFields extends AddFieldsSpec<TInput>> = {
	[K in keyof TFields as TFields[K] extends '$$REMOVE' ? never : K]: InferExprType<TInput, TFields[K]>
};

/** The document after an $addFields / $set stage: a field it sets again is replaced, not intersected. */
export type AddFieldsResult<TInput extends object, TFields extends AddFieldsSpec<TInput>> =
	Omit<TInput, keyof TFields> & AddFieldsOutput<TInput, TFields>;

/** Fields to add or overwrite via $addFields / $set. Unlike `$project`, a number or boolean here is a literal value. */
export type AddFieldsSpec<TInput extends object> = Record<string, ExprOrDocument<TInput> | FieldRef<TInput> | (string & {})>;

// ---------------------------------------------------------------------------
// Stage-specific spec types
// ---------------------------------------------------------------------------

/** Spec for $bucketAuto */
export interface BucketAutoSpec<TInput extends object> {
	buckets: number,
	granularity?: string,
	groupBy: Expr<TInput>,
	output?: Record<string, AccumulatorExpr<TInput>>
}

/** Spec for $bucket */
export interface BucketSpec<TInput extends object> {
	boundaries: unknown[],
	default?: number | string,
	groupBy: Expr<TInput>,
	output?: Record<string, AccumulatorExpr<TInput>>
}

/** Spec for $densify */
export interface DensifySpec<TInput extends object> {
	field: DotNotation<TInput>,
	partitionByFields?: DotNotation<TInput>[],
	range: {
		bounds: 'full' | 'partition' | [Date | number, Date | number],
		step: number,
		unit?: 'day' | 'hour' | 'millisecond' | 'minute' | 'month' | 'quarter' | 'second' | 'week' | 'year'
	}
}

/** @internal Merges all dot-notation inclusion paths in a $project spec into a nested object type. */
type DotNotationInclusionMerge<TInput extends object, TSpec> =
	[DotPathsUnion<TInput, TSpec>] extends [never] ? unknown : UnionToIntersection<DotPathsUnion<TInput, TSpec>>;

/** @internal Union of PathToNested results for all non-excluded dot-notation fields in TSpec. */
type DotPathsUnion<TInput extends object, TSpec> = {
	[K in keyof TSpec & string]: K extends `${string}.${string}`
		? TSpec[K] extends 0 | false
			? never
			: TSpec[K] extends boolean | number ? PathToNested<TInput, K> : PathToNested<TInput, K, true, InferExprType<TInput, TSpec[K]>>
		: never
}[keyof TSpec & string];

/** Spec for $fill */
export interface FillSpec<TInput extends object> {
	output: {
		[K in keyof TInput]?: { method: 'backward' | 'forward' | 'linear' | 'locf' | 'spline' } | { value: Expr<TInput> }
	},
	partitionBy?: Record<string, Expr<TInput>>,
	partitionByFields?: DotNotation<TInput>[],
	sortBy?: ObjSort<TInput>
}

/** Spec for $geoNear */
export interface GeoNearSpec<TInput extends object> {
	distanceField: string,
	distanceMultiplier?: number,
	includeLocs?: string,
	key?: string,
	maxDistance?: number,
	minDistance?: number,
	near: [number, number] | GeoJsonPoint,
	query?: Filter<TInput>,
	spherical?: boolean
}

/** Spec for $graphLookup */
export interface GraphLookupSpec<TInput extends object> {
	as: string,
	connectFromField: string,
	connectToField: string,
	depthField?: string,
	from: string,
	maxDepth?: number,
	/** A filter on the `from` collection, which the input's schema doesn't describe. */
	restrictSearchWithMatch?: Document,
	startWith: Expr<TInput>
}

/** The fields of a $group spec other than `_id`, each of which must be an accumulator. */
export type GroupAccumulators<TInput extends object, TSpec> = {
	[K in Exclude<keyof TSpec, '_id'>]: AccumulatorExpr<TInput>
};

/** @internal Infers the element type of an array-returning accumulator; never if not matched */
type GroupArrayAccumulatorElement<TInput extends object, TField> =
	TField extends { $addToSet: infer E } ? InferExprType<TInput, E>
		: TField extends { $bottomN: { n: any, output: infer E, sortBy: any } } ? InferExprType<TInput, E>
			: TField extends { $firstN: { input: infer E, n: any } } ? InferExprType<TInput, E>
				: TField extends { $lastN: { input: infer E, n: any } } ? InferExprType<TInput, E>
					: TField extends { $maxN: { input: infer E, n: any } } ? InferExprType<TInput, E>
						: TField extends { $minN: { input: infer E, n: any } } ? InferExprType<TInput, E>
							: TField extends { $push: infer E } ? InferExprType<TInput, E>
								: TField extends { $topN: { n: any, output: infer E, sortBy: any } } ? InferExprType<TInput, E>
									: never;

/**
 * Infers the output type of a single $group accumulator field.
 * Numeric accumulators → number; array accumulators infer element type and wrap in [];
 * scalar accumulators infer their expression type; fallthrough covers _id and raw expressions.
 */
type GroupFieldOutput<TInput extends object, TField> =
	[TField] extends [GroupNumericAccumulator] ? number
		: [GroupArrayAccumulatorElement<TInput, TField>] extends [never]
			? [GroupScalarAccumulatorOutput<TInput, TField>] extends [never]
				? InferExprType<TInput, TField>
				: GroupScalarAccumulatorOutput<TInput, TField>
			: GroupArrayAccumulatorElement<TInput, TField>[];

/** @internal Numeric accumulator shapes — always produce number */
type GroupNumericAccumulator =
	| { $avg: any }
	| { $count: any }
	| { $stdDevPop: any }
	| { $stdDevSamp: any }
	| { $sum: any };

/** Infers the output document type of a $group stage from its spec. */
export type GroupOutput<TInput extends object, TSpec extends GroupSpec<TInput>> = {
	[K in keyof TSpec]: TSpec[K] extends null ? null : GroupFieldOutput<TInput, TSpec[K]>
};

/** @internal Infers the scalar return type of expression-forwarding non-array accumulators; never if not matched */
type GroupScalarAccumulatorOutput<TInput extends object, TField> =
	TField extends { $bottom: { output: infer E, sortBy: any } } ? InferExprType<TInput, E>
		: TField extends { $first: infer E } ? InferExprType<TInput, E>
			: TField extends { $last: infer E } ? InferExprType<TInput, E>
				: TField extends { $max: infer E } ? InferExprType<TInput, E>
					: TField extends { $mergeObjects: infer E } ? InferExprType<TInput, E>
						: TField extends { $min: infer E } ? InferExprType<TInput, E>
							: TField extends { $top: { output: infer E, sortBy: any } } ? InferExprType<TInput, E>
								: never;

/**
 * Spec for $group.
 * `_id` is required (use `null` for global grouping).
 * All other fields must be accumulator expressions; the builder enforces that through {@link GroupAccumulators}.
 */
export type GroupSpec<TInput extends object> = {
	_id: ExprOrDocument<TInput>
} & {
	[field: string]: AccumulatorExpr<TInput> | ExprOrDocument<TInput>
};

/** True if TSpec has any non-_id field whose value is not `0 | false`, or includes `_id` itself — signals $project inclusion mode. */
type HasInclusion<TSpec> =
	[{ [K in keyof TSpec]: K extends '_id' ? TSpec[K] extends 1 | true ? true : never : TSpec[K] extends 0 | false | undefined ? never : true }[keyof TSpec]] extends [never] ? false : true;

/** Spec for $lookup — equality join or pipeline join */
export type LookupSpec<TInput extends object, TForeignSchema extends object, TAs extends string> =
	| {
		as: TAs,
		foreignField: DotNotation<TForeignSchema>,
		from: string,
		localField: DotNotation<TInput>
	}
	| {
		as: TAs,
		from: string,
		let?: Record<string, Expr<TInput>>,
		pipeline: PipelineStage<TForeignSchema>[]
	};

/** Spec for $merge */
export interface MergeSpec {
	into: string | { coll: string, db: string },
	let?: Record<string, string>,
	on?: string | string[],
	whenMatched?: 'fail' | 'keepExisting' | 'merge' | 'replace' | PipelineStage<any>[],
	whenNotMatched?: 'discard' | 'fail' | 'insert'
}

/**
 * @internal Builds a nested object type from a dot-notation path, preserving array wrappers at intermediate
 * array fields. The leaf keeps its TInput type, or takes `TLeaf` for a computed field.
 */
type PathToNested<TInput extends object, TPath extends string, TComputed extends boolean = false, TLeaf = never> =
	TPath extends `${infer Head}.${infer Rest}`
		? Head extends keyof TInput
			? NonNullable<TInput[Head]> extends readonly (infer U)[]
				? { [K in Head]: Array<U extends object ? PathToNested<U, Rest, TComputed, TLeaf> : unknown> }
				: NonNullable<TInput[Head]> extends object
					? { [K in Head]: PathToNested<NonNullable<TInput[Head]>, Rest, TComputed, TLeaf> }
					: { [K in Head]: unknown }
			: { [K in Head]: unknown }
		: TComputed extends true
			? { [K in TPath]: TLeaf }
			: TPath extends keyof TInput
				? { [K in TPath]: TInput[TPath] }
				: { [K in TPath]: unknown };

export type PipelineStage<TInput extends object> =
	| { $addFields: AddFieldsSpec<TInput> }
	| { $bucket: BucketSpec<TInput> }
	| { $bucketAuto: BucketAutoSpec<TInput> }
	| { $count: string }
	| { $densify: DensifySpec<TInput> }
	| { $documents: DocumentExpr<TInput>[] }
	| { $facet: Record<string, PipelineStage<TInput>[]> }
	| { $fill: FillSpec<TInput> }
	| { $geoNear: GeoNearSpec<TInput> }
	| { $graphLookup: GraphLookupSpec<TInput> }
	| { $group: GroupSpec<TInput> }
	| { $indexStats: Record<string, never> }
	| { $limit: number }
	| { $lookup: LookupSpec<TInput, any, string> }
	| { $match: Filter<TInput> }
	| { $merge: MergeSpec }
	| { $out: string | { coll: string, db: string } }
	| { $project: ProjectSpec<TInput> }
	| { $replaceRoot: { newRoot: ExprOrDocument<TInput> } }
	| { $replaceWith: ExprOrDocument<TInput> }
	| { $sample: { size: number } }
	| { $set: AddFieldsSpec<TInput> }
	| { $setWindowFields: SetWindowFieldsSpec<TInput> }
	| { $skip: number }
	| { $sort: ObjSort<TInput> }
	| { $sortByCount: Expr<TInput> }
	| { $unionWith: string | { coll: string, pipeline?: PipelineStage<any>[] } }
	| { $unset: DotNotation<TInput> | DotNotation<TInput>[] }
	| { $unwind: FieldRef<TInput> | UnwindOptions<TInput, FieldRef<TInput>> };

/** @internal Exclusion-mode $project output: TInput minus excluded fields; expression fields are typed via InferExprType. */
type ProjectExclusionOutput<TInput extends object, TSpec> =
	{ [K in keyof TInput as K extends keyof TSpec ? TSpec[K] extends 0 | false ? never : TSpec[K] extends boolean | number ? K : never : K]: TInput[K] }
	& { [K in keyof TSpec as TSpec[K] extends boolean | number ? never : K]: InferExprType<TInput, TSpec[K]> };

/** @internal The top-level keys a $project spec includes by flag (`1`, `true`, a non-zero number); they keep their TInput modifiers. */
type ProjectFlagKeys<TSpec> = {
	[K in keyof TSpec & string]: K extends `${string}.${string}` ? never : TSpec[K] extends 0 | false ? never : TSpec[K] extends boolean | number ? K : never
}[keyof TSpec & string];

/**
 * @internal Inclusion-mode $project output: top-level fields typed from TInput, dot-notation paths reconstructed
 * as nested objects. Any non-zero number includes a field, as `1` does; `_id` stays unless the spec names it.
 */
type ProjectInclusionOutput<TInput extends object, TSpec> =
	Pick<TInput, Extract<ProjectFlagKeys<TSpec>, keyof TInput>>
	& { [K in Exclude<ProjectFlagKeys<TSpec>, keyof TInput>]: unknown }
	& { [K in keyof TSpec & string as K extends `${string}.${string}` ? never : TSpec[K] extends '$$REMOVE' | boolean | number ? never : K]: InferExprType<TInput, TSpec[K]> }
	& ('_id' extends keyof TSpec ? unknown : Pick<TInput, '_id' & keyof TInput>)
	& DotNotationInclusionMerge<TInput, TSpec>;

/**
 * Inferred output type of a `$project` stage.
 *
 * - **Inclusion mode** (any field = `1 | true`, a non-zero number, or an expression): only spec'd fields
 *   are kept, and `_id` unless it is excluded.
 *   Fields with `1 | true` carry their original `TInput` type; expression
 *   fields are typed via `InferExprType`; `0 | false` fields are dropped;
 *   dot-notation keys are reconstructed as nested object types.
 * - **Exclusion mode** (no field = `1 | true`): `TInput` minus excluded fields.
 *   Expression fields are typed via `InferExprType`.
 */
export type ProjectOutput<TInput extends object, TSpec extends ProjectSpec<TInput>> =
	HasInclusion<TSpec> extends true ? ProjectInclusionOutput<TInput, TSpec> : ProjectExclusionOutput<TInput, TSpec>;

/** Projection spec for $project (field inclusion/exclusion and computed fields). `_id`, like any field, takes a flag or an expression. */
export type ProjectSpec<TInput extends object> = {
	[P in DotNotation<TInput>]?: boolean | DocumentExpr<TInput> | (Expr<TInput> & object) | FieldRef<TInput> | number | (string & {})
} & {
	[field: string]: boolean | DocumentExpr<TInput> | (Expr<TInput> & object) | FieldRef<TInput> | number | (string & {}) | undefined
};

/** The document after a $setWindowFields stage: the input plus its `output` fields, a field set again replaced. */
export type SetWindowFieldsOutput<TInput extends object, TSpec extends SetWindowFieldsSpec<TInput>> =
	Omit<TInput, keyof TSpec['output']> & { [K in keyof TSpec['output']]: WindowFieldOutput<TInput, TSpec['output'][K]> };

/** Spec for $setWindowFields */
export interface SetWindowFieldsSpec<TInput extends object> {
	output: Record<string, WindowAccumulatorExpr<TInput>>,
	partitionBy?: Expr<TInput>,
	sortBy?: ObjSort<TInput>
}

/** @internal Converts a union type to an intersection type. Used to merge nested projection paths. */
type UnionToIntersection<U> =
	(U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

/** @internal Unwinds the field at dotted path `TPath` inside `T`, through embedded documents. */
type UnwindAt<T, TPath extends string, TPreserve extends boolean> =
	TPath extends keyof T
		? Omit<T, TPath> & UnwoundField<T, TPath, TPreserve>
		: TPath extends `${infer Head}.${infer Rest}`
			? Head extends keyof T
				? NonNullable<T[Head]> extends object ? Omit<T, Head> & { [P in Head]: UnwindAt<NonNullable<T[Head]>, Rest, TPreserve> } : T
				: T
			: T;

/** Options object form of $unwind */
export interface UnwindOptions<TInput extends object, TField extends FieldRef<TInput>, TIndex extends string = string, TPreserve extends boolean = boolean> {
	includeArrayIndex?: TIndex,
	path: TField,
	preserveNullAndEmptyArrays?: TPreserve
}

/**
 * Infers the output type of an $unwind stage.
 * The array at `TField`, nested or not, is unwrapped to its element type; `TIndex` names the
 * includeArrayIndex field (`null` for a value that wasn't an array); with `TPreserve`, the field may
 * also be missing or null.
 */
export type UnwindOutput<TInput extends object, TField extends FieldRef<TInput>, TIndex extends string = never, TPreserve extends boolean = false> =
	(TField extends `$${infer K}` ? UnwindAt<TInput, K, TPreserve> : TInput)
	& ([TIndex] extends [never] ? unknown : { [P in TIndex]: null | number });

/** @internal What $unwind leaves of a value: each element of an array, or the value itself. */
type UnwoundElement<T> = NonNullable<T> extends ReadonlyArray<infer U> ? U : NonNullable<T>;

/** @internal The unwound field itself: one element, or with `TPreserve` also missing or null. */
type UnwoundField<T, TPath extends keyof T, TPreserve extends boolean> = TPreserve extends true
	? { [P in TPath]?: null | UnwoundElement<T[TPath]> }
	: { [P in TPath]: UnwoundElement<T[TPath]> };

/** @internal See {@link ValidateFieldRefs}. */
type ValidateExprValue<TInput extends object, TValue> =
	TValue extends `$$${string}` ? TValue
		: TValue extends `$${infer Path}` ? Path extends DotNotation<TInput> ? TValue : never
			: TValue extends Date | readonly unknown[] | RegExp ? TValue
				: TValue extends object
					? [Extract<keyof TValue, `$${string}`>] extends [never]
						? { [K in keyof TValue]: ValidateExprValue<TInput, TValue[K]> }
						: [keyof TValue] extends [UnionToIntersection<keyof TValue>] ? TValue : never
					: TValue;

/**
 * @internal Validates that string values beginning with `$` are valid field references, also inside embedded
 * documents, and refuses an operator object with more than one key (Mongo takes exactly one). `$$` system
 * variables and other values pass through unchanged.
 */
export type ValidateFieldRefs<TInput extends object, TSpec> = {
	[K in keyof TSpec]: ValidateExprValue<TInput, TSpec[K]>
};

/** Accumulator expression with an optional window specification, for use in `$setWindowFields`. */
export type WindowAccumulatorExpr<TInput extends object> = (AccumulatorExpr<TInput> | WindowOperatorExpr<TInput>) & {
	window?: {
		documents?: ['current' | 'unbounded' | number, 'current' | 'unbounded' | number],
		range?: ['current' | 'unbounded' | number, 'current' | 'unbounded' | number],
		unit?: 'day' | 'hour' | 'millisecond' | 'minute' | 'month' | 'quarter' | 'second' | 'week' | 'year'
	}
};

/** @internal The type a $setWindowFields output field takes. */
type WindowFieldOutput<TInput extends object, TField> =
	// The whole operator union, as a spec still at its constraint has: typing it would fan out over every operator.
	[{ $rank: Record<string, never> } | { $sum: 1 }] extends [TField] ? unknown
		: TField extends { $covariancePop: any } | { $covarianceSamp: any } | { $denseRank: any } | { $derivative: any } | { $documentNumber: any } | { $expMovingAvg: any } | { $integral: any } | { $rank: any }
			? number
			: TField extends { $shift: { default: infer D, output: infer E } } ? InferExprType<TInput, D> | InferExprType<TInput, E>
				: TField extends { $shift: { output: infer E } } ? InferExprType<TInput, E> | null
					: TField extends { $linearFill: infer E } | { $locf: infer E } ? InferExprType<TInput, E>
						: GroupFieldOutput<TInput, TField>;

/** Operators only `$setWindowFields` takes. */
export type WindowOperatorExpr<TInput extends object> =
	| { $covariancePop: [NumericExpr<TInput>, NumericExpr<TInput>] }
	| { $covarianceSamp: [NumericExpr<TInput>, NumericExpr<TInput>] }
	| { $denseRank: Record<string, never> }
	| { $derivative: { input: NumericExpr<TInput>, unit?: WindowUnit } }
	| { $documentNumber: Record<string, never> }
	| { $expMovingAvg: { alpha: number, input: NumericExpr<TInput> } | { input: NumericExpr<TInput>, N: number } }
	| { $integral: { input: NumericExpr<TInput>, unit?: WindowUnit } }
	| { $linearFill: Expr<TInput> }
	| { $locf: Expr<TInput> }
	| { $rank: Record<string, never> }
	| { $shift: { by: number, default?: Expr<TInput>, output: Expr<TInput> } };

type WindowUnit = 'day' | 'hour' | 'millisecond' | 'minute' | 'month' | 'quarter' | 'second' | 'week' | 'year';
