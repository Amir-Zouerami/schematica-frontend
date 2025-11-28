import { HashLoader } from 'react-spinners';

export const PageLoader = () => {
	return (
		<div className="flex h-screen w-full flex-col items-center justify-center bg-background">
			<div className="relative h-16 w-16">
				<HashLoader color="#e76e9b" />
			</div>

			<p className="mt-6 animate-pulse text-sm text-muted-foreground">
				Loading your workspace…
			</p>
		</div>
	);
};

export default PageLoader;
