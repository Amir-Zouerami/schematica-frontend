import { getTypeString } from '@/shared/lib/schemaUtils';
import { OpenAPISpec, ParameterObject, ReferenceObject, SchemaObject } from '@/shared/types/types';
import { Badge } from '@/shared/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import React from 'react';

interface ParametersTableProps {
	parameters: ParameterObject[];
	openApiSpec: OpenAPISpec;
	isEditable?: boolean;
}

const ParametersTable: React.FC<ParametersTableProps> = ({ parameters, openApiSpec }) => {
	const getDisplayType = (schema?: SchemaObject | ReferenceObject): string => {
		if (!schema) return 'unknown';
		return getTypeString(schema, openApiSpec);
	};

	return (
		<>
			<div className="flex flex-col gap-4 md:hidden">
				{parameters.map((param, index) => {
					const schema = param.schema as SchemaObject | ReferenceObject | undefined;

					return (
						<div
							key={`${param.name}-${index}`}
							className="p-4 bg-muted/30 border rounded-lg space-y-2"
						>
							<div className="flex justify-between items-start">
								<div className="flex flex-col">
									<span className="font-mono font-medium text-sm">
										{param.name}
									</span>

									<span className="text-xs text-muted-foreground">
										{schema && getDisplayType(schema)}
									</span>
								</div>

								<div className="flex flex-col items-end gap-1">
									{param.required ? (
										<Badge variant="default" className="text-[10px]">
											Required
										</Badge>
									) : (
										<span className="text-[10px] text-muted-foreground uppercase">
											Optional
										</span>
									)}
									{param.deprecated && (
										<Badge variant="destructive" className="text-[10px]">
											Deprecated
										</Badge>
									)}
								</div>
							</div>

							<div className="text-sm text-muted-foreground border-t pt-2 mt-2">
								{param.description || (
									<span className="italic opacity-50">No description</span>
								)}
							</div>
						</div>
					);
				})}
			</div>

			<div className="hidden md:block">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Description</TableHead>
							<TableHead className="w-24 text-center">Required</TableHead>
						</TableRow>
					</TableHeader>

					<TableBody>
						{parameters.map((param, index) => {
							const schema = param.schema as
								| SchemaObject
								| ReferenceObject
								| undefined;

							return (
								<TableRow key={`${param.name}-${index}`}>
									<TableCell className="font-mono">{param.name}</TableCell>
									<TableCell>{schema && getDisplayType(schema)}</TableCell>

									<TableCell className="text-muted-foreground">
										{param.description || '-'}
										{param.deprecated && (
											<Badge variant="outline" className="ml-2">
												Deprecated
											</Badge>
										)}
									</TableCell>

									<TableCell className="text-center">
										{param.required ? (
											<Badge variant="default">Yes</Badge>
										) : (
											<span className="text-muted-foreground">No</span>
										)}
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>
		</>
	);
};

export default ParametersTable;
