import { useDeleteEndpoint, useUpdateEndpoint } from '@/hooks/api/useEndpoints';
import { useProject } from '@/hooks/api/useProject';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import type { components } from '@/types/api-types';
import { OpenAPISpec, OperationObject, ParameterObject, RequestBodyObject } from '@/types/types';
import { deeplyResolveReferences, formatDate } from '@/utils/schemaUtils';
import React, { useMemo, useState } from 'react';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Link as LinkIcon, Trash2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { ApiError } from '@/utils/api';
import { convertOpenApiToCurl } from '@/utils/openApiUtils';
import NotesSection from './DetailTabs/NotesSection';
import ParametersTabContent from './DetailTabs/ParametersTabContent';
import RequestBodyTabContent from './DetailTabs/RequestBodyTabContent';
import ResponsesTabContent from './DetailTabs/ResponsesTabContent';
import EndpointForm from './EndpointForm';

type EndpointDto = components['schemas']['EndpointDto'];

interface EndpointDetailProps {
	endpoint: EndpointDto;
	openApiSpec: OpenAPISpec;
	projectId: string;
}

const EndpointDetail: React.FC<EndpointDetailProps> = ({ endpoint, openApiSpec, projectId }) => {
	const { isProjectOwner } = usePermissions();
	const { toast } = useToast();
	const location = useLocation();
	const { data: project } = useProject(projectId);
	const [isEditMode, setIsEditMode] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const updateEndpointMutation = useUpdateEndpoint();
	const deleteEndpointMutation = useDeleteEndpoint();

	const operation = useMemo(() => {
		return deeplyResolveReferences<OperationObject>(
			endpoint.operation as OperationObject,
			openApiSpec,
		);
	}, [endpoint.operation, openApiSpec]);

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

	const [activeTab, setActiveTab] = useState<string>('headerParams');
	const resolvedRequestBody = useMemo(
		() => operation.requestBody as RequestBodyObject | null,
		[operation.requestBody],
	);
	const responseObjects = useMemo(() => operation.responses, [operation.responses]);

	const createdBy = endpoint.creator.username || 'Unknown';
	const createdAt = formatDate(endpoint.createdAt);
	const lastEditedBy = endpoint.updatedBy.username;
	const lastEditedAt = formatDate(endpoint.updatedAt);

	const handleFormSubmit = async (formDataFromForm: any) => {
		// This will be implemented in the next step
		console.log('Form data to submit:', formDataFromForm);
		setIsEditMode(false);
	};

	const generateClientSideId = (method: string, path: string): string => {
		return `${method.toLowerCase()}-${path.replace(/^\//, '').replace(/[\/{}]/g, '-')}`;
	};

	const handleShareEndpoint = () => {
		const clientSideId = generateClientSideId(endpoint.method, endpoint.path);
		const url = `${window.location.origin}${location.pathname}#${clientSideId}`;
		navigator.clipboard.writeText(url);
		toast({ title: 'URL Copied', description: 'Link to this endpoint copied.' });
	};

	const handleCopyCurl = () => {
		if (!openApiSpec) return;
		try {
			// **FIX: Correctly check typeof serverUrl**
			const baseUrl =
				typeof project?.serverUrl === 'string'
					? project.serverUrl
					: 'https://api.example.com';
			const curl = convertOpenApiToCurl(
				baseUrl,
				endpoint.path,
				endpoint.method,
				operation,
				openApiSpec,
			);
			navigator.clipboard.writeText(curl);
			toast({ title: 'cURL Copied', description: 'cURL command copied to clipboard.' });
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Could not generate cURL command.',
				variant: 'destructive',
			});
		}
	};

	const handleDeleteEndpoint = async () => {
		try {
			await deleteEndpointMutation.mutateAsync({ projectId, endpointId: endpoint.id });
			toast({
				title: 'Endpoint Deleted',
				description: 'The endpoint has been successfully removed.',
			});
			setIsDeleteDialogOpen(false);
		} catch (err) {
			const errorMessage =
				err instanceof ApiError ? err.message : 'Failed to delete endpoint.';
			toast({ title: 'Delete Failed', description: errorMessage, variant: 'destructive' });
		}
	};

	if (isEditMode && isProjectOwner(project)) {
		return (
			<Dialog open={isEditMode} onOpenChange={setIsEditMode}>
				<DialogContent className="max-w-4xl w-[95vw] md:w-[90vw] lg:w-[80vw] xl:w-[70vw] p-0 max-h-[95vh] flex flex-col">
					<EndpointForm
						projectId={projectId}
						endpoint={endpoint}
						onClose={() => setIsEditMode(false)}
						onSubmit={handleFormSubmit}
						openApiSpec={openApiSpec}
					/>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<div className="px-4 py-2" id={endpoint.id}>
			<div className="flex justify-between items-center gap-4 mb-4 mt-3">
				<div>
					<h3 className="text-lg font-semibold">
						{operation.summary || `${endpoint.method.toUpperCase()} ${endpoint.path}`}
					</h3>
					{operation.description && (
						<p
							className="text-muted-foreground whitespace-pre-line mt-1 max-w-[900px]"
							style={{ unicodeBidi: 'plaintext' }}
						>
							{operation.description}
						</p>
					)}
				</div>
				<div className="flex flex-col justify-center items-start space-y-2 sm:space-y-3 flex-shrink-0">
					<div className="flex items-center space-x-2 text-sm text-muted-foreground">
						<Avatar className="h-6 w-6">
							<AvatarImage
								src={
									typeof endpoint.creator.profileImage === 'string'
										? endpoint.creator.profileImage
										: undefined
								}
								alt={createdBy}
							/>
							<AvatarFallback>
								{createdBy.substring(0, 2).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<span className="text-xs">
							Added by {createdBy} on {createdAt}
						</span>
					</div>
					{lastEditedBy && lastEditedAt && (
						<div className="flex items-center space-x-2 text-sm text-muted-foreground">
							<Avatar className="h-6 w-6">
								<AvatarImage
									src={
										typeof endpoint.updatedBy.profileImage === 'string'
											? endpoint.updatedBy.profileImage
											: undefined
									}
									alt={lastEditedBy}
								/>
								<AvatarFallback>
									{lastEditedBy.substring(0, 2).toUpperCase()}
								</AvatarFallback>
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
						<TabsTrigger value="notes">
							Notes ({operation['x-app-metadata']?.notes?.length || 0})
						</TabsTrigger>
					</TabsList>
					<TabsContent value="headerParams">
						<ParametersTabContent
							parameters={headerParams}
							openApiSpec={openApiSpec}
							paramTypeLabel="Headers"
						/>
					</TabsContent>
					<TabsContent value="queryParams">
						<ParametersTabContent
							parameters={queryParams}
							openApiSpec={openApiSpec}
							paramTypeLabel="Query Params"
						/>
					</TabsContent>
					<TabsContent value="pathParams">
						<ParametersTabContent
							parameters={pathParams}
							openApiSpec={openApiSpec}
							paramTypeLabel="Path Params"
						/>
					</TabsContent>
					<TabsContent value="requestBody">
						<RequestBodyTabContent
							requestBody={resolvedRequestBody}
							openApiSpec={openApiSpec}
						/>
					</TabsContent>
					<TabsContent value="responses">
						<ResponsesTabContent
							responses={responseObjects}
							openApiSpec={openApiSpec}
						/>
					</TabsContent>
					<TabsContent value="notes">
						<NotesSection
							projectId={projectId}
							path={endpoint.path}
							method={endpoint.method}
							operation={operation}
						/>
					</TabsContent>
				</Tabs>
			</div>
			<div className="flex justify-end space-x-2 p-4 bg-secondary/20 border-t border-border -mx-4 -mb-2 mt-4">
				<Button variant="outline" size="sm" onClick={handleShareEndpoint}>
					<LinkIcon className="h-4 w-4 mr-1" /> Share Link
				</Button>
				<Button variant="outline" size="sm" onClick={handleCopyCurl}>
					<Copy className="h-4 w-4 mr-1" /> Copy CURL
				</Button>
				{isProjectOwner(project) && (
					<AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
						<AlertDialogTrigger asChild>
							<Button variant="destructive" size="sm">
								<Trash2 className="h-4 w-4 mr-1" /> Delete Endpoint
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Are you sure?</AlertDialogTitle>
								<AlertDialogDescription>
									This will permanently delete the endpoint "
									{operation.summary ||
										`${endpoint.method.toUpperCase()} ${endpoint.path}`}
									". This action cannot be undone.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									onClick={handleDeleteEndpoint}
									disabled={deleteEndpointMutation.isPending}
								>
									{deleteEndpointMutation.isPending ? 'Deleting...' : 'Delete'}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				)}
			</div>
		</div>
	);
};

export default EndpointDetail;
