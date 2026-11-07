/* eslint-disable @typescript-eslint/no-unused-vars */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Assert, Equals, Includes } from '../types.js';
import type {
	AccumulatorExpr,
	AddFieldsOutput,
	GroupOutput,
	PipelineStage,
	ProjectOutput,
	UnwindOutput,
	ValidateFieldRefs
} from './stages.js';

import { Pipeline, pipeline, PipelineBuilder } from './pipeline.js';

interface Address {
	city: string,
	zip: number
}

interface Order {
	amount: number,
	status: string,
	userId: string
}

interface User {
	active: boolean,
	address: Address[],
	createdAt: Date,
	department: string,
	email: string,
	name: string,
	score: number,
	tags: string[]
}

// ---------------------------------------------------------------------------
// AccumulatorExpr
// ---------------------------------------------------------------------------

describe('AccumulatorExpr', () => {
	describe('$sum', () => {
		it('should include $sum accumulator', () => {
			type T1 = Assert<Includes<AccumulatorExpr<User>, { $sum: number }>>;
		});
	});

	describe('$avg', () => {
		it('should include $avg accumulator', () => {
			type T1 = Assert<Includes<AccumulatorExpr<User>, { $avg: '$score' }>>;
		});
	});

	describe('$push', () => {
		it('should include $push accumulator', () => {
			type T1 = Assert<Includes<AccumulatorExpr<User>, { $push: '$name' }>>;
		});
	});

	describe('$addToSet', () => {
		it('should include $addToSet accumulator', () => {
			type T1 = Assert<Includes<AccumulatorExpr<User>, { $addToSet: '$email' }>>;
		});
	});

	describe('$first / $last', () => {
		it('should include $first accumulator', () => {
			type T1 = Assert<Includes<AccumulatorExpr<User>, { $first: '$name' }>>;
		});

		it('should include $last accumulator', () => {
			type T1 = Assert<Includes<AccumulatorExpr<User>, { $last: '$name' }>>;
		});
	});

	describe('$min / $max', () => {
		it('should include $min accumulator', () => {
			type T1 = Assert<Includes<AccumulatorExpr<User>, { $min: '$score' }>>;
		});

		it('should include $max accumulator', () => {
			type T1 = Assert<Includes<AccumulatorExpr<User>, { $max: '$score' }>>;
		});
	});

	describe('$count', () => {
		it('should include $count accumulator', () => {
			type T1 = Assert<Includes<AccumulatorExpr<User>, { $count: Record<string, never> }>>;
		});
	});

	describe('$stdDevPop / $stdDevSamp', () => {
		it('should include $stdDevPop accumulator', () => {
			type T1 = Assert<Includes<AccumulatorExpr<User>, { $stdDevPop: '$score' }>>;
		});

		it('should include $stdDevSamp accumulator', () => {
			type T1 = Assert<Includes<AccumulatorExpr<User>, { $stdDevSamp: '$score' }>>;
		});
	});

	describe('$top / $bottom', () => {
		it('should include $top accumulator', () => {
			type T1 = Assert<Includes<AccumulatorExpr<User>, { $top: { output: '$name', sortBy: { score: -1 } } }>>;
		});

		it('should include $bottom accumulator', () => {
			type T1 = Assert<Includes<AccumulatorExpr<User>, { $bottom: { output: '$name', sortBy: { score: 1 } } }>>;
		});
	});
});

// ---------------------------------------------------------------------------
// PipelineStage — flat union for sub-pipeline use
// ---------------------------------------------------------------------------

describe('PipelineStage', () => {
	it('should accept $match stage', () => {
		const stage: PipelineStage<User> = { $match: { name: 'Alice' } };
	});

	it('should accept $sort stage', () => {
		const stage: PipelineStage<User> = { $sort: { score: -1 } };
	});

	it('should accept $limit stage', () => {
		const stage: PipelineStage<User> = { $limit: 10 };
	});

	it('should accept $group stage', () => {
		const stage: PipelineStage<User> = {
			$group: { _id: '$department', total: { $sum: 1 } }
		};
	});

	it('should accept $lookup stage with equality join', () => {
		const stage: PipelineStage<User> = {
			$lookup: { as: 'orders', foreignField: 'userId', from: 'orders', localField: 'email' }
		};
	});
});

// ---------------------------------------------------------------------------
// pipeline() builder — schema-preserving stages
// ---------------------------------------------------------------------------

