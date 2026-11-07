/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it } from 'node:test';

import type { ArrayExpr, BooleanExpr, ConditionalExpr, DateExpr, DateTimezoneExpr, FieldRef, InferExprType, NumericExpr, ObjectExpr, StringExpr, TypedFieldRef, TypeExpr, VariableExpr } from './expr.js';
import type { Assert, Equals, Includes, Not } from './types.js';

type TestRef = FieldRef<User>;

interface User {
	address: {
		city: string,
		zip: number
	}[],
	createdAt: Date,
	email: string,
	name: string,
	tags: string[]
}

describe('ArrayExpr', () => {
	describe('$arrayElemAt', () => {
		it('should include $arrayElemAt operator', () => {
			type T1 = Assert<Includes<ArrayExpr<User>, { $arrayElemAt: [unknown[], number] }>>;
		});
	});

	describe('$first', () => {
		it('should include $first operator', () => {
			type T1 = Assert<Includes<ArrayExpr<User>, { $first: unknown[] }>>;
		});
	});

	describe('$indexOfArray', () => {
		it('should include $indexOfArray operator', () => {
			type T1 = Assert<Includes<ArrayExpr<User>, { $indexOfArray: [string[], string] }>>;
		});
	});

	describe('$last', () => {
		it('should include $last operator', () => {
			type T1 = Assert<Includes<ArrayExpr<User>, { $last: unknown[] }>>;
		});
	});

	describe('$arrayToObject', () => {
		it('should include $arrayToObject operator', () => {
			type T1 = Assert<Includes<ArrayExpr<User>, { $arrayToObject: unknown[] }>>;
		});
	});

	describe('$objectToArray', () => {
		it('should include $objectToArray operator', () => {
			type T1 = Assert<Includes<ArrayExpr<User>, { $objectToArray: '$email' }>>;
		});
	});

	describe('$split', () => {
		it('should include $split operator (splits a string into an array)', () => {
			type T1 = Assert<Includes<ArrayExpr<User>, { $split: ['$name', '-'] }>>;
		});
	});

	describe('$setIntersection', () => {
		it('should accept two arrays', () => {
			type T1 = Assert<Includes<ArrayExpr<User>, { $setIntersection: ['$tags', '$tags'] }>>;
		});

		it('should accept more than two arrays', () => {
			type T1 = Assert<Includes<ArrayExpr<User>, { $setIntersection: ['$tags', '$tags', '$tags'] }>>;
		});
	});

	describe('$setUnion', () => {
		it('should accept two arrays', () => {
			type T1 = Assert<Includes<ArrayExpr<User>, { $setUnion: ['$tags', '$tags'] }>>;
		});

		it('should accept more than two arrays', () => {
			type T1 = Assert<Includes<ArrayExpr<User>, { $setUnion: ['$tags', '$tags', '$tags'] }>>;
		});
	});
});

describe('BooleanExpr', () => {
	describe('$and', () => {
		it('should accept an array of boolean expressions', () => {
			type T1 = Assert<Includes<BooleanExpr<User>, { $and: [true, false] }>>;
			type T2 = Assert<Includes<BooleanExpr<User>, { $and: [{ $gt: ['$name', 'a'] }] }>>;
		});

		it('should NOT accept a non-array ArrayExpr as its value', () => {
			type T1 = Assert<Not<Includes<BooleanExpr<User>, { $and: { $reverseArray: unknown[] } }>>>;
			type T2 = Assert<Not<Includes<BooleanExpr<User>, { $and: { $filter: { cond: true, input: [] } } }>>>;
		});

		it('should behave consistently with $or and $nor, which correctly use Expr<TInput>[]', () => {
			// $or and $nor correctly reject non-array ArrayExpr forms
			type T1 = Assert<Not<Includes<BooleanExpr<User>, { $or: { $reverseArray: unknown[] } }>>>;
			type T2 = Assert<Not<Includes<BooleanExpr<User>, { $nor: { $reverseArray: unknown[] } }>>>;
		});
	});

	describe('$allElementsTrue', () => {
		it('should accept a wrapped array expression', () => {
			type T1 = Assert<Includes<BooleanExpr<User>, { $allElementsTrue: ['$tags'] }>>;
		});

		it('should NOT accept a bare (unwrapped) array expression', () => {
			type T1 = Assert<Not<Includes<BooleanExpr<User>, { $allElementsTrue: '$tags' }>>>;
		});
	});

	describe('$anyElementTrue', () => {
		it('should accept a wrapped array expression', () => {
			type T1 = Assert<Includes<BooleanExpr<User>, { $anyElementTrue: ['$tags'] }>>;
		});

		it('should NOT accept a bare (unwrapped) array expression', () => {
			type T1 = Assert<Not<Includes<BooleanExpr<User>, { $anyElementTrue: '$tags' }>>>;
		});
	});

	describe('$isArray', () => {
		it('should include $isArray operator', () => {
			type T1 = Assert<Includes<BooleanExpr<User>, { $isArray: '$tags' }>>;
		});
	});

	describe('$nin', () => {
		it('should NOT be a valid aggregation expression operator', () => {
			type T1 = Assert<Not<Includes<BooleanExpr<User>, { $nin: ['$name', ['alice']] }>>>;
		});
	});

	describe('$nor', () => {
		it('should NOT be a valid aggregation expression operator', () => {
			type T1 = Assert<Not<Includes<BooleanExpr<User>, { $nor: [true, false] }>>>;
		});
	});

	describe('$not', () => {
		it('should accept a wrapped expression', () => {
			type T1 = Assert<Includes<BooleanExpr<User>, { $not: [{ $gt: ['$name', 'a'] }] }>>;
		});

		it('should NOT accept a bare (unwrapped) expression', () => {
			type T1 = Assert<Not<Includes<BooleanExpr<User>, { $not: '$name' }>>>;
		});
	});
});

