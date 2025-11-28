import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/badge';
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
import { Check, X } from 'lucide-react';
import React, { useState } from 'react';

export type MultiSelectOption = {
	value: string;
	label: string;
};

interface MultiSelectProps {
	options: MultiSelectOption[];
	selected: string[];
	onChange: React.Dispatch<React.SetStateAction<string[]>>;
	className?: string;
	placeholder?: string;
	isLoading?: boolean;
	onSearch?: (value: string) => void;
}

export function MultiSelect({
	options,
	selected,
	onChange,
	className,
	placeholder = 'Select options...',
	isLoading,
	onSearch,
}: MultiSelectProps) {
	const [open, setOpen] = useState(false);
	const selectedSet = new Set(selected);

	const handleUnselect = (value: string) => {
		onChange(selected.filter((s) => s !== value));
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className={cn('w-full justify-between h-auto min-h-10', className)}
					onClick={() => setOpen(!open)}
				>
					<div className="flex gap-1 flex-wrap">
						{selected.length > 0 ? (
							options
								.filter((option) => selectedSet.has(option.value))
								.map((option) => (
									<Badge
										variant="secondary"
										key={option.value}
										className="mr-1 mb-1"
										onClick={(e) => {
											e.stopPropagation();
											handleUnselect(option.value);
										}}
									>
										{option.label}
										<X className="ml-1 h-3 w-3" />
									</Badge>
								))
						) : (
							<span className="text-muted-foreground">{placeholder}</span>
						)}
					</div>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-full p-0">
				<Command>
					<CommandInput
						placeholder="Search..."
						onValueChange={onSearch}
						disabled={isLoading}
					/>
					<CommandList>
						<CommandEmpty>
							{isLoading ? 'Loading...' : 'No results found.'}
						</CommandEmpty>
						<CommandGroup>
							{options.map((option) => (
								<CommandItem
									key={option.value}
									onSelect={() => {
										onChange(
											selectedSet.has(option.value)
												? selected.filter((s) => s !== option.value)
												: [...selected, option.value],
										);
										setOpen(true);
									}}
								>
									<Check
										className={cn(
											'mr-2 h-4 w-4',
											selectedSet.has(option.value)
												? 'opacity-100'
												: 'opacity-0',
										)}
									/>
									{option.label}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
