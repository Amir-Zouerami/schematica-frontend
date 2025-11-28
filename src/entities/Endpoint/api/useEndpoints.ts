import { AUDIT_LOGS_QUERY_KEY } from '@/entities/AuditLog/api/useAuditLogs';
import { api } from '@/shared/api/api';
import type { components } from '@/shared/types/api-types';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type EndpointSummaryDto = components['schemas']['EndpointSummaryDto'];
type CreateEndpointDto = components['schemas']['CreateEndpointDto'];
type UpdateEndpointDto = components['schemas']['UpdateEndpointDto'];
type EndpointDto = components['schemas']['EndpointDto'];
type UpdateEndpointStatusDto = components['schemas']['UpdateEndpointStatusDto'];

export const useEndpoints = (projectId: string | undefined, limit = 50) => {
	return useInfiniteQuery({
		queryKey: ['endpoints', projectId],
		queryFn: async ({ pageParam = 1 }) => {
			if (!projectId) return null;
			const response = await api.get<EndpointSummaryDto[]>(
				`/projects/${projectId}/endpoints`,
				{ params: { page: pageParam, limit } },
			);
			return response;
		},
		initialPageParam: 1,
		getNextPageParam: (lastPage) => {
			if (!lastPage || !lastPage.meta) return undefined;
			const { page, lastPage: totalPages } = lastPage.meta;
			if (page >= totalPages) return undefined;
			return page + 1;
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
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['endpoints', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['openapi', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['changelog', variables.projectId] });
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
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ['endpoint', variables.projectId, variables.endpointId],
			});
			queryClient.invalidateQueries({ queryKey: ['endpoints', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['openapi', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['changelog', variables.projectId] });
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
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['endpoints', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['openapi', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['changelog', variables.projectId] });
		},
	});
};

export const useUpdateEndpointStatus = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			projectId,
			endpointId,
			statusData,
		}: {
			projectId: string;
			endpointId: string;
			statusData: UpdateEndpointStatusDto;
		}) => {
			const response = await api.post<EndpointDto>(
				`/projects/${projectId}/endpoints/${endpointId}/status`,
				statusData,
			);
			return response.data;
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ['endpoint', variables.projectId, variables.endpointId],
			});
			queryClient.invalidateQueries({ queryKey: ['endpoints', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['openapi', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['changelog', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: [AUDIT_LOGS_QUERY_KEY] });
		},
	});
};
