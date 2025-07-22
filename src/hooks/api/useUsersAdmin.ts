import { api } from '@/utils/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '@/types/types';

export const ADMIN_USERS_QUERY_KEY = ['admin_users'];

export const useAdminUsers = () => {
	return useQuery<User[]>({
		queryKey: ADMIN_USERS_QUERY_KEY,
		queryFn: async () => {
			const response = await api.get<User[]>('/admin/users');

			if (response.error) throw new Error(response.error);
			return response.data || [];
		},
	});
};

export const useCreateUser = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (userData: FormData) => {
			const response = await api.post<User>('/admin/users', userData);

			if (response.error) throw new Error(response.error);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
		},
	});
};

export const useUpdateUser = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ userId, userData }: { userId: string; userData: FormData }) => {
			const response = await api.put<User>(`/admin/users/${userId}`, userData);

			if (response.error) throw new Error(response.error);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
		},
	});
};

export const useDeleteUserAdmin = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (userId: string) => {
			const response = await api.delete(`/admin/users/${userId}`);

			if (response.error) throw new Error(response.error);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
		},
	});
};
