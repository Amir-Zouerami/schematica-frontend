import type { components } from '@/types/api-types';
import { api } from '@/utils/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type TeamDto = components['schemas']['TeamDto'];
type CreateTeamDto = components['schemas']['CreateTeamDto'];
type UpdateTeamDto = components['schemas']['UpdateTeamDto'];

export const TEAMS_QUERY_KEY = ['teams'];

export const useTeams = () => {
	return useQuery({
		queryKey: TEAMS_QUERY_KEY,
		queryFn: () => api.get<TeamDto[]>('/teams'),
	});
};

export const useCreateTeam = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (teamData: CreateTeamDto) => api.post<TeamDto>('/admin/teams', teamData),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: TEAMS_QUERY_KEY });
		},
	});
};

export const useUpdateTeam = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ teamId, teamData }: { teamId: string; teamData: UpdateTeamDto }) =>
			api.put<TeamDto>(`/admin/teams/${teamId}`, teamData),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: TEAMS_QUERY_KEY });
		},
	});
};

export const useDeleteTeam = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (teamId: string) => api.delete<null>(`/admin/teams/${teamId}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: TEAMS_QUERY_KEY });
		},
	});
};
