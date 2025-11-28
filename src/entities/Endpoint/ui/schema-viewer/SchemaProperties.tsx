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

	return (
		<div className="grid grid-cols-1 w-full max-w-[calc(100vw-3rem)] md:max-w-full overflow-x-auto border rounded-md my-2 bg-background/50">
			<Table className="text-xs min-w-[600px]">
				<TableHeader>
					<TableRow className="hover:bg-transparent">
						<TableHead className="min-w-[120px] h-8 bg-muted/20">Name</TableHead>
						<TableHead className="min-w-[120px] h-8 bg-muted/20">Type</TableHead>
						<TableHead className="min-w-[70px] h-8 text-center bg-muted/20">
							Required
						</TableHead>
						<TableHead className="h-8 min-w-[150px] bg-muted/20">Description</TableHead>
					</TableRow>
				</TableHeader>

				<TableBody>
					{Object.entries(schema.properties).map(([propName, propSchemaUntyped]) => {
						const propSchema = propSchemaUntyped as SchemaObject | ReferenceObject;
						const propTypeDisplay = getTypeString(propSchema, openApiSpec);
						const isRequired = schema.required?.includes(propName) || false;

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
								<TableRow className="hover:bg-muted/10">
									<TableCell className="font-mono py-2 font-medium align-top">
										{propName}
									</TableCell>

									<TableCell className="py-2 align-top">
										<Badge
											variant="secondary"
											className="text-[10px] font-normal whitespace-nowrap"
										>
											{propTypeDisplay}
										</Badge>
									</TableCell>

									<TableCell className="py-2 text-center align-top">
										{isRequired ? (
											<Badge
												variant="default"
												className="text-[10px] bg-pink-600 hover:bg-pink-700 px-1.5 py-0"
											>
												Req
											</Badge>
										) : (
											<span className="text-muted-foreground text-[10px]">
												Opt
											</span>
										)}
									</TableCell>

									<TableCell className="py-2 text-muted-foreground align-top whitespace-normal wrap-break-word">
										{propDescription}
									</TableCell>
								</TableRow>

								{isExpanded && isComplexProp && depth < maxDepth && (
									<TableRow>
										<TableCell
											colSpan={4}
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
