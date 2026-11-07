/* eslint-disable @typescript-eslint/no-unused-vars */
import type { z } from 'zod';

import { describe, it } from 'node:test';

import type { DotNotation, DotPathValue, OnlyFieldsOfTypeDotNotation } from './dot-notation.js';
import type { Assert, Equals, Includes, Not } from './types.js';

interface Profile {
	active: boolean,
	bio: string,
	rating: number
}

interface User {
	address?: {
		city?: string,
		zip: number
	},
	createdAt: Date,
	email: string,
	name: string,
	profile: Profile,
	roles: {
		name: string
	}[],
	tags: string[]
}

describe('DotNotation', () => {
	it('should include top-level keys', () => {
		type T = DotNotation<User>;

		type T1 = Assert<Includes<T, 'name'>>;
		type T2 = Assert<Includes<T, 'email'>>;
		type T3 = Assert<Includes<T, 'address'>>;
		type T4 = Assert<Includes<T, 'roles'>>;
		type T5 = Assert<Includes<T, 'tags'>>;
	});

	it('should include nested keys', () => {
		type T = DotNotation<User>;

		type T1 = Assert<Includes<T, 'address.city'>>;
		type T2 = Assert<Includes<T, 'address.zip'>>;
	});

	it('should include array index paths', () => {
		type T = DotNotation<User>;

		type T1 = Assert<Includes<T, 'tags.0'>>;
		type T2 = Assert<Includes<T, 'roles.0'>>;
		type T3 = Assert<Includes<T, 'roles.0.name'>>;
	});

	it('should include deep dot notation with mixed levels', () => {
		interface Deep {
			a: {
				b: {
					c: {
						d: string
					}
				}
			}
		}
		type T = DotNotation<Deep>;

		type T1 = Assert<Includes<T, 'a.b.c.d'>>;
		type T2 = Assert<Includes<T, 'a.b'>>;
	});

	it('should support placeholder paths if enabled', () => {
		type T = DotNotation<User, true>;

		type T1 = Assert<Includes<T, 'tags.$[]'>>;
		type T2 = Assert<Includes<T, 'tags.$[id]'>>;
		type T3 = Assert<Includes<T, 'roles.$[]'>>;
		type T4 = Assert<Includes<T, 'roles.$[id]'>>;
		type T5 = Assert<Includes<T, 'roles.$.name'>>;
		type T6 = Assert<Includes<T, 'roles.$[id].name'>>;
	});

	it('should stop recursion at max depth', () => {
		interface Deep { a: { b: { c: { d: { e: { f: { g: { h: { i: { j: string } } } } } } } } } }
		type T = DotNotation<Deep>;

		// should include up to 9 levels
		type T1 = Assert<Includes<T, 'a.b.c.d.e.f.g.h.i'>>;

		type T2 = Assert<Not<Equals<'a.b.c.d.e.f.g.h.i.j', T>>>;
	});

	it('should treat dates as simple types', () => {
		type T = DotNotation<{ createdAt: Date }>;

		type T1 = Assert<Equals<T, 'createdAt'>>;
	});

	it('should halt at self-referential (recursive) types via cycle detection', () => {
		interface Node {
			child: Node,
			name: string,
			value: number
		}
		type T = DotNotation<Node>;

		// Direct children are produced
		type T1 = Assert<Includes<T, 'name'>>;
		type T2 = Assert<Includes<T, 'value'>>;
		type T3 = Assert<Includes<T, 'child'>>;
		// One level deep into the recursive field still works
		type T4 = Assert<Includes<T, 'child.name'>>;
		type T5 = Assert<Includes<T, 'child.value'>>;
		// The key path itself is still emitted once more, but no further recursion
		type T6 = Assert<Includes<T, 'child.child'>>;
		// Deeper recursion is blocked by cycle detection — this path should NOT exist
		type T7 = Assert<Not<Includes<T, 'child.child.name'>>>;
	});

	it('should halt at mutually recursive types via cycle detection', () => {
		interface A { b: B, name: string }
		interface B { a: A, label: string }
		type T = DotNotation<A>;

		type T1 = Assert<Includes<T, 'name'>>;
		type T2 = Assert<Includes<T, 'b'>>;
		type T3 = Assert<Includes<T, 'b.label'>>;
		type T4 = Assert<Includes<T, 'b.a'>>;
		// A is re-entered once (child-tracking allows one re-entry), so inner fields of A expand
		type T5 = Assert<Includes<T, 'b.a.name'>>;
		type T6 = Assert<Includes<T, 'b.a.b'>>;
		// But B is blocked on re-entry — so recursion into `b.a.b` stops here
		type T7 = Assert<Not<Includes<T, 'b.a.b.label'>>>;
	});

	it('should not false-positive cycle on sibling fields sharing a type', () => {
		interface Inner { value: number }
		interface Outer { a: Inner, b: Inner }
		type T = DotNotation<Outer>;

		// Both siblings should fully recurse — sibling recursions are independent
		type T1 = Assert<Includes<T, 'a.value'>>;
		type T2 = Assert<Includes<T, 'b.value'>>;
	});

	it('should not false-positive cycle on structural subtypes', () => {
		interface Base { x: number }
		interface Extended { x: number, y: string }
		interface Root { base: Base, ext: Extended }
		type T = DotNotation<Root>;

		// Extended is structurally-assignable to Base but semantically distinct;
		// its extra fields must still be produced
		type T1 = Assert<Includes<T, 'base.x'>>;
		type T2 = Assert<Includes<T, 'ext.x'>>;
		type T3 = Assert<Includes<T, 'ext.y'>>;
	});
});

