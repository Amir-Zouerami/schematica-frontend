import SchemaViewer from './SchemaViewer';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import React, { useState, useMemo } from 'react';
import SimpleCodeBlock from '../ui/SimpleCodeBlock';
import { Card, CardContent } from '@/components/ui/card';
import { deeplyResolveReferences, isRefObject, resolveRef } from '@/utils/schemaUtils';
import { SchemaObject, ReferenceObject, OpenAPISpec, ExampleObject } from '@/types/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SchemaDisplayProps {
	schema: SchemaObject | ReferenceObject;
	example?: any;
	examples?: Record<string, ExampleObject | ReferenceObject>;
	openApiSpec: OpenAPISpec;
	title?: string;
}

const SchemaDisplay: React.FC<SchemaDisplayProps> = ({
	schema: initialSchema,
	example: initialExample,
	examples: initialExamples,
	openApiSpec,
	title,
}) => {
	const [showJson, setShowJson] = useState(false);
	const [isExampleOpen, setIsExampleOpen] = useState(false);

	const schema = useMemo(() => {
		return deeplyResolveReferences<SchemaObject | ReferenceObject>(initialSchema, openApiSpec);
	}, [initialSchema, openApiSpec]);

	const displayExample = useMemo(() => {
		if (initialExample !== undefined) {
			return deeplyResolveReferences<any>(initialExample, openApiSpec);
		}

		const resolvedInitialSchema = isRefObject(initialSchema) ? resolveRef(initialSchema.$ref, openApiSpec) : initialSchema;

		if (
			resolvedInitialSchema &&
			typeof resolvedInitialSchema === 'object' &&
			!isRefObject(resolvedInitialSchema) &&
			resolvedInitialSchema.example !== undefined
		) {
			return deeplyResolveReferences<any>(resolvedInitialSchema.example, openApiSpec);
		}

		return undefined;
	}, [initialExample, initialSchema, openApiSpec]);

	const resolvedExamples = useMemo(() => {
		if (!initialExamples) return undefined;
		const resEx: Record<string, any> = {};

		for (const key in initialExamples) {
			const exOrRef = initialExamples[key];
			let exampleValue;

			if (isRefObject(exOrRef)) {
				const resolvedExampleObj = resolveRef(exOrRef.$ref, openApiSpec);
				exampleValue = resolvedExampleObj?.value !== undefined ? resolvedExampleObj.value : resolvedExampleObj;
			}
			else {
				exampleValue = exOrRef.value !== undefined ? exOrRef.value : exOrRef;
			}

			resEx[key] = deeplyResolveReferences<any>(exampleValue, openApiSpec);
		}

		return resEx;
	}, [initialExamples, openApiSpec]);

	const schemaJson = useMemo(() => {
		if (initialSchema && typeof initialSchema === 'object' && Object.keys(initialSchema).length === 0 && !isRefObject(initialSchema)) {
			return JSON.stringify({}, null, 2);
		}

		const resolvedForJson = deeplyResolveReferences(initialSchema, openApiSpec);
		if (typeof resolvedForJson !== 'object' || resolvedForJson === null) {
			return JSON.stringify(initialSchema, null, 2);
		}

		return JSON.stringify(resolvedForJson, null, 2);
	}, [initialSchema, openApiSpec]);

	const isSchemaEffectivelyAReferenceOrError =
		isRefObject(initialSchema) &&
		(isRefObject(schema) || (typeof schema === 'object' && schema !== null && ('error' in schema || 'circular' in schema)));

	return (
		<Card className="mt-4 border border-border bg-muted/30 shadow-none">
			<CardContent className="p-4 space-y-4">
				<div className="flex justify-end items-center mb-1">
					<Button variant="outline" size="sm" onClick={() => setShowJson(!showJson)}>
						{showJson ? 'Interactive View' : 'JSON View'}
					</Button>
				</div>

				<div className="border border-border/50 rounded p-3 bg-background">
					{showJson ||
					isSchemaEffectivelyAReferenceOrError ||
					(typeof schema === 'object' && Object.keys(schema).length === 0 && !isRefObject(schema) && schema.type !== 'object') ? (
							<SimpleCodeBlock code={schemaJson} language="json" />
						) : (
							<SchemaViewer
								schema={schema as SchemaObject}
								openApiSpec={openApiSpec}
								depth={0}
								isNested={false}
								showFullJsonButton={true}
							/>
						)}
				</div>

				{displayExample !== undefined && (
					<Collapsible
						open={isExampleOpen}
						onOpenChange={setIsExampleOpen}
						className="border border-border rounded-lg overflow-hidden mt-4"
					>
						<CollapsibleTrigger className="flex items-center justify-between w-full bg-muted/50 px-4 py-2 hover:bg-muted transition-colors text-sm font-medium">
							Example
							<ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExampleOpen ? 'transform rotate-180' : ''}`} />
						</CollapsibleTrigger>

						<CollapsibleContent className="p-0">
							<div className="bg-background">
								<SimpleCodeBlock
									code={typeof displayExample === 'string' ? displayExample : JSON.stringify(displayExample, null, 2)}
									language={typeof displayExample === 'object' ? 'json' : 'text'}
								/>
							</div>
						</CollapsibleContent>
					</Collapsible>
				)}

				{resolvedExamples &&
					Object.entries(resolvedExamples).map(([key, exValue], idx) => (
						<Collapsible key={key} className="border border-border rounded-lg overflow-hidden mt-4">
							<CollapsibleTrigger className="flex items-center justify-between w-full bg-muted/50 px-4 py-2 hover:bg-muted transition-colors text-sm font-medium">
								Example: {key}
								<ChevronDown className={`h-4 w-4 transition-transform duration-200`} />
							</CollapsibleTrigger>

							<CollapsibleContent className="p-0">
								<div className="bg-background">
									<SimpleCodeBlock
										code={typeof exValue === 'string' ? exValue : JSON.stringify(exValue, null, 2)}
										language={typeof exValue === 'object' ? 'json' : 'text'}
									/>
								</div>
							</CollapsibleContent>
						</Collapsible>
					))}
			</CardContent>
		</Card>
	);
};

export default SchemaDisplay;
