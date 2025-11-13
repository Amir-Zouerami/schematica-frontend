import type { components } from '@/types/api-types';
import { api, ApiError } from '@/utils/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type ProjectDetailDto = components['schemas']['ProjectDetailDto'];
// Note: Using 'any' for OpenAPISpec temporarily because the generated type is an empty object.
// This will be replaced once we have a more complete OpenAPI type definition locally.
type OpenAPISpec = any;
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
			spec: UpdateOpenApiSpecDto['spec'];
			lastKnownUpdatedAt: UpdateOpenApiSpecDto['lastKnownUpdatedAt'];
		}) => {
			const payload: UpdateOpenApiSpecDto = { spec, lastKnownUpdatedAt };
			const response = await api.put(`/projects/${projectId}/openapi`, payload);
			return response.data;
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['openapi', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
		},
	});
};
