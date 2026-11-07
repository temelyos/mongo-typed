import { EnhancedOmit } from './types.js';

export const BsonType = {
	array: 'array',
	binData: 'binData',
	bool: 'bool',
	date: 'date',
	dbPointer: 'dbPointer',
	decimal: 'decimal',
	double: 'double',
	int: 'int',
	javascript: 'javascript',
	javascriptWithScope: 'javascriptWithScope',
	long: 'long',
	maxKey: 'maxKey',
	minKey: 'minKey',
	null: 'null',
	object: 'object',
	objectId: 'objectId',
	regex: 'regex',
	string: 'string',
	symbol: 'symbol',
	timestamp: 'timestamp',
	undefined: 'undefined'
} as const;

export const BsonTypeNumeric = {
	array: 4,
	binData: 5,
	bool: 8,
	date: 9,
	dbPointer: 12,
	decimal: 19,
	double: 1,
	int: 16,
	javascript: 13,
	javascriptWithScope: 15,
	long: 18,
	maxKey: 127,
	minKey: -1,
	null: 10,
	object: 3,
	objectId: 7,
	regex: 11,
	string: 2,
	symbol: 14,
	timestamp: 17,
	undefined: 6
} as const;

export declare type BsonType = typeof BsonType[keyof typeof BsonType];

export declare type BsonTypeNumeric = (typeof BsonTypeNumeric)[keyof typeof BsonTypeNumeric];

export declare type IntegerType = bigint | number;

export declare type NumericType = IntegerType;

/** Add an _id field to an object shaped type */
export declare type WithId<TSchema> = EnhancedOmit<TSchema, '_id'> & {
	_id: string
};

export type NumericBsonType =
	| 1 | 16 | 18 | 19 // Numeric aliases
	| 'decimal' | 'double' | 'int' | 'long';