describe('DotPathValue', () => {
	it('should resolve top-level fields', () => {
		type T1 = Assert<Equals<DotPathValue<User, 'name'>, string>>;
		type T2 = Assert<Equals<DotPathValue<User, 'email'>, string>>;
		type T3 = Assert<Equals<DotPathValue<User, 'address'>, undefined | { city?: string, zip: number }>>;
		type T4 = Assert<Equals<DotPathValue<User, 'tags'>, string[]>>;
		type T5 = Assert<Equals<DotPathValue<User, 'roles'>, { name: string }[]>>;
	});

	it('should resolve nested fields', () => {
		type T1 = Assert<Equals<DotPathValue<User, 'address.city'>, string | undefined>>;
		type T2 = Assert<Equals<DotPathValue<User, 'address.zip'>, number>>;
	});

	it('should resolve array index values', () => {
		type T1 = Assert<Equals<DotPathValue<User, 'tags.0'>, string>>;
		type T2 = Assert<Equals<DotPathValue<User, 'tags.123'>, string>>;
		type T3 = Assert<Equals<DotPathValue<User, 'roles.0'>, { name: string }>>;
		type T4 = Assert<Equals<DotPathValue<User, 'roles.123'>, { name: string }>>;
	});

	it('should resolve placeholder array paths (TCheckInArray = true)', () => {
		type T1 = Assert<Equals<DotPathValue<User, 'tags.$', true, true>, string[]>>;
		type T2 = Assert<Equals<DotPathValue<User, 'tags.$[]', true, true>, string[]>>;
		type T3 = Assert<Equals<DotPathValue<User, 'tags.$[id]', true, true>, string[]>>;
		type T4 = Assert<Equals<DotPathValue<User, 'roles.$', true, true>, { name: string }[]>>;
		type T5 = Assert<Equals<DotPathValue<User, 'roles.$[]', true, true>, { name: string }[]>>;
		type T6 = Assert<Equals<DotPathValue<User, 'roles.$[id]', true, true>, { name: string }[]>>;
	});

	it('should resolve placeholder array paths (TCheckInArray = false)', () => {
		type T1 = Assert<Equals<DotPathValue<User, 'tags.$', true, false>, string>>;
		type T2 = Assert<Equals<DotPathValue<User, 'tags.$[]', true, false>, string>>;
		type T3 = Assert<Equals<DotPathValue<User, 'tags.$[id]', true, false>, string>>;
		type T4 = Assert<Equals<DotPathValue<User, 'roles.$', true, false>, { name: string }>>;
		type T5 = Assert<Equals<DotPathValue<User, 'roles.$[]', true, false>, { name: string }>>;
		type T6 = Assert<Equals<DotPathValue<User, 'roles.$[id]', true, false>, { name: string }>>;
	});

	it('should resolve deeply nested placeholders (TCheckInArray = true)', () => {
		type T1 = Assert<Equals<DotPathValue<User, 'roles.name', true, true>, string[]>>;
		type T2 = Assert<Equals<DotPathValue<User, 'roles.$.name', true, true>, string[]>>;
		type T3 = Assert<Equals<DotPathValue<User, 'roles.$[].name', true, true>, string[]>>;
	});

	it('should resolve deeply nested placeholders (TCheckInArray = false)', () => {
		type T1 = Assert<Equals<DotPathValue<User, 'roles.name', true, false>, string>>;
		type T2 = Assert<Equals<DotPathValue<User, 'roles.$.name', true, false>, string>>;
		type T3 = Assert<Equals<DotPathValue<User, 'roles.$[].name', true, false>, string>>;
	});

	it('should resolve a path below an array through each element, as a query does', () => {
		interface Order { lines: { item: { sku: string, tags: string[] } }[] }
		type T1 = Assert<Equals<DotPathValue<Order, 'lines.item.sku'>, string>>;
		type T2 = Assert<Equals<DotPathValue<Order, 'lines.item.tags.0'>, string>>;
		type T3 = Assert<Equals<DotPathValue<Order, 'lines.item.missing'>, never>>;
	});
});

