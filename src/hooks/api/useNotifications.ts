import type { components } from '@/types/api-types';
import { api } from '@/utils/api';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type NotificationDto = components['schemas']['NotificationDto'];
type PaginationMetaDto = components['schemas']['PaginationMetaDto'];

interface NotificationsResponse {
	data: NotificationDto[];
	meta: PaginationMetaDto;
}

export const NOTIFICATIONS_QUERY_KEY = ['notifications'];

/**
 * Fetches notifications for the current user using infinite scrolling.
 */
export const useNotifications = (limit = 10) => {
	return useInfiniteQuery({
		queryKey: NOTIFICATIONS_QUERY_KEY,
		queryFn: async ({ pageParam = 1 }) => {
			const response = await api.get<NotificationsResponse>('/notifications', {
				params: { page: pageParam, limit },
			});
			return response;
		},
		initialPageParam: 1,
		getNextPageParam: (lastPage) => {
			if (!lastPage || !lastPage.meta) return undefined;

			const currentPage = lastPage.meta.page;
			const totalPages = lastPage.meta.lastPage;

			if (currentPage >= totalPages) {
				return undefined;
			}
			return currentPage + 1;
		},
	});
};

/**
 * Mutation to mark a single notification as read.
 */
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
			// Invalidate the notifications query to refetch and update the unread status.
			queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
		},
	});
};
