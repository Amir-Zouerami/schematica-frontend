import { cn } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Textarea } from '@/shared/ui/textarea';
import { FileType } from 'lucide-react';
import React, { lazy, Suspense, useState } from 'react';

const ReactMarkdown = lazy(() => import('react-markdown'));

interface MarkdownEditorProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
	value,
	onChange,
	placeholder,
	className,
	disabled,
}) => {
	const [activeTab, setActiveTab] = useState('write');

	return (
		<div
			className={cn(
				'flex flex-col border rounded-md overflow-hidden bg-background',
				className,
			)}
		>
			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className="w-full flex flex-col h-full"
			>
				<div className="flex items-center justify-between border-b bg-muted/20 px-2 h-10 shrink-0">
					<TabsList className="h-8 bg-transparent p-0">
						<TabsTrigger
							value="write"
							className="h-8 px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-border cursor-pointer"
						>
							Write
						</TabsTrigger>

						<TabsTrigger
							value="preview"
							className="h-8 px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-border cursor-pointer"
						>
							Preview
						</TabsTrigger>
					</TabsList>

					<div className="px-3 text-muted-foreground" title="Markdown Supported">
						<FileType className="h-4 w-4" />
					</div>
				</div>

				<div className="flex-1 relative min-h-[150px] overflow-hidden">
					<TabsContent
						value="write"
						className="mt-0 h-full absolute inset-0"
						tabIndex={-1}
					>
						<Textarea
							value={value}
							onChange={(e) => onChange(e.target.value)}
							placeholder={placeholder}
							className="h-full w-full rounded-none border-0 focus-visible:ring-0 resize-none p-4 text-sm leading-relaxed"
							disabled={disabled}
							dir="auto"
						/>
					</TabsContent>

					<TabsContent
						value="preview"
						className="mt-0 h-full p-4 overflow-y-auto prose prose-sm dark:prose-invert max-w-none bg-secondary/5 whitespace-pre-wrap"
						dir="auto"
						tabIndex={-1}
					>
						{value ? (
							<Suspense
								fallback={
									<div className="space-y-2">
										<Skeleton className="h-4 w-3/4" />
										<Skeleton className="h-4 w-1/2" />
									</div>
								}
							>
								<ReactMarkdown>{value}</ReactMarkdown>
							</Suspense>
						) : (
							<p className="text-muted-foreground text-sm italic">
								Nothing to preview
							</p>
						)}
					</TabsContent>
				</div>
			</Tabs>
		</div>
	);
};

export default MarkdownEditor;
