import { api } from '@/utils/api';
import { Project, OpenAPISpec } from '@/types/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useProject = (projectId: string | undefined) => {
	return useQuery({
		queryKey: ['project', projectId],
		queryFn: async () => {
			if (!projectId) throw new Error('Project ID is required');

			const response = await api.get<Project>(`/projects/${projectId}`);
			if (response.error && (response as any).status === 404) {
				throw new Error(`Project with ID ${projectId} not found.`);
			}

			if (response.error) {
				throw new Error(`Project fetch error: ${response.error}`);
			}

			return response.data;
		},
		enabled: !!projectId,
	});
};

export const useOpenApiSpec = (projectId: string | undefined) => {
	return useQuery({
		queryKey: ['openapi', projectId],
		queryFn: async () => {
			if (!projectId) throw new Error('Project ID is required');

			const response = await api.get<OpenAPISpec>(`/projects/${projectId}/openapi`);

			if (response.error && (response as any).status === 404) {
				return null;
			}

			if (response.error) {
				return null;
			}

			return response.data || null;
		},
		enabled: !!projectId,
	});
};

export const useUpdateOpenApi = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			projectId,
			specData,
			lastKnownProjectUpdatedAt,
		}: {
			projectId: string;
			specData: OpenAPISpec;
			lastKnownProjectUpdatedAt?: string;
		}) => {
			const payload: any = { specData };

			if (lastKnownProjectUpdatedAt) {
				payload.lastKnownProjectUpdatedAt = lastKnownProjectUpdatedAt;
			}

			const response = await api.put(`/projects/${projectId}/openapi`, payload);

			if (response.error) {
				throw response;
			}

			return response.data;
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['openapi', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
		},
	});
};
