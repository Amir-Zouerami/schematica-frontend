import { ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import SchemaDisplay from '../SchemaDisplay';
import { getStatusCodeClass } from '@/utils/schemaUtils';
import EmptyEndpointMessage from '@/components/general/EmptyEndpointMessage';
import { OpenAPISpec, ResponseObject, MediaTypeObject, OperationObject } from '@/types/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ResponsesTabContentProps {
	responses: OperationObject['responses'] | undefined;
	openApiSpec: OpenAPISpec;
}

const ResponsesTabContent = ({ responses, openApiSpec }: ResponsesTabContentProps) => {
	const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});

	useEffect(() => {
		const initialOpenState: Record<string, boolean> = {};

		if (responses) {
			Object.entries(responses).forEach(([statusCode, responseItemUntyped], responseIndex) => {
				const responseItem = responseItemUntyped as ResponseObject;
				const mainResponseCollapsibleId = `response-${statusCode}-main-${responseIndex}`;
				initialOpenState[mainResponseCollapsibleId] = false;

				if (responseItem && responseItem.content) {
					Object.keys(responseItem.content).forEach((contentType, ctIndex) => {
						const mediaTypeCollapsibleId = `response-${statusCode}-${contentType}-${ctIndex}`;
						initialOpenState[mediaTypeCollapsibleId] = true;
					});
				}
			});
		}

		setOpenCollapsibles(initialOpenState);
	}, [responses]);

	const handleCollapsibleChange = (id: string, isOpen: boolean) => {
		setOpenCollapsibles(prev => ({ ...prev, [id]: isOpen }));
	};

	if (!responses || Object.entries(responses).length === 0) {
		return <EmptyEndpointMessage type="Responses" />;
	}

	return (
		<div className="space-y-4">
			{Object.entries(responses).map(([statusCode, responseItemUntyped], responseIndex) => {
				const responseItem = responseItemUntyped as ResponseObject;
				const mainCollapsibleId = `response-${statusCode}-main-${responseIndex}`;
				const isOpen = !!openCollapsibles[mainCollapsibleId];

				if (!responseItem || typeof responseItem !== 'object' || !responseItem.description) {
					return (
						<div key={mainCollapsibleId} className="p-4 border border-border rounded-lg text-muted-foreground">
							Invalid response structure for status code {statusCode}.
						</div>
					);
				}

				const statusCodeColorClass = getStatusCodeClass(statusCode);

				return (
					<Collapsible
						key={mainCollapsibleId}
						className="border border-border rounded-lg overflow-hidden"
						open={isOpen}
						onOpenChange={open => handleCollapsibleChange(mainCollapsibleId, open)}
					>
						<CollapsibleTrigger className="flex items-center justify-between w-full bg-card px-4 py-3 hover:bg-secondary/30 transition-colors rounded-t-lg data-[state=open]:border-b data-[state=open]:border-border">
							<div className="flex items-center">
								<span className={`font-mono text-lg font-bold ${statusCodeColorClass} mr-3`}>{statusCode}</span>
								<span className="text-foreground font-medium">{responseItem.description}</span>
							</div>
							<ChevronDown
								className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
							/>
						</CollapsibleTrigger>

						<CollapsibleContent className="p-4 bg-background/50 rounded-b-lg">
							{responseItem.content && Object.keys(responseItem.content).length > 0 ? (
								Object.entries(responseItem.content).map(([contentType, mediaTypeUntyped], ctIndex) => {
									const mediaType = mediaTypeUntyped as MediaTypeObject;
									const mediaTypeCollapsibleId = `response-${statusCode}-${contentType}-${ctIndex}`;
									const isMediaTypeOpen = !!openCollapsibles[mediaTypeCollapsibleId];

									return (
										<Collapsible
											key={mediaTypeCollapsibleId}
											open={isMediaTypeOpen}
											onOpenChange={open => handleCollapsibleChange(mediaTypeCollapsibleId, open)}
											className="mt-2 mb-4 p-0 border border-dashed border-border/50 rounded-md bg-muted/20 overflow-hidden"
										>
											<CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 hover:bg-muted/50 transition-colors text-sm">
												<h4 className="font-semibold text-muted-foreground">
													Content-Type: <code className="text-foreground">{contentType}</code>
												</h4>
												<ChevronDown
													className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
														isMediaTypeOpen ? 'transform rotate-180' : ''
													}`}
												/>
											</CollapsibleTrigger>

											<CollapsibleContent className="p-3 border-t border-border/50">
												<SchemaDisplay
													schema={mediaType.schema || {}}
													example={mediaType.example}
													examples={mediaType.examples}
													openApiSpec={openApiSpec}
												/>
											</CollapsibleContent>
										</Collapsible>
									);
								})
							) : (
								<p className="text-sm text-muted-foreground italic">No content defined for this response.</p>
							)}
						</CollapsibleContent>
					</Collapsible>
				);
			})}
		</div>
	);
};

export default ResponsesTabContent;