describe('DateExpr', () => {
	describe('$toDate', () => {
		it('should include $toDate operator', () => {
			type T1 = Assert<Includes<DateExpr<User>, { $toDate: '$createdAt' }>>;
		});
	});

	describe('$dateAdd', () => {
		it('should include $dateAdd operator', () => {
			type T1 = Assert<Includes<DateExpr<User>, { $dateAdd: { amount: 1, startDate: Date, unit: 'day' } }>>;
		});
	});

	describe('$dateSubtract', () => {
		it('should include $dateSubtract operator', () => {
			type T1 = Assert<Includes<DateExpr<User>, { $dateSubtract: { amount: 1, startDate: Date, unit: 'day' } }>>;
		});
	});

	describe('$dateTrunc', () => {
		it('should include $dateTrunc operator', () => {
			type T1 = Assert<Includes<DateExpr<User>, { $dateTrunc: { date: Date, unit: 'day' } }>>;
		});
	});
});

describe('NumericExpr', () => {
	describe('$atan2', () => {
		it('should include $atan2 operator', () => {
			type T1 = Assert<Includes<NumericExpr<User>, { $atan2: [number, number] }>>;
		});
	});

	describe('$indexOfBytes', () => {
		it('should include $indexOfBytes operator', () => {
			type T1 = Assert<Includes<NumericExpr<User>, { $indexOfBytes: ['$name', 'o'] }>>;
		});
	});

	describe('$indexOfCP', () => {
		it('should include $indexOfCP operator', () => {
			type T1 = Assert<Includes<NumericExpr<User>, { $indexOfCP: ['$name', 'o'] }>>;
		});
	});

	describe('$strcasecmp', () => {
		it('should include $strcasecmp operator', () => {
			type T1 = Assert<Includes<NumericExpr<User>, { $strcasecmp: ['$name', 'alice'] }>>;
		});
	});

	describe('date-part operators', () => {
		it('should accept a valid date expression for each operator', () => {
			type T1 = Assert<Includes<NumericExpr<User>, { $dayOfMonth: '$createdAt' }>>;
			type T2 = Assert<Includes<NumericExpr<User>, { $dayOfWeek: '$createdAt' }>>;
			type T3 = Assert<Includes<NumericExpr<User>, { $dayOfYear: '$createdAt' }>>;
			type T4 = Assert<Includes<NumericExpr<User>, { $hour: '$createdAt' }>>;
			type T5 = Assert<Includes<NumericExpr<User>, { $isoDayOfWeek: '$createdAt' }>>;
			type T6 = Assert<Includes<NumericExpr<User>, { $isoWeek: '$createdAt' }>>;
			type T7 = Assert<Includes<NumericExpr<User>, { $isoWeekYear: '$createdAt' }>>;
			type T8 = Assert<Includes<NumericExpr<User>, { $millisecond: '$createdAt' }>>;
			type T9 = Assert<Includes<NumericExpr<User>, { $minute: '$createdAt' }>>;
			type T10 = Assert<Includes<NumericExpr<User>, { $month: '$createdAt' }>>;
			type T11 = Assert<Includes<NumericExpr<User>, { $second: '$createdAt' }>>;
			type T12 = Assert<Includes<NumericExpr<User>, { $week: '$createdAt' }>>;
			type T13 = Assert<Includes<NumericExpr<User>, { $year: '$createdAt' }>>;
		});

		it('should NOT accept an empty object (all keys currently optional — bug)', () => {
			type T1 = Assert<Not<Includes<NumericExpr<User>, Record<never, never>>>>;
		});
	});
});

