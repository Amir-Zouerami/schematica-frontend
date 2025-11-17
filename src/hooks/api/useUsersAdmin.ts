import type { components } from '@/types/api-types';
import { api } from '@/utils/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type UserDto = components['schemas']['UserDto'];
type UpdateUserDto = components['schemas']['UpdateUserDto'];

export const ADMIN_USERS_QUERY_KEY = 'admin_users';

export const useAdminUsers = (page = 1, limit = 10, search = '') => {
	const isSearchEnabled = search.length === 0 || search.length >= 2;

	return useQuery({
		queryKey: [ADMIN_USERS_QUERY_KEY, { page, limit, search }],
		queryFn: () => {
			const queryParams: Record<string, any> = { page, limit };
			if (search) {
				queryParams.search = search;
			}
			return api.get<UserDto[]>('/admin/users', {
				params: queryParams,
			});
		},
		// Add the 'enabled' flag here
		enabled: isSearchEnabled,
		placeholderData: (previousData) => previousData,
	});
};

export const useCreateUser = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (userData: FormData) => api.post<UserDto>('/admin/users', userData),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] });
		},
	});
};

export const useUpdateUser = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ userId, userData }: { userId: string; userData: UpdateUserDto }) =>
			api.put<UserDto>(`/admin/users/${userId}`, userData),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] });
		},
	});
};

export const useUpdateUserProfilePictureAdmin = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ userId, fileData }: { userId: string; fileData: FormData }) =>
			api.put<UserDto>(`/admin/users/${userId}/picture`, fileData),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] });
		},
	});
};

export const useDeleteUserAdmin = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (userId: string) => api.delete<null>(`/admin/users/${userId}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] });
		},
	});
};
