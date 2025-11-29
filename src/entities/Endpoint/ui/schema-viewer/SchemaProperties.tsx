import SchemaViewer from '@/entities/Endpoint/ui/SchemaViewer';
import { getTypeString, isRefObject, resolveRef } from '@/shared/lib/schemaUtils';
import { OpenAPISpec, ReferenceObject, SchemaObject } from '@/shared/types/types';
import { Badge } from '@/shared/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import React from 'react';

interface SchemaPropertiesProps {
	schema: SchemaObject;
	openApiSpec: OpenAPISpec;
	depth: number;
	maxDepth: number;
	isExpanded: boolean;
}

export const SchemaProperties: React.FC<SchemaPropertiesProps> = ({
	schema,
	openApiSpec,
	depth,
	maxDepth,
	isExpanded,
}) => {
	if (!schema.properties || Object.keys(schema.properties).length === 0) {
		return <p className="text-xs text-muted-foreground italic mt-1">No properties defined.</p>;
	}

	const renderExample = (val: unknown) => {
		if (val === undefined) return <span className="text-muted-foreground/30">-</span>;
		const display = typeof val === 'object' ? JSON.stringify(val) : String(val);
		return (
			<code className="bg-muted/30 px-1 py-0.5 rounded text-[10px] text-muted-foreground font-mono break-all">
				{display.length > 30 ? display.slice(0, 30) + '...' : display}
			</code>
		);
	};

	return (
		<div className="grid grid-cols-1 w-full max-w-[calc(100vw-3rem)] md:max-w-full overflow-x-auto border rounded-md my-2 bg-background/50">
			<Table className="text-xs min-w-[600px]">
				<TableHeader>
					<TableRow className="hover:bg-transparent">
						<TableHead className="min-w-[120px] h-8 bg-muted/20">Name</TableHead>
						<TableHead className="min-w-[100px] h-8 bg-muted/20">Type</TableHead>
						<TableHead className="min-w-[60px] h-8 text-center bg-muted/20">
							Req
						</TableHead>
						<TableHead className="min-w-[100px] h-8 bg-muted/20">Example</TableHead>
						<TableHead className="h-8 min-w-[150px] bg-muted/20">Description</TableHead>
					</TableRow>
				</TableHeader>

				<TableBody>
					{Object.entries(schema.properties).map(([propName, propSchemaUntyped]) => {
						const propSchema = propSchemaUntyped as SchemaObject | ReferenceObject;
						const propTypeDisplay = getTypeString(propSchema, openApiSpec);
						const isRequired = schema.required?.includes(propName) || false;

						// Resolve ref to get description and example if needed
						const resolvedProp = isRefObject(propSchema)
							? (resolveRef(propSchema.$ref, openApiSpec) as SchemaObject)
							: (propSchema as SchemaObject);

						const propDescription = resolvedProp?.description || '';
						const propExample = resolvedProp?.example;

						const isComplexProp =
							isRefObject(propSchema) ||
							((propSchema as SchemaObject)?.type === 'object' &&
								!!(propSchema as SchemaObject).properties) ||
							((propSchema as SchemaObject)?.type === 'array' &&
								!!(propSchema as SchemaObject).items);

						return (
							<React.Fragment key={propName}>
								<TableRow className="hover:bg-muted/10">
									<TableCell className="font-mono py-2 font-medium align-top text-foreground">
										{propName}
									</TableCell>

									<TableCell className="py-2 align-top">
										<Badge
											variant="secondary"
											className="text-[10px] font-normal whitespace-nowrap bg-muted/50 text-muted-foreground hover:bg-muted"
										>
											{propTypeDisplay}
										</Badge>
									</TableCell>

									<TableCell className="py-2 text-center align-top font-mono text-[11px]">
										{isRequired ? (
											<span className="text-rose-500 font-semibold">
												true
											</span>
										) : (
											<span className="text-muted-foreground/40">false</span>
										)}
									</TableCell>

									<TableCell className="py-2 align-top">
										{renderExample(propExample)}
									</TableCell>

									<TableCell className="py-2 text-muted-foreground align-top whitespace-normal wrap-break-word">
										{propDescription}
									</TableCell>
								</TableRow>

								{isExpanded && isComplexProp && depth < maxDepth && (
									<TableRow>
										<TableCell
											colSpan={5}
											className="p-0 border-none bg-muted/5"
										>
											<div className="pl-2 md:pl-4 py-2 border-l-2 border-blue-500/30">
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
					})}
				</TableBody>
			</Table>
		</div>
	);
};