describe('OnlyFieldsOfTypeDotNotation', () => {
	it('should include only number fields', () => {
		type T = OnlyFieldsOfTypeDotNotation<User, number>;

		interface Expected {
			'address.zip'?: number,
			'profile.rating'?: number
		}

		type T1 = Assert<Equals<T, Expected>>;
	});

	it('should include only string fields', () => {
		type T = OnlyFieldsOfTypeDotNotation<User, string | undefined>;

		interface Expected {
			[x: `roles.${number}.name`]: string | undefined,
			[x: `tags.${number}`]: string | undefined,
			'address.city'?: string,
			'email'?: string,
			'name'?: string,
			'profile.bio'?: string,
			'roles.name'?: string
		}

		type T1 = Assert<Equals<T, Expected>>;
	});

	it('should include only boolean fields', () => {
		type T = OnlyFieldsOfTypeDotNotation<User, boolean>;

		interface Expected {
			'profile.active'?: boolean
		}

		type T1 = Assert<Equals<T, Expected>>;
	});

	it('should include only Date fields', () => {
		type T = OnlyFieldsOfTypeDotNotation<User, Date>;

		interface Expected {
			createdAt?: Date
		}

		type T1 = Assert<Equals<T, Expected>>;
	});

	it('should allow custom assignable type', () => {
		type T = OnlyFieldsOfTypeDotNotation<User, number, false, false, string>;

		interface Expected {
			'address.zip'?: string,
			'profile.rating'?: string
		}

		type T1 = Assert<Equals<T, Expected>>;
	});

	it('should support placeholder dot notation when enabled', () => {
		type T = OnlyFieldsOfTypeDotNotation<User, string | string[] | undefined>;

		interface Expected {
			[x: `roles.${number}.name`]: string | undefined,
			[x: `tags.${number}`]: string | undefined,
			'address.city'?: string,
			'email'?: string,
			'name'?: string,
			'profile.bio'?: string,
			'roles.name'?: string,
			'tags'?: string[]
		}

		type T1 = Assert<Equals<T, Expected>>;
	});
});

describe('DotNotation of values stored whole', () => {
	/** Shaped like bson's ObjectId: every BSON class carries `_bsontype`. */
	interface ObjectIdLike {
		readonly _bsontype: 'ObjectId',
		equals: (other: unknown) => boolean,
		readonly id: Uint8Array,
		toHexString: () => string
	}

	interface Doc {
		attachment: Buffer,
		meta: { tags: string[] },
		owner: ObjectIdLike,
		pattern: RegExp,
		refs: ObjectIdLike[],
		settings: Map<string, string>,
		when: Date
	}

	it('should not reach into a BSON value, binary data, a Date, RegExp, Map or Set', () => {
		type T1 = Assert<Equals<DotNotation<Doc>, 'attachment' | 'meta' | 'meta.tags' | 'owner' | 'pattern' | 'refs' | 'settings' | 'when' | `meta.tags.${number}` | `refs.${number}`>>;
	});

	it('should keep the paths inside an embedded document that has methods', () => {
		interface Money { amount: number, currency: string, format: () => string }
		interface Order { total: Money }
		type T1 = Assert<Equals<DotNotation<Order>, 'total' | 'total.amount' | 'total.currency'>>;
	});

	it('should list no paths for a leaf given as the document type itself', () => {
		type T1 = Assert<Equals<DotNotation<ObjectIdLike>, never>>;
		type T2 = Assert<Equals<DotNotation<z.ZodObject<{ name: z.ZodString }>>, never>>;
	});

	it('should NOT take any for a leaf', () => {
		type T1 = Assert<Equals<DotNotation<any> extends never ? 'never' : 'paths', 'paths'>>;
	});

	it('should not walk a schema object passed where its inferred type belongs', () => {
		interface Nested { schema: z.ZodObject<{ name: z.ZodString, tags: z.ZodArray<z.ZodString> }> }
		interface StandardSchemaLike { 'shape': { a: { b: string } }, '~standard': { vendor: string, version: 1 } }
		interface Other { schema: StandardSchemaLike }
		type T1 = Assert<Equals<DotNotation<Nested>, 'schema'>>;
		type T2 = Assert<Equals<DotNotation<Other>, 'schema'>>;
	});
});
