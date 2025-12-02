import { useSearchableList } from '@/shared/lib/hooks/useSearchableList';
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
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Textarea } from '@/shared/ui/textarea';
import { Loader2 } from 'lucide-react';
import React, { lazy, Suspense, useRef, useState } from 'react';

const ReactMarkdown = lazy(() => import('react-markdown'));

interface MentionInputProps {
	initialContent?: string;
	onSubmit: (content: string) => Promise<void>;
	onCancel?: () => void;
	isSubmitting: boolean;
	submitLabel: string;
}

export const MentionInput: React.FC<MentionInputProps> = ({
	initialContent = '',
	onSubmit,
	onCancel,
	isSubmitting,
	submitLabel,
}) => {
	const [content, setContent] = useState(initialContent);
	const [activeTab, setActiveTab] = useState('write');
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [cursorPos, setCursorPos] = useState(0);
	const [searchTerm, setSearchTerm] = useState('');

	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const { data: users, isLoading } = useSearchableList('user', searchTerm);
	const isValidSearch = searchTerm.length >= 2;

	const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const val = e.target.value;
		const newPos = e.target.selectionStart;
		setContent(val);
		setCursorPos(newPos);

		const textBeforeCursor = val.slice(0, newPos);
		const lastAt = textBeforeCursor.lastIndexOf('@');

		if (lastAt !== -1) {
			const charBeforeAt = lastAt > 0 ? textBeforeCursor[lastAt - 1] : ' ';
			if (/\s/.test(charBeforeAt)) {
				const query = textBeforeCursor.slice(lastAt + 1);
				if (!/\s/.test(query)) {
					setSearchTerm(query);
					setShowSuggestions(true);
					return;
				}
			}
		}

		setShowSuggestions(false);
	};

	const insertMention = (username: string) => {
		const textBeforeCursor = content.slice(0, cursorPos);
		const lastAt = textBeforeCursor.lastIndexOf('@');
		const textAfterCursor = content.slice(cursorPos);

		const newText = content.slice(0, lastAt) + `@${username} ` + textAfterCursor;
		setContent(newText);
		setShowSuggestions(false);

		setTimeout(() => {
			if (textareaRef.current) {
				textareaRef.current.focus();
				const newCursorPos = lastAt + username.length + 2;
				textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
			}
		}, 0);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (showSuggestions && e.key === 'Enter' && users && users.length > 0) {
			e.preventDefault();
			const user = users[0];
			if ('isDeleted' in user && user.isDeleted) return;

			const username = 'username' in user ? user.username : user.name;
			insertMention(username);
		}
	};

	const handleSubmit = async () => {
		if (!content.trim()) return;
		await onSubmit(content);
		if (!initialContent) setContent('');
	};

	return (
		<div className="w-full">
			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className="w-full flex flex-col border rounded-md bg-background"
			>
				<div className="flex items-center justify-between border-b bg-muted/20 px-2 h-9">
					<TabsList className="h-7 bg-transparent p-0">
						<TabsTrigger value="write" className="h-7 text-xs px-3">
							Write
						</TabsTrigger>
						<TabsTrigger value="preview" className="h-7 text-xs px-3">
							Preview
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="write" className="mt-0 relative">
					<Popover open={showSuggestions} onOpenChange={setShowSuggestions}>
						<PopoverTrigger asChild>
							<Textarea
								ref={textareaRef}
								value={content}
								onChange={handleInputChange}
								onKeyDown={handleKeyDown}
								placeholder="Write a note... (Type @ to mention)"
								className="min-h-[120px] w-full border-0 focus-visible:ring-0 resize-y p-4 text-sm leading-relaxed rounded-none shadow-none"
								disabled={isSubmitting}
								dir="auto"
							/>
						</PopoverTrigger>

						<PopoverContent
							className="p-0 w-[250px]"
							onOpenAutoFocus={(e) => e.preventDefault()}
							align="start"
							hidden={!showSuggestions}
						>
							<Command shouldFilter={false}>
								<div className="hidden">
									<CommandInput value={searchTerm} />
								</div>

								<CommandList>
									{!isValidSearch ? (
										<div className="p-3 text-center text-xs text-muted-foreground">
											Type at least 2 characters...
										</div>
									) : isLoading ? (
										<div className="p-2 text-center">
											<Loader2 className="h-4 w-4 animate-spin mx-auto" />
										</div>
									) : users && users.length > 0 ? (
										<CommandGroup heading="Users">
											{users.map((user) => {
												const isDeleted =
													'isDeleted' in user && user.isDeleted;
												const username =
													'username' in user ? user.username : user.name;

												return (
													<CommandItem
														key={user.id}
														value={username}
														disabled={isDeleted}
														onSelect={() =>
															!isDeleted && insertMention(username)
														}
														className={cn(
															'cursor-pointer',
															isDeleted && 'opacity-50',
														)}
													>
														<div className="flex items-center gap-2 w-full overflow-hidden">
															<Avatar
																className={cn(
																	'h-6 w-6',
																	isDeleted && 'grayscale',
																)}
															>
																<AvatarImage
																	src={
																		'profileImage' in user
																			? user.profileImage ||
																				undefined
																			: undefined
																	}
																/>

																<AvatarFallback>
																	{username
																		.substring(0, 2)
																		.toUpperCase()}
																</AvatarFallback>
															</Avatar>

															<span
																className={cn(
																	'truncate',
																	isDeleted && 'line-through',
																)}
															>
																{username}
															</span>
															{isDeleted && (
																<span className="text-[10px] text-destructive ml-auto">
																	Deactivated
																</span>
															)}
														</div>
													</CommandItem>
												);
											})}
										</CommandGroup>
									) : (
										<CommandEmpty>No users found.</CommandEmpty>
									)}
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				</TabsContent>

				<TabsContent
					value="preview"
					className="mt-0 p-4 min-h-[120px] prose prose-sm dark:prose-invert max-w-none bg-secondary/5 whitespace-pre-wrap [&_a]:text-blue-500 [&_a]:underline"
					dir="auto"
				>
					{content ? (
						<Suspense
							fallback={
								<div className="space-y-2">
									<Skeleton className="h-4 w-3/4" />
									<Skeleton className="h-4 w-1/2" />
								</div>
							}
						>
							<ReactMarkdown>{content}</ReactMarkdown>
						</Suspense>
					) : (
						<p className="text-muted-foreground text-sm italic">Nothing to preview</p>
					)}
				</TabsContent>
			</Tabs>

			<div className="flex justify-end gap-2 mt-3">
				{onCancel && (
					<Button
						type="button"
						variant="ghost"
						onClick={onCancel}
						disabled={isSubmitting}
						size="sm"
						className="cursor-pointer"
					>
						Cancel
					</Button>
				)}
				<Button
					type="button"
					onClick={handleSubmit}
					disabled={isSubmitting || !content.trim()}
					size="sm"
					className="cursor-pointer"
				>
					{isSubmitting ? 'Saving...' : submitLabel}
				</Button>
			</div>
		</div>
	);
};
