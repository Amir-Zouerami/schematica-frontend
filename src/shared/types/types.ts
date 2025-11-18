import type { components } from './api-types';

// --- Re-export Backend DTOs for convenience ---
export type ProjectDetailDto = components['schemas']['ProjectDetailDto'];
export type EndpointDto = components['schemas']['EndpointDto'];
export type ParameterDto = components['schemas']['ParameterObject'];
export type RequestBodyDto = components['schemas']['RequestBodyObject'];
export type ResponseDto = components['schemas']['ResponseObject'];
export type SchemaComponentDto = components['schemas']['SchemaComponentDto'];

// --- Strict Frontend Types (The "Rich" Types) ---

export interface OpenAPISpec {
	openapi: string;
	info: InfoObject;
	servers?: ServerObject[];
	paths: PathsObject;
	components?: ComponentsObject;
	tags?: TagObject[];
	externalDocs?: ExternalDocumentationObject;
	// Allow extension fields
	[key: string]: unknown;
}

export interface InfoObject {
	title: string;
	version: string;
	description?: string;
	termsOfService?: string;
	contact?: ContactObject;
	license?: LicenseObject;
}

export interface ContactObject {
	name?: string;
	url?: string;
	email?: string;
}

export interface LicenseObject {
	name: string;
	url?: string;
}

export interface ServerObject {
	url: string;
	description?: string;
	variables?: Record<string, ServerVariableObject>;
}

export interface ServerVariableObject {
	enum?: string[];
	default: string;
	description?: string;
}

export interface PathsObject {
	[path: string]: PathItemObject;
}

export interface PathItemObject {
	$ref?: string;
	summary?: string;
	description?: string;
	get?: OperationObject;
	put?: OperationObject;
	post?: OperationObject;
	delete?: OperationObject;
	options?: OperationObject;
	head?: OperationObject;
	patch?: OperationObject;
	trace?: OperationObject;
	servers?: ServerObject[];
	parameters?: (ParameterObject | ReferenceObject)[];
}

export interface AppMetadata {
	createdBy?: string;
	createdAt?: string;
	lastEditedBy?: string;
	lastEditedAt?: string;
	notes?: {
		content: string;
		createdBy: string;
		createdAt: string;
	}[];
}

export interface OperationObject {
	summary?: string;
	description?: string;
	operationId?: string;
	parameters?: (ParameterObject | ReferenceObject)[];
	requestBody?: RequestBodyObject | ReferenceObject;
	responses?: Record<string, ResponseObject | ReferenceObject>;
	deprecated?: boolean;
	tags?: string[];
	security?: Array<Record<string, string[]>>;
	servers?: ServerObject[];
	externalDocs?: ExternalDocumentationObject;
	callbacks?: Record<string, CallbackObject | ReferenceObject>;
	'x-app-metadata'?: AppMetadata;
}

export interface ParameterObject {
	name: string;
	in: 'query' | 'header' | 'path' | 'cookie';
	description?: string;
	required?: boolean;
	deprecated?: boolean;
	allowEmptyValue?: boolean;
	style?: string;
	explode?: boolean;
	allowReserved?: boolean;
	schema?: SchemaObject | ReferenceObject;
	example?: unknown;
	examples?: Record<string, ExampleObject | ReferenceObject>;
	content?: Record<string, MediaTypeObject>;
}

export interface RequestBodyObject {
	description?: string;
	content?: Record<string, MediaTypeObject>;
	required?: boolean;
	'x-app-metadata'?: AppMetadata;
}

export interface MediaTypeObject {
	schema?: SchemaObject | ReferenceObject;
	example?: unknown;
	examples?: Record<string, ExampleObject | ReferenceObject>;
	encoding?: EncodingObject;
}

export interface EncodingObject {
	contentType?: string;
	headers?: Record<string, HeaderObject | ReferenceObject>;
	style?: string;
	explode?: boolean;
	allowReserved?: boolean;
}

export interface ResponseObject {
	description: string;
	headers?: Record<string, HeaderObject | ReferenceObject>;
	content?: Record<string, MediaTypeObject>;
	links?: Record<string, LinkObject | ReferenceObject>;
}

