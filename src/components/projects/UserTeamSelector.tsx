import { cn } from '@/shared/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/shared/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { ChevronsUpDown, Loader2, Users as TeamsIcon } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import { useSearchableList } from '@/shared/lib/hooks/useSearchableList';

export type SelectableItem = {
	id: string;
	name: string;
	image?: string | null;
	isDeleted?: boolean;
};

interface UserTeamSelectorProps {
	type: 'user' | 'team';
	onSelect: (item: SelectableItem) => void;
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

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedSearchTerm(searchTerm);
		}, 300);
		return () => clearTimeout(handler);
	}, [searchTerm]);

	const MIN_SEARCH_LENGTH = 2;
	const isSearchLengthValid =
		debouncedSearchTerm.length >= MIN_SEARCH_LENGTH || debouncedSearchTerm.length === 0;

	const { data, error, isLoading } = useSearchableList(type, debouncedSearchTerm);

	const availableItems: SelectableItem[] = useMemo(() => {
		if (!data) return [];
		return data
			.map((item) => ({
				id: item.id,
				name: 'username' in item ? item.username : item.name,
				image: 'profileImage' in item ? item.profileImage : null,
				isDeleted: 'isDeleted' in item ? item.isDeleted : false,
			}))
			.filter((item) => !disabledIds.includes(item.id));
	}, [data, disabledIds]);

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
				<Command shouldFilter={false}>
					<CommandInput
						placeholder={`Search ${type}...`}
						value={searchTerm}
						onValueChange={setSearchTerm}
					/>

					<CommandList className="max-h-64 overflow-y-auto">
						{!isSearchLengthValid ? (
							<div className="py-6 text-center text-sm text-muted-foreground">
								Type at least {MIN_SEARCH_LENGTH} characters...
							</div>
						) : isLoading ? (
							<div className="flex items-center justify-center py-6">
								<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
							</div>
						) : availableItems.length === 0 ? (
							<CommandEmpty>No results found.</CommandEmpty>
						) : (
							<CommandGroup>
								{availableItems.map((item) => (
									<CommandItem
										key={item.id}
										value={item.name}
										disabled={item.isDeleted}
										onSelect={() => {
											if (!item.isDeleted) {
												onSelect(item);
												setSearchTerm('');
												setOpen(false);
											}
										}}
										className={cn(
											'flex items-center gap-2 cursor-pointer',
											item.isDeleted && 'opacity-50 cursor-not-allowed',
										)}
									>
										{type === 'user' ? (
											<Avatar
												className={cn(
													'h-6 w-6',
													item.isDeleted && 'grayscale',
												)}
											>
												<AvatarImage src={item.image || undefined} />
												<AvatarFallback className="text-xs">
													{item.name.substring(0, 2).toUpperCase()}
												</AvatarFallback>
											</Avatar>
										) : (
											<TeamsIcon className="h-4 w-4 text-muted-foreground" />
										)}
										<div className="flex flex-col min-w-0">
											<span
												className={cn(
													'truncate',
													item.isDeleted && 'line-through',
												)}
											>
												{item.name}
											</span>
											{item.isDeleted && (
												<span className="text-[10px] text-destructive">
													Deactivated
												</span>
											)}
										</div>
									</CommandItem>
								))}
							</CommandGroup>
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
