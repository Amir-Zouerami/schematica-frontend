import { cn } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui/skeleton';
import React, { lazy, Suspense } from 'react';

const ReactMarkdown = lazy(() => import('react-markdown'));

interface MarkdownRendererProps {
	content: string;
	className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
	if (!content) return null;

	return (
		<div
			dir="auto"
			className={cn(
				'prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed wrap-break-word whitespace-pre-wrap text-start [&_p]:text-start [&_li]:text-start',
				className,
			)}
		>
			<Suspense
				fallback={
					<div className="space-y-1">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-2/3" />
					</div>
				}
			>
				<ReactMarkdown>{content}</ReactMarkdown>
			</Suspense>
		</div>
	);
};

export default MarkdownRenderer;
