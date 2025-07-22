import { api } from '@/utils/api';
import { Project } from '@/types/types';
import { X, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import React, { useState, useEffect, useRef } from 'react';
import { useCreateProject, useUpdateProject } from '@/hooks/api/useProjects';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import {
	AlertDialog,
	AlertDialogTitle,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
} from '@/components/ui/alert-dialog';

interface ProjectLink {
	name: string;
	url: string;
}

interface ProjectFormProps {
	open: boolean;
	onClose: () => void;
	project?: Project;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ open, onClose, project }) => {
	const { toast } = useToast();
	const initialProjectRef = useRef<Project | undefined>(undefined);
	const hasInitializedFromProps = useRef(false);
	const currentProjectIdentifier = useRef<string | null>(null);

	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [serverUrl, setServerUrl] = useState('');
	const [links, setLinks] = useState<ProjectLink[]>([{ name: '', url: '' }]);

	const createProjectMutation = useCreateProject();
	const updateProjectMutation = useUpdateProject();
	const isSubmitting = createProjectMutation.isPending || updateProjectMutation.isPending;

	const [lastKnownUpdatedAt, setLastKnownUpdatedAt] = useState<string | undefined>(undefined);
	const [conflictError, setConflictError] = useState<string | null>(null);
	const [serverVersionTimestamp, setServerVersionTimestamp] = useState<string | undefined>(undefined);

	const populateFormFields = (currentProjectData: Project | undefined) => {
		setName(currentProjectData?.name || '');
		setDescription(currentProjectData?.description || '');
		setServerUrl(currentProjectData?.serverUrl || '');
		setLinks(
			currentProjectData?.links && currentProjectData.links.length > 0
				? structuredClone(currentProjectData.links)
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
		}
		else {
			if (!conflictError) {
				hasInitializedFromProps.current = false;
				currentProjectIdentifier.current = null;
			}
		}
	}, [project, open, conflictError]);

	const handleAddLink = () => {
		setLinks(prevLinks => [...prevLinks, { name: '', url: '' }]);
	};

	const handleLinkChange = (index: number, field: 'name' | 'url', value: string) => {
		setLinks(prevLinks => {
			const newLinks = [...prevLinks];
			newLinks[index] = { ...newLinks[index], [field]: value };

			return newLinks;
		});
	};

	const handleRemoveLink = (index: number) => {
		setLinks(prevLinks => prevLinks.filter((_, i) => i !== index));
	};

	const handleSubmit = async (e?: React.FormEvent, forceOverwrite = false) => {
		if (e) e.preventDefault();

		if (!name.trim()) {
			toast({ title: 'Validation Error', description: 'Project name is required', variant: 'destructive' });
			return;
		}

		if (!forceOverwrite) {
			setConflictError(null);
			setServerVersionTimestamp(undefined);
		}

		const filteredLinks = links.filter(link => link.name.trim() && link.url.trim());
		const payload: any = {
			name,
			description,
			serverUrl,
			links: filteredLinks,
		};

		if (project && lastKnownUpdatedAt && !forceOverwrite) {
			payload.lastKnownUpdatedAt = lastKnownUpdatedAt;
		}

		try {
			if (project) {
				await updateProjectMutation.mutateAsync({ projectId: project.id, projectData: payload });
			}
			else {
				await createProjectMutation.mutateAsync(payload);
			}

			toast({
				title: project ? (forceOverwrite ? 'Project Overwritten' : 'Project Updated') : 'Project Created',
				description: project
					? `${name} has been successfully ${forceOverwrite ? 'overwritten' : 'updated'}`
					: `${name} has been successfully created`,
			});

			onClose();
		}
		catch (error: any) {
			if (error?.status === 409 && project) {
				setServerVersionTimestamp(error.errorData?.serverUpdatedAt);
				setConflictError(error.error || 'This project was updated by someone else. Please review.');
				return;
			}

			toast({
				title: 'Error',
				description: error?.error || (error instanceof Error ? error.message : 'Failed to save project'),
				variant: 'destructive',
			});
		}
	};

	const handleForceSubmitFromDialog = () => {
		handleSubmit(undefined, true);
	};

	const handleRefreshAndDiscardEdits = async () => {
		if (!project?.id) return;

		const tempSubmittingStateSetter = (val: boolean) =>
			((updateProjectMutation.isPending as any) = (createProjectMutation.isPending as any) = val);

		tempSubmittingStateSetter(true);
		setConflictError(null);

		try {
			const response = await api.get<Project>(`/projects/${project.id}`);
			if (response.data) {
				populateFormFields(response.data);
				initialProjectRef.current = response.data;
				currentProjectIdentifier.current = response.data.id;
				hasInitializedFromProps.current = true;
				setLastKnownUpdatedAt(response.data.updatedAt);

				toast({
					title: 'Data Refreshed',
					description: 'Form has been updated with the latest server data. Your previous edits were discarded.',
				});
			}
			else {
				toast({
					title: 'Refresh Failed',
					description: response.error || 'Could not fetch latest project data.',
					variant: 'destructive',
				});
			}
		}
		catch (error) {
			toast({ title: 'Refresh Failed', description: (error as Error).message, variant: 'destructive' });
		}
		finally {
			tempSubmittingStateSetter(false);
		}
	};

	const handleCloseConflictDialogOnly = () => {
		setConflictError(null);
		toast({
			title: 'Conflict Noted',
			description: 'Your edits are still in the form. Please review or copy them before proceeding.',
			duration: 7000,
		});
	};

	return (
		<>
			<Dialog
				open={open}
				onOpenChange={isOpenDialog => {
					if (!isOpenDialog) {
						if (!isSubmitting) {
							onClose();
						}
					}
				}}
			>
				<DialogContent className="max-w-3xl glass-card">
					<DialogHeader>
						<DialogTitle className="text-gradient">{project ? 'Edit Project' : 'Create New Project'}</DialogTitle>
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
								onChange={e => setName(e.target.value)}
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
								onChange={e => setDescription(e.target.value)}
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
								onChange={e => setServerUrl(e.target.value)}
								placeholder="https://api.example.com"
								disabled={isSubmitting}
							/>
						</div>

						<div className="space-y-2">
							<div className="flex justify-between items-center mb-2">
								<Label>Related Links</Label>
								<Button type="button" variant="outline" size="sm" onClick={handleAddLink} disabled={isSubmitting}>
									Add Link
								</Button>
							</div>
							{links.map((link, index) => (
								<div key={index} className="flex items-center gap-2">
									<Input
										placeholder="Name (e.g., Staging ENV)"
										value={link.name}
										onChange={e => handleLinkChange(index, 'name', e.target.value)}
										className="flex-1"
										disabled={isSubmitting}
									/>

									<Input
										placeholder="URL (e.g., https://staging.api.com)"
										value={link.url}
										onChange={e => handleLinkChange(index, 'url', e.target.value)}
										className="flex-1"
										disabled={isSubmitting}
									/>

									<Button
										type="button"
										variant="destructive"
										size="icon"
										onClick={() => handleRemoveLink(index)}
										className="h-9 w-9"
										disabled={isSubmitting}
									>
										<X className="h-4 w-4" />
									</Button>
								</div>
							))}

							{links.length === 0 && <p className="text-xs text-muted-foreground text-center">No related links added.</p>}
						</div>

						<DialogFooter className="pt-4">
							<Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
								Cancel
							</Button>

							<Button type="submit" disabled={isSubmitting || !!conflictError}>
								{isSubmitting ? (project ? 'Updating...' : 'Creating...') : project ? 'Update Project' : 'Create Project'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{conflictError && (
				<AlertDialog
					open={!!conflictError}
					onOpenChange={isOpenDialog => {
						if (!isOpenDialog) {
							setConflictError(null);
						}
					}}
				>
					<AlertDialogContent className="max-w-screen-lg w-[900px] overflow-y-auto max-h-screen">
						<AlertDialogHeader>
							<AlertDialogTitle>Concurrency Conflict</AlertDialogTitle>
							<AlertDialogDescription>
								<p className="mb-1">{conflictError}</p>
								<div className="my-5 leading-relaxed">
									{serverVersionTimestamp && (
										<>
											<p>
												<strong>Last server update EN:</strong> {new Date(serverVersionTimestamp).toLocaleString()}
											</p>
											<p>
												<strong>Last server update FA:</strong>{' '}
												{new Date(serverVersionTimestamp).toLocaleString('fa-IR')}
											</p>
										</>
									)}
									<p className="mt-2">Your current unsaved edits are still in the form.</p>
								</div>
							</AlertDialogDescription>
						</AlertDialogHeader>

						<AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 mt-2">
							<Button className="w-full sm:w-auto" variant="outline" onClick={handleCloseConflictDialogOnly}>
								<X className="mr-2 h-4 w-4" /> Review My Edits
							</Button>

							<Button className="w-full sm:w-auto" variant="secondary" onClick={handleRefreshAndDiscardEdits}>
								<RefreshCw className="mr-2 h-4 w-4" /> Refresh & Discard My Edits
							</Button>

							<Button className="w-full sm:w-auto" variant="destructive" onClick={handleForceSubmitFromDialog}>
								Force Overwrite With My Edits
							</Button>
						</AlertDialogFooter>

						<AlertDialogCancel className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
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