describe('pipeline() builder', () => {
	it('should return a Pipeline instance', () => {
		const p = pipeline<User>();
		assert.ok(p instanceof Pipeline);
	});

	describe('match', () => {
		it('should accept a valid Filter<User>', () => {
			pipeline<User>().match({ active: true, name: 'Alice' });
		});

		it('should reject invalid field names', () => {
			// @ts-expect-error 'nonExistent' is not a field on User
			pipeline<User>().match({ nonExistent: true });
		});

		it('should preserve the schema (unchanged)', () => {
			const stages = pipeline<User>().match({ active: true }).build();
			assert.deepEqual(stages, [{ $match: { active: true } }]);
		});
	});

	describe('sort', () => {
		it('should accept valid top-level field paths', () => {
			pipeline<User>().sort({ name: 1, score: -1 });
		});

		it('should accept nested dot-notation paths', () => {
			pipeline<User>().sort({ 'address.city': 1 });
		});

		it('should reject unknown field names', () => {
			// @ts-expect-error 'nonExistent' is not a valid sort key on User
			pipeline<User>().sort({ nonExistent: 1 });
		});

		it('should preserve the input schema', () => {
			const stages = pipeline<User>().sort({ name: 1 }).build();
			assert.deepEqual(stages, [{ $sort: { name: 1 } }]);
		});
	});

	describe('limit', () => {
		it('should accept a number', () => {
			pipeline<User>().limit(10);
		});

		it('should preserve the input schema', () => {
			const stages = pipeline<User>().limit(10).build();
			assert.deepEqual(stages, [{ $limit: 10 }]);
		});
	});

	describe('skip', () => {
		it('should accept a number', () => {
			pipeline<User>().skip(5);
		});

		it('should preserve the input schema', () => {
			const stages = pipeline<User>().skip(5).build();
			assert.deepEqual(stages, [{ $skip: 5 }]);
		});
	});

	describe('sample', () => {
		it('should accept a size spec', () => {
			pipeline<User>().sample({ size: 10 });
		});

		it('should preserve the input schema', () => {
			const stages = pipeline<User>().sample({ size: 10 }).build();
			assert.deepEqual(stages, [{ $sample: { size: 10 } }]);
		});
	});

	// -------------------------------------------------------------------------
	// Schema-transforming — inferred output
	// -------------------------------------------------------------------------

	describe('group', () => {
		it('should accept a valid group spec', () => {
			pipeline<User>().group({ _id: '$department', total: { $sum: 1 } });
		});

		it('should accept null _id for global grouping', () => {
			pipeline<User>().group({ _id: null, total: { $sum: 1 } });
		});

		it('$sum accumulator should produce number in output schema', () => {
			type Result = GroupOutput<User, { _id: null, total: { $sum: number } }>;
			type T1 = Assert<Equals<Result['total'], number>>;
		});

		it('$avg accumulator should produce number in output schema', () => {
			type Result = GroupOutput<User, { _id: null, avg: { $avg: '$score' } }>;
			type T1 = Assert<Equals<Result['avg'], number>>;
		});

		it('$push accumulator should produce typed array in output schema', () => {
			type Result = GroupOutput<User, { _id: null, names: { $push: '$name' } }>;
			type T1 = Assert<Equals<Result['names'], string[]>>;
		});

		it('$addToSet accumulator should produce typed array in output schema', () => {
			type Result = GroupOutput<User, { _id: null, tags: { $addToSet: '$department' } }>;
			type T1 = Assert<Equals<Result['tags'], string[]>>;
		});

		it('null _id should produce null in output schema', () => {
			type Result = GroupOutput<User, { _id: null, total: { $sum: 1 } }>;
			type T1 = Assert<Equals<Result['_id'], null>>;
		});

		it('should track the group output schema for downstream stages', () => {
			pipeline<User>()
				.group({ _id: null, total: { $sum: 1 } })
				.sort({ total: -1 }); // 'total' is in the output schema
		});

		it('should reject pre-group fields in downstream sort', () => {
			pipeline<User>()
				.group({ _id: null, total: { $sum: 1 } })
				// @ts-expect-error 'name' is not in the group output schema
				.sort({ name: 1 });
		});
	});

	describe('count', () => {
		it('should produce Record<field, number> output schema', () => {
			const stages = pipeline<User>().count('total').build();
			assert.deepEqual(stages, [{ $count: 'total' }]);
		});

		it('should allow sorting on the count field downstream', () => {
			pipeline<User>().count('total').sort({ total: 1 });
		});

		it('should reject pre-count fields in downstream sort', () => {
			pipeline<User>()
				.count('total')
				// @ts-expect-error 'name' is not in the count output schema
				.sort({ name: 1 });
		});
	});

	describe('addFields', () => {
		it('should accept valid expressions', () => {
			pipeline<User>().addFields({ nameLen: { $strLenCP: '$name' } });
		});

		it('should allow sorting on the added field downstream', () => {
			pipeline<User>()
				.addFields({ nameLen: { $strLenCP: '$name' } })
				.sort({ nameLen: 1 });
		});

		it('should still allow sorting on original fields downstream', () => {
			pipeline<User>()
				.addFields({ nameLen: { $strLenCP: '$name' } })
				.sort({ name: 1 });
		});
	});

	describe('set', () => {
		it('should behave identically to addFields', () => {
			pipeline<User>()
				.set({ nameLen: { $strLenCP: '$name' } })
				.sort({ nameLen: 1 });
		});
	});

	describe('unset', () => {
		it('should remove a single field from the output schema', () => {
			pipeline<User>()
				.unset('name')
				// @ts-expect-error 'name' was removed by $unset
				.sort({ name: 1 });
		});

		it('should remove multiple fields from the output schema', () => {
			pipeline<User>()
				.unset(['name', 'email'])
				// @ts-expect-error 'email' was removed by $unset
				.sort({ email: 1 });
		});

		it('should leave other fields accessible', () => {
			pipeline<User>()
				.unset('name')
				.sort({ score: -1 }); // 'score' was not removed
		});
	});

	describe('unwind', () => {
		it('should accept a field reference string', () => {
			pipeline<User>().unwind('$tags');
		});

		it('should accept an options object', () => {
			pipeline<User>().unwind({ path: '$tags', preserveNullAndEmptyArrays: true });
		});

		it('should unwrap array field to element type', () => {
			// tags: string[] → tags: string after unwind
			type Result = UnwindOutput<User, '$tags'>;
			type T1 = Assert<Equals<Result['tags'], string>>;
		});

		it('should allow sorting on the unwound field downstream', () => {
			pipeline<User>()
				.unwind('$tags')
				.sort({ tags: 1 });
		});
	});

	describe('lookup', () => {
		it('should accept an equality join spec', () => {
			pipeline<User>().lookup<Order, 'orders'>({
				as: 'orders',
				foreignField: 'userId',
				from: 'orders',
				localField: 'email'
			});
		});

		it('should accept a pipeline join spec', () => {
			pipeline<User>().lookup<Order, 'orders'>({
				as: 'orders',
				from: 'orders',
				pipeline: [{ $match: { status: 'active' } }]
			});
		});

		it('should add foreign collection as typed array field', () => {
			const stages = pipeline<User>().lookup<Order, 'orders'>({
				as: 'orders',
				foreignField: 'userId',
				from: 'orders',
				localField: 'email'
			}).build();
			assert.deepEqual(stages, [{ $lookup: { as: 'orders', foreignField: 'userId', from: 'orders', localField: 'email' } }]);
		});

		it('should allow sorting on nested lookup fields downstream', () => {
			pipeline<User>()
				.lookup<Order, 'orders'>({ as: 'orders', foreignField: 'userId', from: 'orders', localField: 'email' })
				.sort({ 'orders.amount': 1 });
		});
	});

	describe('project', () => {
		describe('inclusion mode (any field = 1)', () => {
			it('should carry the TInput field type for 1-valued fields', () => {
				type T1 = Assert<Equals<ProjectOutput<User, { name: 1 }>['name'], string>>;
			});

			it('should only include specified fields (others dropped)', () => {
				type T1 = Assert<Equals<keyof ProjectOutput<User, { name: 1 }>, 'name'>>;
			});

			it('should drop 0-valued fields', () => {
				type T1 = Assert<Equals<keyof ProjectOutput<User, { _id: 0, name: 1 }>, 'name'>>;
			});

			it('should infer string for string expression fields', () => {
				type T1 = Assert<Equals<ProjectOutput<User, { name: 1, upper: { $toUpper: '$name' } }>['upper'], string>>;
			});

			it('should track the inclusion output schema for downstream stages', () => {
				pipeline<User>()
					.project({ name: 1 })
					.sort({ name: 1 }); // 'name' is in inclusion output
			});

			it('should reject non-included fields in downstream stages', () => {
				pipeline<User>()
					.project({ name: 1 })
					// @ts-expect-error 'email' was not included in the projection
					.sort({ email: 1 });
			});

			it('should reconstruct nested object for dot-notation inclusion field', () => {
				type T1 = Assert<Equals<ProjectOutput<User, { 'address.city': 1 }>['address'], Array<{ city: string }>>>;
			});

			it('should use top-level key not flat dot key in inclusion output', () => {
				type T1 = Assert<Equals<keyof ProjectOutput<User, { 'address.city': 1 }>, 'address'>>;
			});

			it('should track dot-notation inclusion output for downstream stages', () => {
				pipeline<User>()
					.project({ 'address.city': 1 })
					.sort({ 'address': 1 });
			});

			it('should reject non-projected top-level fields after dot-notation inclusion', () => {
				pipeline<User>()
					.project({ 'address.city': 1 })
					// @ts-expect-error 'name' was not included in the projection
					.sort({ name: 1 });
			});
		});

		describe('exclusion mode (no field = 1)', () => {
			it('should preserve non-excluded TInput field types', () => {
				type T1 = Assert<Equals<ProjectOutput<User, { email: 0 }>['name'], string>>;
			});

			it('should allow sorting on retained fields downstream', () => {
				pipeline<User>()
					.project({ email: 0 })
					.sort({ name: 1 }); // 'name' was kept
			});

			it('should reject excluded fields in downstream stages', () => {
				pipeline<User>()
					.project({ email: 0 })
					// @ts-expect-error 'email' was excluded by the projection
					.sort({ email: 1 });
			});

			it('should infer number for numeric expression fields', () => {
				type T1 = Assert<Equals<ProjectOutput<User, { score: { $multiply: ['$score', 2] } }>['score'], number>>;
			});

			it('should exclude non-projected fields in inclusion mode with expressions', () => {
				type T1 = Assert<Equals<keyof ProjectOutput<User, { score: { $multiply: ['$score', 2] } }>, 'score'>>;
			});
		});
	});

	describe('replaceRoot', () => {
		it('should accept a newRoot expression', () => {
			pipeline<User>().replaceRoot({ newRoot: '$address' });
		});

		it('should use explicit TOutput for downstream type tracking', () => {
			pipeline<User>()
				.replaceRoot<Address>({ newRoot: { $arrayElemAt: ['$address', 0] } })
				.sort({ city: 1 }); // 'city' is in Address
		});
	});

	describe('replaceWith', () => {
		it('should accept an expression', () => {
			pipeline<User>().replaceWith({ $arrayElemAt: ['$address', 0] });
		});

		it('should use explicit TOutput for downstream type tracking', () => {
			pipeline<User>()
				.replaceWith<Address>({ $arrayElemAt: ['$address', 0] })
				.sort({ city: 1 }); // 'city' is in Address
		});
	});

	describe('sortByCount', () => {
		it('should accept an expression', () => {
			pipeline<User>().sortByCount('$department');
		});

		it('should produce { _id, count } output schema', () => {
			const stages = pipeline<User>().sortByCount('$department').build();
			assert.deepEqual(stages, [{ $sortByCount: '$department' }]);
		});

		it('should allow sorting on count downstream', () => {
			pipeline<User>().sortByCount('$department').sort({ count: -1 });
		});
	});

	describe('facet', () => {
		it('should accept sub-pipeline builders via factory callback', () => {
			pipeline<User>().facet(p => ({
				byDept: p().group({ _id: '$department', total: { $sum: 1 } }),
				top10: p().sort({ score: -1 }).limit(10)
			}));
		});

		it('should infer element type from sub-pipeline output schema', () => {
			const stages = pipeline<User>().facet(p => ({
				byDept: p().group({ _id: '$department', total: { $sum: 1 } })
			})).build();
			assert.deepEqual(stages, [{ $facet: { byDept: [{ $group: { _id: '$department', total: { $sum: 1 } } }] } }]);
		});
	});

	// -------------------------------------------------------------------------
	// Terminal methods
	// -------------------------------------------------------------------------

	describe('out', () => {
		it('should accept a collection name string', () => {
			const terminal = pipeline<User>().match({ active: true }).out('archive');

			assert.deepEqual(terminal.build(), [{ $match: { active: true } }, { $out: 'archive' }]);
		});

		it('should accept a db+coll object', () => {
			const terminal = pipeline<User>().out({ coll: 'archive', db: 'reporting' });
			assert.deepEqual(terminal.build(), [{ $out: { coll: 'archive', db: 'reporting' } }]);
		});
	});

	describe('merge', () => {
		it('should accept a merge spec', () => {
			const terminal = pipeline<User>()
				.match({ active: true })
				.merge({ into: 'archive', whenNotMatched: 'insert' });
			assert.deepEqual(terminal.build(), [
				{ $match: { active: true } },
				{ $merge: { into: 'archive', whenNotMatched: 'insert' } }
			]);
		});
	});

	// -------------------------------------------------------------------------
	// Chaining across multiple schema transformations
	// -------------------------------------------------------------------------

	describe('chaining', () => {
		it('should support multi-step chains with schema tracking', () => {
			// match (User) → group (GroupOutput) → sort (GroupOutput) → limit → merge
			const terminal = pipeline<User>()
				.match({ active: true })
				.group({ _id: '$department', headcount: { $sum: 1 } })
				.sort({ headcount: -1 })
				.limit(5)
				.merge({ into: 'summary' });

			assert.deepEqual(terminal.build(), [
				{ $match: { active: true } },
				{ $group: { _id: '$department', headcount: { $sum: 1 } } },
				{ $sort: { headcount: -1 } },
				{ $limit: 5 },
				{ $merge: { into: 'summary' } }
			]);
		});

		it('should support unwind → match chain on element type', () => {
			// After unwind('$tags'), tags is string. Match on tags as string.
			pipeline<User>()
				.unwind('$tags')
				.match({ tags: 'typescript' }); // tags is now string, not string[]
		});

		it('should support lookup → group chain on joined schema', () => {
			pipeline<User>()
				.lookup<Order, 'orders'>({ as: 'orders', foreignField: 'userId', from: 'orders', localField: 'email' })
				.group({ _id: '$department', orderCount: { $sum: { $size: '$orders' } } });
		});
	});

	// -------------------------------------------------------------------------
	// Extensibility — subclass via create() override
	// -------------------------------------------------------------------------

	describe('extensibility', () => {
		it('should return Pipeline instance through schema-preserving methods', () => {
			const result = pipeline<User>().match({ active: true });
			assert.ok(result instanceof Pipeline);
		});

		it('should return Pipeline instance through schema-transforming methods', () => {
			const result = pipeline<User>().group({ _id: '$department', total: { $sum: 1 } });
			assert.ok(result instanceof Pipeline);
		});

		it('should return Pipeline instance through multi-step chains', () => {
			const result = pipeline<User>()
				.match({ active: true })
				.group({ _id: '$department', total: { $sum: 1 } })
				.sort({ total: -1 })
				.limit(10);
			assert.ok(result instanceof Pipeline);
		});

		it('should use create() for facet sub-pipeline factory', () => {
			let isSubPipeline = false;
			pipeline<User>().facet((p) => {
				const sub = p();
				isSubPipeline = sub instanceof Pipeline;
				return { branch: sub.match({ active: true }) };
			});
			assert.ok(isSubPipeline);
		});

		it('should still accumulate correct stages', () => {
			const stages = pipeline<User>()
				.match({ active: true })
				.sort({ name: 1 })
				.build();
			assert.deepEqual(stages, [
				{ $match: { active: true } },
				{ $sort: { name: 1 } }
			]);
		});

		it('should expose terminal methods on the builder itself', () => {
			const stages = pipeline<User>().match({ active: true }).build();
			assert.deepEqual(stages, [
				{ $match: { active: true } }
			]);
		});

		it('should return TTerminal from out() and merge()', () => {
			const terminal = pipeline<User>()
				.match({ active: true })
				.out('archive');
			assert.deepEqual(terminal.build(), [
				{ $match: { active: true } },
				{ $out: 'archive' }
			]);
		});
	});
});

