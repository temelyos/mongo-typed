/*
 * BSD-2-Clause License
 *
 * Original source code is copyright (c) 2019-2022 Jeremy Rylan
 * <https://github.com/jrylan>
 *
 * Documentation and keyword descriptions are copyright (c) 2018 IETF Trust
 * <https://www.ietf.org/>, Austin Wright <aaa@bzfx.net>, Henry Andrews
 * <henry@cloudflare.com>, Geraint Luff <luffgd@gmail.com>, and Cloudflare,
 * Inc. <https://www.cloudflare.com/>. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

import { BsonType } from '../bson-types.js';
import { MaybeReadonlyArray } from '../types.js';
import { JsonSchemaType } from './types.js';

export const DRAFT = 'Mongo' as const;
export const $SCHEMA = 'https://json-schema.org/draft-04/schema' as const;

/**
 * JSON Schema [Draft 4](https://json-schema.org/draft-04/json-schema-validation.html)
 */
export interface JsonSchema<
	TValue = any,
	TBsonType = TValue extends boolean ? 'bool'
		: TValue extends null ? 'null'
			: TValue extends number ? 'decimal' | 'double' | 'int' | 'long'
				: TValue extends string ? 'string'
					: TValue extends Date ? 'date' | 'timestamp'
						: TValue extends ArrayBuffer | Buffer | Uint8Array ? 'binData'
							: TValue extends RegExp ? 'regex'
								: TValue extends unknown[] ? 'array'
									: TValue extends Record<number | string, unknown> ? 'object'
										: BsonType,
	TSchemaType = TValue extends boolean ? 'boolean'
		: TValue extends null ? 'null'
			: TValue extends number ? 'number'
				: TValue extends string ? 'string'
					: TValue extends unknown[] ? 'array'
						: TValue extends Record<number | string, unknown> ? 'object'
							: JsonSchemaType
