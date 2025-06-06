import { api } from '@/utils/api';
import { Project } from '@/types/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const PROJECTS_QUERY_KEY = ['projects'];

export const useProjects = () => {
	return useQuery({
		queryKey: PROJECTS_QUERY_KEY,
		queryFn: async () => {
			const response = await api.get<Project[]>('/projects');

			if (response.error) {
				throw new Error(response.error);
			}

			return response.data || [];
		},
	});
};

export const useCreateProject = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (projectData: any) => {
			const response = await api.post<Project>('/projects', projectData);

			if (response.error) {
				throw new Error(response.error);
			}

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
		mutationFn: async ({ projectId, projectData }: { projectId: string; projectData: any }) => {
			const response = await api.put<Project>(`/projects/${projectId}`, projectData);

			if (response.error) {
				throw new Error(response.error);
			}

			return response.data;
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
			queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
		},
	});
};

export const useDeleteProject = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (projectId: string) => {
			const response = await api.delete(`/projects/${projectId}`);

			if (response.error) {
				throw new Error(response.error);
			}

			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
		},
	});
};
