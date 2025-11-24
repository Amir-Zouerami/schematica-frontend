import { useCreateProject, useUpdateProject } from '@/entities/Project/api/useProjects';
import {
	ProjectFormValues,
	refinedProjectFormSchema,
} from '@/features/project/create-project/model/project-form-schema';
import { useToast } from '@/hooks/use-toast';
import { api, ApiError } from '@/shared/api/api';
import type { components } from '@/shared/types/api-types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

type ProjectDetailDto = components['schemas']['ProjectDetailDto'];
type CreateProjectDto = components['schemas']['CreateProjectDto'];
type UpdateProjectDto = components['schemas']['UpdateProjectDto'];

export const useProjectForm = (open: boolean, onClose: () => void, project?: ProjectDetailDto) => {
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const createProjectMutation = useCreateProject();
	const updateProjectMutation = useUpdateProject();

	const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
	const [conflictingServerData, setConflictingServerData] = useState<ProjectDetailDto | null>(
		null,
	);

	const [currentUpdatedAt, setCurrentUpdatedAt] = useState<string | undefined>(
		project?.updatedAt,
	);

	const form = useForm<ProjectFormValues>({
		resolver: zodResolver(refinedProjectFormSchema),
		defaultValues: {
			name: '',
			description: '',
			servers: [{ url: '', description: 'Main Server' }],
			links: [{ name: '', url: '' }],
		},
	});

	const {
		fields: linkFields,
		append: appendLink,
		remove: removeLink,
	} = useFieldArray({
		control: form.control,
		name: 'links',
	});

	const {
		fields: serverFields,
		append: appendServer,
		remove: removeServer,
	} = useFieldArray({
		control: form.control,
		name: 'servers',
	});

	const isSubmitting = createProjectMutation.isPending || updateProjectMutation.isPending;

	useEffect(() => {
		if (open) {
			if (project) {
				form.reset({
					name: project.name,
					description: project.description ?? '',
					servers:
						project.servers && project.servers.length > 0
							? project.servers
							: [{ url: '', description: 'Main Server' }],
					links: project.links?.length > 0 ? project.links : [{ name: '', url: '' }],
				});

				setCurrentUpdatedAt(project.updatedAt);
			} else {
				form.reset({
					name: '',
					description: '',
					servers: [{ url: '', description: 'Main Server' }],
					links: [{ name: '', url: '' }],
				});
				setCurrentUpdatedAt(undefined);
			}
			setIsConflictDialogOpen(false);
			setConflictingServerData(null);
		}
	}, [project, open, form]);

	const fetchFreshProjectData = async () => {
		if (!project) return null;

		const res = await api.get<ProjectDetailDto>(`/projects/${project.id}?_t=${Date.now()}`);
		return res.data;
	};

	const processSubmit = async (values: ProjectFormValues, forceOverwrite = false) => {
		const filteredLinks = values.links?.filter((link) => link.name.trim() && link.url.trim());
		const filteredServers = values.servers?.filter((s) => s.url.trim());
		let timestampToSubmit = currentUpdatedAt;

		if (forceOverwrite && project) {
			try {
				const freshData = await fetchFreshProjectData();
				if (freshData) {
					timestampToSubmit = freshData.updatedAt;
					setCurrentUpdatedAt(timestampToSubmit);
				}
			} catch (e) {
				toast({
					title: 'Error',
					description: 'Could not fetch latest version for overwrite.',
					variant: 'destructive',
				});
				return;
			}
		}

		try {
			if (project) {
				const payload: UpdateProjectDto = {
					name: values.name,
					description: values.description,
					servers: filteredServers,
					links: filteredLinks,
					lastKnownUpdatedAt: timestampToSubmit!,
				};

				await updateProjectMutation.mutateAsync({
					projectId: project.id,
					projectData: payload,
				});
			} else {
				const payload: CreateProjectDto = {
					name: values.name,
					description: values.description,
					servers: filteredServers,
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
				if (error.metaCode === 'PROJECT_CONCURRENCY_CONFLICT') {
					try {
						const freshData = await fetchFreshProjectData();
						setConflictingServerData(freshData);
						setIsConflictDialogOpen(true);
					} catch (e) {
						toast({
							title: 'Conflict Detected',
							description: 'Failed to load server version.',
							variant: 'destructive',
						});
					}
				} else if (error.metaCode === 'PROJECT_NAME_ALREADY_EXISTS') {
					form.setError('name', {
						type: 'server',
						message: 'A project with this name already exists.',
					});
				} else {
					toast({
						title: 'Conflict',
						description: error.message,
						variant: 'destructive',
					});
				}
			} else {
				toast({ title: 'Error', description: error.message, variant: 'destructive' });
			}
		}
	};

	const onSubmit = (values: ProjectFormValues) => processSubmit(values, false);

	const handleForceOverwrite = () => {
		setIsConflictDialogOpen(false);
		processSubmit(form.getValues(), true);
	};

	const handleRefreshAndDiscard = () => {
		if (conflictingServerData) {
			form.reset({
				name: conflictingServerData.name,
				description: conflictingServerData.description ?? '',
				servers:
					conflictingServerData.servers?.length > 0
						? conflictingServerData.servers
						: [{ url: '', description: '' }],
				links:
					conflictingServerData.links?.length > 0
						? conflictingServerData.links
						: [{ name: '', url: '' }],
			});

			setCurrentUpdatedAt(conflictingServerData.updatedAt);

			queryClient.invalidateQueries({ queryKey: ['project', project?.id] });
			queryClient.invalidateQueries({ queryKey: ['projects'] });
		}

		setIsConflictDialogOpen(false);
		toast({ title: 'Form Reloaded', description: 'Your changes have been discarded.' });
	};

	return {
		form,
		linkFields,
		appendLink,
		removeLink,
		serverFields,
		appendServer,
		removeServer,
		onSubmit,
		isSubmitting,
		isConflictDialogOpen,
		setIsConflictDialogOpen,
		conflictingServerData,
		handleForceOverwrite,
		handleRefreshAndDiscard,
	};
};
