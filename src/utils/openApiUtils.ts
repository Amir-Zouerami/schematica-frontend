/* eslint-disable no-case-declarations,no-prototype-builtins */

import YAML from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';
import * as curlconverter from 'curlconverter';
import { resolveRef, isRefObject } from './schemaUtils';
import {
	OpenAPISpec,
	OperationObject,
	ParameterObject,
	ReferenceObject,
	SchemaObject,
	RequestBodyObject,
	PathItemObject,
	ExampleObject,
} from '@/types/types';

const isPlainObject = (value: any): value is object => value !== null && typeof value === 'object' && !Array.isArray(value);

export const convertToYaml = (openApiSpec: OpenAPISpec): string => {
	try {
		return YAML.dump(openApiSpec, {
			indent: 2,
			noRefs: true,
		});
	}
	catch (error) {
		return 'Failed to generate YAML';
	}
};

export const generateExampleValue = (
	schemaOrPreResolvedExample: SchemaObject | ReferenceObject | any,
	openApiSpec?: OpenAPISpec,
	context?: { fieldName?: string; isPreResolved?: boolean; parentContentType?: string },
): any => {
	if (context?.isPreResolved) {
		return schemaOrPreResolvedExample;
	}

	const schema = schemaOrPreResolvedExample as SchemaObject | ReferenceObject;
	if (!schema) return null;

	if (isRefObject(schema) && openApiSpec) {
		const resolvedSchema = resolveRef(schema.$ref, openApiSpec);

		if (resolvedSchema && !isRefObject(resolvedSchema)) {
			return generateExampleValue(resolvedSchema, openApiSpec, context);
		}

		return `{$ref: "${schema.$ref}"}`;
	}

	const s = schema as SchemaObject;
	if (s.example !== undefined) return s.example;
	if (s.default !== undefined) return s.default;

	const placeholderName = context?.fieldName || 'value';
	const typeToUse = s.type || (s.properties ? 'object' : undefined);

	switch (typeToUse) {
		case 'integer':
			return 0;
		case 'number':
			return 0.0;
		case 'boolean':
			return false;
		case 'string':
			if (context?.parentContentType === 'application/x-www-form-urlencoded' && !s.format && (!s.enum || s.enum.length === 0)) {
				return `{{${placeholderName}}}`;
			}

			if (s.enum && s.enum.length > 0) return s.enum[0];

			switch (s.format) {
				case 'email':
					return `user@example.com`;
				case 'uuid':
					return `123e4567-e89b-12d3-a456-426614174000`;
				case 'date':
					return `YYYY-MM-DD`;
				case 'date-time':
					return `YYYY-MM-DDTHH:mm:ssZ`;
				case 'byte':
					return `SGVsbG8gV29ybGQ=`;
				case 'binary':
					return `<binary_file_data_for_${placeholderName}>`;
				default:
					return `string_value_for_${placeholderName}`;
			}
		case 'array':
			if (!s.items) return [];
			return [
				generateExampleValue(s.items, openApiSpec, {
					...context,
					fieldName: context?.fieldName ? `${context.fieldName}_item` : 'array_item',
				}),
			];
		case 'object':
			const example: Record<string, any> = {};

			if (s.properties) {
				if (context?.parentContentType === 'application/x-www-form-urlencoded') {
					for (const propertyName in s.properties) {
						if (Object.prototype.hasOwnProperty.call(s.properties, propertyName)) {
							example[propertyName] = `{{${propertyName}}}`;
						}
					}
				}
				else {
					const requiredProps = new Set(s.required || []);
					const propsToShow = Object.keys(s.properties);
					let count = 0;

					for (const propertyName of propsToShow) {
						if (Object.prototype.hasOwnProperty.call(s.properties, propertyName)) {
							if (requiredProps.has(propertyName) || (requiredProps.size === 0 && count < 1)) {
								example[propertyName] = generateExampleValue(s.properties[propertyName], openApiSpec, {
									...context,
									fieldName: propertyName,
								});

								count++;
							}
						}
					}
				}

				if (Object.keys(example).length === 0 && Object.keys(s.properties).length > 0 && context?.fieldName === 'requestBody') {
					return {};
				}
			}
			else if (s.additionalProperties === true || typeof s.additionalProperties === 'object') {
				return { [`property_for_${placeholderName}`]: 'value' };
			}
			return example;
		default:
			if (s.nullable) return null;

			if (typeToUse === undefined && context?.fieldName === 'requestBody') {
				return {};
			}

			return `<unknown_type_for_${placeholderName}:${typeToUse}>`;
	}
};

