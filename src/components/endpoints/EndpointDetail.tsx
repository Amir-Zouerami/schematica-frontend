import { useToast } from '@/hooks/use-toast';
import React, { useState, useMemo } from 'react';
import { useProject } from '@/hooks/api/useProject';
import { usePermissions } from '@/hooks/usePermissions';
import { useUpdateEndpoint } from '@/hooks/api/useEndpoints';
import { isRefObject, resolveRef, deeplyResolveReferences, formatDate } from '@/utils/schemaUtils';
import { OperationObject, OpenAPISpec, ParameterObject, ReferenceObject, RequestBodyObject } from '@/types/types';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import EndpointForm from './EndpointForm';
import NotesSection from './DetailTabs/NotesSection';
import ResponsesTabContent from './DetailTabs/ResponsesTabContent';
import ParametersTabContent from './DetailTabs/ParametersTabContent';
import RequestBodyTabContent from './DetailTabs/RequestBodyTabContent';

interface EndpointDetailProps {
	path: string;
	method: string;
	operation: OperationObject | ReferenceObject;
	openApiSpec: OpenAPISpec;
	projectId: string;
	endpointId: string;
}

const EndpointDetail: React.FC<EndpointDetailProps> = ({
	path: initialPath,
	method: initialMethod,
	operation: initialOperationOrRef,
	openApiSpec,
	projectId,
	endpointId,
}) => {
	const { isProjectOwner } = usePermissions();
	const { toast } = useToast();
	const { data: project } = useProject(projectId);
	const [isEditMode, setIsEditMode] = useState(false);
	const updateEndpointMutation = useUpdateEndpoint();

	const operation = useMemo(() => {
		if (!initialOperationOrRef) {
			return { summary: 'Error: Operation data unavailable' } as OperationObject;
		}

		const op = isRefObject(initialOperationOrRef) ? resolveRef(initialOperationOrRef.$ref, openApiSpec) : initialOperationOrRef;

		if (!op || isRefObject(op)) {
			return {
				summary: `Error: Unresolved op ${isRefObject(initialOperationOrRef) ? initialOperationOrRef.$ref : ''}`,
			} as OperationObject;
		}

		return deeplyResolveReferences<OperationObject>(op as OperationObject, openApiSpec);
	}, [initialOperationOrRef, openApiSpec]);

	const pathParams = useMemo(
		() => (operation.parameters?.filter(p => !isRefObject(p) && p.in === 'path') as ParameterObject[]) || [],
		[operation.parameters],
	);

	const queryParams = useMemo(
		() => (operation.parameters?.filter(p => !isRefObject(p) && p.in === 'query') as ParameterObject[]) || [],
		[operation.parameters],
	);

	const headerParams = useMemo(
		() => (operation.parameters?.filter(p => !isRefObject(p) && p.in === 'header') as ParameterObject[]) || [],
		[operation.parameters],
	);

	const [activeTab, setActiveTab] = useState<string>('headerParams');

	const resolvedRequestBody = useMemo(() => operation.requestBody as RequestBodyObject | null, [operation.requestBody]);
	const responseObjects = useMemo(() => operation.responses, [operation.responses]);

	const appMetadata = operation['x-app-metadata'];
	const createdBy = appMetadata?.createdBy || 'Unknown';
	const createdAt = formatDate(appMetadata?.createdAt);
	const lastEditedBy = appMetadata?.lastEditedBy;
	const lastEditedAt = appMetadata?.lastEditedAt ? formatDate(appMetadata.lastEditedAt) : null;

	const handleFormSubmit = async (formDataFromForm: {
		path: string;
		method: string;
		operation: OperationObject;
		_lastKnownOperationUpdatedAt?: string;
	}) => {
		const { path: newFormPath, method: newFormMethod, operation: operationFromForm, _lastKnownOperationUpdatedAt } = formDataFromForm;

		try {
			await updateEndpointMutation.mutateAsync({
				projectId,
				originalPath: initialPath,
				originalMethod: initialMethod,
				newPath: newFormPath,
				newMethod: newFormMethod,
				operation: operationFromForm,
				lastKnownOperationUpdatedAt: _lastKnownOperationUpdatedAt,
			});

			toast({ title: 'Endpoint updated', description: 'The endpoint has been updated successfully' });
			setIsEditMode(false);
		}
		catch (error: any) {
			if (error && typeof error.error === 'string' && error.status !== undefined) {
				if (error.status !== 409) {
					toast({
						title: 'Update Failed',
						description: error.error || 'Failed to update endpoint',
						variant: 'destructive',
					});
				}
			}
			else {
				toast({
					title: 'Client Error',
					description: (error as Error).message || 'An unexpected client-side error occurred.',
					variant: 'destructive',
				});
			}
			throw error;
		}
	};

	if (isEditMode && isProjectOwner(project)) {
		return (
			<Dialog
				open={isEditMode}
				onOpenChange={openState => {
					if (!openState && !updateEndpointMutation.isPending) setIsEditMode(false);
				}}
			>
				<DialogContent className="max-w-4xl w-[95vw] md:w-[90vw] lg:w-[80vw] xl:w-[70vw] p-0 max-h-[95vh] flex flex-col">
					<EndpointForm
						projectId={projectId}
						initialEndpoint={{ path: initialPath, method: initialMethod, operation: operation }}
						onClose={() => setIsEditMode(false)}
						onSubmit={handleFormSubmit}
						openApiSpec={openApiSpec}
					/>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<div className="px-4 py-2" id={endpointId}>
			<div className="flex justify-between items-center gap-4 mb-4 mt-3">
				<div>
					<h3 className="text-lg font-semibold">{operation.summary || `${initialMethod.toUpperCase()} ${initialPath}`}</h3>
					{operation.description && (
						<p className="text-muted-foreground whitespace-pre-line mt-1 max-w-[900px]" style={{ unicodeBidi: 'plaintext' }}>
							{operation.description}
						</p>
					)}
				</div>

				<div className="flex flex-col justify-center items-start space-y-2 sm:space-y-3 flex-shrink-0">
					<div className="flex items-center space-x-2 text-sm text-muted-foreground">
						<Avatar className="h-6 w-6">
							<AvatarImage src={createdBy !== 'Unknown' ? `/profile-pictures/${createdBy}.png` : undefined} alt={createdBy} />
							<AvatarFallback>{createdBy.substring(0, 2).toUpperCase()}</AvatarFallback>
						</Avatar>

						<span className="text-xs">
							Added by {createdBy} on {createdAt}
						</span>
					</div>

					{lastEditedBy && lastEditedAt && (
						<div className="flex items-center space-x-2 text-sm text-muted-foreground">
							<Avatar className="h-6 w-6">
								<AvatarImage src={lastEditedBy ? `/profile-pictures/${lastEditedBy}.png` : undefined} alt={lastEditedBy} />
								<AvatarFallback>{lastEditedBy.substring(0, 2).toUpperCase()}</AvatarFallback>
							</Avatar>

							<span className="text-xs">
								Last edited by {lastEditedBy} on {lastEditedAt}
							</span>
						</div>
					)}

					{isProjectOwner(project) && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsEditMode(true)}
							className="mt-2 w-full"
							disabled={updateEndpointMutation.isPending}
						>
							Edit Endpoint
						</Button>
					)}
				</div>
			</div>

			<div>
				<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
					<TabsList>
						<TabsTrigger value="headerParams">Headers</TabsTrigger>
						<TabsTrigger value="queryParams">Query Params</TabsTrigger>
						<TabsTrigger value="pathParams">Path Params</TabsTrigger>
						<TabsTrigger value="requestBody">Request Body</TabsTrigger>
						<TabsTrigger value="responses">Responses</TabsTrigger>
						<TabsTrigger value="notes">Notes ({operation['x-app-metadata']?.notes?.length || 0})</TabsTrigger>
					</TabsList>

					<TabsContent value="headerParams" className="space-y-6">
						<ParametersTabContent parameters={headerParams} openApiSpec={openApiSpec} paramTypeLabel="Headers" />
					</TabsContent>

					<TabsContent value="queryParams" className="space-y-6">
						<ParametersTabContent parameters={queryParams} openApiSpec={openApiSpec} paramTypeLabel="Query Params" />
					</TabsContent>

					<TabsContent value="pathParams" className="space-y-6">
						<ParametersTabContent parameters={pathParams} openApiSpec={openApiSpec} paramTypeLabel="Path Params" />
					</TabsContent>

					<TabsContent value="requestBody" className="space-y-4">
						<RequestBodyTabContent requestBody={resolvedRequestBody} openApiSpec={openApiSpec} />
					</TabsContent>

					<TabsContent value="responses" className="space-y-6">
						<ResponsesTabContent responses={responseObjects} openApiSpec={openApiSpec} />
					</TabsContent>

					<TabsContent value="notes">
						<NotesSection projectId={projectId} path={initialPath} method={initialMethod} operation={operation} />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
};

export default EndpointDetail;
