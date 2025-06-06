import React from 'react';
import { Badge } from '@/components/ui/badge';
import { resolveRef } from '@/utils/schemaUtils';
import { ParameterObject, OpenAPISpec, SchemaObject, ReferenceObject } from '@/types/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ParametersTableProps {
	parameters: ParameterObject[];
	openApiSpec: OpenAPISpec;
	isEditable?: boolean;
}

const ParametersTable: React.FC<ParametersTableProps> = ({ parameters, openApiSpec, isEditable = false }) => {
	const getTypeString = (schema?: SchemaObject | ReferenceObject): string => {
		if (!schema) return 'unknown';

		if ('$ref' in schema) {
			const resolved = resolveRef(schema.$ref, openApiSpec);
			return resolved ? getTypeString(resolved as SchemaObject) : 'reference';
		}

		const type = schema.type || 'object';

		if (schema.enum) {
			return `enum (${schema.enum.join(', ')})`;
		}

		if (type === 'array' && schema.items) {
			const itemType = 'type' in schema.items ? schema.items.type : 'object';
			return `array of ${itemType}s`;
		}

		if (schema.format) {
			return `${type} (${schema.format})`;
		}

		return type;
	};

	return (
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
				{parameters.map((param, index) => (
					<TableRow key={`${param.name}-${index}`}>
						<TableCell className="font-mono">{param.name}</TableCell>
						<TableCell>{param.schema && getTypeString(param.schema)}</TableCell>

						<TableCell className="text-muted-foreground">
							{param.description || '-'}
							{param.deprecated && (
								<Badge variant="outline" className="ml-2">
									Deprecated
								</Badge>
							)}
						</TableCell>

						<TableCell className="text-center">
							{param.required ? <Badge variant="default">Yes</Badge> : <span className="text-muted-foreground">No</span>}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
};

export default ParametersTable;
