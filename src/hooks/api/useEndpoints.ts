import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
import type { components } from '@/types/api-types';

type EndpointSummaryDto = components['schemas']['EndpointSummaryDto'];
type CreateEndpointDto = components['schemas']['CreateEndpointDto'];
type UpdateEndpointDto = components['schemas']['UpdateEndpointDto'];
type EndpointDto = components['schemas']['EndpointDto'];

export const useEndpoints = (projectId: string | undefined) => {
	return useQuery({
		queryKey: ['endpoints', projectId],
		queryFn: async () => {
			if (!projectId) return null;
			const response = await api.get<{ data: EndpointSummaryDto[] }>(
				`/projects/${projectId}/endpoints`,
				{ params: { limit: 1000 } },
			);
			return response.data.data;
		},
		enabled: !!projectId,
	});
};

export const useEndpoint = (projectId: string | undefined, endpointId: string | undefined) => {
	return useQuery({
		queryKey: ['endpoint', projectId, endpointId],
		queryFn: async () => {
			if (!projectId || !endpointId) return null;
			const response = await api.get<EndpointDto>(
				`/projects/${projectId}/endpoints/${endpointId}`,
			);
			return response.data;
		},
		enabled: !!projectId && !!endpointId,
	});
};

export const useCreateEndpoint = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			projectId,
			endpointData,
		}: {
			projectId: string;
			endpointData: CreateEndpointDto;
		}) => {
			const response = await api.post<EndpointDto>(
				`/projects/${projectId}/endpoints`,
				endpointData,
			);
			return response.data;
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['endpoints', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['openapi', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
		},
	});
};

export const useUpdateEndpoint = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			projectId,
			endpointId,
			endpointData,
		}: {
			projectId: string;
			endpointId: string;
			endpointData: UpdateEndpointDto;
		}) => {
			const response = await api.put<EndpointDto>(
				`/projects/${projectId}/endpoints/${endpointId}`,
				endpointData,
			);
			return response.data;
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ['endpoint', variables.projectId, variables.endpointId],
			});
			queryClient.invalidateQueries({ queryKey: ['endpoints', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['openapi', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
		},
	});
};

export const useDeleteEndpoint = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			projectId,
			endpointId,
		}: {
			projectId: string;
			endpointId: string;
		}) => {
			await api.delete<null>(`/projects/${projectId}/endpoints/${endpointId}`);
			return endpointId;
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['endpoints', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['openapi', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
		},
	});
};
