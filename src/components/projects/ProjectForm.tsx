import { useCreateProject, useUpdateProject } from '@/hooks/api/useProjects';
import { useToast } from '@/hooks/use-toast';
import type { components } from '@/types/api-types';
import { api, ApiError } from '@/utils/api';
import { RefreshCw, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type ProjectDetailDto = components['schemas']['ProjectDetailDto'];
type ProjectLinkDto = components['schemas']['ProjectLinkDto'];
type CreateProjectDto = components['schemas']['CreateProjectDto'];
type UpdateProjectDto = components['schemas']['UpdateProjectDto'];

interface ProjectFormProps {
	open: boolean;
	onClose: () => void;
	project?: ProjectDetailDto;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ open, onClose, project }) => {
	const { toast } = useToast();
	const initialProjectRef = useRef<ProjectDetailDto | undefined>(undefined);
	const hasInitializedFromProps = useRef(false);
	const currentProjectIdentifier = useRef<string | null>(null);

	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [serverUrl, setServerUrl] = useState('');
	const [links, setLinks] = useState<Omit<ProjectLinkDto, 'id'>[]>([{ name: '', url: '' }]);

	const createProjectMutation = useCreateProject();
	const updateProjectMutation = useUpdateProject();
	const isSubmitting = createProjectMutation.isPending || updateProjectMutation.isPending;

	const [lastKnownUpdatedAt, setLastKnownUpdatedAt] = useState<string | undefined>(undefined);
	const [conflictError, setConflictError] = useState<string | null>(null);
	const [serverVersionTimestamp, setServerVersionTimestamp] = useState<string | undefined>(
		undefined,
	);

	const populateFormFields = (currentProjectData: ProjectDetailDto | undefined) => {
		setName(currentProjectData?.name || '');
		setDescription(
			typeof currentProjectData?.description === 'string'
				? currentProjectData.description
				: '',
		);
		setServerUrl(
			typeof currentProjectData?.serverUrl === 'string' ? currentProjectData.serverUrl : '',
		);
		setLinks(
			currentProjectData?.links && currentProjectData.links.length > 0
				? JSON.parse(JSON.stringify(currentProjectData.links))
				: [{ name: '', url: '' }],
		);
		setLastKnownUpdatedAt(currentProjectData?.updatedAt);
	};

	useEffect(() => {
		const newProjectSessionId = project ? project.id : 'new';

		if (open) {
			const shouldFullyReinitialize =
				(!currentProjectIdentifier.current ||
					currentProjectIdentifier.current !== newProjectSessionId ||
					!hasInitializedFromProps.current) &&
				!conflictError;

			if (shouldFullyReinitialize) {
				populateFormFields(project);
				initialProjectRef.current = project;
				currentProjectIdentifier.current = newProjectSessionId;
				hasInitializedFromProps.current = true;
				setConflictError(null);
				setServerVersionTimestamp(undefined);
			}
		} else {
			if (!conflictError) {
				hasInitializedFromProps.current = false;
				currentProjectIdentifier.current = null;
			}
		}
	}, [project, open, conflictError]);

	const handleAddLink = () => {
		setLinks((prevLinks) => [...prevLinks, { name: '', url: '' }]);
	};

	const handleLinkChange = (index: number, field: 'name' | 'url', value: string) => {
		setLinks((prevLinks) => {
			const newLinks = [...prevLinks];
			newLinks[index] = { ...newLinks[index], [field]: value };
			return newLinks;
		});
	};

	const handleRemoveLink = (index: number) => {
		setLinks((prevLinks) => prevLinks.filter((_, i) => i !== index));
	};

	const handleSubmit = async (e?: React.FormEvent, forceOverwrite = false) => {
		if (e) e.preventDefault();

		if (!name.trim()) {
			toast({
				title: 'Validation Error',
				description: 'Project name is required',
				variant: 'destructive',
			});
			return;
		}

		if (!forceOverwrite) {
			setConflictError(null);
			setServerVersionTimestamp(undefined);
		}

		const filteredLinks = links.filter((link) => link.name.trim() && link.url.trim());

		try {
			if (project) {
				if (!lastKnownUpdatedAt && !forceOverwrite) {
					throw new Error('Missing last known update timestamp.');
				}
				const payload: UpdateProjectDto = {
					name,
					description,
					serverUrl,
					links: filteredLinks,
					lastKnownUpdatedAt: forceOverwrite ? undefined : lastKnownUpdatedAt,
				};
				await updateProjectMutation.mutateAsync({
					projectId: project.id,
					projectData: payload,
				});
			} else {
				const payload: CreateProjectDto = {
					name,
					description,
					serverUrl,
					links: filteredLinks,
				};
				await createProjectMutation.mutateAsync(payload);
			}

			toast({
				title: project
					? forceOverwrite
						? 'Project Overwritten'
						: 'Project Updated'
					: 'Project Created',
				description: `${name} has been successfully saved.`,
			});

			onClose();
		} catch (err) {
			const error = err as ApiError;
			if (error?.status === 409 && project) {
				setServerVersionTimestamp((error.errorResponse as any)?.serverUpdatedAt);
				setConflictError(
					error.message || 'This project was updated by someone else. Please review.',
				);
				return;
			}
			const errorMessage =
				error instanceof ApiError ? error.message : 'Failed to save project.';
			toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
		}
	};

	const handleForceSubmitFromDialog = () => {
		handleSubmit(undefined, true);
	};

	const handleRefreshAndDiscardEdits = async () => {
		if (!project?.id) return;

		updateProjectMutation.reset();
		createProjectMutation.reset();
		setConflictError(null);

		try {
			const response = await api.get<ProjectDetailDto>(`/projects/${project.id}`);
			if (response.data) {
				populateFormFields(response.data);
				initialProjectRef.current = response.data;
				currentProjectIdentifier.current = response.data.id;
				hasInitializedFromProps.current = true;
				setLastKnownUpdatedAt(response.data.updatedAt);

				toast({
					title: 'Data Refreshed',
					description:
						'Form has been updated with the latest server data. Your previous edits were discarded.',
				});
			} else {
				throw new Error('Could not fetch latest project data.');
			}
		} catch (err) {
			const errorMessage = err instanceof ApiError ? err.message : 'Refresh failed.';
			toast({ title: 'Refresh Failed', description: errorMessage, variant: 'destructive' });
		}
	};

	const handleCloseConflictDialogOnly = () => {
		setConflictError(null);
		toast({
			title: 'Conflict Noted',
			description:
				'Your edits are still in the form. Please review or copy them before proceeding.',
			duration: 7000,
		});
	};

	return (
		<>
			<Dialog
				open={open}
				onOpenChange={(isOpenDialog) => {
					if (!isOpenDialog && !isSubmitting) onClose();
				}}
			>
				<DialogContent className="max-w-3xl glass-card">
					<DialogHeader>
						<DialogTitle className="text-gradient">
							{project ? 'Edit Project' : 'Create New Project'}
						</DialogTitle>
						<DialogDescription>
							{project
								? 'Update the details of your API documentation project'
								: 'Fill in the details to create a new API documentation project'}
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleSubmit} className="space-y-4 pt-4">
						<div className="space-y-2">
							<Label htmlFor="name">Project Name</Label>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="My API Project"
								required
								disabled={isSubmitting}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="A brief description of your API project"
								rows={3}
								disabled={isSubmitting}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="serverUrl">Base Server URL</Label>
							<Input
								id="serverUrl"
								value={serverUrl}
								onChange={(e) => setServerUrl(e.target.value)}
								placeholder="https://api.example.com"
								disabled={isSubmitting}
							/>
						</div>
						<div className="space-y-2">
							<div className="flex justify-between items-center mb-2">
								<Label>Related Links</Label>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleAddLink}
									disabled={isSubmitting}
								>
									Add Link
								</Button>
							</div>
							{links.map((link, index) => (
								<div key={index} className="flex items-center gap-2">
									<Input
										placeholder="Name (e.g., Staging ENV)"
										value={link.name}
										onChange={(e) =>
											handleLinkChange(index, 'name', e.target.value)
										}
										className="flex-1"
										disabled={isSubmitting}
									/>
									<Input
										placeholder="URL (e.g., https://staging.api.com)"
										value={link.url}
										onChange={(e) =>
											handleLinkChange(index, 'url', e.target.value)
										}
										className="flex-1"
										disabled={isSubmitting}
									/>
									<Button
										type="button"
										variant="destructive"
										size="icon"
										onClick={() => handleRemoveLink(index)}
										className="h-9 w-9"
										disabled={isSubmitting || links.length <= 1}
									>
										<X className="h-4 w-4" />
									</Button>
								</div>
							))}
						</div>
						<DialogFooter className="pt-4">
							<Button
								type="button"
								variant="outline"
								onClick={onClose}
								disabled={isSubmitting}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitting || !!conflictError}>
								{isSubmitting
									? project
										? 'Updating...'
										: 'Creating...'
									: project
										? 'Update Project'
										: 'Create Project'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{conflictError && (
				<AlertDialog
					open={!!conflictError}
					onOpenChange={(isOpenDialog) => {
						if (!isOpenDialog) setConflictError(null);
					}}
				>
					<AlertDialogContent className="max-w-5xl w-[900px]">
						<AlertDialogHeader>
							<AlertDialogTitle>Concurrency Conflict</AlertDialogTitle>
							<AlertDialogDescription>
								<p className="mb-1">{conflictError}</p>
								<div className="my-5 leading-relaxed">
									{serverVersionTimestamp && (
										<p>
											<strong>Last Server Update:</strong>{' '}
											{new Date(serverVersionTimestamp).toLocaleString()}
										</p>
									)}
									<p className="mt-2">
										Your current unsaved edits are still in the form.
									</p>
								</div>
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 mt-2">
							<Button
								className="w-full sm:w-auto"
								variant="outline"
								onClick={handleCloseConflictDialogOnly}
							>
								<X className="mr-2 h-4 w-4" /> Review My Edits
							</Button>
							<Button
								className="w-full sm:w-auto"
								variant="secondary"
								onClick={handleRefreshAndDiscardEdits}
							>
								<RefreshCw className="mr-2 h-4 w-4" /> Refresh & Discard My Edits
							</Button>
							<Button
								className="w-full sm:w-auto"
								variant="destructive"
								onClick={handleForceSubmitFromDialog}
							>
								Force Overwrite With My Edits
							</Button>
						</AlertDialogFooter>
						<AlertDialogCancel
							onClick={handleCloseConflictDialogOnly}
							className="absolute right-4 top-4"
						>
							<X className="h-4 w-4" />
							<span className="sr-only">Close</span>
						</AlertDialogCancel>
					</AlertDialogContent>
				</AlertDialog>
			)}
		</>
	);
};

export default ProjectForm;
