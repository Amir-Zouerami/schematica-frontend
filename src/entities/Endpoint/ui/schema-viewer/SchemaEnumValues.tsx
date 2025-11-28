import { SchemaObject } from '@/shared/types/types';
import { Badge } from '@/shared/ui/badge';
import React from 'react';

interface SchemaEnumValuesProps {
	schema: SchemaObject;
}

export const SchemaEnumValues: React.FC<SchemaEnumValuesProps> = ({ schema }) => {
	if (!schema.enum || schema.enum.length === 0) return null;

	return (
		<div className="mt-2">
			<div className="text-xs font-medium text-muted-foreground">Enum values:</div>
			<div className="flex flex-wrap gap-1 mt-1">
				{schema.enum.map((value, index) => (
					<Badge key={index} variant="outline" className="text-xs">
						{JSON.stringify(value)}
					</Badge>
				))}
			</div>
		</div>
	);
};
