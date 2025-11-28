import { useNotifications } from '@/entities/Notification/api/useNotifications';
import { Button } from '@/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Skeleton } from '@/shared/ui/skeleton';
import { Bell } from 'lucide-react';
import { useMemo, useState } from 'react';
import NotificationsDropdown from './NotificationsDropdown';

const NotificationBell = () => {
	const [isOpen, setIsOpen] = useState(false);
	const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useNotifications();

	const allNotifications = useMemo(
		() => data?.pages.flatMap((page) => page?.data ?? []) ?? [],
		[data],
	);
	const hasUnread = useMemo(() => allNotifications.some((n) => !n.isRead), [allNotifications]);

	if (isLoading) {
		return <Skeleton className="h-9 w-9 rounded-full" />;
	}

	if (error) {
		console.error('Failed to load notifications:', error);
		return (
			<Button variant="ghost" size="icon" disabled title="Could not load notifications">
				<Bell className="h-5 w-5" />
			</Button>
		);
	}

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="relative cursor-pointer hover:bg-secondary/50 transition-colors"
				>
					<Bell className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
					{hasUnread && (
						<span className="absolute top-2 right-2.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-background shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-in zoom-in duration-300"></span>
					)}
				</Button>
			</PopoverTrigger>

			<PopoverContent
				className="w-[380px] p-0 border-white/10 bg-background/80 backdrop-blur-xl shadow-2xl overflow-hidden rounded-xl mr-4"
				align="end"
				sideOffset={8}
			>
				<NotificationsDropdown
					notifications={allNotifications}
					onClose={() => setIsOpen(false)}
					fetchNextPage={fetchNextPage}
					hasNextPage={hasNextPage}
					isFetchingNextPage={isFetchingNextPage}
				/>
			</PopoverContent>
		</Popover>
	);
};

export default NotificationBell;
