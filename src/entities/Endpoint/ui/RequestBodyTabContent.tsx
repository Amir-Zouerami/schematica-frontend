import EmptyEndpointMessage from '@/components/general/EmptyEndpointMessage';
import SchemaDisplay from '@/entities/Endpoint/ui/SchemaDisplay';
import { MediaTypeObject, OpenAPISpec, RequestBodyObject } from '@/shared/types/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';

interface RequestBodyTabContentProps {
	requestBody: RequestBodyObject | null;
	openApiSpec: OpenAPISpec;
}

const RequestBodyTabContent = ({ requestBody, openApiSpec }: RequestBodyTabContentProps) => {
	const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});

	useEffect(() => {
		const initialOpenState: Record<string, boolean> = {};
		if (requestBody && requestBody.content) {
			Object.keys(requestBody.content).forEach((contentType, index) => {
				initialOpenState[`request-${contentType}-${index}`] = true;
			});
		}
		setOpenCollapsibles(initialOpenState);
	}, [requestBody]);

	const handleCollapsibleChange = (id: string, isOpen: boolean) => {
		setOpenCollapsibles((prev) => ({ ...prev, [id]: isOpen }));
	};

	if (!requestBody || !requestBody.content || Object.keys(requestBody.content).length === 0) {
		return <EmptyEndpointMessage type="Request Body" />;
	}

	return (
		<div className="space-y-4">
			{requestBody.description && (
				<p className="text-sm text-muted-foreground mb-3">{requestBody.description}</p>
			)}

			<p className="text-sm mb-3">
				<span className="font-medium text-muted-foreground">Required:</span>{' '}
				{requestBody.required ? (
					<span className="font-semibold text-pink-500">Yes</span>
				) : (
					<span className="text-foreground">No</span>
				)}
			</p>

			{Object.entries(requestBody.content).map(([contentType, mediaTypeUntyped], index) => {
				const mediaType = mediaTypeUntyped as MediaTypeObject;
				const collapsibleId = `request-${contentType}-${index}`;
				const isOpen = !!openCollapsibles[collapsibleId];

				return (
					<Collapsible
						key={collapsibleId}
						className="border border-border rounded-lg overflow-hidden"
						open={isOpen}
						onOpenChange={(open) => handleCollapsibleChange(collapsibleId, open)}
					>
						<CollapsibleTrigger className="flex items-center justify-between w-full bg-card px-4 py-3 hover:bg-secondary/30 transition-colors rounded-t-lg data-[state=open]:border-b data-[state=open]:border-border">
							<span className="font-medium text-foreground">
								Content-Type: <code className="text-foreground">{contentType}</code>
							</span>
							<ChevronDown
								className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
							/>
						</CollapsibleTrigger>

						<CollapsibleContent className="p-4 bg-background/50 rounded-b-lg">
							<SchemaDisplay
								schema={mediaType.schema || {}}
								example={mediaType.example}
								examples={mediaType.examples}
								openApiSpec={openApiSpec}
							/>
						</CollapsibleContent>
					</Collapsible>
				);
			})}
		</div>
	);
};

export default RequestBodyTabContent;
