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

const account = z.object({
	authorizations: z.array(z.object({ hash: z.string(), service: z.string() })),
	config: z.object({ password: z.string(), theme: z.string() }),
	name: z.string()
});

const guarded = objFilter(account, { forbiddenFields: ['authorizations.hash', 'config.password'], untrusted: true });

function refused(schema: z.ZodType, filter: unknown): string[] {
	const result = schema.safeParse(filter);
	assert.equal(result.success, false);
	return result.error!.issues.map(issue => issue.message);
}

describe('objFilter() with untrusted', () => {
	it('refuses an operator that runs code or a pipeline, at any depth', () => {
		for (const filter of [
			{ $where: 'this.name' },
			{ $or: [{ $expr: { $eq: ['$name', 'a'] } }] },
			{ authorizations: { $elemMatch: { $function: {} } } },
			{ name: { $not: { $jsonSchema: {} } } }
		]) {
			assert.deepEqual(refused(guarded, filter), ['Filter contains a forbidden operator or value.']);
		}
	});

	it('refuses anything but plain data', () => {
		class Probe {}
		const sparse: unknown[] = [];
		sparse[2] = 'a';

		refused(guarded, { name: () => 'a' });
		refused(guarded, { name: new Probe() });
		refused(guarded, { name: new Map() });
		refused(guarded, { name: { $in: sparse } });
	});

	it('refuses an object reached twice, and a cycle', () => {
		const clause = { name: 'a' };
		const cycle: Record<string, unknown> = { name: 'a' };
		cycle['$and'] = [cycle];

		refused(guarded, { $or: [clause, clause] });
		refused(guarded, cycle);
	});

	it('accepts the same Date twice and equal objects built separately', () => {
		const at = new Date('2026-10-01T00:00:00.000Z');
		const schema = objFilter(roster, { untrusted: true });

		assert.equal(schema.safeParse({ $or: [{ createdAt: at }, { reviewedAt: at }] }).success, true);
		assert.equal(schema.safeParse({ $or: [{ name: 'a' }, { name: 'a' }] }).success, true);
	});

	it('leaves those operators to a trusted caller', () => {
		assert.equal(objFilter(account).safeParse({ $expr: { $eq: ['$name', 'a'] } }).success, true);
	});
});

describe('objFilter() with forbiddenFields', () => {
	it('refuses a forbidden path however the filter names it', () => {
		for (const filter of [
			{ 'authorizations.hash': 'x' },
			{ 'authorizations.hash': { $options: 'i', $regex: '^ab' } },
			{ 'authorizations.0.hash': { $exists: true } },
			{ authorizations: { $elemMatch: { hash: 'x' } } },
			{ $or: [{ 'config.password': { $ne: null } }] }
		]) {
			assert.deepEqual(refused(guarded, filter), ['Filter references a forbidden field.'], JSON.stringify(filter));
		}
	});

	it('refuses a forbidden field inside a parent compared whole', () => {
		refused(guarded, { config: { password: 'x', theme: 't' } });
		refused(guarded, { authorizations: [{ hash: 'x', service: 's' }] });
	});

	it('refuses what lies below a forbidden object', () => {
		refused(objFilter(account, { forbiddenFields: ['config'] }), { 'config.theme': 'dark' });
	});

	it('names the forbidden path in the issue', () => {
		const result = z.object({ where: guarded }).safeParse({ where: { 'authorizations.hash': 'x' } });

		assert.deepEqual(result.error?.issues.map(issue => issue.path), [['where', 'authorizations', 'hash']]);
	});

	it('allows the fields beside a forbidden one, and its parent without a value', () => {
		assert.equal(guarded.safeParse({ 'authorizations.service': 'google', 'config.theme': 'dark' }).success, true);
		assert.equal(guarded.safeParse({ authorizations: { $exists: true, $size: 1 } }).success, true);
	});

	it('takes only paths of the model', () => {
		// @ts-expect-error a misspelt path is not one of the model's
		objFilter(account, { forbiddenFields: ['authorizations.hsah'] });
	});
});
