import { api } from '@/utils/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Team {
	id: string;
	name: string;
}

export const TEAMS_QUERY_KEY = ['teams'];

export const useTeams = () => {
	return useQuery<Team[]>({
		queryKey: TEAMS_QUERY_KEY,
		queryFn: async () => {
			const response = await api.get<Team[]>('/auth/teams');

			if (response.error) {
				throw new Error(response.error);
			}

			return response.data || [];
		},
	});
};

export const useCreateTeam = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (teamName: string) => {
			const response = await api.post<Team>('/admin/teams', { name: teamName });
			if (response.error) {
				throw new Error(response.error);
			}
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: TEAMS_QUERY_KEY });
		},
	});
};

export const useUpdateTeam = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ teamId, newName }: { teamId: string; newName: string }) => {
			const response = await api.put<Team>(`/admin/teams/${teamId}`, { name: newName });

			if (response.error) {
				throw new Error(response.error);
			}

			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: TEAMS_QUERY_KEY });
		},
	});
};

export const useDeleteTeam = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (teamId: string) => {
			const response = await api.delete(`/admin/teams/${teamId}`);
			if (response.error) {
				throw new Error(response.error);
			}
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: TEAMS_QUERY_KEY });
		},
	});
};
