import EmptyEndpointMessage from '@/components/general/EmptyEndpointMessage';
import SchemaDisplay from '@/entities/Endpoint/ui/SchemaDisplay';
import { getStatusCodeClass } from '@/shared/lib/schemaUtils';
import { cn } from '@/shared/lib/utils';
import { MediaTypeObject, OpenAPISpec, ResponseObject } from '@/shared/types/types';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/shared/ui/dialog';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { ChevronRight, Maximize2 } from 'lucide-react';
import { useState } from 'react';

interface ResponsesTabContentProps {
	responses: Record<string, ResponseObject | unknown> | undefined;
	openApiSpec: OpenAPISpec;
}

interface SelectedResponse {
	statusCode: string;
	data: ResponseObject;
}

const ResponsesTabContent = ({ responses, openApiSpec }: ResponsesTabContentProps) => {
	const [selectedResponse, setSelectedResponse] = useState<SelectedResponse | null>(null);

	if (!responses || Object.keys(responses).length === 0) {
		return <EmptyEndpointMessage type="Responses" className="min-h-[200px]" />;
	}

	return (
		<>
			<div className="space-y-2">
				{Object.entries(responses).map(([statusCode, responseItemUntyped]) => {
					const responseItem = responseItemUntyped as ResponseObject;
					const statusCodeColorClass = getStatusCodeClass(statusCode);

					if (
						!responseItem ||
						typeof responseItem !== 'object' ||
						!responseItem.description
					) {
						return null;
					}

					return (
						<div
							key={statusCode}
							onClick={() => setSelectedResponse({ statusCode, data: responseItem })}
							className="group flex items-center justify-between w-full p-3 rounded-md border border-transparent hover:bg-secondary/50 hover:border-border/50 cursor-pointer transition-all duration-200"
						>
							<div className="flex items-center gap-4 overflow-hidden">
								<span
									className={cn(
										'font-mono text-base font-bold w-12 shrink-0',
										statusCodeColorClass,
									)}
								>
									{statusCode}
								</span>

								<span className="text-sm text-muted-foreground font-medium truncate group-hover:text-foreground transition-colors">
									{responseItem.description}
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

			{/* Detail Modal */}
			<Dialog
				open={!!selectedResponse}
				onOpenChange={(open) => !open && setSelectedResponse(null)}
			>
				<DialogContent className="w-screen h-dvh max-w-none rounded-none sm:rounded-xl sm:max-w-[90vw] sm:w-[90vw] sm:h-[90vh] flex flex-col glass-card p-0 gap-0 border-border/50">
					<DialogHeader className="p-6 pb-4 border-b border-border/50 shrink-0">
						<div className="flex items-center gap-3">
							<span
								className={cn(
									'font-mono text-3xl font-bold',
									selectedResponse
										? getStatusCodeClass(selectedResponse.statusCode)
										: '',
								)}
							>
								{selectedResponse?.statusCode}
							</span>

							<DialogTitle className="text-2xl">Response Details</DialogTitle>
						</div>

						<DialogDescription className="text-base mt-1">
							{selectedResponse?.data.description}
						</DialogDescription>
					</DialogHeader>

					<div className="flex-1 overflow-hidden w-full min-w-0">
						<ScrollArea className="h-full w-full">
							<div className="p-4 md:p-6 min-w-0">
								{selectedResponse &&
								selectedResponse.data.content &&
								Object.keys(selectedResponse.data.content).length > 0 ? (
									<Tabs
										defaultValue={Object.keys(selectedResponse.data.content)[0]}
										className="w-full"
									>
										<div className="w-full overflow-x-auto pb-1 mb-6 border-b border-border/50 no-scrollbar">
											<TabsList className="w-auto justify-start flex-nowrap h-auto gap-y-1 bg-transparent p-0 rounded-none">
												{Object.keys(selectedResponse.data.content).map(
													(contentType) => (
														<TabsTrigger
															key={contentType}
															value={contentType}
															className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2 text-base whitespace-nowrap"
														>
															{contentType}
														</TabsTrigger>
													),
												)}
											</TabsList>
										</div>

										{Object.entries(selectedResponse.data.content).map(
											([contentType, mediaTypeUntyped]) => {
												const mediaType =
													mediaTypeUntyped as MediaTypeObject;
												return (
													<TabsContent
														key={contentType}
														value={contentType}
														className="mt-0 focus-visible:ring-0 min-w-0"
													>
														<SchemaDisplay
															schema={mediaType.schema || {}}
															example={mediaType.example}
															examples={mediaType.examples}
															openApiSpec={openApiSpec}
														/>
													</TabsContent>
												);
											},
										)}
									</Tabs>
								) : (
									<div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
										<p className="text-lg">
											No content schema defined for this response.
										</p>
									</div>
								)}
							</div>
						</ScrollArea>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default ResponsesTabContent;
