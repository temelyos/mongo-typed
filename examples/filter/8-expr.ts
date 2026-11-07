/* eslint-disable @typescript-eslint/no-unused-vars */
import { Filter, pipeline } from '../../src/index.js';

interface User {
	_id: string,
	address: { city: string, zip: string },
	age: number,
	name: string,
	score: number,
	tags: string[]
}

// Field paths as keys: suggested and checked. Try typing a key, or misspelling one.
const fields: Filter<User> = {
	'address.city': 'Paris',
	'age': { $gte: 18 }
};

// $expr compares fields with each other. Its operators and their operands are checked; its field
// references take any '$…' string, so `$$ROOT` and other system variables fit too.
const scoreAboveAge: Filter<User> = {
	$expr: { $gt: ['$score', '$age'] }
};

const nested: Filter<User> = {
	$expr: { $and: [{ $gte: [{ $size: '$tags' }, 2] }, { $eq: [{ $toLower: '$address.city' }, 'paris'] }] }
};

// A system variable is a field reference too.
const viaRoot: Filter<User> = {
	$expr: { $eq: ['$$ROOT.name', 'Ada'] }
};

// Refused: an unknown operator, the wrong number of operands, an operand of the wrong type.
// Remove the @ts-expect-error lines to see the errors.
// @ts-expect-error `$gtt` is no operator
const unknownOperator: Filter<User> = { $expr: { $gtt: ['$score', '$age'] } };
// @ts-expect-error $gt takes two operands
const oneOperand: Filter<User> = { $expr: { $gt: ['$score'] } };
// @ts-expect-error $size takes an array
const notAnArray: Filter<User> = { $expr: { $size: 5 } };

// A misspelt field reference is accepted, in $expr: '$…' strings aren't checked against the schema.
const misspelt: Filter<User> = { $expr: { $gt: ['$scroe', '$age'] } };

// So is a missing `$`: 'age' is the string "age", a valid expression, and every number sorts below every
// string, so this matches nothing.
const missingDollar: Filter<User> = { $expr: { $gt: ['$score', 'age'] } };

// Pipeline stages other than $match suggest the schema's paths in their expressions. Their builders check a
// field reference given as the value itself, but not one inside an operator.
const added = pipeline<User>().addFields({ nameLength: { $strLenCP: '$name' } });
// @ts-expect-error `address.cty` is no field of User
const refused = pipeline<User>().addFields({ city: '$address.cty' });
const insideAnOperator = pipeline<User>().addFields({ nameLength: { $strLenCP: '$nmae' } });
