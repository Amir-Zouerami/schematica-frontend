import SchemaViewer from '@/entities/Endpoint/ui/SchemaViewer';
import { OpenAPISpec, SchemaObject } from '@/shared/types/types';
import React from 'react';

interface SchemaArrayItemsProps {
	schema: SchemaObject;
	openApiSpec: OpenAPISpec;
	depth: number;
	maxDepth: number;
}

export const SchemaArrayItems: React.FC<SchemaArrayItemsProps> = ({
	schema,
	openApiSpec,
	depth,
	maxDepth,
}) => {
	if (!schema.items) {
		return (
			<p className="text-xs text-muted-foreground italic mt-1">
				No item type defined for array.
			</p>
		);
	}

	return (
		<div className="mt-2">
			<div className="text-xs font-medium text-muted-foreground mb-1">Items:</div>
			{depth < maxDepth && (
				<SchemaViewer
					schema={schema.items}
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
