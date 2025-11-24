import { useAuth } from '@/app/providers/AuthContext';
import { api } from '@/shared/api/api';
import type { components } from '@/shared/types/api-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { USERS_QUERY_KEY } from './useUsers';
import { ADMIN_USERS_QUERY_KEY } from './useUsersAdmin';

type UserDto = components['schemas']['UserDto'];
type MeDto = components['schemas']['MeDto'];

export const ME_QUERY_KEY = ['me'];

export const useMe = () => {
	const { isAuthenticated } = useAuth();
	return useQuery({
		queryKey: ME_QUERY_KEY,
		queryFn: async () => {
			const response = await api.get<MeDto>('/auth/me');
			return response.data;
		},
		enabled: isAuthenticated,
	});
};

export const useUpdateProfilePicture = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (fileData: FormData) => {
			const response = await api.put<UserDto>('/profile/picture', fileData);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
			queryClient.invalidateQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] });
			queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
			queryClient.invalidateQueries({ queryKey: ['search-users'] });
		},
	});
};
