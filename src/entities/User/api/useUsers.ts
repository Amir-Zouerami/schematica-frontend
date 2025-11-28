import { api } from '@/shared/api/api';
import type { components } from '@/shared/types/api-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type SetPasswordDto = components['schemas']['SetPasswordDto'];
type SanitizedUserDto = components['schemas']['SanitizedUserDto'];

export const USERS_QUERY_KEY = ['users'];

export const useUsers = (page = 1, limit = 10, search = '') => {
	const isSearchEnabled = search.length === 0 || search.length >= 2;

	return useQuery({
		queryKey: [USERS_QUERY_KEY, { page, limit, search }],
		queryFn: () => {
			const queryParams: Record<string, any> = { page, limit };
			if (search) {
				queryParams.search = search;
			}
			return api.get<SanitizedUserDto[]>(`/users`, {
				params: queryParams,
			});
		},
		enabled: isSearchEnabled,
		placeholderData: (previousData) => previousData,
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
