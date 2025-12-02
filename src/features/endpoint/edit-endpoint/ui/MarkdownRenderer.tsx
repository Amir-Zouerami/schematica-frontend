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
			className={cn(
				'text-foreground leading-relaxed wrap-break-word whitespace-pre-wrap',
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
				<ReactMarkdown
					components={{
						h1: ({ children }) => (
							<h1 dir="auto" className="text-2xl font-bold mt-6 mb-4 border-b pb-2">
								{children}
							</h1>
						),

						h2: ({ children }) => (
							<h2 dir="auto" className="text-xl font-bold mt-5 mb-3">
								{children}
							</h2>
						),

						h3: ({ children }) => (
							<h3 dir="auto" className="text-lg font-semibold mt-4 mb-2">
								{children}
							</h3>
						),

						h4: ({ children }) => (
							<h4 dir="auto" className="text-base font-semibold mt-3 mb-1">
								{children}
							</h4>
						),

						ul: ({ children }) => (
							<ul className="list-disc list-outside px-5 leading-4">{children}</ul>
						),

						ol: ({ children }) => (
							<ol className="list-decimal list-outside px-5 leading-4">{children}</ol>
						),

						// List Items: Auto-detect direction.
						li: ({ children }) => <li dir="auto">{children}</li>,

						// Paragraphs: Auto-detect alignment.
						p: ({ children }) => (
							<p dir="auto" className="my-1 leading-7">
								{children}
							</p>
						),

						// Code: Always force LTR for technical content
						code: ({ className, children, ...props }: any) => {
							const match = /language-(\w+)/.exec(className || '');
							const isInline = !match && !String(children).includes('\n');

							if (isInline) {
								return (
									<code
										dir="ltr"
										className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-pink-500 dark:text-pink-400 inline-block align-middle mx-1"
										{...props}
									>
										{children}
									</code>
								);
							}

							return (
								<div
									dir="ltr"
									className="relative my-4 rounded-lg bg-[#1e1e1e] p-4 font-mono text-sm text-gray-200 overflow-x-auto border border-white/10 text-left"
								>
									<code className={className} {...props}>
										{children}
									</code>
								</div>
							);
						},

						pre: ({ children }) => (
							<pre className="m-0 p-0 bg-transparent">{children}</pre>
						),

						// Links
						a: ({ href, children }) => (
							<a
								href={href}
								target="_blank"
								rel="noopener noreferrer"
								className="text-blue-500 hover:underline hover:text-blue-400 transition-colors"
								dir="auto"
							>
								{children}
							</a>
						),

						blockquote: ({ children }) => (
							<blockquote
								dir="auto"
								className="border-s-4 border-primary/30 ps-4 py-1 my-4 bg-muted/20 italic rounded-e"
							>
								{children}
							</blockquote>
						),
					}}
				>
					{content}
				</ReactMarkdown>
			</Suspense>
		</div>
	);
};

export default MarkdownRenderer;
