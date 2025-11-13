export interface OpenAPISpec {
	openapi: string;
	info: InfoObject;
	servers?: ServerObject[];
	paths: PathsObject;
	components?: ComponentsObject;
	tags?: TagObject[];
	externalDocs?: ExternalDocumentationObject;
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

export interface RequestBodyObject {
	description?: string;
	required?: boolean;
	content?: Record<string, MediaTypeObject>;
	'x-app-metadata'?: AppMetadata;
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

export interface ExternalDocumentationObject {
	description?: string;
	url: string;
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
	example?: any;
	examples?: Record<string, ExampleObject | ReferenceObject>;
	content?: Record<string, MediaTypeObject>;
}

export interface RequestBody {
	description?: string;
	content: {
		[contentType: string]: MediaTypeObject;
	};
	required?: boolean;
}

export interface MediaTypeObject {
	schema?: SchemaObject | ReferenceObject;
	example?: any;
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

export interface HeaderObject extends ParameterObject {
	schema?: SchemaObject | ReferenceObject;
	content?: Record<string, MediaTypeObject>;
}

export interface ResponseObject {
	description: string;
	headers?: Record<string, HeaderObject | ReferenceObject>;
	content?: Record<string, MediaTypeObject>;
	links?: Record<string, LinkObject | ReferenceObject>;
}

export interface ExampleObject {
	summary?: string;
	description?: string;
	value?: any;
	externalValue?: string;
}

export interface LinkObject {
	operationRef?: string;
	operationId?: string;
	parameters?: Record<string, any | string>;
	requestBody?: any;
	description?: string;
	server?: ServerObject;
}

export interface ComponentsObject {
	schemas?: Record<string, SchemaObject | ReferenceObject>;
	responses?: Record<string, ResponseObject | ReferenceObject>;
	parameters?: Record<string, ParameterObject | ReferenceObject>;
	examples?: Record<string, ExampleObject | ReferenceObject>;
	requestBodies?: Record<string, RequestBody | ReferenceObject>;
	headers?: Record<string, HeaderObject | ReferenceObject>;
	securitySchemes?: Record<string, SecuritySchemeObject | ReferenceObject>;
	links?: Record<string, LinkObject | ReferenceObject>;
	callbacks?: Record<string, CallbackObject | ReferenceObject>;
}

export interface SchemaObject {
	type?: 'integer' | 'number' | 'string' | 'boolean' | 'object' | 'array' | 'enum';
	format?: string;
	title?: string;
	description?: string;
	default?: any;
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
	enum?: any[];
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
	example?: any;
	deprecated?: boolean;
	nullable?: boolean;
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

export interface ReferenceObject {
	$ref: string;
}

export interface EndpointFormProps {
	projectId: string;
	initialEndpoint?: {
		path: string;
		method: string;
		operation: OperationObject;
	};
	onClose: () => void;
	onSubmit: (data: {
		path: string;
		method: string;
		operation: OperationObject;
		_lastKnownOperationUpdatedAt?: string;
	}) => void;
}