describe('TypeExpr', () => {
	describe('$type', () => {
		it('should accept a valid $type expression', () => {
			type T1 = Assert<Includes<TypeExpr<User>, { $type: '$name' }>>;
		});

		it('should require a $type operand (not match an unrelated object)', () => {
			type T1 = Assert<Not<Includes<TypeExpr<User>, { unrelated: string }>>>;
		});
	});
});

describe('VariableExpr', () => {
	it('should accept $let with vars and in', () => {
		type T1 = Assert<Includes<VariableExpr<User>, { $let: { in: '$name', vars: { x: '$email' } } }>>;
	});

	it('should not match an object with no $let, $map, or $reduce key', () => {
		type T1 = Assert<Not<Includes<VariableExpr<User>, { unrelated: string }>>>;
	});
});

describe('ConditionalExpr', () => {
	describe('$cond', () => {
		it('should accept array form', () => {
			type T1 = Assert<Includes<ConditionalExpr<User>, { $cond: [true, 1, 0] }>>;
		});

		it('should accept object form', () => {
			type T1 = Assert<Includes<ConditionalExpr<User>, { $cond: { else: 0, if: true, then: 1 } }>>;
		});
	});

	describe('$ifNull', () => {
		it('should accept two arguments', () => {
			type T1 = Assert<Includes<ConditionalExpr<User>, { $ifNull: ['$name', 'default'] }>>;
		});

		it('should accept more than two arguments (variadic since MongoDB 5.0)', () => {
			type T1 = Assert<Includes<ConditionalExpr<User>, { $ifNull: ['$name', '$email', 'fallback'] }>>;
		});
	});

	describe('$switch', () => {
		it('should accept with default', () => {
			type T1 = Assert<Includes<ConditionalExpr<User>, { $switch: { branches: [{ case: true, then: 1 }], default: 0 } }>>;
		});

		it('should accept without default (default is optional)', () => {
			type T1 = Assert<Includes<ConditionalExpr<User>, { $switch: { branches: [{ case: true, then: 1 }] } }>>;
		});
	});

	it('should NOT accept an empty object (structural bug — all-optional interface)', () => {
		type T1 = Assert<Not<Includes<ConditionalExpr<User>, Record<never, never>>>>;
	});
});

describe('DateTimezoneExpr', () => {
	it('timezone should be optional (date alone is valid)', () => {
		type T1 = Assert<Includes<DateTimezoneExpr<User>, { date: Date }>>;
	});

	it('should accept date with timezone', () => {
		type T1 = Assert<Includes<DateTimezoneExpr<User>, { date: Date, timezone: 'UTC' }>>;
	});
});

describe('ObjectExpr', () => {
	describe('$getField', () => {
		it('should accept string shorthand', () => {
			type T1 = Assert<Includes<ObjectExpr<User>, { $getField: 'name' }>>;
		});

		it('should accept object form with field and input', () => {
			type T1 = Assert<Includes<ObjectExpr<User>, { $getField: { field: 'name', input: '$name' } }>>;
		});

		it('should accept object form with field only (input is optional)', () => {
			type T1 = Assert<Includes<ObjectExpr<User>, { $getField: { field: 'name' } }>>;
		});
	});

	describe('$mergeObjects', () => {
		it('should accept an array of expressions', () => {
			type T1 = Assert<Includes<ObjectExpr<User>, { $mergeObjects: ['$name', '$email'] }>>;
		});
	});

	describe('$regexFind', () => {
		it('should accept input and regex', () => {
			type T1 = Assert<Includes<ObjectExpr<User>, { $regexFind: { input: '$name', regex: 'pattern' } }>>;
		});

		it('should accept input, regex, and options', () => {
			type T1 = Assert<Includes<ObjectExpr<User>, { $regexFind: { input: '$name', options: 'i', regex: 'pattern' } }>>;
		});
	});

	describe('$regexFindAll', () => {
		it('should accept input and regex', () => {
			type T1 = Assert<Includes<ObjectExpr<User>, { $regexFindAll: { input: '$name', regex: 'pattern' } }>>;
		});

		it('should accept input, regex, and options', () => {
			type T1 = Assert<Includes<ObjectExpr<User>, { $regexFindAll: { input: '$name', options: 'i', regex: 'pattern' } }>>;
		});
	});

	it('should NOT match an unrelated object', () => {
		type T1 = Assert<Not<Includes<ObjectExpr<User>, { unrelated: string }>>>;
	});
});

