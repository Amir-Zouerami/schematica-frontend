import {
	useMarkAllNotificationsAsRead,
	useMarkNotificationAsRead,
} from '@/entities/Notification/api/useNotifications';
import { useToast } from '@/hooks/use-toast';
import { getStorageUrl } from '@/shared/lib/storage';
import { cn } from '@/shared/lib/utils';
import type { components } from '@/shared/types/api-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, Inbox, Loader2 } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

type NotificationDto = components['schemas']['NotificationDto'];

interface NotificationsDropdownProps {
	notifications: NotificationDto[];
	onClose: () => void;
	fetchNextPage: () => void;
	hasNextPage?: boolean;
	isFetchingNextPage: boolean;
}

const cleanNotificationMessage = (message: string, actorName: string) => {
	const lowerMsg = message.toLowerCase();
	const lowerActor = actorName.toLowerCase();

	if (lowerMsg.startsWith(`user '${lowerActor}'`)) {
		return message.substring(6 + actorName.length + 2).trim();
	}

	if (message.includes(actorName)) {
		return message
			.replace(actorName, '')
			.replace(/^User '' /, '')
			.replace(/^User ' '/, '')
			.trim();
	}

	return message;
};

const NotificationItem: React.FC<{
	notification: NotificationDto;
	onClick: (notification: NotificationDto) => void;
}> = ({ notification, onClick }) => {
	const actorName = notification.actor?.username || 'System';
	const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });

	const displayMessage = cleanNotificationMessage(notification.message, actorName);

	return (
		<div
			className={cn(
				'group relative p-4 cursor-pointer transition-all duration-200 border-b border-border/40 last:border-0 hover:bg-muted/40',
				!notification.isRead && 'bg-primary/5 hover:bg-primary/10',
			)}
			onClick={() => onClick(notification)}
		>
			{/* Unread Glow Strip */}
			{!notification.isRead && (
				<div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary shadow-[0_0_10px_rgba(var(--primary),0.6)]" />
			)}

			<div className="flex items-start gap-4">
				<Avatar
					className={cn(
						'h-9 w-9 border border-border/50 shadow-sm shrink-0 mt-0.5',
						notification.actor?.isDeleted && 'grayscale opacity-50',
					)}
				>
					<AvatarImage
						src={getStorageUrl(notification.actor?.profileImage)}
						alt={actorName}
						className="object-cover"
					/>

					<AvatarFallback className="text-xs bg-secondary font-medium">
						{actorName.substring(0, 2).toUpperCase()}
					</AvatarFallback>
				</Avatar>

				<div className="flex-1 space-y-1">
					<p className="text-sm leading-snug text-foreground/90 group-hover:text-foreground transition-colors">
						<span
							className={cn(
								'font-semibold text-foreground',
								notification.actor?.isDeleted &&
									'text-muted-foreground line-through decoration-muted-foreground/50',
							)}
						>
							{actorName}
						</span>{' '}
						<span
							className="text-muted-foreground"
							dangerouslySetInnerHTML={{
								__html: displayMessage,
							}}
						/>
					</p>

					<p className="text-[11px] text-muted-foreground/60 font-medium uppercase tracking-wider">
						{timeAgo}
					</p>
				</div>
				{!notification.isRead && (
					<div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2 shadow-[0_0_5px_rgba(var(--primary),0.5)]" />
				)}
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
	const { toast } = useToast();
	const markAsReadMutation = useMarkNotificationAsRead();
	const markAllAsReadMutation = useMarkAllNotificationsAsRead();

	const loaderRef = useRef<HTMLDivElement>(null);
	const scrollAreaRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
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
			{ root: scrollViewport, threshold: 0.1, rootMargin: '50px' },
		);

		const currentLoader = loaderRef.current;
		observer.observe(currentLoader);
		return () => observer.unobserve(currentLoader);
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	const handleNotificationClick = (notification: NotificationDto) => {
		if (!notification.isRead) {
			markAsReadMutation.mutate(notification.notificationId);
		}

		navigate(notification.link);
		onClose();
	};

	const handleMarkAllRead = () => {
		markAllAsReadMutation.mutate(undefined, {
			onSuccess: (data) => {
				toast({
					title: 'Success',
					description: data.message || 'All notifications marked as read.',
				});
			},

			onError: () => {
				toast({
					title: 'Error',
					description: 'Failed to mark notifications as read.',
					variant: 'destructive',
				});
			},
		});
	};

	return (
		<div className="flex flex-col h-[480px] w-full">
			<div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/20">
				<h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
					<Bell className="h-4 w-4 text-primary" />
					Notifications
				</h4>

				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className="h-7 px-2 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-50 cursor-pointer"
							onClick={handleMarkAllRead}
							disabled={markAllAsReadMutation.isPending}
						>
							{markAllAsReadMutation.isPending ? (
								<Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
							) : (
								<CheckCheck className="h-3.5 w-3.5 mr-1.5" />
							)}
							Mark all read
						</Button>
					</TooltipTrigger>

					<TooltipContent>
						<p>Mark all notifications as read</p>
					</TooltipContent>
				</Tooltip>
			</div>

			<ScrollArea ref={scrollAreaRef} className="flex-1">
				{notifications.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-[400px] p-6 text-center animate-in fade-in zoom-in duration-300">
						<div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
							<Inbox className="h-8 w-8 text-muted-foreground/50" />
						</div>

						<h3 className="font-medium text-foreground">All caught up!</h3>

						<p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
							You have no new notifications at the moment.
						</p>
					</div>
				) : (
					<div className="pb-2">
						{notifications.map((n) => (
							<NotificationItem
								key={n.notificationId}
								notification={n}
								onClick={handleNotificationClick}
							/>
						))}

						<div ref={loaderRef} className="flex justify-center p-4 min-h-[50px]">
							{isFetchingNextPage && (
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<Loader2 className="h-3.5 w-3.5 animate-spin" />
									Loading more...
								</div>
							)}
						</div>
					</div>
				)}
			</ScrollArea>
		</div>
	);
};

export default NotificationsDropdown;
