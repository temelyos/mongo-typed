import { z } from 'zod';

import type { DotNotation } from '../dot-notation.js';
import type { ObjFilter } from '../filter.js';

import { filterPaths, mapFilterValues } from '../filter-values.js';

type Direction = 'decode' | 'encode';
type EncodedFilter<TModel extends z.ZodType<object>> = ObjFilter<z.input<TModel> extends object ? z.input<TModel> : never>;

type Issues = z.core.ParsePayload['issues'];

export interface ObjFilterOptions<TModel extends z.ZodType<object>> {
	/**
	 * Paths a decoded filter may not reference: at the path, below it, through `$elemMatch`, or
	 * inside a parent compared whole. A parent with no field value (`$exists`, `$size`) stays allowed.
	 * Operators that name fields where they can't be checked (`$expr`, `$where`, `$function`,
	 * `$accumulator`, `$jsonSchema`) are refused whenever this is set, trusted or not.
	 */
	forbiddenFields?: readonly DotNotation<z.output<TModel> & object>[],
	/**
	 * The filter comes from outside, e.g. a request. Decoding then refuses operators that run code or
	 * pipelines, anything but plain data (`Date` and `RegExp` aside), and any object reached twice,
	 * which a later copy of the filter would multiply.
	 */
	untrusted?: boolean
}

/** A filter on `TModel`: decoded, its values are the model's output (`Date`); encoded, its input (an ISO string). */
export type ObjFilterSchema<TModel extends z.ZodType<object>> = z.ZodCodec<
	z.ZodType<EncodedFilter<TModel>, EncodedFilter<TModel>>,
	z.ZodType<ObjFilter<z.output<TModel>>, ObjFilter<z.output<TModel>>>
>;

const isoDateTime = z.iso.datetime({ offset: true });

const codeOperators: ReadonlySet<string> = new Set([
	'$accumulator',
	'$expr',
	'$function',
	'$graphLookup',
	'$jsonSchema',
	'$lookup',
	'$merge',
	'$out',
	'$where'
]);

/** Operators that name fields inside code, expressions or schemas, where forbiddenFields can't see them. */
const opaqueOperators: ReadonlySet<string> = new Set(['$accumulator', '$expr', '$function', '$jsonSchema', '$where']);

/** Whether `field` takes `value` as it stands on `direction`'s target side; an array field also takes one element. */
function accepts(field: z.ZodType, value: unknown, direction: Direction): boolean {
	const def = field.def as z.core.$ZodTypeDef & Record<string, any>;

	if (def.type === 'array' && !Array.isArray(value)) return accepts(unwrap(def.element as z.ZodType), value, direction);
	if (def.type === 'date' && direction === 'encode') return typeof value === 'string';
	if (def.type === 'pipe' && 'reverseTransform' in def) return (direction === 'decode' ? def.out : def.in as z.ZodType).safeParse(value).success;

	return field.safeParse(value).success;
}

/**
 * Stores what a key or path of a filter resolved to in one of the caches below, if it is the model's own:
 * it resolves, holds no numeric segment and is at most {@link CACHE_KEY_LENGTH} long, and the cache holds
 * fewer than {@link CACHE_LIMIT}. Keys come from the filter, which may be untrusted; anything else is
 * resolved afresh each time.
 *
 * A numeric segment is an array or tuple position (`tags.0`, `tags.1`, ...), which a filter may name
 * without end, or a numeric object key; a tuple's or an object's schema depends on the number, so it is
 * neither cached nor rewritten to share an entry.
 */
function remember(cache: Map<string, z.ZodType[]>, key: string, found: z.ZodType[]): void {
	if (found.length > 0 && cache.size < CACHE_LIMIT && key.length <= CACHE_KEY_LENGTH && !numericSegment.test(key)) cache.set(key, found);
}

const CACHE_LIMIT = 1000;

/** How many arrays deep {@link convertValue} follows a single element; see there. */
const MAX_ARRAY_DEPTH = 32;
const CACHE_KEY_LENGTH = 256;
const numericSegment = /(?:^|\.)\d+(?:\.|$)/;

/** {@link children}' results, per schema and key: a model's schemas don't change, and filters name the same paths again and again. */
const childrenCache = new WeakMap<z.ZodType, Map<string, z.ZodType[]>>();

