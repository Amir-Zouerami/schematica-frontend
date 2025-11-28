import {
	MediaTypeObject,
	OpenAPISpec,
	ReferenceObject,
	RequestBodyObject,
	SchemaObject,
} from '@/shared/types/types';

/**
 * Type Guard to differentiate ReferenceObject from SchemaObject
 */
export const isRefObject = (obj: unknown): obj is ReferenceObject => {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'$ref' in obj &&
		typeof (obj as any).$ref === 'string'
	);
};

export const resolveRef = (ref: string, openApiSpec: OpenAPISpec): unknown | null => {
	if (!ref || typeof ref !== 'string' || !ref.startsWith('#/')) {
		return null;
	}

	const path = ref.replace('#/', '').split('/');
	let current: unknown = openApiSpec;

	for (const segment of path) {
		if (current && typeof current === 'object' && segment in current) {
			current = (current as Record<string, unknown>)[segment];
		} else {
			return null;
		}
	}

	return current;
};

// Use generic constraint to ensure type safety while allowing flexibility
export const deeplyResolveReferences = <T>(
	input: T,
	openApiSpec: OpenAPISpec,
	visitedRefs: Set<string> = new Set(),
): T | (T & { circular?: boolean; error?: string }) => {
	if (!input || typeof input !== 'object') {
		return input;
	}

	// Handle ReferenceObject
	if (isRefObject(input)) {
		if (visitedRefs.has(input.$ref)) {
			return { ...input, circular: true } as any; // Cast required for intersection type
		}

		const newVisited = new Set(visitedRefs);
		newVisited.add(input.$ref);

		const resolved = resolveRef(input.$ref, openApiSpec);

		if (!resolved) {
			return { ...input, error: 'Could not resolve reference' } as any;
		}

		return deeplyResolveReferences(resolved, openApiSpec, newVisited) as T;
	}

	// Handle Array
	if (Array.isArray(input)) {
		return input.map((item) =>
			deeplyResolveReferences(item, openApiSpec, new Set(visitedRefs)),
		) as unknown as T;
	}

	// Handle Object traversal
	const result: Record<string, unknown> = {};

	for (const key in input) {
		if (Object.prototype.hasOwnProperty.call(input, key)) {
			result[key] = deeplyResolveReferences(
				(input as Record<string, unknown>)[key],
				openApiSpec,
				new Set(visitedRefs),
			);
		}
	}

	return result as T;
};

export const resolveRequestBody = (
	requestBodyOrRef: RequestBodyObject | ReferenceObject | undefined,
	openApiSpec: OpenAPISpec,
): RequestBodyObject | null => {
	if (!requestBodyOrRef) return null;
	let directRequestBody: RequestBodyObject | null = null;

	if (isRefObject(requestBodyOrRef)) {
		const resolved = resolveRef(requestBodyOrRef.$ref, openApiSpec);

		if (resolved && !isRefObject(resolved)) {
			directRequestBody = resolved as RequestBodyObject;
		} else {
			console.warn(`Could not resolve RequestBody $ref: ${requestBodyOrRef.$ref}`);
			return null;
		}
	} else {
		directRequestBody = requestBodyOrRef;
	}

	if (!directRequestBody || !directRequestBody.content) {
		return directRequestBody;
	}

	const resolvedContent: Record<string, MediaTypeObject> = {};

	for (const contentType in directRequestBody.content) {
		if (Object.prototype.hasOwnProperty.call(directRequestBody.content, contentType)) {
			const mediaType = directRequestBody.content[contentType];
			resolvedContent[contentType] = deeplyResolveReferences<MediaTypeObject>(
				mediaType,
				openApiSpec,
			);
		}
	}

	return { ...directRequestBody, content: resolvedContent };
};

export const getTypeString = (
	schema: SchemaObject | ReferenceObject,
	openApiSpec: OpenAPISpec,
): string => {
	const resolvedSchemaInput = isRefObject(schema) ? resolveRef(schema.$ref, openApiSpec) : schema;

	if (
		!resolvedSchemaInput ||
		typeof resolvedSchemaInput !== 'object' ||
		Array.isArray(resolvedSchemaInput) ||
		'$ref' in resolvedSchemaInput
	) {
		if (isRefObject(schema)) {
			const refName = getRefName(schema.$ref);
			return refName ? `Reference (${refName})` : 'unknown (unresolved ref)';
		}

		return 'unknown (invalid schema)';
	}

	const resolvedSchema = resolvedSchemaInput as SchemaObject;
	let typeString: string = resolvedSchema.type || 'object';

	if (resolvedSchema.enum) {
		typeString = `${resolvedSchema.type || 'string'} (enum)`;
	} else if (typeString === 'array' && resolvedSchema.items) {
		const itemSchema = resolvedSchema.items;

		if (isRefObject(itemSchema)) {
			const refParts = itemSchema.$ref.split('/');
			typeString = `array[${refParts[refParts.length - 1] || 'reference'}]`;
		} else if (itemSchema && typeof itemSchema === 'object' && 'type' in itemSchema) {
			typeString = `array[${(itemSchema as SchemaObject).type || 'unknown_item'}]`;
		} else {
			typeString = `array[unknown_item_format]`;
		}
	}

	return typeString;
};

export const getResolvedSchemaJson = (
	schema: SchemaObject | ReferenceObject,
	openApiSpec: OpenAPISpec,
): string => {
	try {
		const fullyResolvedSchema = deeplyResolveReferences(schema, openApiSpec);

		if (fullyResolvedSchema === undefined || fullyResolvedSchema === null) {
			return JSON.stringify(schema, null, 2);
		}

		return JSON.stringify(fullyResolvedSchema, null, 2);
	} catch (error) {
		console.error('Failed to fully resolve schema (exception):', error);
		return JSON.stringify(schema, null, 2);
	}
};

export const extractMediaTypeInfo = (mediaType: MediaTypeObject) => {
	if (!mediaType || !mediaType.schema) return { schema: null, example: null };
	return { schema: mediaType.schema, example: mediaType.example };
};

export const formatDate = (dateString?: string): string => {
	if (!dateString) return 'Unknown date';

	try {
		return new Date(dateString).toLocaleString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	} catch (e) {
		return 'Invalid date';
	}
};

export const getRefName = (ref: string | undefined): string | null => {
	if (!ref) return null;
	return ref.split('/').pop() || null;
};

export const shouldShowPropertiesTable = (schema: SchemaObject): boolean => {
	return (
		schema &&
		typeof schema === 'object' &&
		schema.type === 'object' &&
		!!schema.properties &&
		Object.keys(schema.properties).length > 0
	);
};

export const getStatusCodeClass = (statusCode: string): string => {
	const numericStatusCode = parseInt(statusCode, 10);
	if (isNaN(numericStatusCode)) return 'text-gradient-green';
	if (numericStatusCode >= 200 && numericStatusCode < 300) return 'text-gradient-green';
	if (numericStatusCode >= 300 && numericStatusCode < 400) return 'text-gradient-blue';
	if (numericStatusCode >= 400 && numericStatusCode < 500) return 'text-gradient-orange';
	if (numericStatusCode >= 500 && numericStatusCode < 600) return 'text-gradient-red';
	return 'text-gradient-green';
};