export const convertOpenApiToCurl = (
	baseServerUrl: string,
	endpointPath: string,
	method: string,
	operation: OperationObject,
	openApiSpec: OpenAPISpec,
): string => {
	let fullUrl = `${baseServerUrl.replace(/\/$/, '')}${endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`}`;
	let curlCommand = `curl -X ${method.toUpperCase()}`;
	const headersToAdd: Record<string, string> = {};
	const queryParamsList: { key: string; value: string }[] = [];

	const operationParameters = (operation.parameters || []) as (ParameterObject | ReferenceObject)[];
	const pathItem = openApiSpec.paths[endpointPath] as PathItemObject | undefined;
	const pathItemParameters = (pathItem?.parameters || []) as (ParameterObject | ReferenceObject)[];

	const parameterMap = new Map<string, ParameterObject>();

	const resolveAndAddParam = (paramOrRef: ParameterObject | ReferenceObject) => {
		let paramDef: ParameterObject | null = null;

		if (isRefObject(paramOrRef)) {
			const resolved = resolveRef(paramOrRef.$ref, openApiSpec);

			if (resolved && !isRefObject(resolved)) {
				paramDef = resolved as ParameterObject;
			}
		}
		else {
			paramDef = paramOrRef as ParameterObject;
		}

		if (paramDef && paramDef.name && paramDef.in) {
			parameterMap.set(`${paramDef.name}-${paramDef.in}`, paramDef);
		}
	};

	pathItemParameters.forEach(resolveAndAddParam);
	operationParameters.forEach(resolveAndAddParam);

	const combinedParameters = Array.from(parameterMap.values());

	const getParameterValueForCurl = (param: ParameterObject): string => {
		let actualSchema: SchemaObject | null = null;
		if (param.schema) {
			if (isRefObject(param.schema)) {
				const resolvedSchema = resolveRef(param.schema.$ref, openApiSpec);
				if (resolvedSchema && !isRefObject(resolvedSchema)) {
					actualSchema = resolvedSchema as SchemaObject;
				}
			}
			else {
				actualSchema = param.schema as SchemaObject;
			}
		}

		if (param.example !== undefined) return String(param.example);
		if (actualSchema?.example !== undefined) return String(actualSchema.example);
		if (actualSchema?.default !== undefined) return String(actualSchema.default);

		if (param.in === 'path') return `{${param.name}}`;
		return `{{${param.name}}}`;
	};

	combinedParameters.forEach(p => {
		const valueToUse = getParameterValueForCurl(p);

		if (p.in === 'header') {
			headersToAdd[p.name] = valueToUse;
		}
		else if (p.in === 'query') {
			queryParamsList.push({ key: p.name, value: valueToUse });
		}
		else if (p.in === 'path') {
			if (valueToUse !== `{${p.name}}`) {
				fullUrl = fullUrl.replace(`{${p.name}}`, encodeURIComponent(valueToUse));
			}
		}
	});

	if (queryParamsList.length > 0) {
		const queryStringParts = queryParamsList.map(qp => {
			return `${qp.key}=${qp.value}`;
		});
		fullUrl += `?${queryStringParts.join('&')}`;
	}

	curlCommand += ` "${fullUrl}"`;

	let requestBodyDataString: string | null = null;

	if (operation.requestBody) {
		let reqBodyDef: RequestBodyObject | null = null;

		if (isRefObject(operation.requestBody)) {
			const resolvedReqBody = resolveRef(operation.requestBody.$ref, openApiSpec);
			if (resolvedReqBody && !isRefObject(resolvedReqBody)) reqBodyDef = resolvedReqBody as RequestBodyObject;
		}
		else {
			reqBodyDef = operation.requestBody as RequestBodyObject;
		}

		if (reqBodyDef && reqBodyDef.content) {
			const jsonContent = reqBodyDef.content['application/json'];
			const formUrlEncodedContent = reqBodyDef.content['application/x-www-form-urlencoded'];
			const formDataContent = reqBodyDef.content['multipart/form-data'];
			const firstContentTypeKey = Object.keys(reqBodyDef.content)[0];

			const bodyContent =
				jsonContent ||
				formUrlEncodedContent ||
				formDataContent ||
				(firstContentTypeKey ? reqBodyDef.content[firstContentTypeKey] : null);

			const chosenContentType = jsonContent
				? 'application/json'
				: formUrlEncodedContent
					? 'application/x-www-form-urlencoded'
					: formDataContent
						? 'multipart/form-data'
						: firstContentTypeKey;

			if (bodyContent) {
				let exampleData: any;

				if (bodyContent.examples && typeof bodyContent.examples === 'object' && Object.keys(bodyContent.examples).length > 0) {
					const firstExampleName = Object.keys(bodyContent.examples)[0];
					const firstExampleOrRef = bodyContent.examples[firstExampleName];

					if (isRefObject(firstExampleOrRef)) {
						const resolvedExampleComponent = resolveRef(firstExampleOrRef.$ref, openApiSpec);
						exampleData = resolvedExampleComponent?.value;
					}
					else if (firstExampleOrRef && typeof firstExampleOrRef === 'object' && 'value' in firstExampleOrRef) {
						exampleData = (firstExampleOrRef as ExampleObject).value;
					}
					else {
						exampleData = firstExampleOrRef;
					}
				}

				if (exampleData === undefined && bodyContent.example !== undefined) {
					exampleData = bodyContent.example;
				}
				if (exampleData === undefined && bodyContent.schema) {
					exampleData = generateExampleValue(bodyContent.schema, openApiSpec, {
						fieldName: 'requestBody',
						parentContentType: chosenContentType,
					});
				}

				if (exampleData !== undefined) {
					const explicitlySetContentType = headersToAdd['Content-Type'] || headersToAdd['content-type'];
					const actualContentType = explicitlySetContentType || chosenContentType || 'text/plain';

					if (actualContentType.includes('json')) {
						headersToAdd['Content-Type'] = 'application/json';
						requestBodyDataString = JSON.stringify(exampleData, null, 2);
					}
					else if (actualContentType.includes('x-www-form-urlencoded') && isPlainObject(exampleData)) {
						headersToAdd['Content-Type'] = 'application/x-www-form-urlencoded';
						const formDataParts: string[] = [];

						for (const key in exampleData) {
							if (Object.prototype.hasOwnProperty.call(exampleData, key)) {
								formDataParts.push(`${key}=${exampleData[key]}`);
							}
						}

						requestBodyDataString = formDataParts.join('&');
					}
					else if (typeof exampleData === 'string') {
						if (!headersToAdd['Content-Type'] && !headersToAdd['content-type'] && chosenContentType) {
							headersToAdd['Content-Type'] = chosenContentType;
						}
						else if (!headersToAdd['Content-Type'] && !headersToAdd['content-type']) {
							headersToAdd['Content-Type'] = 'text/plain';
						}

						requestBodyDataString = exampleData;
					}
					else {
						if (!headersToAdd['Content-Type'] && !headersToAdd['content-type'] && chosenContentType) {
							headersToAdd['Content-Type'] = chosenContentType;
						}
						else if (!headersToAdd['Content-Type'] && !headersToAdd['content-type']) {
							headersToAdd['Content-Type'] = 'application/json';
						}

						requestBodyDataString = JSON.stringify(exampleData, null, 2);
					}
				}
			}
		}
	}

	for (const key in headersToAdd) {
		if (headersToAdd.hasOwnProperty(key)) {
			curlCommand += ` -H "${key}: ${String(headersToAdd[key]).replace(/"/g, '\\"')}"`;
		}
	}

	if (requestBodyDataString) {
		const contentTypeForDataFlag = headersToAdd['Content-Type'] || headersToAdd['content-type'] || '';

		if (contentTypeForDataFlag.includes('x-www-form-urlencoded')) {
			curlCommand += ` --data-urlencode '${requestBodyDataString.replace(/'/g, "'\\''")}'`;
		}
		else {
			const escapedDataForCurl = requestBodyDataString.replace(/'/g, "'\\''");
			curlCommand += ` -d '${escapedDataForCurl}'`;
		}
	}

	return curlCommand;
};