/** Every schema `key` may name below `schema`, unwrapped: one per union or intersection option that declares it. */
function children(schema: z.ZodType, key: string): z.ZodType[] {
	let byKey = childrenCache.get(schema);
	if (!byKey) childrenCache.set(schema, byKey = new Map());

	let found = byKey.get(key);
	if (!found) {
		const all = declared(schema, key).map(unwrap);
		found = all.length > 1 ? [...new Set(all)] : all;
		remember(byKey, key, found);
	}
	return found;
}

function convert(field: z.ZodType, value: unknown, direction: Direction): { error?: string, value?: unknown } {
	const def = field.def as z.core.$ZodTypeDef & Record<string, any>;

	if (def.type === 'pipe' && 'reverseTransform' in def) {
		const result = direction === 'decode' ? z.safeDecode(field, value as never) : z.safeEncode(field, value as never);
		if (result.success) return { value: result.data };
		const done = (direction === 'decode' ? def.out : def.in) as z.ZodType;
		return done.safeParse(value).success ? { value } : { error: result.error.issues[0]?.message ?? 'Invalid value' };
	}

	if (def.type === 'date') {
		if (direction === 'encode') return value instanceof Date ? { value: value.toISOString() } : { value };
		if (value instanceof Date) return { value };
		return isoDateTime.safeParse(value).success ? { value: new Date(value as string) } : { error: 'Invalid ISO datetime' };
	}

	return { value };
}

/**
 * `value` converted by the first of `fields` that converts it cleanly and accepts the result, the way a
 * union parse takes its first matching option. When none does, the first field converts it and reports why.
 */
function convertByAny(fields: z.ZodType[], value: unknown, path: string[], issues: Issues, direction: Direction): unknown {
	if (fields.length === 0) return value;

	if (fields.length > 1) {
		for (const field of fields) {
			const tried: Issues = [];
			const converted = convertValue(field, value, path, tried, direction);
			if (tried.length === 0 && accepts(field, converted, direction)) return converted;
		}
	}

	return convertValue(fields[0]!, value, path, issues, direction);
}

/** `filter` with each value converted; `visit` sees each value first, with its path, as it stands. */
function convertFilter(model: z.ZodType, filter: ObjFilter<object>, issues: Issues, direction: Direction, visit?: (path: string, value: unknown) => void): ObjFilter<object> {
	return mapFilterValues(filter, ({ path, value }) => {
		visit?.(path, value);
		const fields = fieldsAt(model, path);
		return keepsAsIs(fields, value) ? value : convertByAny(fields, value, path.split('.'), issues, direction);
	});
}

/**
 * `value` converted by `field`. An array field takes a whole array or one element. An embedded document
 * compared whole has its codec and date leaves converted in place: Mongo matches a document by its exact
 * keys and their order, so nothing is stripped or reordered the way a Zod object parse would.
 */
function convertValue(field: z.ZodType, value: unknown, path: string[], issues: Issues, direction: Direction, arrays = 0): unknown {
	if (value === null || value === undefined || value instanceof RegExp) return value;

	const def = field.def as z.core.$ZodTypeDef & Record<string, any>;

	if (def.type === 'array') {
		const element = unwrap(def.element as z.ZodType);
		if (Array.isArray(value)) return value.map(item => convertValue(element, item, path, issues, direction));
		// One element, matched through the arrays it sits in. An array of itself (through z.lazy) has no
		// end: past a depth no document reaches, leave the value as it is.
		return arrays < MAX_ARRAY_DEPTH ? convertValue(element, value, path, issues, direction, arrays + 1) : value;
	}

	if (documentTypes.has(def.type) && typeof value === 'object' && isPlainPrototype(Object.getPrototypeOf(value))) {
		return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, convertByAny(children(field, key), item, [...path, key], issues, direction)]));
	}

	const result = convert(field, value, direction);
	if (result.error) issues.push({ code: 'custom', input: value, message: result.error, path });
	return result.error ? value : result.value;
}

