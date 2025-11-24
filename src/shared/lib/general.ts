/**
 * Performs a deep equality check between two values of the same type.
 * Handles Primitives, Arrays, Objects, Maps, Sets, Dates, and RegExps.
 */
export function deepEqual<T>(a: T, b: T): boolean {
	if (a === b) return true;

	if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
		return a !== a && b !== b; // Handle NaN
	}

	if (a.constructor !== b.constructor) return false;

	if (Array.isArray(a)) {
		const arrA = a as unknown[];
		const arrB = b as unknown[];

		if (arrA.length !== arrB.length) return false;

		for (let i = 0; i < arrA.length; i++) {
			if (!deepEqual(arrA[i], arrB[i])) return false;
		}

		return true;
	}

	if (a instanceof Map && b instanceof Map) {
		if (a.size !== b.size) return false;

		for (const [key, val] of a) {
			if (!b.has(key)) return false;
			if (!deepEqual(val, b.get(key))) return false;
		}

		return true;
	}

	if (a instanceof Set && b instanceof Set) {
		if (a.size !== b.size) return false;

		for (const val of a) {
			if (!b.has(val)) return false;
		}

		return true;
	}

	if (a instanceof Date && b instanceof Date) {
		return a.getTime() === b.getTime();
	}

	if (a instanceof RegExp && b instanceof RegExp) {
		return a.source === b.source && a.flags === b.flags;
	}

	if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) {
		// Specific handling for typed arrays if needed, generally strictly referential or length check
		// For simple use cases, we treat them as objects below or add specific logic here.
		// Falling through to object check for now.
	}

	const keysA = Object.keys(a as Record<string, unknown>);
	const keysB = Object.keys(b as Record<string, unknown>);

	if (keysA.length !== keysB.length) return false;

	for (const key of keysA) {
		if (!Object.prototype.hasOwnProperty.call(b, key)) return false;

		const valA = (a as Record<string, unknown>)[key];
		const valB = (b as Record<string, unknown>)[key];

		if (!deepEqual(valA, valB)) return false;
	}

	return true;
}

export const simpleIsEqual = deepEqual;
