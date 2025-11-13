import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/hooks/api/useNotifications';
import { Bell } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Skeleton } from '../ui/skeleton';
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
		// Silently fail for now, not to break the header layout. Log error.
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
				<Button variant="ghost" size="icon" className="relative">
					<Bell className="h-5 w-5" />
					{hasUnread && (
						<span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-red-500"></span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80 h-[450px] p-0" align="end">
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
