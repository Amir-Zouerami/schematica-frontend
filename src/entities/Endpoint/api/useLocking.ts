import { api } from '@/shared/api/api';
import type { components } from '@/shared/types/api-types';
import { useMutation } from '@tanstack/react-query';

type LockDto = components['schemas']['LockDto'];

/**
 * Mutation hook to acquire or refresh a lock on an endpoint.
 * On success, returns the lock details.
 * Throws an ApiError on failure, which can be caught to handle conflicts (409).
 */
export const useAcquireLock = () => {
	return useMutation({
		mutationFn: async ({
			projectId,
			endpointId,
		}: {
			projectId: string;
			endpointId: string;
		}) => {
			const response = await api.post<LockDto>(
				`/projects/${projectId}/endpoints/${endpointId}/lock`,
			);
			return response.data;
		},
	});
};

/**
 * Mutation hook to release a lock on an endpoint.
 * This should be called when the user is finished editing.
 */
export const useReleaseLock = () => {
	return useMutation({
		mutationFn: async ({
			projectId,
			endpointId,
		}: {
			projectId: string;
			endpointId: string;
		}) => {
			await api.delete<null>(`/projects/${projectId}/endpoints/${endpointId}/unlock`);
		},
	});
};
