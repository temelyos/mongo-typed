import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ObjFilter } from './filter.js';

import { FilterOperand, mapFilterValues } from './filter-values.js';

interface Roster {
	_id: string,
	name: string,
	owner: { _id: string, name: string },
	shifts: Shift[],
	tags: string[]
}

interface Shift {
	endAt: Date,
	owner: string,
	startAt: Date
}

function visits(filter: ObjFilter<Roster>): [string, string, unknown][] {
	const seen: [string, string, unknown][] = [];
	mapFilterValues(filter, ({ operator, path, value }: FilterOperand) => {
		seen.push([path, operator, value]);
		return value;
	});
	return seen;
}

const upper = ({ value }: FilterOperand) => (typeof value === 'string' ? value.toUpperCase() : value);

describe('mapFilterValues()', () => {
	it('maps an equality value as $eq', () => {
		assert.deepEqual(mapFilterValues<Roster>({ name: 'a', owner: { _id: 'o', name: 'n' } }, upper), { name: 'A', owner: { _id: 'o', name: 'n' } });
		assert.deepEqual(visits({ name: 'a' }), [['name', '$eq', 'a']]);
	});

	it('passes an embedded document or array compared whole as one value', () => {
		assert.deepEqual(visits({ owner: { _id: 'o', name: 'n' }, tags: ['a', 'b'] }), [
			['owner', '$eq', { _id: 'o', name: 'n' }],
			['tags', '$eq', ['a', 'b']]
		]);
	});

	it('maps comparison operands under their operator', () => {
		const from = new Date('2026-10-01T00:00:00Z');
		const to = new Date('2026-10-08T00:00:00Z');

		assert.deepEqual(visits({ 'name': { $ne: 'x' }, 'shifts.startAt': { $gte: from, $lt: to } }), [
			['name', '$ne', 'x'],
			['shifts.startAt', '$gte', from],
			['shifts.startAt', '$lt', to]
		]);
	});

	it('maps each item of $in, $nin and $all', () => {
		assert.deepEqual(mapFilterValues<Roster>({ _id: { $in: ['a', 'b'] }, name: { $nin: ['c'] }, tags: { $all: ['d'] } }, upper), {
			_id: { $in: ['A', 'B'] },
			name: { $nin: ['C'] },
			tags: { $all: ['D'] }
		});
	});

	it('maps a list operand that is not a list as one value', () => {
		assert.deepEqual(mapFilterValues<Roster>({ _id: { $in: 'a' } } as unknown as ObjFilter<Roster>, upper), { _id: { $in: 'A' } });
	});

	it('recurses into $and, $or and $nor with the same paths', () => {
		assert.deepEqual(mapFilterValues<Roster>({ $and: [{ $or: [{ name: 'a' }, { _id: 'b' }] }], $nor: [{ tags: 'c' }] }, upper), {
			$and: [{ $or: [{ name: 'A' }, { _id: 'B' }] }],
			$nor: [{ tags: 'C' }]
		});
	});

	it('maps the operands under $not', () => {
		assert.deepEqual(visits({ name: { $not: { $eq: 'a' } } }), [['name', '$eq', 'a']]);
	});

	it('maps an $elemMatch condition by the element\'s full path', () => {
		assert.deepEqual(visits({ shifts: { $elemMatch: { owner: 'u', startAt: { $gt: 1 } } } } as ObjFilter<Roster>), [
			['shifts.owner', '$eq', 'u'],
			['shifts.startAt', '$gt', 1]
		]);
		assert.deepEqual(visits({ tags: { $elemMatch: { $in: ['a'] } } }), [['tags', '$in', 'a']]);
		assert.deepEqual(visits({ shifts: { $elemMatch: { $or: [{ owner: 'u' }] } } } as ObjFilter<Roster>), [['shifts.owner', '$eq', 'u']]);
	});

	it('copies operators that take no field value', () => {
		const filter = {
			$comment: 'c',
			$expr: { $eq: ['$name', 'a'] },
			$text: { $search: 'a' },
			name: { $exists: true, $options: 'i', $regex: 'a' },
			tags: { $size: 2, $type: 'array' }
		} as ObjFilter<Roster>;

		assert.deepEqual(visits(filter), []);
		assert.deepEqual(mapFilterValues(filter, upper), filter);
	});

	it('leaves the filter it was given unchanged', () => {
		const filter: ObjFilter<Roster> = { $or: [{ name: 'a' }], _id: { $in: ['b'] } };

		mapFilterValues(filter, upper);

		assert.deepEqual(filter, { $or: [{ name: 'a' }], _id: { $in: ['b'] } });
	});
});
