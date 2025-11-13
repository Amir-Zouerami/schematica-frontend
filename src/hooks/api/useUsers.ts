import type { components } from '@/types/api-types';
import { api } from '@/utils/api';
import { useQuery } from '@tanstack/react-query';

type SanitizedUserDto = components['schemas']['SanitizedUserDto'];

export const USERS_QUERY_KEY = ['users'];

export const useUsers = () => {
	return useQuery({
		queryKey: USERS_QUERY_KEY,
		queryFn: () => api.get<SanitizedUserDto[]>(`/users`),
		staleTime: 1000 * 60 * 5,
	});
};
