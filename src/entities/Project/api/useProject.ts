import { api, ApiError } from '@/shared/api/api';
import type { components } from '@/shared/types/api-types';
import type { OpenAPISpec } from '@/shared/types/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type ProjectDetailDto = components['schemas']['ProjectDetailDto'];
type UpdateOpenApiSpecDto = components['schemas']['UpdateOpenApiSpecDto'];

export const useProject = (projectId: string | undefined) => {
	return useQuery({
		queryKey: ['project', projectId],
		queryFn: async () => {
			if (!projectId) throw new Error('Project ID is required');
			const response = await api.get<ProjectDetailDto>(`/projects/${projectId}`);
			return response.data;
		},
		enabled: !!projectId,
		retry: 1,
	});
};

export const useOpenApiSpec = (projectId: string | undefined) => {
	return useQuery({
		queryKey: ['openapi', projectId],
		queryFn: async () => {
			if (!projectId) return null;
			try {
				const response = await api.get<OpenAPISpec>(`/projects/${projectId}/openapi`);
				return response.data;
			} catch (error) {
				if (error instanceof ApiError && error.status === 404) {
					return null;
				}
				throw error;
			}
		},
		enabled: !!projectId,
	});
};

export const useUpdateOpenApi = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			projectId,
			spec,
			lastKnownUpdatedAt,
		}: {
			projectId: string;
			spec: OpenAPISpec;
			lastKnownUpdatedAt?: string;
		}) => {
			const payload: UpdateOpenApiSpecDto = {
				spec: spec as unknown as UpdateOpenApiSpecDto['spec'],
				lastKnownUpdatedAt: lastKnownUpdatedAt!,
			};

			const response = await api.put(`/projects/${projectId}/openapi`, payload);
			return response.data;
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['openapi', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['endpoints', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['schemas', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['changelog', variables.projectId] });
		},
	});
};
