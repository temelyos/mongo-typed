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

function child(schema: z.ZodType, key: string): undefined | z.ZodType {
	const field = unwrap(schema);
	const def = field.def as z.core.$ZodTypeDef & Record<string, any>;

	switch (def.type) {
		case 'array': {
			const element = def.element as z.ZodType;
			return /^\d+$/.test(key) ? element : child(element, key);
		}
		case 'object': return (def.shape as Record<string, z.ZodType>)[key];
		case 'union': {
			for (const option of def.options as z.ZodType[]) {
				const found = child(option, key);
				if (found) return found;
			}
			return undefined;
		}
		default: return undefined;
	}
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

function convertFilter(model: z.ZodType, filter: ObjFilter<object>, issues: Issues, direction: Direction): ObjFilter<object> {
	return mapFilterValues(filter, ({ path, value }) => {
		if (value === null || value === undefined || value instanceof RegExp) return value;

		const field = fieldAt(model, path);
		if (!field) return value;

		const one = (item: unknown) => {
			const result = convert(field.element ?? field.schema, item, direction);
			if (result.error) issues.push({ code: 'custom', input: item, message: result.error, path: path.split('.') });
			return result.error ? item : result.value;
		};

		return field.element && Array.isArray(value) ? value.map(one) : one(value);
	});
}

/** The schema at a dotted filter path, and its element's when the field is an array (a filter may name either). */
function fieldAt(model: z.ZodType, path: string): undefined | { element?: z.ZodType, schema: z.ZodType } {
	let schema: undefined | z.ZodType = model;

	for (const key of path.split('.')) {
		schema = schema && child(schema, key);
	}

	if (!schema) return undefined;

	const field = unwrap(schema);
	const def = field.def as z.core.$ZodTypeDef & Record<string, any>;

	return def.type === 'array' ? { element: unwrap(def.element as z.ZodType), schema: field } : { schema: field };
}

/** Each path `filter` references at or below a forbidden one, including the keys of a value compared whole. */
function forbiddenReferences(filter: ObjFilter<object>, forbidden: readonly string[]): string[] {
	const isForbidden = (path: string) => {
		const field = withoutIndexes(path);
		return forbidden.some(entry => field === entry || field.startsWith(`${entry}.`));
	};
	const found = new Set(filterPaths(filter).filter(isForbidden));

	mapFilterValues(filter, ({ path, value }) => {
		for (const nested of valuePaths(value, path)) {
			if (isForbidden(nested)) found.add(nested);
		}
		return value;
	});

	return [...found];
}

function isPlainData(value: unknown, seen = new Set<object>()): boolean {
	if (typeof value === 'function') return false;
	if (value === null || typeof value !== 'object' || value instanceof Date || value instanceof RegExp) return true;
	if (seen.has(value)) return false;
	seen.add(value);

	const entries = Object.entries(value);
	const prototype: unknown = Object.getPrototypeOf(value);
	if (Array.isArray(value) ? entries.length !== value.length : prototype !== Object.prototype && prototype !== null) return false;

	return entries.every(([key, item]) => !codeOperators.has(key) && isPlainData(item, seen));
}

/**
 * A Mongo filter on `model` as a Zod codec. Parsing (decoding) a filter that arrived as JSON turns each
 * value back into what its field holds, by the field's own codec, or an ISO string into a `Date` for a
 * `z.date()` field; `z.encode` goes the other way. Fields without either, nulls, paths the model
 * doesn't declare and operators that don't take a field value pass through unchanged.
 */
export function objFilter<TModel extends z.ZodType<object>>(model: TModel, options: ObjFilterOptions<TModel> = {}): ObjFilterSchema<TModel> {
	const shape = z.record(z.string(), z.unknown());
	const forbidden = (options.forbiddenFields ?? []).map(withoutIndexes);

	return z.codec(shape, shape, {
		decode: (filter, payload) => {
			if (options.untrusted && !isPlainData(filter)) {
				payload.issues.push({ code: 'custom', input: filter, message: 'Filter contains a forbidden operator or value.' });
				return filter;
			}

			for (const path of forbidden.length > 0 ? forbiddenReferences(filter, forbidden) : []) {
				payload.issues.push({ code: 'custom', input: filter, message: 'Filter references a forbidden field.', path: path.split('.') });
			}

			return convertFilter(model, filter, payload.issues, 'decode') as Record<string, unknown>;
		},
		encode: (filter, payload) => convertFilter(model, filter, payload.issues, 'encode') as Record<string, unknown>
	}) as unknown as ObjFilterSchema<TModel>;
}

function unwrap(schema: z.ZodType): z.ZodType {
	let current = schema;

	for (;;) {
		const def = current.def as z.core.$ZodTypeDef & Record<string, any>;

		if (['catch', 'default', 'nonoptional', 'nullable', 'optional', 'prefault', 'readonly'].includes(def.type)) {
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

function withoutIndexes(path: string): string {
	return path.split('.').filter(segment => !/^\d+$/.test(segment)).join('.');
}