describe('BooleanExpr additions', () => {
	describe('$isNumber', () => {
		it('should accept a field reference', () => {
			type T1 = Assert<Includes<BooleanExpr<User>, { $isNumber: '$name' }>>;
		});

		it('should accept a numeric literal', () => {
			type T1 = Assert<Includes<BooleanExpr<User>, { $isNumber: 42 }>>;
		});
	});

	describe('$toBool', () => {
		it('should accept a field reference', () => {
			type T1 = Assert<Includes<BooleanExpr<User>, { $toBool: '$name' }>>;
		});

		it('should accept a numeric expression', () => {
			type T1 = Assert<Includes<BooleanExpr<User>, { $toBool: 1 }>>;
		});
	});
});

describe('NumericExpr additions', () => {
	describe('$cmp', () => {
		it('should accept two string expressions', () => {
			type T1 = Assert<Includes<NumericExpr<User>, { $cmp: ['$name', 'alice'] }>>;
		});

		it('should accept two numeric expressions', () => {
			type T1 = Assert<Includes<NumericExpr<User>, { $cmp: ['$age', 18] }>>;
		});
	});

	describe('$convert.to', () => {
		it('should accept any BsonType string alias (bool)', () => {
			type T1 = Assert<Includes<NumericExpr<User>, { $convert: { input: '$name', to: 'bool' } }>>;
		});

		it('should accept any BsonType string alias (string)', () => {
			type T1 = Assert<Includes<NumericExpr<User>, { $convert: { input: '$name', to: 'string' } }>>;
		});

		it('should still accept numeric BSON types', () => {
			type T1 = Assert<Includes<NumericExpr<User>, { $convert: { input: '$name', to: 'int' } }>>;
		});
	});

	describe('$dateDiff', () => {
		it('should accept startOfWeek parameter', () => {
			type T1 = Assert<Includes<NumericExpr<User>, { $dateDiff: { endDate: Date, startDate: Date, startOfWeek: 'monday', unit: 'week' } }>>;
		});
	});
});

describe('ArrayExpr additions', () => {
	describe('$filter with limit', () => {
		it('should accept limit parameter (added in MongoDB 5.2)', () => {
			type T1 = Assert<Includes<ArrayExpr<User>, { $filter: { as: 'tag', cond: true, input: '$tags', limit: 5 } }>>;
		});
	});

	describe('$sortArray', () => {
		it('should accept numeric sortBy (for simple value arrays)', () => {
			type T1 = Assert<Includes<ArrayExpr<User>, { $sortArray: { input: '$tags', sortBy: 1 } }>>;
		});

		it('should accept object sortBy (for arrays of documents)', () => {
			type T1 = Assert<Includes<ArrayExpr<User>, { $sortArray: { input: '$tags', sortBy: { name: 1 } } }>>;
		});
	});
});

describe('DateExpr additions', () => {
	describe('$dateFromParts ISO week-date form', () => {
		it('should accept isoWeekYear as the required field', () => {
			type T1 = Assert<Includes<DateExpr<User>, { $dateFromParts: { isoWeekYear: 2023 } }>>;
		});

		it('should accept isoWeekYear with optional isoWeek and isoDayOfWeek', () => {
			type T1 = Assert<Includes<DateExpr<User>, { $dateFromParts: { isoDayOfWeek: 1, isoWeek: 1, isoWeekYear: 2023 } }>>;
		});
	});
});

describe('TypeExpr additions', () => {
	describe('$toObjectId', () => {
		it('should accept any expression', () => {
			type T1 = Assert<Includes<TypeExpr<User>, { $toObjectId: '$name' }>>;
		});
	});
});

describe('InferExprType', () => {
	it('should resolve a top-level field ref to its type', () => {
		type T1 = Assert<Equals<InferExprType<User, '$name'>, string>>;
	});

	it('should resolve a dot-notation field ref to its type', () => {
		type T1 = Assert<Equals<InferExprType<User, '$address.city'>, string[]>>; // one per element of address
	});

	it('should resolve a numeric dot-notation field ref', () => {
		type T1 = Assert<Equals<InferExprType<User, '$address.zip'>, number[]>>;
	});

	it('should resolve a Date field ref', () => {
		type T1 = Assert<Equals<InferExprType<User, '$createdAt'>, Date>>;
	});

	it('should resolve an unknown path to unknown', () => {
		type T1 = Assert<Equals<InferExprType<User, '$nonExistent'>, unknown>>;
	});

	it('should resolve a raw number literal to number', () => {
		type T1 = Assert<Equals<InferExprType<User, 123>, number>>;
	});

	it('should resolve a numeric expression to number', () => {
		type T1 = Assert<Equals<InferExprType<User, { $multiply: ['$address.zip', 2] }>, number>>;
	});

	it('should resolve a string expression to string', () => {
		type T1 = Assert<Equals<InferExprType<User, { $toUpper: '$name' }>, string>>;
	});

	it('should resolve a $literal to its wrapped type', () => {
		type T1 = Assert<Equals<InferExprType<User, { $literal: 42 }>, 42>>;
		type T2 = Assert<Equals<InferExprType<User, { $literal: 'hello' }>, 'hello'>>;
	});
});

