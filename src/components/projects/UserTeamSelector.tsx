import { ChevronsUpDown, Users as TeamsIcon } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchableList } from '@/hooks/api/useSearchableList'; // Import the new hook

// Define the shape of the items we'll be working with internally for rendering
type SelectableItem = {
	id: string;
	name: string;
	image?: string | null;
};

interface UserTeamSelectorProps {
	type: 'user' | 'team';
	onSelect: (id: string) => void;
	disabledIds: string[];
	triggerText: string;
}

const UserTeamSelector: React.FC<UserTeamSelectorProps> = ({
	type,
	onSelect,
	disabledIds,
	triggerText,
}) => {
	const [open, setOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

	// Debounce the search term before passing it to the data-fetching hook
	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedSearchTerm(searchTerm);
		}, 300);
		return () => clearTimeout(handler);
	}, [searchTerm]);

	// Use our new, clean, abstracted hook
	const { data, error, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, isLoading } =
		useSearchableList(type, debouncedSearchTerm);

	// Flatten the pages of data into a single array for rendering
	const allItems: SelectableItem[] =
		data?.pages
			.flatMap((page) => page.data) // `page.data` is the array of users/teams
			.map((item) => ({
				id: item.id,
				name: 'username' in item ? item.username : item.name,
				image: 'profileImage' in item ? item.profileImage : null,
			}))
			.filter((item) => !disabledIds.includes(item.id)) || [];

	const listRef = useRef<HTMLDivElement>(null);

	// Infinite scroll logic
	const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
		const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
		if (scrollHeight - scrollTop - clientHeight < 20 && hasNextPage && !isFetchingNextPage) {
			fetchNextPage();
		}
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-[150px] justify-between"
				>
					{triggerText}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>

			<PopoverContent onWheel={(e) => e.stopPropagation()} className="w-[250px] p-0">
				<Command>
					<CommandInput
						placeholder={`Search ${type}...`}
						value={searchTerm}
						onValueChange={setSearchTerm}
						disabled={isLoading && !isFetching}
					/>
					<CommandList
						ref={listRef}
						onScroll={handleScroll}
						className="max-h-64 overflow-y-auto"
					>
						{isLoading ? (
							<div className="p-2 space-y-2">
								<Skeleton className="h-8 w-full" />
								<Skeleton className="h-8 w-full" />
								<Skeleton className="h-8 w-full" />
							</div>
						) : allItems.length === 0 && !isFetching ? (
							<CommandEmpty>No results found.</CommandEmpty>
						) : (
							<CommandGroup>
								{allItems.map((item) => (
									<CommandItem
										key={item.id}
										value={item.name}
										onSelect={() => {
											onSelect(item.id);
											setSearchTerm('');
											setOpen(false);
										}}
										className="flex items-center gap-2"
									>
										{type === 'user' ? (
											<Avatar className="h-6 w-6">
												<AvatarImage src={item.image || undefined} />
												<AvatarFallback className="text-xs">
													{item.name.substring(0, 2).toUpperCase()}
												</AvatarFallback>
											</Avatar>
										) : (
											<TeamsIcon className="h-4 w-4 text-muted-foreground" />
										)}
										<span className="truncate">{item.name}</span>
									</CommandItem>
								))}
							</CommandGroup>
						)}
						{isFetchingNextPage && (
							<div className="py-2 flex justify-center">
								<p className="text-xs text-muted-foreground">Loading more...</p>
							</div>
						)}
						{error && (
							<div className="py-2 px-4">
								<p className="text-xs text-destructive">Failed to load data.</p>
							</div>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
};

export default UserTeamSelector;
