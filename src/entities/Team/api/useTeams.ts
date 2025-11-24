import { AUDIT_LOGS_QUERY_KEY } from '@/entities/AuditLog/api/useAuditLogs';
import { ME_QUERY_KEY } from '@/entities/User/api/useMe';
import { ADMIN_USERS_QUERY_KEY } from '@/entities/User/api/useUsersAdmin';
import { api } from '@/shared/api/api';
import type { components } from '@/shared/types/api-types';
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
			queryClient.invalidateQueries({ queryKey: [AUDIT_LOGS_QUERY_KEY] });
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
			queryClient.invalidateQueries({ queryKey: [AUDIT_LOGS_QUERY_KEY] });
			queryClient.invalidateQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] });
			queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
		},
	});
};

export const useDeleteTeam = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (teamId: string) => api.delete<null>(`/admin/teams/${teamId}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [TEAMS_QUERY_KEY] });
			queryClient.invalidateQueries({ queryKey: [AUDIT_LOGS_QUERY_KEY] });
			queryClient.invalidateQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] });
			queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
		},
	});
};
