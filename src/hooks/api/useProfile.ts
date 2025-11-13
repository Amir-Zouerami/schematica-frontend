import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
import type { components } from '@/types/api-types';
import { ADMIN_USERS_QUERY_KEY } from './useUsersAdmin';

type UserDto = components['schemas']['UserDto'];

/**
 * Mutation hook for the authenticated user to update their own profile picture.
 */
export const useUpdateProfilePicture = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (fileData: FormData) => {
			const response = await api.put<UserDto>('/profile/picture', fileData);
			return response.data;
		},
		onSuccess: () => {
			// Invalidate the current user's profile query to refetch the updated data.
			// This key is not explicitly defined but is the effective key for the /auth/me call.
			queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });

			// Also invalidate the admin user list in case an admin is updating their own picture.
			queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
		},
	});
};