// ---------------------------------------------------------------------------
// ValidateFieldRefs
// ---------------------------------------------------------------------------

describe('ValidateFieldRefs', () => {
	it('should pass through valid top-level field refs unchanged', () => {
		type Result = ValidateFieldRefs<User, { x: '$email' }>;
		type T1 = Assert<Equals<Result['x'], '$email'>>;
	});

	it('should pass through valid dot-notation field refs unchanged', () => {
		type Result = ValidateFieldRefs<User, { x: '$address.city' }>;
		type T1 = Assert<Equals<Result['x'], '$address.city'>>;
	});

	it('should map invalid field refs to never', () => {
		type Result = ValidateFieldRefs<User, { x: '$nonExistent' }>;
		type T1 = Assert<Equals<Result['x'], never>>;
	});

	it('should map invalid dot-notation refs to never', () => {
		type Result = ValidateFieldRefs<User, { x: '$address.cityy' }>;
		type T1 = Assert<Equals<Result['x'], never>>;
	});

	it('should pass through non-$ string values unchanged', () => {
		type Result = ValidateFieldRefs<User, { x: 'hello' }>;
		type T1 = Assert<Equals<Result['x'], 'hello'>>;
	});

	it('should pass through object expressions unchanged', () => {
		type Result = ValidateFieldRefs<User, { x: { $strLenCP: '$name' } }>;
		type T1 = Assert<Equals<Result['x'], { $strLenCP: '$name' }>>;
	});

	it('should pass through numeric values unchanged', () => {
		type Result = ValidateFieldRefs<User, { x: 1 }>;
		type T1 = Assert<Equals<Result['x'], 1>>;
	});

	it('should validate multiple keys independently', () => {
		type Result = ValidateFieldRefs<User, { a: '$email', b: '$nonExistent', c: 'literal' }>;
		type T1 = Assert<Equals<Result['a'], '$email'>>;
		type T2 = Assert<Equals<Result['b'], never>>;
		type T3 = Assert<Equals<Result['c'], 'literal'>>;
	});

	it('should reject invalid field refs in addFields at compile time', () => {
		pipeline<User>()
			.addFields({
				// @ts-expect-error — $nonExistent is not a valid field ref
				bad: '$nonExistent',
				good: '$email'
			});
	});

	it('should reject invalid field refs in set at compile time', () => {
		pipeline<User>()
			.set({
				// @ts-expect-error — $address.cityy is not a valid field ref (typo)
				bad: '$address.cityy',
				good: '$name'
			});
	});

	it('should reject invalid field refs in project at compile time', () => {
		pipeline<User>()
			.project({
				// @ts-expect-error — $address.cityy is not a valid field ref (typo)
				bad: '$address.cityy',
				good: '$email'
			});
	});
});

