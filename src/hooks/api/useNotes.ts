import { api } from '@/utils/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateNote = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ projectId, method, path, content }: { projectId: string; method: string; path: string; content: string }) => {
			const response = await api.post(`/projects/${projectId}/endpoints/${method}${path}/notes`, {
				content,
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

export const useDeleteNote = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ projectId, method, path, noteIndex }: { projectId: string; method: string; path: string; noteIndex: number }) => {
			const response = await api.delete(`/projects/${projectId}/endpoints/${method}${path}/notes/${noteIndex}`);

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
