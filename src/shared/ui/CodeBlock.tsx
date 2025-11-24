import React, { lazy, Suspense } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/shared/ui/skeleton';
import SimpleCodeBlock from './SimpleCodeBlock';

// Dynamically import Monaco Editor only for OpenAPI editing
const MonacoEditor = lazy(() => import('@monaco-editor/react').then(module => ({ default: module.default })));

interface CodeBlockProps {
	code: string;
	language?: string;
	showLineNumbers?: boolean;
	caption?: string;
	height?: string;
	readOnly?: boolean;
	onChange?: (value: string | undefined) => void;
	useMonaco?: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
	code,
	language = 'json',
	showLineNumbers = true,
	caption,
	height = '200px',
	readOnly = true,
	onChange,
	useMonaco = false,
}) => {
	const { toast } = useToast();

	if (!useMonaco || (readOnly && !useMonaco)) {
		return <SimpleCodeBlock code={code} language={language} showLineNumbers={showLineNumbers} caption={caption} />;
	}

	const copyToClipboard = () => {
		navigator.clipboard.writeText(code).then(
			() => {
				toast({
					title: 'Copied to clipboard',
					description: 'Code has been copied to your clipboard',
				});
			},
			err => {
				toast({
					title: 'Copy failed',
					description: 'Could not copy code to clipboard',
					variant: 'destructive',
				});
			},
		);
	};

	return (
		<div className="relative rounded-md overflow-hidden bg-secondary/40">
			{caption && <div className="text-xs px-4 py-1 border-b border-border bg-background/50">{caption}</div>}
			<div className="relative">
				{readOnly && (
					<Button
						variant="ghost"
						size="icon"
						className="absolute right-2 top-2 h-8 w-8 opacity-70 hover:opacity-100 z-10"
						onClick={copyToClipboard}>
						<Copy className="h-4 w-4" />
					</Button>
				)}
				<Suspense fallback={<Skeleton className={`w-full h-[${height}]`} />}>
					<MonacoEditor
						height={height}
						language={language}
						value={code}
						onChange={onChange}
						theme="vs-dark"
						options={{
							readOnly,
							minimap: { enabled: false },
							lineNumbers: showLineNumbers ? 'on' : 'off',
							renderLineHighlight: 'none',
							scrollBeyondLastLine: false,
							folding: true,
							automaticLayout: true,
							scrollbar: {
								verticalScrollbarSize: 10,
								horizontalScrollbarSize: 10,
							},
						}}
					/>
				</Suspense>
			</div>
		</div>
	);
};

export default CodeBlock;
