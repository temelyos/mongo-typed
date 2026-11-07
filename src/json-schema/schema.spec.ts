/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it } from 'node:test';

import type { Assert, Includes, Not } from '../types.js';
import type { JsonSchema } from './schema.js';
import type { JsonSchemaBoolean, JsonSchemaInteger, JsonSchemaNumber } from './types.js';

describe('JsonSchema', () => {
	describe('allOf', () => {
		it('should accept BSON type aliases in nested number schemas', () => {
			type T1 = Assert<Includes<JsonSchema<number>, { allOf: [{ bsonType: 'int' }] }>>;
			type T2 = Assert<Includes<JsonSchema<number>, { allOf: [{ bsonType: 'double' }] }>>;
			type T3 = Assert<Includes<JsonSchema<number>, { allOf: [{ bsonType: 'decimal' }] }>>;
			type T4 = Assert<Includes<JsonSchema<number>, { allOf: [{ bsonType: 'long' }] }>>;
		});

		it('should NOT accept JSON-only type as bsonType in nested number schemas', () => {
			type T1 = Assert<Not<Includes<JsonSchema<number>, { allOf: [{ bsonType: 'number' }] }>>>;
		});

		it('should accept BSON type alias in nested boolean schemas', () => {
			type T1 = Assert<Includes<JsonSchema<boolean>, { allOf: [{ bsonType: 'bool' }] }>>;
		});

		it('should NOT accept JSON-only type as bsonType in nested boolean schemas', () => {
			type T1 = Assert<Not<Includes<JsonSchema<boolean>, { allOf: [{ bsonType: 'boolean' }] }>>>;
		});

		it('should still accept the correct JSON schema type in the type field of nested schemas', () => {
			type T1 = Assert<Includes<JsonSchema<number>, { allOf: [{ type: 'number' }] }>>;
			type T2 = Assert<Includes<JsonSchema<boolean>, { allOf: [{ type: 'boolean' }] }>>;
		});
	});

	describe('anyOf', () => {
		it('should accept BSON type aliases in nested number schemas', () => {
			type T1 = Assert<Includes<JsonSchema<number>, { anyOf: [{ bsonType: 'int' }] }>>;
			type T2 = Assert<Includes<JsonSchema<number>, { anyOf: [{ bsonType: 'double' }] }>>;
			type T3 = Assert<Includes<JsonSchema<number>, { anyOf: [{ bsonType: 'decimal' }] }>>;
			type T4 = Assert<Includes<JsonSchema<number>, { anyOf: [{ bsonType: 'long' }] }>>;
		});

		it('should NOT accept JSON-only type as bsonType in nested number schemas', () => {
			type T1 = Assert<Not<Includes<JsonSchema<number>, { anyOf: [{ bsonType: 'number' }] }>>>;
		});

		it('should accept BSON type alias in nested boolean schemas', () => {
			type T1 = Assert<Includes<JsonSchema<boolean>, { anyOf: [{ bsonType: 'bool' }] }>>;
		});

		it('should NOT accept JSON-only type as bsonType in nested boolean schemas', () => {
			type T1 = Assert<Not<Includes<JsonSchema<boolean>, { anyOf: [{ bsonType: 'boolean' }] }>>>;
		});

		it('should still accept the correct JSON schema type in the type field of nested schemas', () => {
			type T1 = Assert<Includes<JsonSchema<number>, { anyOf: [{ type: 'number' }] }>>;
			type T2 = Assert<Includes<JsonSchema<boolean>, { anyOf: [{ type: 'boolean' }] }>>;
		});
	});

	describe('contains', () => {
		it('should accept BSON type aliases in a nested number schema', () => {
			type T1 = Assert<Includes<JsonSchema<number>, { contains: { bsonType: 'int' } }>>;
			type T2 = Assert<Includes<JsonSchema<number>, { contains: { bsonType: 'double' } }>>;
			type T3 = Assert<Includes<JsonSchema<number>, { contains: { bsonType: 'decimal' } }>>;
			type T4 = Assert<Includes<JsonSchema<number>, { contains: { bsonType: 'long' } }>>;
		});

		it('should NOT accept JSON-only type as bsonType in a nested number schema', () => {
			type T1 = Assert<Not<Includes<JsonSchema<number>, { contains: { bsonType: 'number' } }>>>;
		});

		it('should accept BSON type alias in a nested boolean schema', () => {
			type T1 = Assert<Includes<JsonSchema<boolean>, { contains: { bsonType: 'bool' } }>>;
		});

		it('should NOT accept JSON-only type as bsonType in a nested boolean schema', () => {
			type T1 = Assert<Not<Includes<JsonSchema<boolean>, { contains: { bsonType: 'boolean' } }>>>;
		});

		it('should still accept the correct JSON schema type in the type field of a nested schema', () => {
			type T1 = Assert<Includes<JsonSchema<number>, { contains: { type: 'number' } }>>;
			type T2 = Assert<Includes<JsonSchema<boolean>, { contains: { type: 'boolean' } }>>;
		});
	});

	describe('not', () => {
		it('should accept BSON type aliases in a nested number schema', () => {
			type T1 = Assert<Includes<JsonSchema<number>, { not: { bsonType: 'int' } }>>;
			type T2 = Assert<Includes<JsonSchema<number>, { not: { bsonType: 'double' } }>>;
			type T3 = Assert<Includes<JsonSchema<number>, { not: { bsonType: 'decimal' } }>>;
			type T4 = Assert<Includes<JsonSchema<number>, { not: { bsonType: 'long' } }>>;
		});

		it('should NOT accept JSON-only type as bsonType in a nested number schema', () => {
			type T1 = Assert<Not<Includes<JsonSchema<number>, { not: { bsonType: 'number' } }>>>;
		});

		it('should accept BSON type alias in a nested boolean schema', () => {
			type T1 = Assert<Includes<JsonSchema<boolean>, { not: { bsonType: 'bool' } }>>;
		});

		it('should NOT accept JSON-only type as bsonType in a nested boolean schema', () => {
			type T1 = Assert<Not<Includes<JsonSchema<boolean>, { not: { bsonType: 'boolean' } }>>>;
		});

		it('should still accept the correct JSON schema type in the type field of a nested schema', () => {
			type T1 = Assert<Includes<JsonSchema<number>, { not: { type: 'number' } }>>;
			type T2 = Assert<Includes<JsonSchema<boolean>, { not: { type: 'boolean' } }>>;
		});
	});

	describe('oneOf', () => {
		it('should accept BSON type aliases in nested number schemas', () => {
			type T1 = Assert<Includes<JsonSchema<number>, { oneOf: [{ bsonType: 'int' }] }>>;
			type T2 = Assert<Includes<JsonSchema<number>, { oneOf: [{ bsonType: 'double' }] }>>;
			type T3 = Assert<Includes<JsonSchema<number>, { oneOf: [{ bsonType: 'decimal' }] }>>;
			type T4 = Assert<Includes<JsonSchema<number>, { oneOf: [{ bsonType: 'long' }] }>>;
		});

		it('should NOT accept JSON-only type as bsonType in nested number schemas', () => {
			type T1 = Assert<Not<Includes<JsonSchema<number>, { oneOf: [{ bsonType: 'number' }] }>>>;
		});

		it('should accept BSON type alias in nested boolean schemas', () => {
			type T1 = Assert<Includes<JsonSchema<boolean>, { oneOf: [{ bsonType: 'bool' }] }>>;
		});

		it('should NOT accept JSON-only type as bsonType in nested boolean schemas', () => {
			type T1 = Assert<Not<Includes<JsonSchema<boolean>, { oneOf: [{ bsonType: 'boolean' }] }>>>;
		});

		it('should still accept the correct JSON schema type in the type field of nested schemas', () => {
			type T1 = Assert<Includes<JsonSchema<number>, { oneOf: [{ type: 'number' }] }>>;
			type T2 = Assert<Includes<JsonSchema<boolean>, { oneOf: [{ type: 'boolean' }] }>>;
		});
	});

	describe('readonly arrays', () => {
		it('should accept readonly bsonType and type lists', () => {
			const types = ['string', 'null'] as const;
			type T1 = Assert<Includes<JsonSchema<null | string>, { bsonType: typeof types }>>;
			type T2 = Assert<Includes<JsonSchema<null | string>, { type: typeof types }>>;
		});
	});
});

describe('JsonSchemaBoolean / JsonSchemaNumber / JsonSchemaInteger', () => {
	it('should take the BSON aliases Mongo knows', () => {
		type T1 = Assert<Includes<JsonSchemaBoolean, { bsonType: 'bool' }>>;
		type T2 = Assert<Includes<JsonSchemaNumber, { bsonType: 'double' }>>;
		type T3 = Assert<Includes<JsonSchemaNumber, { bsonType: ['int', 'long'] }>>;
		type T4 = Assert<Includes<JsonSchemaInteger, { bsonType: 'int' }>>;
	});

	it('should NOT take the JSON type names as a bsonType', () => {
		type T1 = Assert<Not<Includes<JsonSchemaBoolean, { bsonType: 'boolean' }>>>;
	});
});
