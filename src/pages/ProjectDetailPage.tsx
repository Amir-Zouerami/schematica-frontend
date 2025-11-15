import CurlConverter from '@/components/endpoints/CurlConverter';
import ChangelogTabContent from '@/components/endpoints/DetailTabs/ChangelogTabContent';
import EndpointsList from '@/components/endpoints/EndpointsList';
import OpenApiEditor from '@/components/openapi/OpenApiEditor';
import ProjectAccessForm from '@/components/projects/ProjectAccessForm';
import ProjectForm from '@/components/projects/ProjectForm';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useOpenApiSpec, useProject } from '@/hooks/api/useProject';
import { useDeleteProject } from '@/hooks/api/useProjects';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { ApiError } from '@/utils/api';
import {
	convertOpenApiToPostmanCollection,
	convertToYaml,
	sanitizeOpenApiSpecForDownload,
} from '@/utils/openApiUtils';
import { Download, Edit3, SquareArrowOutUpRight, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ProjectDetailPage = () => {
	const { projectId, endpointId } = useParams<{ projectId: string; endpointId?: string }>();
	const navigate = useNavigate();
	const { toast } = useToast();
	const { isProjectOwner } = usePermissions();

	const { data: project, isLoading: projectLoading, error: projectError } = useProject(projectId);
	const { data: openApiSpec, isLoading: specLoading } = useOpenApiSpec(projectId);
	const deleteProjectMutation = useDeleteProject();

	const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isOpenApiEditorOpen, setIsOpenApiEditorOpen] = useState(false);
	const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);

	const isLoading = projectLoading || specLoading;

	const handleEditProject = () => setIsEditProjectModalOpen(true);
	const handleDeleteProject = () => setIsDeleteDialogOpen(true);

	const confirmDeleteProject = async () => {
		if (!projectId) return;
		try {
			await deleteProjectMutation.mutateAsync(projectId);
			toast({
				title: 'Project Deleted',
				description: 'The project has been deleted successfully',
			});
			navigate('/');
		} catch (err) {
			const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete project';
			toast({ title: 'Delete Failed', description: errorMessage, variant: 'destructive' });
		} finally {
			setIsDeleteDialogOpen(false);
		}
	};

	const downloadFileHelper = (content: string, filename: string, contentType: string) => {
		const blob = new Blob([content], { type: contentType });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const handleDownloadOpenApiSpecJson = () => {
		if (!openApiSpec) {
			toast({
				title: 'Download Error',
				description: 'OpenAPI data is not loaded.',
				variant: 'destructive',
			});
			return;
		}
		const sanitizedSpec = sanitizeOpenApiSpecForDownload(openApiSpec);
		let specString;
		try {
			specString = JSON.stringify(sanitizedSpec, null, 2);
		} catch (err) {
			toast({
				title: 'Download Error',
				description: 'Could not prepare data for download.',
				variant: 'destructive',
			});
			return;
		}
		const projectNameForFile = project?.name
			? project.name.replace(/\s+/g, '_').toLowerCase()
			: projectId;
		downloadFileHelper(specString, `${projectNameForFile}.openapi.json`, 'application/json');
		toast({ title: 'Download Started', description: 'Sanitized OpenAPI JSON is downloading.' });
	};

	const handleDownloadOpenApiSpecYaml = () => {
		if (!openApiSpec) {
			toast({
				title: 'Download Error',
				description: 'OpenAPI data not loaded.',
				variant: 'destructive',
			});
			return;
		}

		const sanitizedSpec = sanitizeOpenApiSpecForDownload(openApiSpec);
		let specString;

		try {
			specString = convertToYaml(sanitizedSpec);
		} catch (err) {
			toast({
				title: 'Download Error',
				description: 'Could not prepare YAML data for download.',
				variant: 'destructive',
			});
			return;
		}

		const projectNameForFile = project?.name
			? project.name.replace(/\s+/g, '_').toLowerCase()
			: projectId;
		downloadFileHelper(specString, `${projectNameForFile}.openapi.yaml`, 'application/x-yaml');
		toast({ title: 'Download Started', description: 'Sanitized OpenAPI YAML is downloading.' });
	};

	const handleDownloadPostmanCollection = () => {
		if (!openApiSpec || !project) {
			return;
		}

		const postmanCollection = convertOpenApiToPostmanCollection(openApiSpec);

		if (!postmanCollection) {
			toast({
				title: 'Conversion Failed',
				description: 'Could not convert to Postman collection.',
				variant: 'destructive',
			});
			return;
		}

		let collectionString;

		try {
			collectionString = JSON.stringify(postmanCollection, null, 2);
		} catch (err) {
			toast({
				title: 'Download Error',
				description: 'Could not prepare Postman data.',
				variant: 'destructive',
			});
			return;
		}

		const collectionNameForFile = (project?.name || 'api-collection')
			.replace(/[^a-z0-9_.-]/gi, '_')
			.toLowerCase();

		downloadFileHelper(
			collectionString,
			`${collectionNameForFile}.postman_collection.json`,
			'application/json',
		);
		toast({ title: 'Download Started', description: 'Postman collection is downloading.' });
	};

	if (isLoading) {
		return (
			<div className="space-y-6 p-4 md:p-6 lg:p-8">
				<div className="flex items-center justify-between">
					<Skeleton className="h-10 w-3/5" />
					<Skeleton className="h-9 w-24" />
				</div>
				<Skeleton className="h-16 w-full" />
				<Skeleton className="h-10 w-full" />
				<div className="space-y-4 mt-8">
					<Skeleton className="h-8 w-1/3" />
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-24 w-full" />
				</div>
			</div>
		);
	}

	if (projectError || !project) {
		return (
			<div className="text-center py-10 px-4">
				<h2 className="text-2xl font-bold text-red-500 mb-4">Error Loading Project</h2>
				<p className="text-muted-foreground mb-6">
					{projectError instanceof ApiError
						? projectError.message
						: `An error occurred or the project with ID ${projectId} was not found.`}
				</p>
				<Button onClick={() => navigate('/')}>Back to Projects</Button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* ... project header and links ... */}
			<div className="flex flex-col md:flex-row gap-4 md:items-center justify-between mt-4 mb-12">
				<div>
					<h1
						className="text-3xl font-bold text-gradient"
						style={{ unicodeBidi: 'plaintext' }}
					>
						{project.name}
					</h1>
					{typeof project.description === 'string' && project.description && (
						<p
							className="text-muted-foreground mt-3 whitespace-pre-line max-w-[1200px]"
							style={{ unicodeBidi: 'plaintext' }}
						>
							{project.description}
						</p>
					)}
				</div>
				<div className="flex flex-col sm:flex-row md:flex-col gap-2 self-start md:self-center flex-shrink-0">
					{isProjectOwner(project) && (
						<>
							<Button
								variant="outline"
								className="w-full sm:w-auto md:w-full"
								onClick={() => setIsAccessModalOpen(true)}
							>
								<Users className="h-4 w-4 mr-2" /> Manage Access
							</Button>
							<Button
								variant="outline"
								className="w-full sm:w-auto md:w-full"
								onClick={handleEditProject}
							>
								<Edit3 className="h-4 w-4 mr-2" /> Edit Project
							</Button>
							<Button
								variant="destructive"
								className="w-full sm:w-auto md:w-full"
								onClick={handleDeleteProject}
							>
								<Trash2 className="h-4 w-4 mr-2" /> Delete Project
							</Button>
						</>
					)}
				</div>
			</div>
			{typeof project.serverUrl === 'string' && project.serverUrl && (
				<div className="bg-secondary/40 rounded-lg p-4">
					<div className="text-sm text-muted-foreground mb-1">Base Server URL:</div>
					<code className="font-mono text-sm break-all">{project.serverUrl}</code>
				</div>
			)}
			{project.links && project.links.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{project.links.map((link, index) => (
						<Button
							key={index}
							variant="outline"
							size="sm"
							className="text-xs"
							onClick={() =>
								window.open(
									link.url.startsWith('http') ? link.url : 'https://' + link.url,
									'_blank',
									'noopener,noreferrer',
								)
							}
						>
							<SquareArrowOutUpRight className="h-3 w-3 mr-1.5" /> {link.name}
						</Button>
					))}
				</div>
			)}

			<div className="flex flex-wrap justify-between items-center gap-4 !mt-12">
				<h2 className="text-2xl font-bold text-gradient-green">API Documentation</h2>
				<div className="flex flex-wrap gap-2">
					<Button
						variant="outline"
						onClick={handleDownloadOpenApiSpecJson}
						disabled={!openApiSpec}
					>
						<Download className="h-4 w-4 mr-2" /> OpenAPI (JSON)
					</Button>
					<Button
						variant="outline"
						onClick={handleDownloadOpenApiSpecYaml}
						disabled={!openApiSpec}
					>
						<Download className="h-4 w-4 mr-2" /> OpenAPI (YAML)
					</Button>
					<Button
						variant="outline"
						onClick={handleDownloadPostmanCollection}
						disabled={!openApiSpec}
					>
						<Download className="h-4 w-4 mr-2" /> Postman
					</Button>
					{isProjectOwner(project) && (
						<Button
							variant="outline"
							onClick={() => setIsOpenApiEditorOpen(true)}
							disabled={!isProjectOwner(project)}
						>
							<Edit3 className="h-4 w-4 mr-2" /> Edit Open API
						</Button>
					)}
				</div>
			</div>

			<Tabs defaultValue="endpoints" className="space-y-4">
				<TabsList>
					<TabsTrigger value="endpoints">Endpoints</TabsTrigger>
					<TabsTrigger value="changelog">Changelog</TabsTrigger>
				</TabsList>
				<TabsContent value="endpoints">
					{isProjectOwner(project) && openApiSpec && (
						<div className="space-y-6 mb-6">
							<CurlConverter projectId={projectId || ''} openApiSpec={openApiSpec} />
						</div>
					)}
					{openApiSpec ? (
						<EndpointsList
							openApiSpec={openApiSpec}
							projectId={projectId || ''}
							endpointId={endpointId}
						/>
					) : (
						!isLoading && (
							<p className="text-muted-foreground text-center py-8">
								No API specification loaded for this project. Admins can import one
								using the "Edit Open API" button.
							</p>
						)
					)}
				</TabsContent>
				<TabsContent value="changelog">
					<ChangelogTabContent projectId={projectId || ''} />
				</TabsContent>
			</Tabs>

			{isEditProjectModalOpen && (
				<ProjectForm
					open={isEditProjectModalOpen}
					onClose={() => setIsEditProjectModalOpen(false)}
					project={project}
				/>
			)}
			{isAccessModalOpen && (
				<ProjectAccessForm
					project={project}
					isOpen={isAccessModalOpen}
					onClose={() => setIsAccessModalOpen(false)}
				/>
			)}
			{isOpenApiEditorOpen && project && (
				<OpenApiEditor
					projectId={projectId || ''}
					openApi={openApiSpec || {}}
					projectUpdatedAt={project.updatedAt}
					isOpen={isOpenApiEditorOpen}
					onClose={() => setIsOpenApiEditorOpen(false)}
				/>
			)}
			{isDeleteDialogOpen && project && (
				<AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
					<AlertDialogContent className="max-w-3xl">
						<AlertDialogHeader>
							<AlertDialogTitle>Are you sure?</AlertDialogTitle>
							<AlertDialogDescription className="py-1 leading-6">
								This will permanently delete the project "{project.name}" and all of
								its endpoints. This action cannot be undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={deleteProjectMutation.isPending}>
								Cancel
							</AlertDialogCancel>
							<AlertDialogAction
								onClick={confirmDeleteProject}
								disabled={deleteProjectMutation.isPending}
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							>
								{deleteProjectMutation.isPending ? 'Deleting...' : 'Delete'}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}
		</div>
	);
};

export default ProjectDetailPage;