// ---------------------------------------------------------------------------
// Non-zero number projection: Mongo reads any non-zero number as `true`, i.e. inclusion
// ---------------------------------------------------------------------------

describe('non-zero number projection', () => {
	it('should accept number literals in project spec', () => {
		pipeline<User>()
			.project({ num: 123, score: 1 })
			.build();
	});

	it('should include the field a non-zero number names, with its TInput type', () => {
		type T1 = Assert<Equals<ProjectOutput<User, { name: 123 }>['name'], string>>;
	});

	it('should still treat 1 as inclusion (preserving TInput type)', () => {
		type T1 = Assert<Equals<ProjectOutput<User, { name: 1 }>['name'], string>>;
	});

	it('should still treat 0 as exclusion', () => {
		type T1 = Assert<Equals<keyof ProjectOutput<User, { _id: 0, name: 1 }>, 'name'>>;
	});

	it('should infer number for numeric expression alongside a non-zero number', () => {
		type Result = ProjectOutput<User, { doubled: { $multiply: ['$score', 2] }, name: 123 }>;
		type T1 = Assert<Equals<Result['doubled'], number>>;
		type T2 = Assert<Equals<Result['name'], string>>;
	});

	it('should allow downstream access to fields included by a non-zero number', () => {
		pipeline<User>()
			.project({ name: 1, score: 123 })
			.sort({ score: 1 });
	});
});

