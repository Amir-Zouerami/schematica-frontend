import { api } from '@/shared/api/api';
import type { components } from '@/shared/types/api-types';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type NotificationDto = components['schemas']['NotificationDto'];
type MessageResponseDto = components['schemas']['MessageResponseDto'];

export const NOTIFICATIONS_QUERY_KEY = ['notifications'];

export const useNotifications = (limit = 10) => {
	return useInfiniteQuery({
		queryKey: NOTIFICATIONS_QUERY_KEY,
		queryFn: async ({ pageParam = 1 }) => {
			const response = await api.get<NotificationDto[]>('/notifications', {
				params: { page: pageParam, limit },
			});
			return response;
		},
		initialPageParam: 1,
		getNextPageParam: (lastPage) => {
			if (!lastPage || !lastPage.meta) return undefined;
			const currentPage = lastPage.meta.page;
			const totalPages = lastPage.meta.lastPage;
			if (currentPage >= totalPages) return undefined;
			return currentPage + 1;
		},
		staleTime: 1000 * 60 * 1,
		refetchOnWindowFocus: true,
	});
};

export const useMarkNotificationAsRead = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (notificationId: number) => {
			const response = await api.post<NotificationDto>(
				`/notifications/${notificationId}/read`,
			);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
		},
	});
};

export const useMarkAllNotificationsAsRead = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async () => {
			const response = await api.post<MessageResponseDto>('/notifications/read-all');
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
		},
	});
};
