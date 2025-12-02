import ParametersTabContent from '@/entities/Endpoint/ui/ParametersTabContent';
import RequestBodyTabContent from '@/entities/Endpoint/ui/RequestBodyTabContent';
import ResponsesTabContent from '@/entities/Endpoint/ui/ResponsesTabContent';
import { useNotes } from '@/entities/Note/api/useNotes';
import { NotesModal } from '@/features/note/list-notes/NotesModal';
import NotesSection from '@/features/note/list-notes/NotesSection';
import type {
	OpenAPISpec,
	OperationObject,
	ParameterObject,
	RequestBodyObject,
} from '@/shared/types/types';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Maximize2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';

interface EndpointDetailTabsProps {
	projectId: string;
	endpointId: string;
	operation: OperationObject;
	openApiSpec: OpenAPISpec;
	method: string;
	path: string;
}

const TabScrollContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<div className="h-64 w-full overflow-hidden flex flex-col">
		<ScrollArea className="flex-1 w-full h-full">
			<div className="min-h-64 flex flex-col *:flex-1">{children}</div>
		</ScrollArea>
	</div>
);

export const EndpointDetailTabs: React.FC<EndpointDetailTabsProps> = ({
	projectId,
	endpointId,
	operation,
	openApiSpec,
	method,
	path,
}) => {
	const [activeTab, setActiveTab] = useState('headerParams');
	const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);

	const { data: notes } = useNotes(endpointId);
	const notesCount = notes?.length || 0;

	const pathParams = useMemo(
		() =>
			(operation.parameters?.filter(
				(p) => (p as ParameterObject).in === 'path',
			) as ParameterObject[]) || [],
		[operation.parameters],
	);

	const queryParams = useMemo(
		() =>
			(operation.parameters?.filter(
				(p) => (p as ParameterObject).in === 'query',
			) as ParameterObject[]) || [],
		[operation.parameters],
	);

	const headerParams = useMemo(
		() =>
			(operation.parameters?.filter(
				(p) => (p as ParameterObject).in === 'header',
			) as ParameterObject[]) || [],
		[operation.parameters],
	);

	const resolvedRequestBody = useMemo(
		() => operation.requestBody as RequestBodyObject | null,
		[operation.requestBody],
	);

	const responseObjects = useMemo(() => operation.responses, [operation.responses]);

	return (
		<div>
			<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
				<div className="w-full overflow-x-auto pb-1 no-scrollbar">
					<TabsList className="inline-flex w-auto justify-start">
						<TabsTrigger
							className="cursor-pointer whitespace-nowrap"
							value="headerParams"
						>
							Headers
						</TabsTrigger>

						<TabsTrigger
							className="cursor-pointer whitespace-nowrap"
							value="queryParams"
						>
							Query Params
						</TabsTrigger>

						<TabsTrigger
							className="cursor-pointer whitespace-nowrap"
							value="pathParams"
						>
							Path Params
						</TabsTrigger>

						<TabsTrigger
							className="cursor-pointer whitespace-nowrap"
							value="requestBody"
						>
							Request Body
						</TabsTrigger>

						<TabsTrigger className="cursor-pointer whitespace-nowrap" value="responses">
							Responses
						</TabsTrigger>

						<TabsTrigger
							className="cursor-pointer whitespace-nowrap gap-2"
							value="notes"
						>
							Notes
							{notesCount > 0 && (
								<Badge
									variant="secondary"
									className="h-5 px-1.5 min-w-5 justify-center text-[10px]"
								>
									{notesCount}
								</Badge>
							)}
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="headerParams" className="mt-0" tabIndex={-1}>
					<TabScrollContainer>
						<ParametersTabContent
							parameters={headerParams}
							openApiSpec={openApiSpec}
							paramTypeLabel="Headers"
						/>
					</TabScrollContainer>
				</TabsContent>

				<TabsContent value="queryParams" className="mt-0" tabIndex={-1}>
					<TabScrollContainer>
						<ParametersTabContent
							parameters={queryParams}
							openApiSpec={openApiSpec}
							paramTypeLabel="Query Params"
						/>
					</TabScrollContainer>
				</TabsContent>

				<TabsContent value="pathParams" className="mt-0" tabIndex={-1}>
					<TabScrollContainer>
						<ParametersTabContent
							parameters={pathParams}
							openApiSpec={openApiSpec}
							paramTypeLabel="Path Params"
						/>
					</TabScrollContainer>
				</TabsContent>

				<TabsContent value="requestBody" className="mt-0" tabIndex={-1}>
					<TabScrollContainer>
						<RequestBodyTabContent
							requestBody={resolvedRequestBody}
							openApiSpec={openApiSpec}
						/>
					</TabScrollContainer>
				</TabsContent>

				<TabsContent value="responses" className="mt-0" tabIndex={-1}>
					<TabScrollContainer>
						<ResponsesTabContent
							responses={responseObjects}
							openApiSpec={openApiSpec}
						/>
					</TabScrollContainer>
				</TabsContent>

				<TabsContent value="notes" className="mt-0 relative group" tabIndex={-1}>
					<Button
						variant="ghost"
						size="icon"
						className="absolute top-2 right-4 z-10 opacity-50 hover:opacity-100 bg-background/50 backdrop-blur-sm cursor-pointer"
						onClick={() => setIsNotesModalOpen(true)}
						title="Maximize Notes"
					>
						<Maximize2 className="h-4 w-4" />
					</Button>
					<TabScrollContainer>
						<div className="pt-2">
							<NotesSection projectId={projectId} endpointId={endpointId} />
						</div>
					</TabScrollContainer>
				</TabsContent>
			</Tabs>

			{isNotesModalOpen && (
				<NotesModal
					isOpen={isNotesModalOpen}
					onClose={() => setIsNotesModalOpen(false)}
					projectId={projectId}
					endpointId={endpointId}
					endpointMethod={method}
					endpointPath={path}
				/>
			)}
		</div>
	);
};
