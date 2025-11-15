import { useCreateProject, useUpdateProject } from '@/hooks/api/useProjects';
import { useToast } from '@/hooks/use-toast';
import type { components } from '@/types/api-types';
import { api, ApiError } from '@/utils/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { RefreshCw, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

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
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// --- Type Definitions ---
type ProjectDetailDto = components['schemas']['ProjectDetailDto'];
type CreateProjectDto = components['schemas']['CreateProjectDto'];
type UpdateProjectDto = components['schemas']['UpdateProjectDto'];

// --- Zod Schema for Validation ---
const projectFormSchema = z.object({
	name: z.string().min(1, { message: 'Project name is required.' }),
	description: z.string().min(1, { message: 'Description should not be empty.' }),
	serverUrl: z
		.url({ message: 'Please enter a valid URL (e.g., https://api.example.com).' })
		.optional(),
	links: z
		.array(
			z.object({
				name: z.string(),
				url: z.string(),
			}),
		)
		.optional(),
});

// Refine the schema to ensure that if a link URL is present, its name is also present.
const refinedProjectFormSchema = projectFormSchema.refine(
	(data) => {
		if (!data.links) return true;
		return data.links.every((link) => {
			if (link.url.trim() !== '') {
				return link.name.trim() !== '';
			}
			return true;
		});
	},
	{
		message: 'Link name is required if a URL is provided.',
		path: ['links'],
	},
);

type ProjectFormValues = z.infer<typeof refinedProjectFormSchema>;

