import { z } from 'zod';

import type { ObjFilter } from '../filter.js';

import { mapFilterValues } from '../filter-values.js';

type Direction = 'decode' | 'encode';
type EncodedFilter<TModel extends z.ZodType<object>> = ObjFilter<z.input<TModel> extends object ? z.input<TModel> : never>;

type Issues = z.core.ParsePayload['issues'];

/** A filter on `TModel`: decoded, its values are the model's output (`Date`); encoded, its input (an ISO string). */
export type ObjFilterSchema<TModel extends z.ZodType<object>> = z.ZodCodec<
	z.ZodType<EncodedFilter<TModel>, EncodedFilter<TModel>>,
	z.ZodType<ObjFilter<z.output<TModel>>, ObjFilter<z.output<TModel>>>
>;

const isoDateTime = z.iso.datetime({ offset: true });

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

/**
 * A Mongo filter on `model` as a Zod codec. Parsing (decoding) a filter that arrived as JSON turns each
 * value back into what its field holds, by the field's own codec, or an ISO string into a `Date` for a
 * `z.date()` field; `z.encode` goes the other way. Fields without either, nulls, paths the model
 * doesn't declare and operators that don't take a field value pass through unchanged.
 */
export function objFilter<TModel extends z.ZodType<object>>(model: TModel): ObjFilterSchema<TModel> {
	const shape = z.record(z.string(), z.unknown());

	return z.codec(shape, shape, {
		decode: (filter, payload) => convertFilter(model, filter, payload.issues, 'decode') as Record<string, unknown>,
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