// ---------------------------------------------------------------------------
// TypedFieldRef
// ---------------------------------------------------------------------------

describe('TypedFieldRef', () => {
	interface TypedRefDoc {
		age: number,
		createdAt: Date,
		name: string,
		score: number
	}

	it('should allow numeric field paths for TypedFieldRef<T, number>', () => {
		type T1 = Assert<Includes<TypedFieldRef<TypedRefDoc, number>, '$age'>>;
		type T2 = Assert<Includes<TypedFieldRef<TypedRefDoc, number>, '$score'>>;
	});

	it('should not allow string field paths for TypedFieldRef<T, number>', () => {
		type T1 = Assert<Not<Includes<TypedFieldRef<TypedRefDoc, number>, '$name'>>>;
	});

	it('should allow string field paths for TypedFieldRef<T, string>', () => {
		type T1 = Assert<Includes<TypedFieldRef<TypedRefDoc, string>, '$name'>>;
	});

	it('should not allow numeric field paths for TypedFieldRef<T, string>', () => {
		type T1 = Assert<Not<Includes<TypedFieldRef<TypedRefDoc, string>, '$age'>>>;
	});

	it('should allow Date field paths for TypedFieldRef<T, Date>', () => {
		type T1 = Assert<Includes<TypedFieldRef<TypedRefDoc, Date>, '$createdAt'>>;
	});

	it('should not allow string field paths for TypedFieldRef<T, Date>', () => {
		type T1 = Assert<Not<Includes<TypedFieldRef<TypedRefDoc, Date>, '$name'>>>;
	});
});

describe('InferExprType of array, conversion and date arithmetic operators', () => {
	interface Doc {
		at: Date,
		meta: { score: number },
		tags: string[]
	}

	it('should type an element taken from an array as the element', () => {
		type T1 = Assert<Equals<InferExprType<Doc, { $arrayElemAt: ['$tags', 0] }>, string>>;
		type T2 = Assert<Equals<InferExprType<Doc, { $first: '$tags' }>, string>>;
		type T3 = Assert<Equals<InferExprType<Doc, { $last: '$tags' }>, string>>;
	});

	it('should keep the element type of an array reshaped as an array', () => {
		type T1 = Assert<Equals<InferExprType<Doc, { $slice: ['$tags', 2] }>, string[]>>;
		type T2 = Assert<Equals<InferExprType<Doc, { $reverseArray: '$tags' }>, string[]>>;
		type T3 = Assert<Equals<InferExprType<Doc, { $filter: { cond: true, input: '$tags' } }>, string[]>>;
	});

	it('should type $indexOfArray as a number and $reduce by its initial value', () => {
		type T1 = Assert<Equals<InferExprType<Doc, { $indexOfArray: ['$tags', 'a'] }>, number>>;
		type T2 = Assert<Equals<InferExprType<Doc, { $reduce: { in: 0, initialValue: 0, input: '$tags' } }>, number>>;
	});

	it('should type $convert by its target type', () => {
		type T1 = Assert<Equals<InferExprType<Doc, { $convert: { input: '$meta.score', to: 'string' } }>, string>>;
		type T2 = Assert<Equals<InferExprType<Doc, { $convert: { input: '$tags', to: 'bool' } }>, boolean>>;
		type T3 = Assert<Equals<InferExprType<Doc, { $convert: { input: '$tags', to: 'date' } }>, Date>>;
		type T4 = Assert<Equals<InferExprType<Doc, { $convert: { input: '$tags', to: 'int' } }>, number>>;
	});

	it('should type a date plus or minus milliseconds as a date, and a date minus a date as a number', () => {
		type T1 = Assert<Equals<InferExprType<Doc, { $add: ['$at', 1000] }>, Date>>;
		type T2 = Assert<Equals<InferExprType<Doc, { $subtract: ['$at', 1000] }>, Date>>;
		type T3 = Assert<Equals<InferExprType<Doc, { $subtract: ['$at', '$at'] }>, number>>;
		type T4 = Assert<Equals<InferExprType<Doc, { $add: ['$meta.score', 1] }>, number>>;
	});
});
