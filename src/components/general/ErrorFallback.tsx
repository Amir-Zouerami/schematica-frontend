import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Separator } from '@/shared/ui/separator';
import { AlertTriangle, Home, RefreshCw, Terminal } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ErrorFallbackProps {
	error?: Error | null;
	resetErrorBoundary?: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
	const navigate = useNavigate();

	const handleGoHome = () => {
		if (resetErrorBoundary) {
			resetErrorBoundary();
		}

		navigate('/', { replace: true });
		window.location.reload();
	};

	const handleReload = () => {
		window.location.reload();
	};

	return (
		<div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-6 relative overflow-hidden">
			{/* Ambient Background Glow */}
			<div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
			<div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

			<div className="relative w-full max-w-2xl z-10">
				<div className="glass-card border border-white/10 shadow-2xl overflow-hidden rounded-xl">
					{/* Header Section */}
					<div className="p-8 text-center space-y-4">
						<div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20 mb-6 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
							<AlertTriangle className="h-8 w-8 text-destructive" />
						</div>

						<h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
							System Critical Error
						</h1>
						<p className="text-muted-foreground text-lg max-w-md mx-auto">
							The application encountered an unexpected state and could not recover.
						</p>
					</div>

					<Separator className="bg-white/5" />

					{/* Terminal / Error Details Section */}
					<div className="p-6 bg-black/20">
						<div className="rounded-lg border border-white/5 bg-black/40 overflow-hidden">
							<div className="flex items-center gap-2 px-4 py-2 bg-white/5 border-b border-white/5">
								<Terminal className="h-3 w-3 text-muted-foreground" />

								<span className="text-xs font-mono text-muted-foreground">
									Console Output
								</span>
							</div>

							<ScrollArea className="h-48 w-full p-4">
								<div className="font-mono text-xs md:text-sm space-y-2">
									<p className="text-red-400 font-semibold">
										{error?.name || 'Error'}:{' '}
										{error?.message || 'Unknown error occurred'}
									</p>

									{error?.stack && (
										<pre className="text-muted-foreground/60 whitespace-pre-wrap pl-4 border-l-2 border-white/10 mt-2">
											{error.stack}
										</pre>
									)}
								</div>
							</ScrollArea>
						</div>
					</div>

					<Separator className="bg-white/5" />

					{/* Actions Footer */}
					<div className="p-6 bg-white/5 flex flex-col sm:flex-row gap-3 justify-center items-center">
						<Button
							variant="outline"
							onClick={handleGoHome}
							className="w-full sm:w-auto cursor-pointer h-11 border-white/10 hover:bg-white/5 hover:text-white"
						>
							<Home className="mr-2 h-4 w-4" />
							Return Home
						</Button>

						<Button
							variant="default"
							onClick={handleReload}
							className="w-full sm:w-auto h-11 cursor-pointer bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg shadow-blue-900/20"
						>
							<RefreshCw className="mr-2 h-4 w-4" />
							Reload Application
						</Button>
					</div>
				</div>

				<div className="text-center mt-8 text-xs text-muted-foreground/40 font-mono">
					ERR_CODE:{' '}
					{error?.message?.includes('Minified React error')
						? 'REACT_CRASH'
						: 'RUNTIME_EXCEPTION'}
				</div>
			</div>
		</div>
	);
};
