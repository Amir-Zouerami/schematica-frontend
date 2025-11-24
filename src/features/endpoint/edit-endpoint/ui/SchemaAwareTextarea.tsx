import { useSchemas } from '@/entities/Schema/api/useSchemas';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Popover, PopoverAnchor, PopoverContent } from '@/shared/ui/popover';
import { Textarea } from '@/shared/ui/textarea';
import { AlignLeft, Box, Loader2 } from 'lucide-react';
import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';

interface SchemaAwareTextareaProps extends React.ComponentProps<typeof Textarea> {
	projectId: string;
	value: string;
	onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	isSubmitting?: boolean;
}

export const SchemaAwareTextarea = forwardRef<HTMLTextAreaElement, SchemaAwareTextareaProps>(
	({ projectId, value, onChange, isSubmitting, className, ...props }, ref) => {
		const [showSuggestions, setShowSuggestions] = useState(false);
		const [searchTerm, setSearchTerm] = useState('');
		const [selectedIndex, setSelectedIndex] = useState(0);
		const [insertionState, setInsertionState] = useState<{
			lastHash: number;
			cursorPos: number;
			textareaElement: HTMLTextAreaElement;
		} | null>(null);

		const internalRef = useRef<HTMLTextAreaElement>(null);
		const textareaRef = (ref || internalRef) as React.RefObject<HTMLTextAreaElement>;
		const textareaElementRef = useRef<HTMLTextAreaElement | null>(null);

		const { data: schemas, isLoading } = useSchemas(projectId);

		const filteredSchemas =
			schemas?.filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase())) || [];

		useEffect(() => {
			setSelectedIndex(0);
		}, [searchTerm]);

		const prettifyJson = (input: string) => {
			if (!input || input.trim() === '') return null;

			try {
				const parsed = JSON.parse(input);
				return JSON.stringify(parsed, null, 2);
			} catch (e) {
				return null;
			}
		};

		const handlePrettify = (e?: React.MouseEvent) => {
			if (e) e.preventDefault();

			const formatted = prettifyJson(value);
			if (formatted && formatted !== value) {
				// Try stored element first, then ref
				const textarea = textareaElementRef.current || textareaRef.current;

				if (textarea) {
					textarea.focus();
					textarea.select();

					// Use document.execCommand for undo-friendly replacement
					const success = document.execCommand('insertText', false, formatted);

					if (!success) {
						// Fallback: Use setRangeText
						console.warn('execCommand not supported for prettify, trying setRangeText');

						try {
							textarea.setRangeText(formatted, 0, textarea.value.length, 'end');
							textarea.dispatchEvent(new Event('input', { bubbles: true }));
						} catch (err) {
							console.error('setRangeText failed:', err);

							textarea.value = formatted;
							textarea.dispatchEvent(new Event('input', { bubbles: true }));
						}
					}

					textarea.setSelectionRange(formatted.length, formatted.length);
				} else {
					console.error('Textarea element not available for prettify');
				}
			}
		};

		const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
			const val = e.target.value;
			const newPos = e.target.selectionStart;

			// Store the textarea element for later use (prettify, etc.)
			textareaElementRef.current = e.target;

			onChange(e);

			const textBeforeCursor = val.slice(0, newPos);
			const lastHashIndex = textBeforeCursor.lastIndexOf('#');

			if (lastHashIndex !== -1) {
				const textFromHashToCursor = textBeforeCursor.slice(lastHashIndex + 1);

				const hasClosingQuote =
					textFromHashToCursor.includes('"') || textFromHashToCursor.includes("'");
				const hasNewline = textFromHashToCursor.includes('\n');

				if (!hasClosingQuote && !hasNewline && textFromHashToCursor.length < 40) {
					const charBeforeHash =
						lastHashIndex > 0 ? textBeforeCursor[lastHashIndex - 1] : '';

					if (
						charBeforeHash === '"' ||
						charBeforeHash === ' ' ||
						charBeforeHash === '' ||
						charBeforeHash === ':'
					) {
						setSearchTerm(textFromHashToCursor);
						setShowSuggestions(true);
						// Store insertion state WITH the textarea element reference
						setInsertionState({
							lastHash: lastHashIndex,
							cursorPos: newPos,
							textareaElement: e.target, // Store the actual DOM element
						});

						return;
					}
				}
			}

			setShowSuggestions(false);
			setInsertionState(null);
		};

		const insertSchemaRef = useCallback(
			(schemaName: string) => {
				if (!insertionState) {
					console.error('No insertion state available');
					return;
				}

				// Use the stored textarea element directly
				const textarea = insertionState.textareaElement;
				const { lastHash, cursorPos } = insertionState;

				const charBeforeHash = lastHash > 0 ? textarea.value[lastHash - 1] : '';
				let insertion = `/components/schemas/${schemaName}`;

				if (charBeforeHash !== '"') {
					insertion = `{"$ref": "#${insertion}"}`;
				}

				// Focus the textarea FIRST, before changing state
				textarea.focus();

				// Set the selection to the range we want to replace
				textarea.setSelectionRange(lastHash, cursorPos);

				// Try execCommand first (works in most browsers and preserves undo)
				const success = document.execCommand('insertText', false, insertion);

				if (!success) {
					// Fallback: Use setRangeText which also preserves undo in modern browsers
					console.warn('execCommand not supported, trying setRangeText');

					try {
						textarea.setRangeText(insertion, lastHash, cursorPos, 'end');
						// Manually trigger input event for React Hook Form
						textarea.dispatchEvent(new Event('input', { bubbles: true }));
					} catch (err) {
						console.error('setRangeText failed:', err);

						// Last resort fallback
						const before = textarea.value.slice(0, lastHash);
						const after = textarea.value.slice(cursorPos);
						const newValue = before + insertion + after;
						const newCursorPos = before.length + insertion.length;

						textarea.value = newValue;
						textarea.dispatchEvent(new Event('input', { bubbles: true }));
						textarea.setSelectionRange(newCursorPos, newCursorPos);
					}
				}

				// Close suggestions AFTER insertion
				setShowSuggestions(false);
				setInsertionState(null);
			},
			[insertionState],
		);

		const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'i' || e.key === 'I')) {
				e.preventDefault();
				handlePrettify();
				return;
			}

			if (showSuggestions && filteredSchemas.length > 0) {
				if (e.key === 'ArrowDown') {
					e.preventDefault();
					setSelectedIndex((prev) => (prev + 1) % filteredSchemas.length);
					return;
				}

				if (e.key === 'ArrowUp') {
					e.preventDefault();
					setSelectedIndex(
						(prev) => (prev - 1 + filteredSchemas.length) % filteredSchemas.length,
					);
					return;
				}

				if (e.key === 'Enter' || e.key === 'Tab') {
					e.preventDefault();
					insertSchemaRef(filteredSchemas[selectedIndex].name);
					return;
				}

				if (e.key === 'Escape') {
					e.preventDefault();
					setShowSuggestions(false);
					setInsertionState(null);
					return;
				}
			}

			if (props.onKeyDown) props.onKeyDown(e);
		};

		return (
			<div className="relative w-full h-full group/textarea">
				<div className="absolute top-2 right-2 z-10">
					<Button
						type="button"
						variant="secondary"
						size="icon"
						className="h-7 w-7 shadow-sm bg-background/80 backdrop-blur border opacity-70 hover:opacity-100 transition-opacity"
						onClick={handlePrettify}
						title="Prettify JSON (Ctrl+Shift+I)"
					>
						<AlignLeft className="h-3.5 w-3.5" />
					</Button>
				</div>

				<Popover open={showSuggestions} onOpenChange={setShowSuggestions}>
					<PopoverAnchor asChild>
						<Textarea
							ref={textareaRef}
							value={value}
							onChange={handleInputChange}
							onKeyDown={handleKeyDown}
							disabled={isSubmitting}
							className={cn('font-mono text-sm', className)}
							autoComplete="off"
							autoCorrect="off"
							autoCapitalize="off"
							spellCheck="false"
							{...props}
						/>
					</PopoverAnchor>

					<PopoverContent
						className="p-1 w-[90vw] max-w-[300px] max-h-[200px] overflow-y-auto"
						onOpenAutoFocus={(e) => e.preventDefault()}
						align="start"
						sideOffset={5}
					>
						{isLoading ? (
							<div className="p-2 text-center text-xs text-muted-foreground">
								<Loader2 className="h-3 w-3 animate-spin mx-auto mb-1" />
								Loading schemas...
							</div>
						) : filteredSchemas.length === 0 ? (
							<div className="p-2 text-center text-xs text-muted-foreground">
								No schemas found matching "{searchTerm}"
							</div>
						) : (
							<div className="flex flex-col gap-0.5">
								{filteredSchemas.map((schema, index) => (
									<button
										key={schema.id}
										type="button"
										onMouseDown={(e) => {
											e.preventDefault();
											e.stopPropagation();

											// Call insertion immediately in mousedown before popover closes
											insertSchemaRef(schema.name);
										}}
										className={cn(
											'flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm text-left transition-colors w-full cursor-pointer',
											index === selectedIndex
												? 'bg-accent text-accent-foreground'
												: 'hover:bg-muted',
										)}
									>
										<Box className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

										<div className="flex flex-col min-w-0">
											<span className="font-medium truncate">
												{schema.name}
											</span>

											{schema.description && (
												<span className="text-[10px] text-muted-foreground truncate opacity-80">
													{schema.description}
												</span>
											)}
										</div>
									</button>
								))}
							</div>
						)}
					</PopoverContent>
				</Popover>
			</div>
		);
	},
);

SchemaAwareTextarea.displayName = 'SchemaAwareTextarea';
