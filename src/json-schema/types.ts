import { AnyKeywords, ArrayKeywords, NumberKeywords, ObjectKeywords, StringKeywords } from './keywords.js';
import { JsonSchema } from './schema.js';

export type JsonSchemaArray<T = any> = Pick<
	JsonSchema<T, 'array'>,
	AnyKeywords | ArrayKeywords
>;

export type JsonSchemaBoolean = Pick<
	JsonSchema<boolean>,
	AnyKeywords
>;

export type JsonSchemaInteger = Pick<
	JsonSchema<number, 'int' | 'long'>,
	AnyKeywords | NumberKeywords
>;

export type JsonSchemaNull = Pick<
	JsonSchema<null>,
	AnyKeywords
>;

export type JsonSchemaNumber = Pick<
	JsonSchema<number>,
	AnyKeywords | NumberKeywords
>;

export type JsonSchemaObject<T = any> = Pick<
	JsonSchema<T, 'object'>,
	AnyKeywords | ObjectKeywords
>;

export type JsonSchemaString = Pick<
	JsonSchema<string, 'string'>,
	AnyKeywords | StringKeywords
>;

export const JsonSchemaType = {
	array: 'array',
	boolean: 'boolean',
	null: 'null',
	number: 'number',
	object: 'object',
	string: 'string'
} as const;

export declare type JsonSchemaType = typeof JsonSchemaType[keyof typeof JsonSchemaType];