// --- Component Props ---
interface ProjectFormProps {
	open: boolean;
	onClose: () => void;
	project?: ProjectDetailDto;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ open, onClose, project }) => {
	const { toast } = useToast();
	const createProjectMutation = useCreateProject();
	const updateProjectMutation = useUpdateProject();
	const isSubmitting = createProjectMutation.isPending || updateProjectMutation.isPending;

	const [lastKnownUpdatedAt, setLastKnownUpdatedAt] = useState<string | undefined>(undefined);
	const [conflictError, setConflictError] = useState<string | null>(null);
	const [serverVersionTimestamp, setServerVersionTimestamp] = useState<string | undefined>(
		undefined,
	);

	const form = useForm<ProjectFormValues>({
		resolver: zodResolver(refinedProjectFormSchema),
		defaultValues: {
			name: '',
			description: '',
			serverUrl: '',
			links: [{ name: '', url: '' }],
		},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: 'links',
	});

	useEffect(() => {
		if (open) {
			if (project) {
				form.reset({
					name: project.name,
					description: project.description ?? '',
					serverUrl: project.serverUrl ?? '',
					links: project.links?.length > 0 ? project.links : [{ name: '', url: '' }],
				});
				setLastKnownUpdatedAt(project.updatedAt);
			} else {
				form.reset({
					name: '',
					description: '',
					serverUrl: '',
					links: [{ name: '', url: '' }],
				});
				setLastKnownUpdatedAt(undefined);
			}
			setConflictError(null);
			setServerVersionTimestamp(undefined);
		}
	}, [project, open, form]);

	const processSubmit = async (values: ProjectFormValues, forceOverwrite = false) => {
		if (!forceOverwrite) {
			setConflictError(null);
			setServerVersionTimestamp(undefined);
		}

		const filteredLinks = values.links?.filter((link) => link.name.trim() && link.url.trim());

		try {
			if (project) {
				if (!lastKnownUpdatedAt && !forceOverwrite) {
					throw new Error('Missing last known update timestamp.');
				}
				const payload: UpdateProjectDto = {
					...values,
					serverUrl: values.serverUrl || undefined,
					links: filteredLinks,
					lastKnownUpdatedAt: forceOverwrite ? undefined : lastKnownUpdatedAt,
				};
				await updateProjectMutation.mutateAsync({
					projectId: project.id,
					projectData: payload,
				});
			} else {
				const payload: CreateProjectDto = {
					...values,
					serverUrl: values.serverUrl || undefined,
					links: filteredLinks,
				};
				await createProjectMutation.mutateAsync(payload);
			}
			toast({
				title: project ? 'Project Updated' : 'Project Created',
				description: `${values.name} has been successfully saved.`,
			});
			onClose();
		} catch (err) {
			const error = err as ApiError;
			if (error.status === 409) {
				if (error.message.toLowerCase().includes('concurrency')) {
					setServerVersionTimestamp((error.errorResponse as any)?.serverUpdatedAt);
					setConflictError(error.message || 'This project was updated by someone else.');
				} else {
					form.setError('name', { type: 'server', message: error.message });
				}
			} else if (error.status === 400 && typeof error.errorResponse?.message === 'object') {
				const serverErrors = (error.errorResponse.message as any).message;
				if (Array.isArray(serverErrors)) {
					serverErrors.forEach((msg: string) => {
						if (msg.includes('name'))
							form.setError('name', { type: 'server', message: msg });
						else if (msg.includes('description'))
							form.setError('description', { type: 'server', message: msg });
						else if (msg.includes('serverUrl'))
							form.setError('serverUrl', { type: 'server', message: msg });
						else
							toast({
								title: 'Validation Error',
								description: msg,
								variant: 'destructive',
							});
					});
				}
			} else {
				const errorMessage =
					error instanceof ApiError ? error.message : 'Failed to save project.';
				toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
			}
		}
	};

	const onSubmit = (values: ProjectFormValues) => {
		processSubmit(values, false);
	};

	const handleForceSubmitFromDialog = () => {
		processSubmit(form.getValues(), true);
	};

	const handleRefreshAndDiscardEdits = async () => {
		if (!project?.id) return;
		setConflictError(null);
		try {
			const response = await api.get<ProjectDetailDto>(`/projects/${project.id}`);
			if (response.data) {
				form.reset(response.data);
				setLastKnownUpdatedAt(response.data.updatedAt);
				toast({
					title: 'Data Refreshed',
					description: 'Form has been updated with the latest server data.',
				});
			}
		} catch (err) {
			toast({
				title: 'Refresh Failed',
				description: 'Could not fetch latest project data.',
				variant: 'destructive',
			});
		}
	};

	const handleCloseConflictDialogOnly = () => {
		setConflictError(null);
		toast({
			title: 'Conflict Noted',
			description: 'Your edits are still in the form.',
			duration: 7000,
		});
	};

	return (
		<>
			<Dialog open={open} onOpenChange={(isOpenDialog) => !isOpenDialog && onClose()}>
				<DialogContent className="max-w-3xl glass-card">
					<DialogHeader>
						<DialogTitle className="text-gradient">
							{project ? 'Edit Project' : 'Create New Project'}
						</DialogTitle>
						<DialogDescription>
							{project
								? 'Update project details.'
								: 'Create a new API documentation project.'}
						</DialogDescription>
					</DialogHeader>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Project Name</FormLabel>
										<FormControl>
											<Input
												placeholder="My API Project"
												{...field}
												disabled={isSubmitting}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Description</FormLabel>
										<FormControl>
											<Textarea
												placeholder="A brief description of your API project"
												{...field}
												disabled={isSubmitting}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="serverUrl"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Base Server URL</FormLabel>
										<FormControl>
											<Input
												placeholder="https://api.example.com"
												{...field}
												disabled={isSubmitting}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<div className="space-y-2">
								<div className="flex justify-between items-center mb-2">
									<Label>Related Links</Label>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => append({ name: '', url: '' })}
										disabled={isSubmitting}
									>
										Add Link
									</Button>
								</div>
								{fields.map((item, index) => (
									<div key={item.id} className="flex items-start gap-2">
										<FormField
											control={form.control}
											name={`links.${index}.name`}
											render={({ field }) => (
												<FormItem className="flex-1">
													<FormControl>
														<Input
															placeholder="Name (e.g., Staging ENV)"
															{...field}
															disabled={isSubmitting}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name={`links.${index}.url`}
											render={({ field }) => (
												<FormItem className="flex-1">
													<FormControl>
														<Input
															placeholder="URL (e.g., https://staging.api.com)"
															{...field}
															disabled={isSubmitting}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<Button
											type="button"
											variant="destructive"
											size="icon"
											onClick={() => remove(index)}
											className="h-9 w-9 mt-0.5"
											disabled={isSubmitting || fields.length <= 1}
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
					</Form>
				</DialogContent>
			</Dialog>
			{conflictError && (
				<AlertDialog
					open={!!conflictError}
					onOpenChange={(isOpenDialog) => !isOpenDialog && setConflictError(null)}
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