/** The schemas `schema` declares for `key`, still wrapped; see `children`. */
function declared(schema: z.ZodType, key: string): z.ZodType[] {
	const def = unwrap(schema).def as z.core.$ZodTypeDef & Record<string, any>;
	const isIndex = /^\d+$/.test(key);

	switch (def.type) {
		case 'array': return isIndex ? [def.element as z.ZodType] : declared(def.element as z.ZodType, key);
		case 'intersection': return [...declared(def.left as z.ZodType, key), ...declared(def.right as z.ZodType, key)];
		case 'object': {
			const shape = def.shape as Record<string, z.ZodType>;
			const catchall = def.catchall as undefined | z.ZodType;
			if (Object.hasOwn(shape, key)) return [shape[key]!];
			return catchall && catchall.def.type !== 'never' ? [catchall] : [];
		}
		case 'pipe': return 'reverseTransform' in def ? [] : declared(def.in as z.ZodType, key);
		case 'record': return [def.valueType as z.ZodType];
		case 'tuple': {
			const item = isIndex ? (def.items as z.ZodType[])[Number(key)] ?? (def.rest as null | z.ZodType) : null;
			return item ? [item] : [];
		}
		case 'union': return (def.options as z.ZodType[]).flatMap(option => declared(option, key));
		default: return [];
	}
}

/** {@link fieldsAt}' results, per model and path, as {@link remember} keeps them. */
const fieldsCache = new WeakMap<z.ZodType, Map<string, z.ZodType[]>>();

/**
 * `filter` decoded, with an issue for each path it references at or below a forbidden one, the keys of a
 * value compared whole included. One walk both converts the values and looks inside them; the issues come
 * in the same order as if each were its own walk: the forbidden paths first, then the conversions'.
 */
function decodeGuarded(model: z.ZodType, filter: ObjFilter<object>, forbidden: readonly string[], issues: Issues): ObjFilter<object> {
	const isForbidden = (path: string) => {
		const field = withoutIndexes(path);
		return forbidden.some(entry => field === entry || field.startsWith(`${entry}.`));
	};
	const found = new Set(filterPaths(filter).filter(isForbidden));
	const conversions: Issues = [];

	const decoded = convertFilter(model, filter, conversions, 'decode', (path, value) => {
		if (value === null || typeof value !== 'object') return;
		for (const nested of valuePaths(value, path)) {
			if (isForbidden(nested)) found.add(nested);
		}
	});

	for (const path of found) {
		issues.push({ code: 'custom', input: filter, message: 'Filter references a forbidden field.', path: path.split('.') });
	}
	issues.push(...conversions);
	return decoded;
}

/** The schemas a dotted filter path may reach, unwrapped; more than one through a union or intersection. */
function fieldsAt(model: z.ZodType, path: string): z.ZodType[] {
	let byPath = fieldsCache.get(model);
	if (!byPath) fieldsCache.set(model, byPath = new Map());

	let schemas = byPath.get(path);
	if (!schemas) {
		schemas = [model];
		for (const key of path.split('.')) {
			schemas = schemas.length === 1 ? children(schemas[0]!, key) : [...new Set(schemas.flatMap(schema => children(schema, key)))];
		}
		remember(byPath, path, schemas);
	}
	return schemas;
}

/** The schema types whose plain-object values {@link convertValue} converts key by key. */
const documentTypes: ReadonlySet<string> = new Set(['intersection', 'object', 'record', 'union']);

function hasKey(value: unknown, keys: ReadonlySet<string>, seen = new Set<object>()): boolean {
	if (value === null || typeof value !== 'object' || seen.has(value)) return false;
	seen.add(value);
	return Object.entries(value).some(([key, item]) => keys.has(key) || hasKey(item, keys, seen));
}

function isPlainData(value: unknown, seen = new Set<object>()): boolean {
	if (typeof value === 'function') return false;
	if (value === null || typeof value !== 'object' || value instanceof Date || value instanceof RegExp) return true;
	if (seen.has(value)) return false;
	seen.add(value);

	const keys = Object.keys(value);
	if (Array.isArray(value) ? keys.length !== value.length : !isPlainPrototype(Object.getPrototypeOf(value))) return false;

	for (const key of keys) {
		if (codeOperators.has(key) || !isPlainData((value as Record<string, unknown>)[key], seen)) return false;
	}
	return true;
}

function isPlainPrototype(prototype: unknown): boolean {
	return prototype === Object.prototype || prototype === null;
}

/**
 * Whether converting `value` by any of `fields` would return it unchanged, without walking it: no field,
 * or a value that isn't an object on fields that convert none (see {@link keepsScalars}).
 */
