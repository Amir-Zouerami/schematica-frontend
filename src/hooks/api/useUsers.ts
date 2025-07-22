import { api } from '@/utils/api';
import { useQuery } from '@tanstack/react-query';

export interface SanitizedUser {
	id: string;
	username: string;
	profileImage?: string;
}

export const USERS_QUERY_KEY = ['users'];

export const useUsers = () => {
	return useQuery<SanitizedUser[]>({
		queryKey: USERS_QUERY_KEY,
		queryFn: async () => {
			const response = await api.get<SanitizedUser[]>('/auth/users');

			if (response.error) {
				throw new Error(response.error);
			}

			return response.data || [];
		},
		staleTime: 1000 * 60 * 5,
	});
};
