import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BsonType, BsonTypeNumeric } from './bson-types.js';

describe('BsonTypeNumeric', () => {
	it('exists at runtime, with a number for every BsonType alias', () => {
		assert.equal(BsonTypeNumeric.int, 16);
		assert.equal(BsonTypeNumeric.minKey, -1);
		assert.deepEqual(Object.keys(BsonTypeNumeric).sort(), Object.keys(BsonType).sort());
	});
});
