import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMarkNotificationAsRead } from '@/hooks/api/useNotifications';
import { cn } from '@/lib/utils';
import type { components } from '@/types/api-types';
import { formatDate } from '@/utils/schemaUtils';
import React from 'react';
import { useNavigate } from 'react-router-dom';

type NotificationDto = components['schemas']['NotificationDto'];

interface NotificationsDropdownProps {
	notifications: NotificationDto[];
	onClose: () => void;
	fetchNextPage: () => void;
	hasNextPage?: boolean;
	isFetchingNextPage: boolean;
}

const NotificationItem: React.FC<{
	notification: NotificationDto;
	onClick: (notification: NotificationDto) => void;
}> = ({ notification, onClick }) => {
	return (
		<div
			className={cn(
				'p-3 hover:bg-secondary cursor-pointer border-b',
				!notification.isRead && 'bg-blue-500/10 hover:bg-blue-500/20',
			)}
			onClick={() => onClick(notification)}
		>
			<p className="text-sm">{notification.message}</p>
			<p className="text-xs text-muted-foreground mt-1">
				{formatDate(notification.createdAt)}
			</p>
		</div>
	);
};

const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
	notifications,
	onClose,
	fetchNextPage,
	hasNextPage,
	isFetchingNextPage,
}) => {
	const navigate = useNavigate();
	const markAsReadMutation = useMarkNotificationAsRead();

	const handleNotificationClick = (notification: NotificationDto) => {
		if (!notification.isRead) {
			// Perform the mutation, but don't wait for it to complete to navigate.
			// The query invalidation will update the UI in the background.
			markAsReadMutation.mutate(notification.notificationId);
		}
		navigate(notification.link);
		onClose();
	};

	return (
		<div className="flex flex-col h-full">
			<div className="p-3 border-b">
				<h4 className="font-semibold text-lg">Notifications</h4>
			</div>
			<ScrollArea className="flex-1">
				{notifications.length === 0 ? (
					<p className="text-muted-foreground text-center p-8">
						You have no notifications.
					</p>
				) : (
					<div>
						{notifications.map((n) => (
							<NotificationItem
								key={n.notificationId}
								notification={n}
								onClick={handleNotificationClick}
							/>
						))}
					</div>
				)}
			</ScrollArea>
			{hasNextPage && (
				<div className="p-2 border-t">
					<Button
						variant="outline"
						className="w-full"
						onClick={() => fetchNextPage()}
						disabled={isFetchingNextPage}
					>
						{isFetchingNextPage ? 'Loading...' : 'Load More'}
					</Button>
				</div>
			)}
		</div>
	);
};

export default NotificationsDropdown;