function keepsAsIs(fields: z.ZodType[], value: unknown): boolean {
	if (fields.length === 0) return true;
	if (value !== null && typeof value === 'object') return false;
	for (const field of fields) {
		if (!keepsScalars(field)) return false;
	}
	return true;
}

/** {@link keepsScalars}' results, per schema. */
const scalarsCache = new WeakMap<z.ZodType, boolean>();

/**
 * Whether {@link convertValue} returns any value that isn't an object unchanged on `field`, with no issue:
 * it converts one only on a date or a codec, also as an array's element.
 */
function keepsScalars(field: z.ZodType, depth = 0): boolean {
	// Only a field's own answer is cached: one below it holds at its depth, which another path may not share.
	const cached = depth === 0 ? scalarsCache.get(field) : undefined;
	if (cached !== undefined) return cached;

	const def = field.def as z.core.$ZodTypeDef & Record<string, any>;
	const isKept = def.type === 'array'
		// An array of itself (through z.lazy) has no end: past the depth convertValue goes to, it keeps them.
		? depth >= MAX_ARRAY_DEPTH || keepsScalars(unwrap(def.element as z.ZodType), depth + 1)
		: def.type !== 'date' && !(def.type === 'pipe' && 'reverseTransform' in def);

	if (depth === 0) scalarsCache.set(field, isKept);
	return isKept;
}

/**
 * A Mongo filter on `model` as a Zod codec. Parsing (decoding) a filter that arrived as JSON turns each
 * value back into what its field holds, by the field's own codec, or an ISO string into a `Date` for a
 * `z.date()` field; `z.encode` goes the other way. Fields without either, nulls, paths the model
 * doesn't declare and operators that don't take a field value pass through unchanged.
 */
export function objFilter<TModel extends z.ZodType<object>>(model: TModel, options: ObjFilterOptions<TModel> = {}): ObjFilterSchema<TModel> {
	// A record, not a loose object: that would copy any object's own keys, and read a Map as `{}`, the filter
	// that matches everything.
	const shape = z.record(z.string(), z.unknown());
	const forbidden = (options.forbiddenFields ?? []).map(withoutIndexes);

	return z.codec(shape, shape, {
		decode: (filter, payload) => {
			if (options.untrusted && !isPlainData(filter)) {
				payload.issues.push({ code: 'custom', input: filter, message: 'Filter contains a forbidden operator or value.' });
				return filter;
			}

			// An untrusted filter was just walked for these (they are all code operators), so only look for a trusted one.
			if (!options.untrusted && forbidden.length > 0 && hasKey(filter, opaqueOperators)) {
				payload.issues.push({ code: 'custom', input: filter, message: 'Filter references fields through an operator forbiddenFields cannot check.' });
				return filter;
			}

			return (forbidden.length > 0
				? decodeGuarded(model, filter, forbidden, payload.issues)
				: convertFilter(model, filter, payload.issues, 'decode')) as Record<string, unknown>;
		},
		encode: (filter, payload) => convertFilter(model, filter, payload.issues, 'encode') as Record<string, unknown>
	}) as unknown as ObjFilterSchema<TModel>;
}

function unwrap(schema: z.ZodType): z.ZodType {
	let current = schema;

	for (;;) {
		const def = current.def as z.core.$ZodTypeDef & Record<string, any>;

		if (wrapperTypes.has(def.type)) {
			current = def.innerType as z.ZodType;
		} else if (def.type === 'lazy') {
			current = (def.getter as () => z.ZodType)();
		} else {
			return current;
		}
	}
}

/** The dotted paths of the keys inside `value`, under `path`; array items share their array's path. */
function valuePaths(value: unknown, path: string): string[] {
	if (Array.isArray(value)) return value.flatMap(item => valuePaths(item, path));
	if (value === null || typeof value !== 'object' || value instanceof Date || value instanceof RegExp) return [];

	return Object.entries(value).flatMap(([key, item]) => [`${path}.${key}`, ...valuePaths(item, `${path}.${key}`)]);
}

/** The schema types {@link unwrap} sees through to their inner type. */
const wrapperTypes: ReadonlySet<string> = new Set(['catch', 'default', 'nonoptional', 'nullable', 'optional', 'prefault', 'readonly']);

function withoutIndexes(path: string): string {
	if (!numericSegment.test(path)) return path;
	return path.split('.').filter(segment => !/^\d+$/.test(segment)).join('.');
}
