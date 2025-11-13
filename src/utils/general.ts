export function simpleIsEqual(a: any, b: any): boolean {
	if (a === b) return true;

	if (a && typeof a === 'object' && b && typeof b === 'object') {
		if (a.constructor !== b.constructor) return false;

		let length, i;

		if (Array.isArray(a)) {
			length = a.length;
			if (length !== b.length) return false;
			for (i = length; i-- !== 0; ) if (!simpleIsEqual(a[i], b[i])) return false;
			return true;
		}

		if (a instanceof Map && b instanceof Map) {
			if (a.size !== b.size) return false;
			for (i of a.entries()) if (!b.has(i[0])) return false;
			for (i of a.entries()) if (!simpleIsEqual(i[1], b.get(i[0]))) return false;
			return true;
		}

		if (a instanceof Set && b instanceof Set) {
			if (a.size !== b.size) return false;
			for (i of a.entries()) if (!b.has(i[0])) return false;
			return true;
		}

		if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
		if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
		if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();

		const keys = Object.keys(a).sort();
		length = keys.length;

		if (length !== Object.keys(b).sort().length) return false;

		for (i = length; i-- !== 0; )
			if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;

		for (i = length; i-- !== 0; ) {
			const key = keys[i];
			if (!simpleIsEqual(a[key], b[key])) return false;
		}

		return true;
	}

	// True if both NaN, false otherwise
	return a !== a && b !== b;
}
