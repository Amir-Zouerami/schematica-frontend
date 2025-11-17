import type { components } from '@/types/api-types';
import { api } from '@/utils/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type TeamDto = components['schemas']['TeamDto'];
type CreateTeamDto = components['schemas']['CreateTeamDto'];
type UpdateTeamDto = components['schemas']['UpdateTeamDto'];

export const TEAMS_QUERY_KEY = ['teams'];

export const useTeams = (page = 1, limit = 10, search = '') => {
	const isSearchEnabled = search.length === 0 || search.length >= 2;

	return useQuery({
		queryKey: [TEAMS_QUERY_KEY, { page, limit, search }],
		queryFn: () => {
			const queryParams: Record<string, any> = { page, limit };
			if (search) {
				queryParams.search = search;
			}
			return api.get<TeamDto[]>('/teams', {
				params: queryParams,
			});
		},

		enabled: isSearchEnabled,
		placeholderData: (previousData) => previousData,
	});
};

export const useCreateTeam = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (teamData: CreateTeamDto) => api.post<TeamDto>('/admin/teams', teamData),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [TEAMS_QUERY_KEY] });
		},
	});
};

export const useUpdateTeam = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ teamId, teamData }: { teamId: string; teamData: UpdateTeamDto }) =>
			api.put<TeamDto>(`/admin/teams/${teamId}`, teamData),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [TEAMS_QUERY_KEY] });
		},
	});
};

export const useDeleteTeam = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (teamId: string) => api.delete<null>(`/admin/teams/${teamId}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [TEAMS_QUERY_KEY] });
		},
	});
};
