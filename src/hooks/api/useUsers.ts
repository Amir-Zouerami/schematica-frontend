import type { components } from '@/types/api-types';
import { api } from '@/utils/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type SetPasswordDto = components['schemas']['SetPasswordDto'];
type SanitizedUserDto = components['schemas']['SanitizedUserDto'];

export const USERS_QUERY_KEY = ['users'];

export const useUsers = () => {
	return useQuery({
		queryKey: USERS_QUERY_KEY,
		queryFn: () => api.get<SanitizedUserDto[]>(`/users`),
		staleTime: 1000 * 60 * 5,
	});
};

export const useSetPassword = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (passwordData: SetPasswordDto) => api.post('/users/set-password', passwordData),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
		},
	});
};