> {
	/**
   * This keyword is reserved for comments from schema authors to readers or
   * maintainers of the schema. The value of this keyword MUST be a string.
   * Implementations MUST NOT present this string to end users. Tools for
   * editing schemas SHOULD support displaying and editing this keyword.
   *
   * The value of this keyword MAY be used in debug or error output which is
   * intended for developers making use of schemas. Schema vocabularies
   * SHOULD allow `comment` within any object containing vocabulary
   * keywords.
   *
   * Implementations MAY assume `comment` is allowed unless the vocabulary
   * specifically forbids it. Vocabularies MUST NOT specify any effect of
   * `comment` beyond what is described in this specification. Tools that
   * translate other media types or programming languages to and from
   * `application/schema+json` MAY choose to convert that media type or
   * programming language's native comments to or from `comment` values.
   *
   * The behavior of such translation when both native comments and
   * `comment` properties are present is implementation-dependent.
   * Implementations SHOULD treat `comment` identically to an unknown
   * extension keyword.
   *
   * They MAY strip `comment` values at any point during processing. In
   * particular, this allows for shortening schemas when the size of deployed
   * schemas is a concern. Implementations MUST NOT take any other action
   * based on the presence, absence, or contents of `comment` properties.
   */
	$comment?: string,

	/**
   * The `$id` keyword defines a URI for the schema, and the base URI that
   * other URI references within the schema are resolved against. A
   * subschema's `$id` is resolved against the base URI of its parent
   * schema. If no parent sets an explicit base with `$id`, the base URI is
   * that of the entire document, as determined per
   * [RFC 3986 section 5][RFC3986].
   *
   * If present, the value for this keyword MUST be a string, and MUST
   * represent a valid [URI-reference][RFC3986]. This value SHOULD be
   * normalized, and SHOULD NOT be an empty fragment `#` or an empty string.
   *
   * [RFC3986]: https://datatracker.ietf.org/doc/html/rfc3986
   *
   * @format "uri-reference"
   */
	$id?: string,

	/**
   * The `$schema` keyword is both used as a JSON Schema version identifier
   * and the location of a resource which is itself a JSON Schema, which
   * describes any schema written for this particular version.
   *
   * The value of this keyword MUST be a [URI][RFC3986] (containing a scheme)
   * and this URI MUST be normalized. The current schema MUST be valid
   * against the meta-schema identified by this URI.
   *
   * If this URI identifies a retrievable resource, that resource SHOULD be
   * of media type `application/schema+json`.
   *
   * The `$schema` keyword SHOULD be used in a root schema. It MUST NOT
   * appear in subschemas.
   *
   * Values for this property are defined in other documents and by other
   * parties. JSON Schema implementations SHOULD implement support for
   * current and previous published drafts of JSON Schema vocabularies as
   * deemed reasonable.
   *
   * [RFC3986]: https://datatracker.ietf.org/doc/html/rfc3986
   *
   * @format "uri"
   */
	$schema?: string,

	/**
   * The value of `additionalItems` MUST be a valid JSON Schema.
   *
   * This keyword determines how child instances validate for arrays, and
   * does not directly validate the immediate instance itself.
   *
   * If `items` is an array of schemas, validation succeeds if every
   * instance element at a position greater than the size of `items`
   * validates against `additionalItems`.
   *
   * Otherwise, `additionalItems` MUST be ignored, as the `items` schema
   * (possibly the default value of an empty schema) is applied to all
   * elements.
   *
   * Omitting this keyword has the same behavior as an empty schema.
   */
	additionalItems?: boolean | JsonSchema,

	/**
   * The value of `additionalProperties` MUST be a valid JSON Schema.
   *
   * This keyword determines how child instances validate for objects, and
   * does not directly validate the immediate instance itself.
   *
   * Validation with `additionalProperties` applies only to the child
   * values of instance names that do not match any names in `properties`,
   * and do not match any regular expression in `patternProperties`.
   *
   * For all such properties, validation succeeds if the child instance
   * validates against the `additionalProperties` schema.
   *
   * Omitting this keyword has the same behavior as an empty schema.
   */
	additionalProperties?: boolean | JsonSchema,

	/**
   * This keyword's value MUST be a non-empty array. Each item of the array
   * MUST be a valid JSON Schema.
   *
   * An instance validates successfully against this keyword if it validates
   * successfully against all schemas defined by this keyword's value.
   */
	allOf?: MaybeReadonlyArray<boolean | JsonSchema<TValue, TBsonType, TSchemaType>>,

	/**
   * This keyword's value MUST be a non-empty array. Each item of the array
   * MUST be a valid JSON Schema.
   *
   * An instance validates successfully against this keyword if it validates
   * successfully against at least one schema defined by this keyword's
   * value.
   */
	anyOf?: MaybeReadonlyArray<boolean | JsonSchema<TValue, TBsonType, TSchemaType>>,

	/**
   * The value of this keyword MUST be either a string or an array. If it is
   * an array, elements of the array MUST be strings and MUST be unique.
   *
   * Accepts same string aliases used for the $type operator
   *
   * An instance validates if and only if the instance is in any of the sets
   * listed for this keyword.
   */
	bsonType?: MaybeReadonlyArray<TBsonType> | TBsonType,

	/**
   * The value of this keyword MUST be a valid JSON Schema.
   *
   * An array instance is valid against `contains` if at least one of its
   * elements is valid against the given schema.
   */
	contains?: boolean | JsonSchema<TValue, TBsonType, TSchemaType>,

	/**
   * This keyword can be used to supply a default JSON value associated with
   * a particular schema. It is RECOMMENDED that a `default` value be valid
   * against the associated schema.
   */
	default?: TValue,

	/**
   * This keyword specifies rules that are evaluated if the instance is an
   * object and contains a certain property.
   *
   * This keyword's value MUST be an object. Each property specifies a
   * dependency. Each dependency value MUST be an array or a valid JSON
   * Schema.
   *
   * If the dependency value is a subschema, and the dependency key is a
   * property in the instance, the entire instance must validate against the
   * dependency value.
   *
   * If the dependency value is an array, each element in the array, if any,
   * MUST be a string, and MUST be unique. If the dependency key is a
   * property in the instance, each of the items in the dependency value must
   * be a property that exists in the instance.
   *
   * Omitting this keyword has the same behavior as an empty object.
   */
	dependencies?: Record<string, boolean | JsonSchema | MaybeReadonlyArray<string>>,

	/**
   * Can be used to decorate a user interface with explanation or information
   * about the data produced.
   */
	description?: string,

	/**
   * The value of this keyword MUST be an array. This array SHOULD have at
   * least one element. Elements in the array SHOULD be unique.
   *
   * An instance validates successfully against this keyword if its value is
   * equal to one of the elements in this keyword's array value.
   *
   * Elements in the array might be of any type, including `null`.
   */
	enum?: MaybeReadonlyArray<TValue>,

	/**
   * The value of `exclusiveMaximum` MUST be a number, representing an
   * exclusive upper limit for a numeric instance.
   *
   * If the instance is a number, then the instance is valid only if it has a
   * value strictly less than (not equal to) `exclusiveMaximum`.
   */
	exclusiveMaximum?: number,

	/**
   * The value of `exclusiveMinimum` MUST be a number, representing an
   * exclusive lower limit for a numeric instance.
   *
   * If the instance is a number, then the instance is valid only if it has a
   * value strictly greater than (not equal to) `exclusiveMinimum`.
   */
	exclusiveMinimum?: number,

	/**
   * The `format` keyword functions as both an [annotation][annotation] and
   * as an [assertion][assertion]. While no special effort is required to
   * implement it as an annotation conveying semantic meaning, implementing
   * validation is non-trivial.
   *
   * Implementations MAY support the `format` keyword as a validation
   * assertion.
   *
   * Implementations MAY add custom `format` attributes. Save for agreement
   * between parties, schema authors SHALL NOT expect a peer implementation
   * to support this keyword and/or custom `format` attributes.
   *
   * [annotation]: https://json-schema.org/draft-07/json-schema-validation.html#annotations
   * [assertion]: https://json-schema.org/draft-07/json-schema-validation.html#assertions
   */
	format?: string,

	/**
   * The value of `items` MUST be either a valid JSON Schema or an array of
   * valid JSON Schemas.
   *
   * This keyword determines how child instances validate for arrays, and
   * does not directly validate the immediate instance itself.
   *
   * If `items` is a schema, validation succeeds if all elements in the
   * array successfully validate against that schema.
   *
   * If `items` is an array of schemas, validation succeeds if each element
   * of the instance validates against the schema at the same position, if
   * any.
   *
   * Omitting this keyword has the same behavior as an empty schema.
   */
	items?: boolean | JsonSchema | MaybeReadonlyArray<boolean | JsonSchema>,

	/**
   * The value of `maximum` MUST be a number, representing an inclusive
   * upper limit for a numeric instance.
   *
   * If the instance is a number, then this keyword validates only if the
   * instance is less than or exactly equal to `maximum`.
   */
	maximum?: number,

	/**
   * The value of this keyword MUST be a non-negative integer.
   *
   * An array instance is valid against `maxItems` if its size is less
   * than, or equal to, the value of this keyword.
   *
   * @minimum 0
   */
	maxItems?: number,

	/**
   * The value of this keyword MUST be a non-negative integer.
   *
   * A string instance is valid against this keyword if its length is less
   * than, or equal to, the value of this keyword.
   *
   * The length of a string instance is defined as the number of its
   * characters as defined by [RFC 7159][RFC7159].
   *
   * [RFC7159]: https://datatracker.ietf.org/doc/html/rfc7159
   *
   * @minimum 0
   */
	maxLength?: number,

	/**
   * The value of this keyword MUST be a non-negative integer.
   *
   * An object instance is valid against `maxProperties` if its number of
   * `properties` is less than, or equal to, the value of this keyword.
   *
   * @minimum 0
   */
	maxProperties?: number,

	/**
   * The value of `minimum` MUST be a number, representing an inclusive
   * lower limit for a numeric instance.
   *
   * If the instance is a number, then this keyword validates only if the
   * instance is greater than or exactly equal to `minimum`.
   */
	minimum?: number,

	/**
   * The value of this keyword MUST be a non-negative integer.
   *
   * An array instance is valid against `minItems` if its size is greater
   * than, or equal to, the value of this keyword.
   *
   * Omitting this keyword has the same behavior as a value of `0`.
   *
   * @default 0
   * @minimum 0
   */
	minItems?: number,

	/**
   * The value of this keyword MUST be a non-negative integer.
   *
   * A string instance is valid against this keyword if its length is greater
   * than, or equal to, the value of this keyword.
   *
   * The length of a string instance is defined as the number of its
   * characters as defined by [RFC 7159][RFC7159].
   *
   * Omitting this keyword has the same behavior as a value of `0`.
   *
   * [RFC7159]: https://datatracker.ietf.org/doc/html/rfc7159
   *
   * @default 0
   * @minimum 0
   */
	minLength?: number,

	/**
   * The value of this keyword MUST be a non-negative integer.
   *
   * An object instance is valid against `minProperties` if its number of
   * `properties` is greater than, or equal to, the value of this keyword.
   *
   * Omitting this keyword has the same behavior as a value of `0`.
   *
   * @default 0
   * @minimum 0
   */
	minProperties?: number,

	/**
   * The value of `multipleOf` MUST be a number, strictly greater than
   * `0`.
   *
   * A numeric instance is valid only if division by this keyword's value
   * results in an integer.
   *
   * @exclusiveMinimum 0
   */
	multipleOf?: number,

	/**
   * This keyword's value MUST be a valid JSON Schema.
   *
   * An instance is valid against this keyword if it fails to validate
   * successfully against the schema defined by this keyword.
   */
	not?: boolean | JsonSchema<TValue, TBsonType, TSchemaType>,

	/**
   * This keyword's value MUST be a non-empty array. Each item of the array
   * MUST be a valid JSON Schema.
   *
   * An instance validates successfully against this keyword if it validates
   * successfully against exactly one schema defined by this keyword's value.
   */
	oneOf?: MaybeReadonlyArray<boolean | JsonSchema<TValue, TBsonType, TSchemaType>>,

	/**
   * The value of this keyword MUST be a string. This string SHOULD be a
   * valid regular expression, according to the [ECMA-262][ecma262] regular
   * expression dialect.
   *
   * A string instance is considered valid if the regular expression matches
   * the instance successfully. Recall: regular expressions are not
   * implicitly anchored.
   *
   * [ecma262]: https://www.ecma-international.org/publications-and-standards/standards/ecma-262/
   *
   * @format "regex"
   */
	pattern?: string,

	/**
   * The value of `patternProperties` MUST be an object. Each property name
   * of this object SHOULD be a valid regular expression, according to the
   * [ECMA-262][ecma262] regular expression dialect. Each property value of
   * this object MUST be a valid JSON Schema.
   *
   * This keyword determines how child instances validate for objects, and
   * does not directly validate the immediate instance itself. Validation of
   * the primitive instance type against this keyword always succeeds.
   *
   * Validation succeeds if, for each instance name that matches any regular
   * expressions that appear as a property name in this keyword's value, the
   * child instance for that name successfully validates against each schema
   * that corresponds to a matching regular expression.
   *
   * Omitting this keyword has the same behavior as an empty object.
   *
   * [ecma262]: https://www.ecma-international.org/publications-and-standards/standards/ecma-262/
   */
	patternProperties?: Record<string, boolean | JsonSchema>,

	/**
   * The value of `properties` MUST be an object. Each value of this object
   * MUST be a valid JSON Schema.
   *
   * This keyword determines how child instances validate for objects, and
   * does not directly validate the immediate instance itself.
   *
   * Validation succeeds if, for each name that appears in both the instance
   * and as a name within this keyword's value, the child instance for that
   * name successfully validates against the corresponding schema.
   *
   * Omitting this keyword has the same behavior as an empty object.
   */
	properties?: Record<string, boolean | JsonSchema>,

	/**
   * The value of this keyword MUST be an array. Elements of this array, if
   * any, MUST be strings, and MUST be unique.
   *
   * An object instance is valid against this keyword if every item in the
   * array is the name of a property in the instance.
   *
   * Omitting this keyword has the same behavior as an empty array.
   */
	required?: MaybeReadonlyArray<string>,

	/**
   * Can be used to decorate a user interface with a short label about the
   * data produced.
   */
	title?: string,

	/**
   * The value of this keyword MUST be either a string or an array. If it is
   * an array, elements of the array MUST be strings and MUST be unique.
   *
   * String values MUST be one of the six primitive types (`"null"`,
   * `"boolean"`, `"object"`, `"array"`, `"number"`, or
   * `"string"`)`.
   *
   * An instance validates if and only if the instance is in any of the sets
   * listed for this keyword.
   */
	type?: MaybeReadonlyArray<TSchemaType> | TSchemaType,

	/**
   * The value of this keyword MUST be a boolean.
   *
   * If this keyword has boolean value `false`, the instance validates
   * successfully. If it has boolean value `true`, the instance validates
   * successfully if all of its elements are unique.
   *
   * Omitting this keyword has the same behavior as a value of `false`.
   *
   * @default false
   */
	uniqueItems?: boolean
};
