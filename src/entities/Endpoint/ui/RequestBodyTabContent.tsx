import EmptyEndpointMessage from '@/components/general/EmptyEndpointMessage';
import SchemaDisplay from '@/entities/Endpoint/ui/SchemaDisplay';
import { cn } from '@/shared/lib/utils';
import { MediaTypeObject, OpenAPISpec, RequestBodyObject } from '@/shared/types/types';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/shared/ui/dialog';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { ChevronRight, FileJson, Maximize2 } from 'lucide-react';
import { useState } from 'react';

interface RequestBodyTabContentProps {
	requestBody: RequestBodyObject | null;
	openApiSpec: OpenAPISpec;
}

interface SelectedBody {
	contentType: string;
	mediaType: MediaTypeObject;
}

const RequestBodyTabContent = ({ requestBody, openApiSpec }: RequestBodyTabContentProps) => {
	const [selectedBody, setSelectedBody] = useState<SelectedBody | null>(null);

	if (!requestBody || !requestBody.content || Object.keys(requestBody.content).length === 0) {
		return <EmptyEndpointMessage type="Request Body" />;
	}

	return (
		<>
			<div className="space-y-4">
				{requestBody.description && (
					<p className="text-sm text-muted-foreground mb-3">{requestBody.description}</p>
				)}

				<div className="space-y-2">
					{Object.entries(requestBody.content).map(([contentType, mediaTypeUntyped]) => {
						const mediaType = mediaTypeUntyped as MediaTypeObject;

						return (
							<div
								key={contentType}
								onClick={() => setSelectedBody({ contentType, mediaType })}
								className="group flex items-center justify-between w-full p-3 rounded-md border border-transparent hover:bg-secondary/50 hover:border-border/50 cursor-pointer transition-all duration-200"
							>
								<div className="flex items-center gap-3 overflow-hidden">
									<div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 text-primary">
										<FileJson className="h-4 w-4" />
									</div>

									<span className="font-mono text-sm text-foreground font-medium truncate">
										{contentType}
									</span>
								</div>

								<div className="flex items-center text-muted-foreground/50 group-hover:text-primary transition-colors">
									<Maximize2 className="h-4 w-4 opacity-0 group-hover:opacity-100 mr-2 transition-opacity duration-200" />
									<ChevronRight className="h-4 w-4" />
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Detail Modal */}
			<Dialog open={!!selectedBody} onOpenChange={(open) => !open && setSelectedBody(null)}>
				<DialogContent className="w-screen h-dvh max-w-none rounded-none sm:rounded-xl sm:max-w-[90vw] sm:w-[90vw] sm:h-[90vh] flex flex-col glass-card p-0 gap-0 border-border/50">
					<DialogHeader className="p-6 pb-4 border-b border-border/50 shrink-0">
						<div className="flex items-center gap-3">
							<span className={cn('font-mono text-xl font-bold text-primary')}>
								{selectedBody?.contentType}
							</span>
							<DialogTitle className="text-2xl">Request Body</DialogTitle>
						</div>

						<DialogDescription className="text-base mt-1">
							{requestBody.description || 'Schema definition for this request body.'}
						</DialogDescription>
					</DialogHeader>

					<div className="flex-1 overflow-hidden w-full min-w-0">
						<ScrollArea className="h-full w-full">
							<div className="p-4 md:p-6 min-w-0">
								{selectedBody && (
									<SchemaDisplay
										schema={selectedBody.mediaType.schema || {}}
										example={selectedBody.mediaType.example}
										examples={selectedBody.mediaType.examples}
										openApiSpec={openApiSpec}
									/>
								)}
							</div>
						</ScrollArea>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default RequestBodyTabContent;
