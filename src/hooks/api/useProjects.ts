import { api } from '@/utils/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/types/api-types';

type ProjectDetailDto = components['schemas']['ProjectDetailDto'];
type ProjectSummaryDto = components['schemas']['ProjectSummaryDto'];
type CreateProjectDto = components['schemas']['CreateProjectDto'];
type UpdateProjectDto = components['schemas']['UpdateProjectDto'];

export const PROJECTS_QUERY_KEY = ['projects'];

export const useProjects = () => {
	return useQuery({
		queryKey: PROJECTS_QUERY_KEY,
		queryFn: () => api.get<ProjectSummaryDto[]>(`/projects`),
	});
};

export const useCreateProject = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (projectData: CreateProjectDto) =>
			api.post<ProjectDetailDto>('/projects', projectData),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
		},
	});
};

export const useUpdateProject = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			projectId,
			projectData,
		}: {
			projectId: string;
			projectData: UpdateProjectDto;
		}) => api.put<ProjectDetailDto>(`/projects/${projectId}`, projectData),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
			queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
		},
	});
};

export const useDeleteProject = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (projectId: string) => api.delete<null>(`/projects/${projectId}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
		},
	});
};
