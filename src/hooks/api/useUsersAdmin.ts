import { api } from '@/utils/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/types/api-types';

type UserDto = components['schemas']['UserDto'];
type UpdateUserDto = components['schemas']['UpdateUserDto'];

export const ADMIN_USERS_QUERY_KEY = ['admin_users'];

export const useAdminUsers = () => {
	return useQuery({
		queryKey: ADMIN_USERS_QUERY_KEY,
		queryFn: () => api.get<UserDto[]>('/admin/users'),
	});
};

export const useCreateUser = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (userData: FormData) => api.post<UserDto>('/admin/users', userData),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
		},
	});
};

export const useUpdateUser = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ userId, userData }: { userId: string; userData: UpdateUserDto }) =>
			api.put<UserDto>(`/admin/users/${userId}`, userData),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
		},
	});
};

export const useDeleteUserAdmin = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (userId: string) => api.delete<null>(`/admin/users/${userId}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
		},
	});
};
