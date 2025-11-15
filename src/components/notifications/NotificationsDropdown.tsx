import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMarkNotificationAsRead } from '@/hooks/api/useNotifications';
import { cn } from '@/lib/utils';
import type { components } from '@/types/api-types';
import { formatDate } from '@/utils/schemaUtils';
import { BellRing, Inbox, Loader2 } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

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
	const actorName = notification.actor?.username || 'System';

	return (
		<div
			className={cn(
				'p-3 hover:bg-secondary cursor-pointer border-b',
				!notification.isRead && 'bg-blue-500/10 hover:bg-blue-500/20',
			)}
			onClick={() => onClick(notification)}
		>
			<div className="flex items-start gap-3">
				<Avatar className="h-6 w-6">
					<AvatarImage
						src={
							typeof notification.actor?.profileImage === 'string'
								? notification.actor.profileImage
								: undefined
						}
						alt={actorName}
					/>
					<AvatarFallback className="text-xs">
						{actorName.substring(0, 2).toUpperCase()}
					</AvatarFallback>
				</Avatar>
				<div className="flex-1">
					<p className="text-sm">{notification.message}</p>
					<p className="text-xs text-muted-foreground mt-1">
						{formatDate(notification.createdAt)}
					</p>
				</div>
			</div>
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
	const loaderRef = useRef<HTMLDivElement>(null);
	const scrollAreaRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// Find the actual scrolling element within ScrollArea
		const scrollViewport = scrollAreaRef.current?.querySelector(
			'[data-radix-scroll-area-viewport]',
		);

		if (!scrollViewport || !loaderRef.current) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{
				root: scrollViewport, // Observe within the scroll container
				threshold: 0.1,
				rootMargin: '50px', // Trigger slightly before reaching the bottom
			},
		);

		const currentLoader = loaderRef.current;
		observer.observe(currentLoader);

		return () => {
			observer.unobserve(currentLoader);
		};
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	const handleNotificationClick = (notification: NotificationDto) => {
		if (!notification.isRead) {
			markAsReadMutation.mutate(notification.notificationId);
		}
		navigate(notification.link);
		onClose();
	};

	return (
		<div className="flex flex-col h-full">
			<div className="p-3 border-b">
				<h4 className="font-semibold text-lg flex items-center gap-2">
					<BellRing className="h-5 w-5" />
					Notifications
				</h4>
			</div>
			<ScrollArea ref={scrollAreaRef} className="flex-1">
				{notifications.length === 0 ? (
					<div className="flex items-center justify-center h-full p-4">
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<Inbox className="h-8 w-8" />
								</EmptyMedia>
								<EmptyTitle className="text-base">All caught up!</EmptyTitle>
								<EmptyDescription>You have no new notifications.</EmptyDescription>
							</EmptyHeader>
						</Empty>
					</div>
				) : (
					<div>
						{notifications.map((n) => (
							<NotificationItem
								key={n.notificationId}
								notification={n}
								onClick={handleNotificationClick}
							/>
						))}
						<div ref={loaderRef} className="flex justify-center p-4">
							{isFetchingNextPage && (
								<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
							)}
							{!isFetchingNextPage && hasNextPage && (
								<div className="h-1" /> // Invisible trigger element
							)}
						</div>
					</div>
				)}
			</ScrollArea>
		</div>
	);
};

export default NotificationsDropdown;
