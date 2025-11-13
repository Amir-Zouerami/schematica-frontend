import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';

function EditorLoading() {
	const [progress, setProgress] = useState(13);

	useEffect(() => {
		const timer1 = setTimeout(() => setProgress(66), 400);
		const timer2 = setTimeout(() => setProgress(88), 900);

		return () => {
			clearTimeout(timer1);
			clearTimeout(timer2);
		};
	}, []);

	return (
		<div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
			<p className="text-lg font-medium">Loading Editor...</p>
			<Progress value={progress} className="w-[70%]" />
		</div>
	);
}

export default EditorLoading;