export const inferSchemaFromValue = (value: any): SchemaObject => {
	const type = typeof value;

	if (value === null) return { type: 'string', nullable: true };

	if (Array.isArray(value)) {
		const itemsSchema: SchemaObject | ReferenceObject =
			value.length > 0 ? inferSchemaFromValue(value[0]) : ({ type: 'string' } as SchemaObject);
		return { type: 'array', items: itemsSchema };
	}

	if (type === 'object') {
		const properties: Record<string, SchemaObject> = {};
		for (const key in value) {
			if (Object.hasOwnProperty.call(value, key)) {
				properties[key] = inferSchemaFromValue(value[key]);
			}
		}

		return { type: 'object', properties };
	}

	if (type === 'string') {
		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/.test(value)) return { type: 'string', format: 'date-time' };
		if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return { type: 'string', format: 'date' };
		if (/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(value))
			return { type: 'string', format: 'uuid' };
		if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { type: 'string', format: 'email' };
		return { type: 'string' };
	}

	if (type === 'number') {
		if (Number.isInteger(value)) return { type: 'integer' };
		return { type: 'number' };
	}

	if (type === 'boolean') return { type: 'boolean' };
	return { type: 'string' };
};

export const parseCurlToOpenApi = (
	curlCommand: string,
	createdByUsername: string,
): { path: string; method: string; operation: OperationObject } | null => {
	try {
		const commandToParse = curlCommand.replace(/\\\r?\n/g, ' ').trim();
		if (!commandToParse.toLowerCase().startsWith('curl')) {
			throw new Error('Invalid cURL command: Must start with "curl".');
		}

		const parsedCurl = curlconverter.toJsonObject(commandToParse);
		if (!parsedCurl.url && !parsedCurl.raw_url) {
			return null;
		}

		let urlObject;
		try {
			let tempUrl = parsedCurl.raw_url || parsedCurl.url;

			if (!tempUrl) {
				return null;
			}

			if (!/^https?:\/\//i.test(tempUrl)) tempUrl = 'http://' + tempUrl;
			urlObject = new URL(tempUrl);
		}
		catch (e) {
			return null;
		}

		const parameters: ParameterObject[] = [];
		if (parsedCurl.queries) {
			for (const key in parsedCurl.queries) {
				if (Object.hasOwnProperty.call(parsedCurl.queries, key)) {
					const values = parsedCurl.queries[key];
					(Array.isArray(values) ? values : [values]).forEach(value => {
						parameters.push({
							name: key,
							in: 'query',
							description: `Query parameter ${key}`,
							required: false,
							schema: { type: 'string', example: String(value) },
						});
					});
				}
			}
		}

		let requestContentTypeFromHeader: string | undefined = undefined;

		if (parsedCurl.headers) {
			for (const key in parsedCurl.headers) {
				if (Object.hasOwnProperty.call(parsedCurl.headers, key)) {
					const lowerKey = key.toLowerCase();
					if (!['user-agent', 'accept', 'host', 'content-length', 'cookie'].includes(lowerKey)) {
						parameters.push({
							name: key,
							in: 'header',
							description: `Header parameter ${key}`,
							required: false,
							schema: { type: 'string', example: String(parsedCurl.headers[key]) },
						});
					}

					if (lowerKey === 'content-type') {
						requestContentTypeFromHeader = String(parsedCurl.headers[key]).split(';')[0].trim();
					}
				}
			}
		}

		let requestBody: RequestBodyObject | undefined = undefined;

		if (parsedCurl.data !== undefined && parsedCurl.data !== null) {
			let actualContentType = requestContentTypeFromHeader || 'application/octet-stream';
			let exampleValue = parsedCurl.data;
			let inferredSchema: SchemaObject = { type: 'string' };

			if (isPlainObject(parsedCurl.data) || Array.isArray(parsedCurl.data)) {
				actualContentType = requestContentTypeFromHeader || 'application/json';
				inferredSchema = inferSchemaFromValue(parsedCurl.data);
				exampleValue = parsedCurl.data;
			}
			else if (typeof parsedCurl.data === 'string') {
				try {
					const jsonData = JSON.parse(parsedCurl.data);

					if (isPlainObject(jsonData) || Array.isArray(jsonData)) {
						actualContentType = requestContentTypeFromHeader || 'application/json';
						inferredSchema = inferSchemaFromValue(jsonData);
						exampleValue = jsonData;
					}
					else {
						actualContentType = requestContentTypeFromHeader || 'text/plain';
						inferredSchema = { type: 'string' };
						exampleValue = parsedCurl.data;
					}
				}
				catch (e) {
					actualContentType = requestContentTypeFromHeader || 'text/plain';
					inferredSchema = { type: 'string' };
					exampleValue = parsedCurl.data;
				}
			}
			requestBody = { content: { [actualContentType]: { schema: inferredSchema, example: exampleValue } } };
		}

		const operation: OperationObject = {
			summary: `Imported from cURL (${(parsedCurl.method || 'GET').toUpperCase()} ${urlObject.pathname})`,
			description: `Generated from cURL command:\n\`\`\`bash\n${curlCommand}\n\`\`\``,
			parameters: parameters.length > 0 ? parameters : undefined,
			requestBody: requestBody,
			responses: { '200': { description: 'Successful response' } },
			'x-app-metadata': {
				createdBy: createdByUsername,
				createdAt: new Date().toISOString(),
				lastEditedBy: createdByUsername,
				lastEditedAt: new Date().toISOString(),
				notes: [],
			},
		};

		return { path: urlObject.pathname, method: (parsedCurl.method || 'get').toLowerCase(), operation: operation };
	}
	catch (error) {
		if (error instanceof Error && error.message.includes('Invalid URL')) {
			console.error('Hint: Ensure the URL in the cURL command includes a scheme (http:// or https://) or is a valid hostname.');
		}

		if (error instanceof Error && error.message.startsWith('Invalid cURL command:')) {
			throw error;
		}

		return null;
	}
};

interface PostmanUrlVariable {
	key: string;
	value: string;
	description?: string;
	type?: string;
}

interface PostmanQueryParam {
	key: string;
	value: string | null;
	disabled?: boolean;
	description?: string;
}

interface PostmanHeader {
	key: string;
	value: string;
	type?: string;
	disabled?: boolean;
	description?: string;
}

interface PostmanCollection {
	info: { _postman_id: string; name: string; description?: string; schema: string };
	item: any[];
	variable?: Array<{ key: string; value: string; type: string; description?: string }>;
}

export const convertOpenApiToPostmanCollection = (openApiSpec: OpenAPISpec): PostmanCollection | null => {
	if (!openApiSpec || !openApiSpec.info || !openApiSpec.paths) {
		console.error('Invalid OpenAPI spec provided for Postman conversion.');
		return null;
	}

	const postmanCollection: PostmanCollection = {
		info: {
			_postman_id: uuidv4(),
			name: openApiSpec.info.title || 'API Collection',
			description: openApiSpec.info.description || '',
			schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
		},
		item: [],
		variable: [],
	};

	if (openApiSpec.servers && openApiSpec.servers.length > 0) {
		const baseUrlValue = openApiSpec.servers[0].url.replace(/\/$/, '');

		postmanCollection.variable?.push({
			key: 'baseUrl',
			value: baseUrlValue,
			type: 'string',
			description: openApiSpec.servers[0].description || 'Main server URL',
		});
	}
	else {
		postmanCollection.variable?.push({
			key: 'baseUrl',
			value: 'YOUR_API_BASE_URL',
			type: 'string',
			description: 'Replace with your API base URL',
		});
	}

	const organizedItems: Record<string, any[]> = {};

	Object.entries(openApiSpec.paths).forEach(([path, pathItemUntyped]) => {
		if (!pathItemUntyped) return;
		const pathItemObject = pathItemUntyped as PathItemObject;

		Object.entries(pathItemObject).forEach(([method, operationOrPathItemProp]) => {
			if (!['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'].includes(method.toLowerCase())) return;
			let operation: OperationObject | null = null;

			if (typeof operationOrPathItemProp === 'object' && operationOrPathItemProp !== null) {
				if (isRefObject(operationOrPathItemProp)) {
					const resolvedOp = resolveRef(operationOrPathItemProp.$ref, openApiSpec);
					if (resolvedOp && !isRefObject(resolvedOp)) operation = resolvedOp as OperationObject;
					else {
						console.warn(`Could not resolve operation $ref: ${operationOrPathItemProp.$ref}`);
						return;
					}
				}
				else {
					operation = operationOrPathItemProp as OperationObject;
				}
			}

			if (!operation) return;

			const firstTagName = operation.tags && operation.tags.length > 0 ? operation.tags[0] : 'Default';
			const requestName = operation.summary || `${method.toUpperCase()} ${path}`;
			const postmanRequest: any = {
				name: requestName,
				_postman_id: uuidv4(),
				request: {
					method: method.toUpperCase(),
					header: [] as PostmanHeader[],
					url: {
						raw: `{{baseUrl}}${path}`,
						host: ['{{baseUrl}}'],
						path: path.startsWith('/') ? path.substring(1).split('/') : path.split('/'),
						query: [] as PostmanQueryParam[],
						variable: [] as PostmanUrlVariable[],
					},
					description: operation.description || '',
				},
				response: [],
			};

			const operationParameters = (operation.parameters || []) as (ParameterObject | ReferenceObject)[];
			const pathItemParametersFromPathObject = (pathItemObject.parameters as (ParameterObject | ReferenceObject)[]) || [];
			const parameterMap = new Map<string, ParameterObject>();

			pathItemParametersFromPathObject.forEach(paramOrRef => {
				let paramDef = paramOrRef;

				if (isRefObject(paramDef)) {
					const resolved = resolveRef(paramDef.$ref, openApiSpec);
					if (resolved && !isRefObject(resolved)) paramDef = resolved as ParameterObject;
					else return;
				}

				if ('name' in paramDef && 'in' in paramDef)
					parameterMap.set(
						`${(paramDef as ParameterObject).name}-${(paramDef as ParameterObject).in}`,
						paramDef as ParameterObject,
					);
			});

			operationParameters.forEach(paramOrRef => {
				let paramDef = paramOrRef;

				if (isRefObject(paramDef)) {
					const resolved = resolveRef(paramDef.$ref, openApiSpec);
					if (resolved && !isRefObject(resolved)) paramDef = resolved as ParameterObject;
					else return;
				}

				if ('name' in paramDef && 'in' in paramDef)
					parameterMap.set(
						`${(paramDef as ParameterObject).name}-${(paramDef as ParameterObject).in}`,
						paramDef as ParameterObject,
					);
			});

			const combinedParameters = Array.from(parameterMap.values());

			combinedParameters.forEach(p => {
				let actualSchema: SchemaObject | null = null;

				if (p.schema) {
					if (isRefObject(p.schema)) {
						const resolvedSchema = resolveRef(p.schema.$ref, openApiSpec);
						if (resolvedSchema && !isRefObject(resolvedSchema)) actualSchema = resolvedSchema as SchemaObject;
					}
					else actualSchema = p.schema as SchemaObject;
				}

				const exampleValue = String(p.example ?? actualSchema?.example ?? actualSchema?.default ?? '');

				const finalValue =
					exampleValue === '' && p.in === 'path'
						? `<${p.name}>`
						: exampleValue === '' && !p.allowEmptyValue
							? `{{${p.name}}}`
							: exampleValue;

				if (p.in === 'header') {
					postmanRequest.request.header.push({ key: p.name, value: finalValue, type: 'text', description: p.description || '' });
				}
				else if (p.in === 'query') {
					postmanRequest.request.url.query.push({
						key: p.name,
						value: finalValue,
						disabled: p.deprecated,
						description: p.description || '',
					});
				}
				else if (p.in === 'path') {
					postmanRequest.request.url.variable.push({
						key: p.name,
						value: exampleValue,
						description: p.description || '',
						type: 'string',
					});
					postmanRequest.request.url.raw = postmanRequest.request.url.raw.replace(`{${p.name}}`, `:${p.name}`);
					postmanRequest.request.url.path = postmanRequest.request.url.path.map((segment: string) =>
						segment === `{${p.name}}` ? `:${p.name}` : segment,
					);
				}
			});

			if (postmanRequest.request.url.query.length > 0) {
				const queryString = postmanRequest.request.url.query
				.map((q: PostmanQueryParam) => `${encodeURIComponent(q.key)}=${encodeURIComponent(q.value || '')}`)
				.join('&');
				postmanRequest.request.url.raw = `${postmanRequest.request.url.raw.split('?')[0]}?${queryString}`;
			}

			if (operation.requestBody) {
				let reqBodyDef: RequestBodyObject | null = null;

				if (isRefObject(operation.requestBody)) {
					const resolved = resolveRef(operation.requestBody.$ref, openApiSpec);
					if (resolved && !isRefObject(resolved)) reqBodyDef = resolved as RequestBodyObject;
				}
				else reqBodyDef = operation.requestBody as RequestBodyObject;
				if (reqBodyDef && reqBodyDef.content) {
					const jsonContent = reqBodyDef.content['application/json'];
					const formUrlEncodedContent = reqBodyDef.content['application/x-www-form-urlencoded'];
					const formDataContent = reqBodyDef.content['multipart/form-data'];
					const targetContent = jsonContent || formUrlEncodedContent || formDataContent || Object.values(reqBodyDef.content)[0];

					const targetContentType = jsonContent
						? 'application/json'
						: formUrlEncodedContent
							? 'application/x-www-form-urlencoded'
							: formDataContent
								? 'multipart/form-data'
								: Object.keys(reqBodyDef.content)[0];

					if (targetContent) {
						let exampleForPostman: any;

						if (targetContent.examples && Object.keys(targetContent.examples).length > 0) {
							const firstExampleName = Object.keys(targetContent.examples)[0];
							const firstExampleOrRef = targetContent.examples[firstExampleName];

							if (isRefObject(firstExampleOrRef)) {
								const resolvedExampleComponent = resolveRef(firstExampleOrRef.$ref, openApiSpec);
								exampleForPostman = resolvedExampleComponent?.value;
							}
							else {
								exampleForPostman = firstExampleOrRef.value;
							}
						}

						if (exampleForPostman === undefined && targetContent.example !== undefined) {
							exampleForPostman = targetContent.example;
						}

						if (exampleForPostman === undefined && targetContent.schema) {
							exampleForPostman = generateExampleValue(targetContent.schema, openApiSpec, { fieldName: 'requestBody' });
						}

						if (targetContentType && targetContentType.includes('json')) {
							postmanRequest.request.body = {
								mode: 'raw',
								raw: JSON.stringify(exampleForPostman, null, 2),
								options: { raw: { language: 'json' } },
							};

							if (!postmanRequest.request.header.find((h: PostmanHeader) => h.key.toLowerCase() === 'content-type')) {
								postmanRequest.request.header.push({ key: 'Content-Type', value: 'application/json', type: 'text' });
							}
						}
						else if (
							targetContentType &&
							targetContentType.includes('x-www-form-urlencoded') &&
							isPlainObject(exampleForPostman)
						) {
							postmanRequest.request.body = {
								mode: 'urlencoded',
								urlencoded: Object.entries(exampleForPostman).map(([key, value]) => ({
									key: key,
									value: String(value),
									type: 'text',
								})),
							};

							if (!postmanRequest.request.header.find((h: PostmanHeader) => h.key.toLowerCase() === 'content-type')) {
								postmanRequest.request.header.push({
									key: 'Content-Type',
									value: 'application/x-www-form-urlencoded',
									type: 'text',
								});
							}
						}
						else if (targetContentType && targetContentType.includes('form-data') && isPlainObject(exampleForPostman)) {
							postmanRequest.request.body = {
								mode: 'formdata',
								formdata: Object.entries(exampleForPostman).map(([key, value]) => ({
									key: key,
									value: String(value),
									type: 'text',
								})),
							};
						}
					}
				}
			}

			if (!organizedItems[firstTagName]) organizedItems[firstTagName] = [];
			organizedItems[firstTagName].push(postmanRequest);
		});
	});

	Object.entries(organizedItems).forEach(([folderName, items]) => {
		if (items.length === 1 && folderName === 'Default' && Object.keys(organizedItems).length === 1) {
			postmanCollection.item.push(...items);
		}
		else {
			postmanCollection.item.push({ name: folderName, item: items, _postman_id: uuidv4() });
		}
	});

	return postmanCollection;
};

const removeExtensionsRecursive = (obj: any): any => {
	if (typeof obj !== 'object' || obj === null) return obj;
	if (Array.isArray(obj)) return obj.map(item => removeExtensionsRecursive(item));

	const newObj: { [key: string]: any } = {};

	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			if (!key.startsWith('x-')) newObj[key] = removeExtensionsRecursive(obj[key]);
		}
	}

	return newObj;
};

export const sanitizeOpenApiSpecForDownload = (specObject: any): any => {
	if (!specObject || typeof specObject !== 'object') return specObject;

	const clonedSpec = JSON.parse(JSON.stringify(specObject));
	return removeExtensionsRecursive(clonedSpec);
};

export const safeStringify = (obj: any, indent = 2): string => {
	try {
		return JSON.stringify(obj, null, indent);
	}
	catch (error) {
		console.error('Failed to stringify object', error);
		return '[Could not display]';
	}
};
