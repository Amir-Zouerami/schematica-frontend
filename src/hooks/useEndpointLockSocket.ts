import { useAuth } from '@/app/providers/AuthContext';
import type { components } from '@/shared/types/api-types';
import { useEffect, useState } from 'react';

type LockDto = components['schemas']['LockDto'];

interface LockUpdatePayload {
	resourceId: string;
	lock: LockDto | null;
}

export const useEndpointLockSocket = (endpointId: string | undefined) => {
	const { lockingSocket } = useAuth();
	const [activeLock, setActiveLock] = useState<LockDto | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		if (!endpointId || !lockingSocket) {
			setIsLoading(false);
			return;
		}

		setIsLoading(true);

		const handleLockUpdate = (data: LockUpdatePayload) => {
			// Multiplexing Logic: Filter events by resourceId
			if (data.resourceId === endpointId) {
				setActiveLock(data.lock);
				setIsLoading(false);
			}
		};

		// Subscribe
		lockingSocket.emit('subscribeToResource', endpointId);
		lockingSocket.on('lock_updated', handleLockUpdate);

		return () => {
			lockingSocket.off('lock_updated', handleLockUpdate);
		};
	}, [endpointId, lockingSocket]);

	return { activeLock, isLoading };
};
