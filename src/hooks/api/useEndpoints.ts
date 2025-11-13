import { useMutation, useQueryClient } from '@tanstack/react-query';
import { OperationObject } from '@/types/types';
import { api } from '@/utils/api';

export const useCreateEndpoint = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			projectId,
			endpointData,
		}: {
			projectId: string;
			endpointData: any;
		}) => {
			const response = await api.post(`/projects/${projectId}/endpoints`, endpointData);

			if (response.error) {
				throw new Error(response.error);
			}

			return response.data;
		},
		onSuccess: (data, variables) => {
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
			originalPath,
			originalMethod,
			newPath,
			newMethod,
			operation,
			lastKnownOperationUpdatedAt,
		}: {
			projectId: string;
			originalPath: string;
			originalMethod: string;
			newPath: string;
			newMethod: string;
			operation: OperationObject;
			lastKnownOperationUpdatedAt?: string;
		}) => {
			const apiPayload: any = {
				originalPath,
				originalMethod,
				newPath,
				newMethod,
				operation,
			};

			if (lastKnownOperationUpdatedAt) {
				apiPayload.lastKnownOperationUpdatedAt = lastKnownOperationUpdatedAt;
			}

			const response = await api.put<{ operation: OperationObject }>(
				`/projects/${projectId}/endpoints`,
				apiPayload,
			);

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

export const useDeleteEndpoint = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			projectId,
			path,
			method,
		}: {
			projectId: string;
			path: string;
			method: string;
		}) => {
			const response = await api.delete(`/projects/${projectId}/endpoints`, {
				body: { path, method },
			});

			if (response.error) {
				throw new Error(response.error);
			}

			return response.data;
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['openapi', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
		},
	});
};