// ---------------------------------------------------------------------------
// MongoDB expression semantics
// ---------------------------------------------------------------------------

describe('expressions as MongoDB reads them', () => {
	interface Account {
		_id: string,
		deletedAt?: Date,
		name: string,
		score: number,
		tags: string[]
	}

	it('should take null as a literal inside an expression', () => {
		pipeline<Account>().match({ $expr: { $eq: ['$deletedAt', null] } });
		pipeline<Account>().addFields({ at: { $ifNull: ['$deletedAt', null] } });
	});

	it('should take an embedded document whose values are expressions, and type it', () => {
		type Grouped = GroupOutput<Account, { _id: { n: '$name', s: '$score' }, people: { $push: { n: '$name' } } }>;
		type T1 = Assert<Equals<Grouped['_id'], { n: string, s: number }>>;
		type T2 = Assert<Equals<Grouped['people'], { n: string }[]>>;

		pipeline<Account>().group({ _id: { n: '$name', s: '$score' }, c: { $sum: 1 } });
		pipeline<Account>().replaceRoot({ newRoot: { n: '$name' } });
		pipeline<Account>().replaceWith({ n: '$name' });
		pipeline<Account>().project({ meta: { a: '$name' } });

		const added = pipeline<Account>().addFields({ meta: { a: '$name', b: 1 } });
		added.sort({ 'meta.a': 1 });
	});

	it('should still refuse a misspelt operator, or one with extra keys', () => {
		// @ts-expect-error $toUpperr is no operator, and a document's keys may not start with $
		pipeline<Account>().addFields({ x: { $toUpperr: '$name' } });
		// @ts-expect-error an operator object takes exactly one key
		pipeline<Account>().addFields({ x: { $toUpper: '$name', y: 1 } });
		// @ts-expect-error also inside an embedded document
		pipeline<Account>().addFields({ meta: { x: { $concat: ['$name'], $extra: 1 } } });
		// @ts-expect-error a filter's $expr stays strict too
		pipeline<Account>().match({ $expr: { $eq: ['$name', 'x'], y: 1 } });
		// @ts-expect-error field references are checked inside an embedded document
		pipeline<Account>().addFields({ meta: { a: '$nope' } });
	});

	it('should take number, boolean and null literals in $addFields and $set', () => {
		type Added = AddFieldsOutput<Account, { count: 0, deletedAt: null, flag: true }>;
		type T1 = Assert<Equals<Added, { count: number, deletedAt: null, flag: boolean }>>;

		pipeline<Account>().set({ count: 0, deletedAt: null, flag: true });
	});

	it('should take system variables and type them', () => {
		type Added = AddFieldsOutput<Account, { at: '$$NOW', doc: '$$ROOT' }>;
		type T1 = Assert<Equals<Added['at'], Date>>;
		type T2 = Assert<Equals<Added['doc'], Account>>;

		pipeline<Account>().addFields({ at: '$$NOW', doc: '$$ROOT' });
		pipeline<Account>().project({ name: 1, score: '$$REMOVE' });
		// @ts-expect-error a single $ still names a field, which must exist
		pipeline<Account>().addFields({ x: '$nope' });
	});

	it('should remove a field set to $$REMOVE', () => {
		const removed = pipeline<Account>().set({ name: '$$REMOVE' });
		// @ts-expect-error name was removed
		removed.sort({ name: 1 });
	});

	it('should overwrite a field $addFields, $set or $lookup sets again, not intersect it', () => {
		type OutputOf<TBuilder> = TBuilder extends PipelineBuilder<infer TOutput, any> ? TOutput : never;

		const added = pipeline<Account>().addFields({ score: { $toString: '$score' } });
		type T1 = Assert<Equals<OutputOf<typeof added>['score'], string>>;

		const joined = pipeline<Account>().lookup<Order, 'tags'>({ as: 'tags', foreignField: 'userId', from: 'orders', localField: '_id' });
		type T2 = Assert<Equals<OutputOf<typeof joined>['tags'], Order[]>>;
	});

	it('should accept only accumulators beside _id in $group', () => {
		// @ts-expect-error a $group field other than _id must be an accumulator
		pipeline<Account>().group({ _id: null, x: '$name' });
	});
});

describe('$project as MongoDB reads it', () => {
	interface Account {
		_id: string,
		name: string,
		score: number
	}

	it('should keep _id in inclusion mode unless it is excluded', () => {
		type T1 = Assert<Equals<keyof ProjectOutput<Account, { name: 1 }>, '_id' | 'name'>>;
		type T2 = Assert<Equals<keyof ProjectOutput<Account, { _id: 0, name: 1 }>, 'name'>>;
		type T3 = Assert<Equals<keyof ProjectOutput<Account, { _id: 1 }>, '_id'>>;

		pipeline<Account>().project({ name: 1 }).sort({ _id: 1 });
	});

	it('should read a non-zero number as inclusion, keeping the field\'s type', () => {
		type T1 = Assert<Equals<ProjectOutput<Account, { name: 5 }>['name'], string>>;
		type T2 = Assert<Equals<keyof ProjectOutput<Account, { name: 5 }>, '_id' | 'name'>>;
	});
});