export interface HeaderObject extends Omit<ParameterObject, 'name' | 'in'> {
	// Headers don't have name/in inside the object definition in this context
}

export interface ExampleObject {
	summary?: string;
	description?: string;
	value?: unknown;
	externalValue?: string;
}

export interface LinkObject {
	operationRef?: string;
	operationId?: string;
	parameters?: Record<string, unknown>;
	requestBody?: unknown;
	description?: string;
	server?: ServerObject;
}

export interface ComponentsObject {
	schemas?: Record<string, SchemaObject | ReferenceObject>;
	responses?: Record<string, ResponseObject | ReferenceObject>;
	parameters?: Record<string, ParameterObject | ReferenceObject>;
	examples?: Record<string, ExampleObject | ReferenceObject>;
	requestBodies?: Record<string, RequestBodyObject | ReferenceObject>;
	headers?: Record<string, HeaderObject | ReferenceObject>;
	securitySchemes?: Record<string, SecuritySchemeObject | ReferenceObject>;
	links?: Record<string, LinkObject | ReferenceObject>;
	callbacks?: Record<string, CallbackObject | ReferenceObject>;
}

// Extensive Schema Object definition to replace 'Record<string, never>'
export interface SchemaObject {
	type?: 'integer' | 'number' | 'string' | 'boolean' | 'object' | 'array' | 'null';
	format?: string;
	title?: string;
	description?: string;
	default?: unknown;
	multipleOf?: number;
	maximum?: number;
	exclusiveMaximum?: boolean;
	minimum?: number;
	exclusiveMinimum?: boolean;
	maxLength?: number;
	minLength?: number;
	pattern?: string;
	maxItems?: number;
	minItems?: number;
	uniqueItems?: boolean;
	maxProperties?: number;
	minProperties?: number;
	required?: string[];
	enum?: unknown[];
	allOf?: (SchemaObject | ReferenceObject)[];
	oneOf?: (SchemaObject | ReferenceObject)[];
	anyOf?: (SchemaObject | ReferenceObject)[];
	not?: SchemaObject | ReferenceObject;
	items?: SchemaObject | ReferenceObject;
	properties?: Record<string, SchemaObject | ReferenceObject>;
	additionalProperties?: boolean | SchemaObject | ReferenceObject;
	discriminator?: DiscriminatorObject;
	readOnly?: boolean;
	writeOnly?: boolean;
	xml?: XMLObject;
	externalDocs?: ExternalDocumentationObject;
	example?: unknown;
	deprecated?: boolean;
	nullable?: boolean;
	[key: string]: unknown; // Allow extensions
}

export interface ReferenceObject {
	$ref: string;
	[key: string]: unknown; // Allow extensions even on refs (OpenAPI 3.1 compatible)
}

export interface DiscriminatorObject {
	propertyName: string;
	mapping?: Record<string, string>;
}

export interface XMLObject {
	name?: string;
	namespace?: string;
	prefix?: string;
	attribute?: boolean;
	wrapped?: boolean;
}

export interface ExternalDocumentationObject {
	description?: string;
	url: string;
}

export interface TagObject {
	name: string;
	description?: string;
	externalDocs?: ExternalDocumentationObject;
}

export interface CallbackObject {
	[expression: string]: PathItemObject;
}

export interface SecuritySchemeObject {
	type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
	description?: string;
	name?: string;
	in?: 'query' | 'header' | 'cookie';
	scheme?: string;
	bearerFormat?: string;
	flows?: OAuthFlowsObject;
	openIdConnectUrl?: string;
}

export interface OAuthFlowsObject {
	implicit?: OAuthFlowObject;
	password?: OAuthFlowObject;
	clientCredentials?: OAuthFlowObject;
	authorizationCode?: OAuthFlowObject;
}

export interface OAuthFlowObject {
	authorizationUrl?: string;
	tokenUrl?: string;
	refreshUrl?: string;
	scopes: Record<string, string>;
}
