import type { components } from '@/types/api-types';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type LockDto = components['schemas']['LockDto'];

/**
 * A custom hook to subscribe to real-time lock status updates for a specific endpoint.
 *
 * @param endpointId The ID of the endpoint to monitor for lock changes.
 * @returns An object containing the current lock status (`LockDto` or `null`) and a loading state.
 */
export const useEndpointLockSocket = (endpointId: string | undefined) => {
	const [activeLock, setActiveLock] = useState<LockDto | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		if (!endpointId) {
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		setActiveLock(null);

		const backendUrl = import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:3000';
		const token = localStorage.getItem('token');

		const socket: Socket = io(`${backendUrl}/locking`, {
			path: '/socket.io',
			auth: { token },
		});

		socket.on('connect', () => {
			socket.emit('subscribeToResource', endpointId);
			setIsLoading(false);
		});

		socket.on('lock_updated', (lockData: LockDto | null) => {
			setActiveLock(lockData);
			setIsLoading(false);
		});

		socket.on('connect_error', (error) => {
			console.error('Locking socket connection error:', error.message);
			setIsLoading(false);
		});

		return () => {
			socket.off('connect');
			socket.off('lock_updated');
			socket.off('connect_error');
			socket.disconnect();
		};
	}, [endpointId]);

	return { activeLock, isLoading };
};
