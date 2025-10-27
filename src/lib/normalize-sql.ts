import type { BindableValue } from '@sqlite.org/sqlite-wasm';
import type { Statement } from '../types.js';
import { sqlTag } from './sql-tag.js';

function isObject(
	value: unknown
): value is { [paramName: string]: BindableValue } {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeNamedParams(
	sql: string,
	params: { [paramName: string]: BindableValue }
): { [paramName: string]: BindableValue } {
	const normalizedParams: { [paramName: string]: BindableValue } = {};

	// Find all named parameters in the SQL and their prefixes
	const paramMatches = sql.matchAll(/([:@$])(\w+)/g);
	const paramMap = new Map<string, string>();

	for (const match of paramMatches) {
		const prefix = match[1];
		const paramName = match[2];
		paramMap.set(paramName, prefix);
	}

	// Only add prefix to parameters that exist in the SQL
	for (const [key, value] of Object.entries(params)) {
		const prefix = paramMap.get(key);
		if (prefix) {
			// Parameter exists in SQL, add with prefix
			normalizedParams[`${prefix}${key}`] = value;
		}
		// Silently ignore parameters not in SQL
	}

	return normalizedParams;
}

export function normalizeSql(
	maybeQueryTemplate: TemplateStringsArray | string,
	params: unknown[]
): Statement {
	let statement: Statement;

	if (typeof maybeQueryTemplate === 'string') {
		// Handle named parameters
		if (params.length === 1 && isObject(params[0])) {
			statement = {
				sql: maybeQueryTemplate,
				params: normalizeNamedParams(maybeQueryTemplate, params[0]),
			};
		} else {
			// Handle positional parameters
			statement = {
				sql: maybeQueryTemplate,
				params: params as BindableValue[],
			};
		}
	} else {
		// Handle template literal syntax
		statement = sqlTag(maybeQueryTemplate, ...(params as BindableValue[]));
	}

	return statement;
}
