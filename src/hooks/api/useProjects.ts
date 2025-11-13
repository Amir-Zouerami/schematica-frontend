import type { components } from '@/types/api-types';
import { api } from '@/utils/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type ProjectDetailDto = components['schemas']['ProjectDetailDto'];
type ProjectSummaryDto = components['schemas']['ProjectSummaryDto'];
type CreateProjectDto = components['schemas']['CreateProjectDto'];
type UpdateProjectDto = components['schemas']['UpdateProjectDto'];
type UpdateAccessDto = components['schemas']['UpdateAccessDto'];

export const PROJECTS_QUERY_KEY = ['projects'];

export const useProjects = () => {
	return useQuery({
		queryKey: PROJECTS_QUERY_KEY,
		queryFn: async () => {
			const response = await api.get<ProjectSummaryDto[]>(`/projects`);
			return response;
		},
	});
};

export const useCreateProject = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (projectData: CreateProjectDto) => {
			const response = await api.post<ProjectDetailDto>('/projects', projectData);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
		},
	});
};

export const useUpdateProject = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			projectId,
			projectData,
		}: {
			projectId: string;
			projectData: UpdateProjectDto;
		}) => {
			const response = await api.put<ProjectDetailDto>(`/projects/${projectId}`, projectData);
			return response.data;
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
			queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
		},
	});
};

export const useUpdateProjectAccess = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			projectId,
			accessData,
		}: {
			projectId: string;
			accessData: UpdateAccessDto;
		}) => {
			const response = await api.put<ProjectDetailDto>(
				`/projects/${projectId}/access`,
				accessData,
			);
			return response.data;
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
		},
	});
};

export const useDeleteProject = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (projectId: string) => {
			const response = await api.delete<null>(`/projects/${projectId}`);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
		},
	});
};
