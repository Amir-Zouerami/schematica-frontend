import { z } from 'zod';

export const jsonString = z.string().refine(
	(val) => {
		if (val.trim() === '') return true;
		try {
			JSON.parse(val);
			return true;
		} catch {
			return false;
		}
	},
	{ message: 'Invalid JSON format.' },
);

export const parameterSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	in: z.enum(['query', 'header', 'path', 'cookie']),
	description: z.string().optional(),
	required: z.boolean().optional(),
	schema: z
		.object({
			type: z.enum(['string', 'number', 'integer', 'boolean', 'array', 'object', 'uuid']),
		})
		.optional(),
});

export const requestBodySchema = z.object({
	description: z.string().optional(),
	required: z.boolean().optional(),
	contentType: z.string(),
	schemaString: jsonString,
	exampleString: jsonString,
});

export const responseSchema = z.object({
	statusCode: z.string().min(1, 'Status code is required.'),
	description: z.string().min(1, 'Description is required.'),
	contentType: z.string(),
	schemaString: jsonString,
	exampleString: jsonString,
});

// CHANGED: Added '@' to the regex character class
const PATH_REGEX = /^(\/([a-zA-Z0-9_\-\.@]+|\{[a-zA-Z0-9_]+\}))+$/;

export const endpointFormSchema = z.object({
	path: z
		.string()
		.min(1, 'Path is required.')
		.startsWith('/', { message: 'Path must start with /' })
		.regex(PATH_REGEX, {
			message:
				'Invalid format. Use "/resource/{param}" syntax. Segments can contain alphanumeric chars, _, -, ., and @.',
		}),
	method: z.enum(['get', 'post', 'put', 'delete', 'patch', 'options', 'head']),
	status: z.enum(['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'DEPRECATED']),
	summary: z.string().min(1, 'Summary is required.'),
	description: z.string().optional(),
	tags: z.array(z.string()),
	isDeprecated: z.boolean(),
	parameters: z
		.array(parameterSchema)
		.optional()
		.refine(
			(params) => {
				if (!params) return true;
				const seen = new Set<string>();
				for (const p of params) {
					const key = `${p.in}:${p.name.toLowerCase()}`;
					if (seen.has(key)) return false;
					seen.add(key);
				}
				return true;
			},
			{
				message:
					'Duplicate parameters found. A parameter name must be unique within its location (query, header, path).',
			},
		),
	requestBody: requestBodySchema.nullable().optional(),
	responses: z.array(responseSchema).min(1, 'At least one response is required.'),
});

export type EndpointFormValues = z.infer<typeof endpointFormSchema>;
