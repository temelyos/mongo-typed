import type { ObjFilter } from './filter.js';

export interface FilterOperand {
	/** `$eq` for a value compared directly; each item of `$in`, `$nin` and `$all` is its own operand, as is a malformed one that isn't a list. */
	operator: FilterValueOperator,
	/** The field's dotted path from the filter's root, through any `$elemMatch`. */
	path: string,
	value: unknown
}

/** An operator whose operand is a value of the field, or a list of them. */
export type FilterValueOperator = '$all' | '$eq' | '$gt' | '$gte' | '$in' | '$lt' | '$lte' | '$ne' | '$nin';

const listOperators = new Set<string>(['$all', '$in', '$nin']);
const logicalOperators = new Set<string>(['$and', '$nor', '$or']);
const valueOperators = new Set<string>(['$eq', '$gt', '$gte', '$lt', '$lte', '$ne']);

type Mapper = (operand: FilterOperand) => unknown;
type Plain = Record<string, unknown>;

function isOperatorObject(value: unknown): value is Plain {
	if (!isPlainObject(value)) return false;
	const keys = Object.keys(value);
	return keys.length > 0 && keys.every(key => key.startsWith('$'));
}

function isPlainObject(value: unknown): value is Plain {
	if (value === null || typeof value !== 'object') return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function join(prefix: string, key: string): string {
	return prefix ? `${prefix}.${key}` : key;
}

function mapCondition(condition: unknown, path: string, map: Mapper): unknown {
	return isOperatorObject(condition)
		? mapOperators(condition, path, map)
		: map({ operator: '$eq', path, value: condition });
}

function mapElemMatch(condition: unknown, path: string, map: Mapper): unknown {
	if (!isPlainObject(condition)) return condition;
	return isOperatorObject(condition) && !Object.keys(condition).some(key => logicalOperators.has(key))
		? mapOperators(condition, path, map)
		: mapFilter(condition, path, map);
}

function mapFilter(filter: Plain, prefix: string, map: Mapper): Plain {
	const result: Plain = {};
	for (const [key, value] of Object.entries(filter)) {
		if (logicalOperators.has(key) && Array.isArray(value)) {
			result[key] = value.map(clause => (isPlainObject(clause) ? mapFilter(clause, prefix, map) : clause));
		} else if (key.startsWith('$')) {
			result[key] = value;
		} else {
			result[key] = mapCondition(value, join(prefix, key), map);
		}
	}
	return result;
}

/**
 * A copy of `filter` with every field value replaced by `map`'s result. Logical operators,
 * `$not` and `$elemMatch` are walked; operands that aren't field values (`$exists`, `$size`,
 * `$regex`, `$type`, geo, `$expr`, `$text` and the like) are copied as they are.
 */
export function mapFilterValues<T extends object>(filter: ObjFilter<T>, map: Mapper): ObjFilter<T> {
	return mapFilter(filter as Plain, '', map) as ObjFilter<T>;
}

function mapOperators(operators: Plain, path: string, map: Mapper): Plain {
	const result: Plain = {};
	for (const [operator, operand] of Object.entries(operators)) {
		if (valueOperators.has(operator)) {
			result[operator] = map({ operator: operator as FilterValueOperator, path, value: operand });
		} else if (listOperators.has(operator)) {
			const mapItem = (item: unknown) => map({ operator: operator as FilterValueOperator, path, value: item });
			result[operator] = Array.isArray(operand) ? operand.map(mapItem) : mapItem(operand);
		} else if (operator === '$not' && isOperatorObject(operand)) {
			result[operator] = mapOperators(operand, path, map);
		} else if (operator === '$elemMatch') {
			result[operator] = mapElemMatch(operand, path, map);
		} else {
			result[operator] = operand;
		}
	}
	return result;
}
