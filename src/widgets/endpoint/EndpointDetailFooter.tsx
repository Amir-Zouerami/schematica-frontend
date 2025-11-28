import { useProjectStore } from '@/app/store/useProjectStore';
import { useDeleteEndpoint } from '@/entities/Endpoint/api/useEndpoints';
import { useProject } from '@/entities/Project/api/useProject';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { ApiError } from '@/shared/api/api';
import { convertOpenApiToCurl } from '@/shared/lib/openApiUtils';
import type { OpenAPISpec, OperationObject } from '@/shared/types/types';
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
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { Copy, Link as LinkIcon, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

interface EndpointDetailFooterProps {
	projectId: string;
	endpointId: string;
	endpointPath: string;
	endpointMethod: string;
	operation: OperationObject;
	openApiSpec: OpenAPISpec;
}

export const EndpointDetailFooter: React.FC<EndpointDetailFooterProps> = ({
	projectId,
	endpointId,
	endpointPath,
	endpointMethod,
	operation,
	openApiSpec,
}) => {
	const { isProjectOwner } = usePermissions();
	const { data: project } = useProject(projectId);
	const { toast } = useToast();
	const deleteEndpointMutation = useDeleteEndpoint();
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const { activeServerUrl } = useProjectStore();

	const handleShareEndpoint = () => {
		const url = `${window.location.origin}/projects/${projectId}/endpoints/${endpointId}`;
		navigator.clipboard.writeText(url);
		toast({ title: 'URL Copied', description: 'Link to this endpoint copied.' });
	};

	const handleCopyCurl = () => {
		const baseUrl = activeServerUrl || 'https://api.your-server.com';
		try {
			const curl = convertOpenApiToCurl(
				baseUrl,
				endpointPath,
				endpointMethod,
				operation,
				openApiSpec,
			);
			navigator.clipboard.writeText(curl);
			toast({ title: 'cURL Copied', description: `Generated cURL for ${baseUrl}` });
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
			await deleteEndpointMutation.mutateAsync({ projectId, endpointId });
			toast({
				title: 'Endpoint Deleted',
				description: 'The endpoint has been successfully removed.',
			});
			setIsDeleteDialogOpen(false);
		} catch (err) {
			const description =
				err instanceof ApiError ? err.message : 'Failed to delete the endpoint.';
			toast({ title: 'Delete Failed', description, variant: 'destructive' });
		}
	};

	return (
		<div className="flex flex-wrap justify-end gap-2 p-4 bg-secondary/20 border-t border-border -mx-4 -mb-2 mt-4">
			<Button
				variant="outline"
				size="sm"
				onClick={handleShareEndpoint}
				className="cursor-pointer"
			>
				<LinkIcon className="h-4 w-4 mr-1" /> Share Link
			</Button>

			<Button variant="outline" size="sm" onClick={handleCopyCurl} className="cursor-pointer">
				<Copy className="h-4 w-4 mr-1" /> Copy CURL
			</Button>

			{isProjectOwner(project) && (
				<AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
					<AlertDialogTrigger asChild>
						<Button variant="destructive" size="sm" className="cursor-pointer">
							<Trash2 className="h-4 w-4 mr-1" /> Delete Endpoint
						</Button>
					</AlertDialogTrigger>

					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Are you sure?</AlertDialogTitle>
							<AlertDialogDescription>
								This will permanently delete the endpoint "
								{operation.summary ||
									`${endpointMethod.toUpperCase()} ${endpointPath}`}
								". This action cannot be undone.
							</AlertDialogDescription>
						</AlertDialogHeader>

						<AlertDialogFooter>
							<AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleDeleteEndpoint}
								disabled={deleteEndpointMutation.isPending}
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
							>
								{deleteEndpointMutation.isPending ? 'Deleting...' : 'Delete'}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}
		</div>
	);
};
