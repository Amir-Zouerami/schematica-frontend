import { SchemaArrayItems } from '@/entities/Endpoint/ui/schema-viewer/SchemaArrayItems';
import { SchemaEnumValues } from '@/entities/Endpoint/ui/schema-viewer/SchemaEnumValues';
import { SchemaProperties } from '@/entities/Endpoint/ui/schema-viewer/SchemaProperties';
import {
	deeplyResolveReferences,
	getRefName,
	getTypeString,
	isRefObject,
} from '@/shared/lib/schemaUtils';
import { OpenAPISpec, ReferenceObject, SchemaObject } from '@/shared/types/types';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import SimpleCodeBlock from '@/shared/ui/SimpleCodeBlock';
import { ChevronDown } from 'lucide-react';
import React, { useMemo, useState } from 'react';

interface SchemaViewerProps {
	schema: SchemaObject | ReferenceObject;
	openApiSpec: OpenAPISpec;
	name?: string;
	depth?: number;
	isNested?: boolean;
	showNestedDetailsInitially?: boolean;
	showFullJsonButton?: boolean;
}

const MAX_RECURSION_DEPTH = Number(import.meta.env.VITE_SCHEMA_MAX_RECURSION_DEPTH) || 7;

const SchemaViewer: React.FC<SchemaViewerProps> = ({
	schema: initialSchema,
	openApiSpec,
	name,
	depth = 0,
	isNested = false,
	showNestedDetailsInitially = !isNested,
	showFullJsonButton = !isNested,
}) => {
	const schema = useMemo(() => {
		return deeplyResolveReferences<SchemaObject | ReferenceObject>(initialSchema, openApiSpec);
	}, [initialSchema, openApiSpec]);

	const [isExpanded, setIsExpanded] = useState(showNestedDetailsInitially);
	const [isFullSchemaJsonVisible, setIsFullSchemaJsonVisible] = useState(false);

	const fullSchemaJsonForDisplay = useMemo(() => {
		return JSON.stringify(deeplyResolveReferences(initialSchema, openApiSpec), null, 2);
	}, [initialSchema, openApiSpec]);

	if (!schema || (isRefObject(schema) && !('circular' in schema || 'error' in schema))) {
		const refPath = isRefObject(initialSchema) ? initialSchema.$ref : 'Unknown Reference';

		return (
			<div className={`text-sm text-destructive ${isNested ? 'ml-4 pl-3 border-l' : ''}`}>
				Error: Could not fully resolve schema or reference:{' '}
				{isRefObject(initialSchema) ? <code>{refPath}</code> : name || 'schema'}.
			</div>
		);
	}

	if (typeof schema === 'object' && schema !== null) {
		if ('error' in schema && typeof (schema as any).error === 'string') {
			return (
				<div className="text-xs text-destructive italic">
					Error resolving <code>{(initialSchema as ReferenceObject).$ref}</code>:{' '}
					{(schema as any).error}
				</div>
			);
		}

		if ('circular' in schema && (schema as any).circular === true) {
			return (
				<div className="text-xs text-amber-600 italic">
					Circular reference to <code>{(initialSchema as ReferenceObject).$ref}</code>
				</div>
			);
		}
	}

	const resolvedSchema = schema as SchemaObject;

	if (depth > MAX_RECURSION_DEPTH) {
		return (
			<div className="text-xs text-muted-foreground italic ml-4">
				[Max display depth reached]
			</div>
		);
	}

	const toggleExpand = () => setIsExpanded(!isExpanded);
	const typeDisplay = getTypeString(initialSchema, openApiSpec);
	const description = resolvedSchema.description;
	const originalRefPath = isRefObject(initialSchema) ? initialSchema.$ref : null;
	const originalRefName = originalRefPath ? getRefName(originalRefPath) : null;

	const hasExpandableContent =
		(resolvedSchema.type === 'object' &&
			resolvedSchema.properties &&
			Object.keys(resolvedSchema.properties).length > 0) ||
		(resolvedSchema.type === 'array' && resolvedSchema.items) ||
		(resolvedSchema.enum && resolvedSchema.enum.length > 0);

	return (
		<div className={isNested ? 'ml-4 pl-3 border-l border-border/70 py-2' : 'py-2'}>
			<div className="flex items-start justify-between gap-2">
				<div className="grow">
					<div className="flex items-center flex-wrap gap-x-2 gap-y-1">
						{name && (
							<span className="font-mono text-sm font-medium text-foreground">
								{name}:
							</span>
						)}

						<Badge variant="outline" className="text-xs">
							{typeDisplay}
						</Badge>

						{originalRefName && (
							<Badge variant="secondary" className="text-xs font-normal">
								(ref: {originalRefName})
							</Badge>
						)}

						{resolvedSchema.format && (
							<Badge variant="outline" className="text-xs font-normal">
								format: {resolvedSchema.format}
							</Badge>
						)}

						{resolvedSchema.nullable && (
							<Badge variant="outline" className="text-xs font-normal">
								nullable
							</Badge>
						)}

						{resolvedSchema.deprecated && (
							<Badge variant="destructive" className="text-xs">
								deprecated
							</Badge>
						)}
					</div>

					{description && (
						<p className="text-xs text-muted-foreground mt-1">{description}</p>
					)}
				</div>

				{hasExpandableContent && (
					<Button
						variant="ghost"
						size="sm"
						className="p-0 h-6 w-6 shrink-0"
						onClick={toggleExpand}
					>
						<ChevronDown
							className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
						/>
					</Button>
				)}
			</div>

			{isExpanded && (
				<div className="mt-2">
					{resolvedSchema.type === 'object' && (
						<SchemaProperties
							schema={resolvedSchema}
							openApiSpec={openApiSpec}
							depth={depth}
							maxDepth={MAX_RECURSION_DEPTH}
							isExpanded={isExpanded}
						/>
					)}

					{resolvedSchema.type === 'array' && (
						<SchemaArrayItems
							schema={resolvedSchema}
							openApiSpec={openApiSpec}
							depth={depth}
							maxDepth={MAX_RECURSION_DEPTH}
						/>
					)}
					<SchemaEnumValues schema={resolvedSchema} />
				</div>
			)}

			{showFullJsonButton && (
				<div className="mt-3 text-right">
					<Button
						variant="link"
						size="sm"
						className="text-xs h-auto p-0"
						onClick={() => setIsFullSchemaJsonVisible(!isFullSchemaJsonVisible)}
					>
						{isFullSchemaJsonVisible ? 'Hide Full JSON' : 'View Full JSON'}
					</Button>
				</div>
			)}

			{showFullJsonButton && isFullSchemaJsonVisible && (
				<div className="mt-2">
					<SimpleCodeBlock
						code={fullSchemaJsonForDisplay}
						language="json"
						showLineNumbers
					/>
				</div>
			)}
		</div>
	);
};

export default React.memo(SchemaViewer);
