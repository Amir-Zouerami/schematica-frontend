import { Button } from '@/shared/ui/button';
import { AlertOctagon, ArrowLeft } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ModernErrorStateProps {
	title?: string;
	description?: string;
	actionLabel?: string;
	onAction?: () => void;
	backLink?: string;
}

export const ModernErrorState: React.FC<ModernErrorStateProps> = ({
	title = 'Something went wrong',
	description = 'We encountered an error while loading this resource.',
	actionLabel = 'Try Again',
	onAction,
	backLink = '/',
}) => {
	const navigate = useNavigate();

	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-in fade-in zoom-in duration-300">
			<div className="relative mb-6">
				<div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
				<div className="relative bg-background border border-destructive/30 p-4 rounded-2xl shadow-2xl">
					<AlertOctagon className="h-12 w-12 text-destructive" />
				</div>
			</div>

			<h2 className="text-3xl font-bold tracking-tight mb-3 bg-linear-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
				{title}
			</h2>

			<p className="text-muted-foreground max-w-md mb-8 text-lg leading-relaxed">
				{description}
			</p>

			<div className="flex items-center gap-3">
				<Button
					variant="outline"
					size="lg"
					onClick={() => navigate(backLink)}
					className="gap-2 cursor-pointer"
				>
					<ArrowLeft className="h-4 w-4" />
					Go Back
				</Button>
				{onAction && (
					<Button
						size="lg"
						onClick={onAction}
						className="cursor-pointer shadow-lg shadow-primary/20"
					>
						{actionLabel}
					</Button>
				)}
			</div>
		</div>
	);
};
