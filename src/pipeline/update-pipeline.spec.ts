/* eslint-disable @typescript-eslint/no-unused-vars */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Assert, Equals } from '../types.js';
import type { ProjectOutput } from './stages.js';

import { UpdatePipeline, updatePipeline } from './update-pipeline.js';

interface Address {
	city: string,
	zip: number
}

interface User {
	active: boolean,
	department: string,
	email: string,
	name: string,
	score: number,
	tags: string[]
}

// ---------------------------------------------------------------------------
// UpdatePipeline — stage methods
// ---------------------------------------------------------------------------

describe('UpdatePipeline', () => {
	describe('addFields', () => {
		it('should accept valid expressions', () => {
			const stages = updatePipeline<User>()
				.addFields({ nameLen: { $strLenCP: '$name' } })
				.build();
			assert.deepEqual(stages, [{ $addFields: { nameLen: { $strLenCP: '$name' } } }]);
		});

		it('should make added fields visible downstream', () => {
			updatePipeline<User>()
				.addFields({ nameLen: { $strLenCP: '$name' } })
				.project({ nameLen: 1 });
		});

		it('should preserve original fields', () => {
			updatePipeline<User>()
				.addFields({ nameLen: { $strLenCP: '$name' } })
				.project({ name: 1, nameLen: 1 });
		});
	});

	describe('set', () => {
		it('should behave identically to addFields', () => {
			const stages = updatePipeline<User>()
				.set({ nameLen: { $strLenCP: '$name' } })
				.build();
			assert.deepEqual(stages, [{ $set: { nameLen: { $strLenCP: '$name' } } }]);
		});

		it('should make set fields visible downstream', () => {
			updatePipeline<User>()
				.set({ nameLen: { $strLenCP: '$name' } })
				.project({ nameLen: 1 });
		});
	});

	describe('project', () => {
		it('should accept inclusion mode', () => {
			const stages = updatePipeline<User>()
				.project({ email: 1, name: 1 })
				.build();
			assert.deepEqual(stages, [{ $project: { email: 1, name: 1 } }]);
		});

		it('should accept exclusion mode', () => {
			const stages = updatePipeline<User>()
				.project({ tags: 0 })
				.build();
			assert.deepEqual(stages, [{ $project: { tags: 0 } }]);
		});

		it('should carry the field type for included fields', () => {
			type T1 = Assert<Equals<ProjectOutput<User, { name: 1 }>['name'], string>>;
		});

		it('should reshape schema in inclusion mode', () => {
			updatePipeline<User>()
				.project({ name: 1 })
				// @ts-expect-error 'email' was not included in project
				.unset('email');
		});
	});

	describe('unset', () => {
		it('should remove a single field', () => {
			const stages = updatePipeline<User>()
				.unset('name')
				.build();
			assert.deepEqual(stages, [{ $unset: 'name' }]);
		});

		it('should remove multiple fields', () => {
			const stages = updatePipeline<User>()
				.unset(['name', 'email'])
				.build();
			assert.deepEqual(stages, [{ $unset: ['name', 'email'] }]);
		});

		it('should make removed fields inaccessible downstream', () => {
			updatePipeline<User>()
				.unset('name')
				// @ts-expect-error 'name' was removed by $unset
				.unset('name');
		});

		it('should leave other fields accessible', () => {
			updatePipeline<User>()
				.unset('name')
				.set({ x: { $strLenCP: '$email' } }); // 'email' was not removed
		});
	});

	describe('replaceRoot', () => {
		it('should accept a newRoot expression', () => {
			const stages = updatePipeline<User>()
				.replaceRoot({ newRoot: '$department' })
				.build();
			assert.deepEqual(stages, [{ $replaceRoot: { newRoot: '$department' } }]);
		});

		it('should use explicit TOutput for downstream type tracking', () => {
			updatePipeline<User>()
				.replaceRoot<Address>({ newRoot: { $arrayElemAt: ['$tags', 0] } })
				.project({ city: 1 }); // 'city' is in Address
		});
	});

	describe('replaceWith', () => {
		it('should accept an expression', () => {
			const stages = updatePipeline<User>()
				.replaceWith({ $arrayElemAt: ['$tags', 0] })
				.build();
			assert.deepEqual(stages, [{ $replaceWith: { $arrayElemAt: ['$tags', 0] } }]);
		});

		it('should use explicit TOutput for downstream type tracking', () => {
			updatePipeline<User>()
				.replaceWith<Address>({ $arrayElemAt: ['$tags', 0] })
				.project({ city: 1 }); // 'city' is in Address
		});
	});

	// -------------------------------------------------------------------------
	// build
	// -------------------------------------------------------------------------

	describe('build', () => {
		it('should return empty array for no stages', () => {
			assert.deepEqual(updatePipeline<User>().build(), []);
		});

		it('should return a copy of stages', () => {
			const p = updatePipeline<User>().set({ x: { $literal: 1 } });
			const a = p.build();
			const b = p.build();
			assert.notEqual(a, b);
			assert.deepEqual(a, b);
		});
	});

	// -------------------------------------------------------------------------
	// Chaining across multiple schema transformations
	// -------------------------------------------------------------------------

	describe('chaining', () => {
		it('should support multi-step chains with schema tracking', () => {
			const stages = updatePipeline<User>()
				.set({ fullName: { $concat: ['$name', ' ', '$email'] } })
				.unset('email')
				.project({ active: 1, fullName: 1, name: 1 })
				.build();

			assert.deepEqual(stages, [
				{ $set: { fullName: { $concat: ['$name', ' ', '$email'] } } },
				{ $unset: 'email' },
				{ $project: { active: 1, fullName: 1, name: 1 } }
			]);
		});
	});

	// -------------------------------------------------------------------------
	// Extensibility
	// -------------------------------------------------------------------------

	describe('extensibility', () => {
		it('should be an instance of UpdatePipeline', () => {
			const p = updatePipeline<User>();
			assert.ok(p instanceof UpdatePipeline);
		});

		it('should return UpdatePipeline instances after chaining', () => {
			const p = updatePipeline<User>().set({ x: { $literal: 1 } });
			assert.ok(p instanceof UpdatePipeline);
		});
	});

	// -------------------------------------------------------------------------
	// ValidateFieldRefs
	// -------------------------------------------------------------------------

	describe('ValidateFieldRefs', () => {
		it('should accept valid field refs in addFields', () => {
			updatePipeline<User>()
				.addFields({ copy: '$email' })
				.build();
		});

		it('should reject invalid field refs in addFields', () => {
			updatePipeline<User>()
				.addFields({
					// @ts-expect-error — $nonExistent is not a valid field ref
					bad: '$nonExistent',
					good: '$name'
				});
		});

		it('should reject invalid field refs in set', () => {
			updatePipeline<User>()
				.set({
					// @ts-expect-error — $department.typo is not a valid field ref
					bad: '$department.typo',
					good: '$email'
				});
		});

		it('should reject invalid field refs in project', () => {
			updatePipeline<User>()
				.project({
					// @ts-expect-error — $nonExistent is not a valid field ref
					bad: '$nonExistent',
					good: '$name'
				});
		});

		it('should accept valid dot-notation field refs in set', () => {
			updatePipeline<User>()
				.set({ copy: '$tags' })
				.build();
		});
	});

	// -------------------------------------------------------------------------
	// Number literal projection
	// -------------------------------------------------------------------------

	describe('non-zero number projection', () => {
		it('should accept number literals in project spec', () => {
			updatePipeline<User>()
				.project({ num: 123, score: 1 })
				.build();
		});

		it('should include the field a non-zero number names, as 1 does', () => {
			type T1 = Assert<Equals<ProjectOutput<User, { name: 123 }>['name'], string>>;
		});
	});
});
