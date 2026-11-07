import { DotNotation } from '../dot-notation.js';
import { Expr, ExprOrDocument, FieldRef, InferExprType } from '../expr.js';
import { Filter } from '../filter.js';
import {
	AddFieldsResult,
	AddFieldsSpec,
	GroupAccumulators,
	GroupOutput,
	GroupSpec,
	LookupSpec,
	MergeSpec,
	ObjSort,
	ProjectOutput,
	ProjectSpec,
	SetWindowFieldsSpec,
	UnwindOptions,
	UnwindOutput,
	ValidateFieldRefs
} from './stages.js';

/** Enriches the builder return type with TTerminal methods (non-conditional intersection). */
type Chain<TInput extends object, TTerminal> = PipelineBuilder<TInput, TTerminal> & TTerminal;

/** Inferred output type of a $facet stage — each key maps to an array of the sub-pipeline's output type. */
export type FacetOutput<TSpec> = {
	[K in keyof TSpec]: TSpec[K] extends PipelineBuilder<infer O, any> ? O[] : unknown[]
};

// ---------------------------------------------------------------------------
// PipelineBuilder — fluent builder with schema tracking across stages
// ---------------------------------------------------------------------------

/** Terminal interface for {@link Pipeline} — provides `build()`, `merge()`, and `out()`. */
export interface PipelineTerminal {
	build: () => object[],
	merge: (spec: MergeSpec) => PipelineTerminal,
	out: (collection: string | { coll: string, db: string }) => PipelineTerminal
}

/**
 * Creates a type-safe MongoDB aggregation pipeline.
 * The generic parameter `TInput` is the schema of the collection being aggregated.
 *
 * @example
 * ```ts
 * const stages = pipeline<User>()
 *   .match({ active: true })
 *   .group({ _id: '$department', headcount: { $sum: 1 } })
 *   .sort({ headcount: -1 })
 *   .build();
 * ```
 */
export function pipeline<TInput extends object>(): Pipeline<TInput> {
	return new Pipeline<TInput>();
}

export class PipelineBuilder<TInput extends object, TTerminal = object> {
	protected readonly stages: object[];

	constructor(stages: object[] = []) {
		this.stages = stages;
	}

	addFields<TFields extends AddFieldsSpec<TInput>>(spec: ValidateFieldRefs<TInput, TFields>): Chain<AddFieldsResult<TInput, TFields>, TTerminal> {
		return this.push({ $addFields: spec });
	}

	count<TField extends string>(field: TField): Chain<Record<TField, number>, TTerminal> {
		return this.push({ $count: field });
	}

	/** Override in subclasses to control how new builder instances are created during chaining. */
	protected create<T extends object>(stages: object[]): PipelineBuilder<T, TTerminal> {
		return new PipelineBuilder<T, TTerminal>(stages);
	}

	facet<TSpec extends Record<string, PipelineBuilder<any, any>>>(fn: (p: () => PipelineBuilder<TInput, TTerminal>) => TSpec): Chain<FacetOutput<TSpec>, TTerminal> {
		const spec = fn(() => this.create<TInput>([]));
		const built = Object.fromEntries(Object.entries(spec).map(([k, b]) => [k, [...b.stages]]));
		return this.push({ $facet: built });
	}

	group<TSpec extends GroupSpec<TInput>>(spec: GroupAccumulators<TInput, TSpec> & TSpec): Chain<GroupOutput<TInput, TSpec>, TTerminal> {
		return this.push({ $group: spec });
	}

	limit(n: number): Chain<TInput, TTerminal> {
		return this.push({ $limit: n });
	}

	lookup<TForeignSchema extends object, TAs extends string>(
		spec: LookupSpec<TInput, TForeignSchema, TAs>
	): Chain<Omit<TInput, TAs> & Record<TAs, TForeignSchema[]>, TTerminal> {
		return this.push({ $lookup: spec });
	}

	match(filter: Filter<TInput>): Chain<TInput, TTerminal> {
		return this.push({ $match: filter });
	}

	project<TSpec extends ProjectSpec<TInput>>(spec: ValidateFieldRefs<TInput, TSpec>): Chain<ProjectOutput<TInput, TSpec>, TTerminal> {
		return this.push({ $project: spec });
	}

	private push(stage: object): any {
		return this.create([...this.stages, stage]);
	}

	replaceRoot<TOutput extends object = Record<string, unknown>>(spec: { newRoot: ExprOrDocument<TInput> }): Chain<TOutput, TTerminal> {
		return this.push({ $replaceRoot: spec });
	}

	replaceWith<TOutput extends object = Record<string, unknown>>(expr: ExprOrDocument<TInput>): Chain<TOutput, TTerminal> {
		return this.push({ $replaceWith: expr });
	}

	sample(spec: { size: number }): Chain<TInput, TTerminal> {
		return this.push({ $sample: spec });
	}

	set<TFields extends AddFieldsSpec<TInput>>(spec: ValidateFieldRefs<TInput, TFields>): Chain<AddFieldsResult<TInput, TFields>, TTerminal> {
		return this.push({ $set: spec });
	}

	setWindowFields(spec: SetWindowFieldsSpec<TInput>): Chain<TInput, TTerminal> {
		return this.push({ $setWindowFields: spec });
	}

	skip(n: number): Chain<TInput, TTerminal> {
		return this.push({ $skip: n });
	}

	sort(spec: ObjSort<TInput>): Chain<TInput, TTerminal> {
		return this.push({ $sort: spec });
	}

	sortByCount<TExpr extends Expr<TInput>>(expr: TExpr): Chain<{ _id: InferExprType<TInput, TExpr>, count: number }, TTerminal> {
		return this.push({ $sortByCount: expr });
	}

	unset<T extends DotNotation<TInput>>(fields: T | T[]): Chain<Omit<TInput, T>, TTerminal> {
		return this.push({ $unset: fields });
	}

	unwind<TField extends FieldRef<TInput>>(
		spec: TField | UnwindOptions<TInput, TField>
	): Chain<UnwindOutput<TInput, TField>, TTerminal> {
		return this.push({ $unwind: spec });
	}
}

/** Concrete pipeline builder — returns `Pipeline` instances during chaining. */
export class Pipeline<TInput extends object> extends PipelineBuilder<TInput, PipelineTerminal> implements PipelineTerminal {
	build(): object[] {
		return [...this.stages];
	}

	protected override create<T extends object>(stages: object[]): Pipeline<T> {
		return new Pipeline<T>(stages);
	}

	merge(spec: MergeSpec): PipelineTerminal {
		return this.create([...this.stages, { $merge: spec }]);
	}

	out(collection: string | { coll: string, db: string }): PipelineTerminal {
		return this.create([...this.stages, { $out: collection }]);
	}
}
