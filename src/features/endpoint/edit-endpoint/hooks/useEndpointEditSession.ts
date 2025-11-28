import { useAcquireLock, useReleaseLock } from '@/entities/Endpoint/api/useLocking';
import { useToast } from '@/hooks/use-toast';
import { useBeforeUnload } from '@/hooks/useBeforeunload';
import { ApiError } from '@/shared/api/api';
import { useEffect } from 'react';

interface UseEndpointEditSessionProps {
	projectId: string;
	endpointId: string;
	isEditing: boolean;
	onEditSessionEnd: () => void;
	onLockConflict: (lockDetails: { username: string; expiresAt: string }) => void;
}

interface LockDetails {
	lock: { username: string; expiresAt: string };
}

function hasLockDetails(obj: unknown): obj is LockDetails {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'lock' in obj &&
		typeof (obj as LockDetails).lock.username === 'string'
	);
}

export const useEndpointEditSession = ({
	projectId,
	endpointId,
	isEditing,
	onEditSessionEnd,
	onLockConflict,
}: UseEndpointEditSessionProps) => {
	const { toast } = useToast();
	const acquireLockMutation = useAcquireLock();
	const releaseLockMutation = useReleaseLock();

	useBeforeUnload(() => {
		if (isEditing) {
			const token = localStorage.getItem('token');
			// use the configured API base URL to prevent 404s on CDNs
			const baseUrl = import.meta.env.VITE_API_URL || '';
			const url = `${baseUrl.replace(/\/$/, '')}/api/v2/projects/${projectId}/endpoints/${endpointId}/unlock`;

			const headers = new Headers();
			if (token) headers.append('Authorization', `Bearer ${token}`);

			// keepalive is essential for "fire and forget" on unload
			fetch(url, { method: 'DELETE', headers, keepalive: true });
		}
	});

	useEffect(() => {
		if (!isEditing) return;

		const refreshLock = async () => {
			try {
				await acquireLockMutation.mutateAsync({ projectId, endpointId });
			} catch (error) {
				if (error instanceof ApiError && (error.status === 409 || error.status === 403)) {
					onEditSessionEnd();
					toast({
						title: 'Edit Session Ended',
						description: 'Lock lost or expired.',
						variant: 'destructive',
					});
				}
			}
		};

		// Refresh lock every 45 seconds
		const intervalId = setInterval(refreshLock, 45000);
		return () => clearInterval(intervalId);
	}, [isEditing, acquireLockMutation, projectId, endpointId, toast, onEditSessionEnd]);

	const beginEditSession = async () => {
		try {
			await acquireLockMutation.mutateAsync({ projectId, endpointId });
			return true;
		} catch (err) {
			if (
				err instanceof ApiError &&
				err.metaCode === 'RESOURCE_LOCKED' &&
				err.errorResponse
			) {
				const messageObj = err.errorResponse.message;

				if (typeof messageObj === 'object' && hasLockDetails(messageObj)) {
					onLockConflict(messageObj.lock);
				} else {
					toast({
						title: 'Endpoint Locked',
						description: 'This endpoint is currently being edited.',
						variant: 'destructive',
					});
				}
			} else {
				toast({
					title: 'Cannot Edit Endpoint',
					description: err instanceof ApiError ? err.message : 'Could not acquire lock.',
					variant: 'destructive',
				});
			}

			return false;
		}
	};

	const endEditSession = () => {
		releaseLockMutation.mutate(
			{ projectId, endpointId },
			{ onSettled: () => onEditSessionEnd() },
		);
	};

	return { beginEditSession, endEditSession, isAcquiringLock: acquireLockMutation.isPending };
};
