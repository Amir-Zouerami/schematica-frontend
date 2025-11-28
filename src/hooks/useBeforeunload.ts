import { useEffect, useRef } from 'react';

/**
 * A hook to attach a callback to the window's `beforeunload` event.
 * This is useful for firing cleanup actions (like releasing a lock) when a user navigates away.
 * @param callback The function to execute on the beforeunload event.
 */
export const useBeforeUnload = (callback: (event: BeforeUnloadEvent) => void) => {
	const callbackRef = useRef(callback);

	useEffect(() => {
		callbackRef.current = callback;
	}, [callback]);

	useEffect(() => {
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (callbackRef.current) {
				callbackRef.current(event);
			}
		};

		window.addEventListener('beforeunload', handleBeforeUnload);

		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
	}, []);
};
