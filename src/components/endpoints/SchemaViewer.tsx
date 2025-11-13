import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import React, { useState, useMemo } from 'react';
import SimpleCodeBlock from '../ui/SimpleCodeBlock';
import { OpenAPISpec, SchemaObject, ReferenceObject } from '@/types/types';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	isRefObject,
	resolveRef,
	deeplyResolveReferences,
	getTypeString,
	getRefName,
} from '@/utils/schemaUtils';

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

	const renderProperties = () => {
		if (!resolvedSchema.properties || Object.keys(resolvedSchema.properties).length === 0) {
			return (
				<p className="text-xs text-muted-foreground italic mt-1">No properties defined.</p>
			);
		}

		return (
			<Table className="mt-2 text-xs">
				<TableHeader>
					<TableRow>
						<TableHead className="w-[150px] h-8">Name</TableHead>
						<TableHead className="w-[150px] h-8">Type</TableHead>
						<TableHead className="w-[80px] h-8">Required</TableHead>
						<TableHead className="h-8">Description</TableHead>
					</TableRow>
				</TableHeader>

				<TableBody>
					{Object.entries(resolvedSchema.properties!).map(
						([propName, propSchemaUntyped]) => {
							const propSchema = propSchemaUntyped as SchemaObject | ReferenceObject;
							const propTypeDisplay = getTypeString(propSchema, openApiSpec);
							const isRequired = resolvedSchema.required?.includes(propName) || false;

							const propDescription =
								(isRefObject(propSchema)
									? (resolveRef(propSchema.$ref, openApiSpec) as SchemaObject)
											?.description
									: (propSchema as SchemaObject)?.description) || '';

							const isComplexProp =
								isRefObject(propSchema) ||
								((propSchema as SchemaObject)?.type === 'object' &&
									!!(propSchema as SchemaObject).properties) ||
								((propSchema as SchemaObject)?.type === 'array' &&
									!!(propSchema as SchemaObject).items);

							return (
								<React.Fragment key={propName}>
									<TableRow>
										<TableCell className="font-mono py-1.5">
											{propName}
										</TableCell>

										<TableCell className="py-1.5">
											<Badge variant="secondary" className="text-xs">
												{propTypeDisplay}
											</Badge>
										</TableCell>

										<TableCell className="py-1.5">
											{isRequired ? (
												<Badge
													variant="default"
													className="text-xs bg-pink-600 hover:bg-pink-700"
												>
													Yes
												</Badge>
											) : (
												<span className="text-muted-foreground">No</span>
											)}
										</TableCell>

										<TableCell className="py-1.5 text-muted-foreground">
											{propDescription}
										</TableCell>
									</TableRow>

									{isExpanded && isComplexProp && depth < MAX_RECURSION_DEPTH && (
										<TableRow>
											<TableCell colSpan={4} className="p-0 border-none">
												<div className="ml-4 my-1 p-2 border-l-2 border-blue-500/30 bg-blue-500/5 rounded-r-md">
													<SchemaViewer
														schema={propSchema}
														openApiSpec={openApiSpec}
														name={propName}
														depth={depth + 1}
														isNested={true}
														showNestedDetailsInitially={false}
														showFullJsonButton={false}
													/>
												</div>
											</TableCell>
										</TableRow>
									)}
								</React.Fragment>
							);
						},
					)}
				</TableBody>
			</Table>
		);
	};

	const renderArrayItems = () => {
		if (!resolvedSchema.items) {
			return (
				<p className="text-xs text-muted-foreground italic mt-1">
					No item type defined for array.
				</p>
			);
		}

		return (
			<div className="mt-2">
				<div className="text-xs font-medium text-muted-foreground mb-1">Items:</div>
				{depth < MAX_RECURSION_DEPTH && (
					<SchemaViewer
						schema={resolvedSchema.items}
						openApiSpec={openApiSpec}
						depth={depth + 1}
						isNested={true}
						showNestedDetailsInitially={true}
						showFullJsonButton={false}
					/>
				)}
			</div>
		);
	};

	const renderEnumValues = () => {
		if (!resolvedSchema.enum || resolvedSchema.enum.length === 0) return null;
		return (
			<div className="mt-2">
				<div className="text-xs font-medium text-muted-foreground">Enum values:</div>
				<div className="flex flex-wrap gap-1 mt-1">
					{resolvedSchema.enum.map((value, index) => (
						<Badge key={index} variant="outline" className="text-xs">
							{JSON.stringify(value)}
						</Badge>
					))}
				</div>
			</div>
		);
	};

	const hasExpandableContent =
		(resolvedSchema.type === 'object' &&
			resolvedSchema.properties &&
			Object.keys(resolvedSchema.properties).length > 0) ||
		(resolvedSchema.type === 'array' && resolvedSchema.items) ||
		(resolvedSchema.enum && resolvedSchema.enum.length > 0);

	return (
		<div className={isNested ? 'ml-4 pl-3 border-l border-border/70 py-2' : 'py-2'}>
			<div className="flex items-start justify-between gap-2">
				<div className="flex-grow">
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
						className="p-0 h-6 w-6 flex-shrink-0"
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
					{resolvedSchema.type === 'object' && renderProperties()}
					{resolvedSchema.type === 'array' && renderArrayItems()}
					{renderEnumValues()}
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
