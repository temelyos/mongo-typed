/* eslint-disable @typescript-eslint/no-unused-vars */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';

import type { ObjFilter } from '../filter.js';
import type { Assert, Equals } from '../types.js';

import { objFilter } from './obj-filter.js';

const isoDate = z.codec(z.iso.datetime(), z.date(), {
	decode: value => new Date(value),
	encode: date => date.toISOString()
});

const shift = z.object({ owner: z.string(), startAt: isoDate });

const roster = z.object({
	closedAt: isoDate.nullable().optional(),
	createdAt: isoDate,
	holidays: z.array(isoDate),
	name: z.string().min(1),
	owner: z.object({ _id: z.string(), name: z.string() }),
	reviewedAt: z.date().optional(),
	shifts: z.array(shift)
});

const request = z.object({ where: objFilter(roster).optional() });

const oct1 = new Date('2026-10-01T00:00:00.000Z');
const oct8 = new Date('2026-10-08T00:00:00.000Z');

/** What a filter looks like after a JSON round trip: every Date is an ISO string. */
function overJson<T>(value: T): unknown {
	return JSON.parse(JSON.stringify(value));
}

describe('objFilter()', () => {
	it('decodes a codec field\'s operands inside a z.object parse', () => {
		const { where } = request.parse({ where: overJson({ $or: [{ createdAt: { $gte: oct1, $lt: oct8 } }, { createdAt: oct1 }] }) });

		assert.deepEqual(where, { $or: [{ createdAt: { $gte: oct1, $lt: oct8 } }, { createdAt: oct1 }] });
	});

	it('decodes by the element\'s full path under $elemMatch', () => {
		const { where } = request.parse({ where: overJson({ shifts: { $elemMatch: { owner: 'u', startAt: { $in: [oct1] } } } }) });

		assert.deepEqual(where, { shifts: { $elemMatch: { owner: 'u', startAt: { $in: [oct1] } } } });
	});

	it('decodes an array field\'s elements, whether compared one at a time or whole', () => {
		const { where } = request.parse({ where: overJson({ $and: [{ holidays: oct1 }, { holidays: { $all: [oct1, oct8] } }, { holidays: [oct1] }] }) });

		assert.deepEqual(where, { $and: [{ holidays: oct1 }, { holidays: { $all: [oct1, oct8] } }, { holidays: [oct1] }] });
	});

	it('reads an ISO string as a date for a z.date() field', () => {
		const { where } = request.parse({ where: overJson({ reviewedAt: { $lt: oct8 } }) });

		assert.deepEqual(where, { reviewedAt: { $lt: oct8 } });
	});

	it('keeps a value that is already decoded', () => {
		const { where } = request.parse({ where: { createdAt: { $gte: oct1 }, reviewedAt: oct8 } });

		assert.deepEqual(where, { createdAt: { $gte: oct1 }, reviewedAt: oct8 });
	});

	it('encodes dates to ISO strings, the way back', () => {
		const where: ObjFilter<z.output<typeof roster>> = {
			$or: [{ createdAt: { $gte: oct1 } }, { reviewedAt: oct8 }],
			holidays: [oct1],
			name: 'Pat',
			shifts: { $elemMatch: { startAt: { $in: [oct1] } } }
		};

		assert.deepEqual(z.encode(request, { where }), { where: overJson(where) });
	});

	it('round-trips a filter through encode and decode', () => {
		const where: ObjFilter<z.output<typeof roster>> = { createdAt: { $gte: oct1, $lt: oct8 }, holidays: { $all: [oct1] }, reviewedAt: { $ne: oct8 } };

		assert.deepEqual(z.decode(request, z.encode(request, { where })), { where });
	});

	it('keeps a value that is already encoded', () => {
		assert.deepEqual(z.encode(request, { where: { createdAt: { $gte: oct1.toISOString() } } as never }), { where: { createdAt: { $gte: oct1.toISOString() } } });
	});

	it('rejects a value its field cannot decode, naming the field', () => {
		const result = request.safeParse({ where: { createdAt: { $gte: 'not a date' } } });

		assert.equal(result.success, false);
		assert.deepEqual(result.error.issues.map(issue => issue.path), [['where', 'createdAt']]);
	});

	it('leaves other fields, nulls, unknown paths and non-value operators as they are', () => {
		const filter = {
			closedAt: null,
			createdAt: { $exists: true },
			extra: '2026-10-01T00:00:00.000Z',
			name: { $ne: '' },
			owner: Object.fromEntries([['name', 'Pat'], ['_id', 'o']])
		};
		const { where } = request.parse({ where: filter });

		assert.deepEqual(where, filter);
		assert.deepEqual(Object.keys(where!.owner as object), ['name', '_id']);
	});

	it('refuses a where that is not an object', () => {
		assert.equal(request.safeParse({ where: 'createdAt' }).success, false);
		assert.equal(request.safeParse({ where: [] }).success, false);
	});

	it('types the parsed filter by the model\'s output and the accepted one by its input', () => {
		type Output = Assert<Equals<z.output<ReturnType<typeof objFilter<typeof roster>>>, ObjFilter<z.output<typeof roster>>>>;
		type Input = Assert<Equals<z.input<ReturnType<typeof objFilter<typeof roster>>>, ObjFilter<z.input<typeof roster>>>>;
	});
});
