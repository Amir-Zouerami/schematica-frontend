import { NOTIFICATIONS_QUERY_KEY } from '@/entities/Notification/api/useNotifications';
import { ME_QUERY_KEY } from '@/entities/User/api/useMe';
import { useToast } from '@/hooks/use-toast';
import { api, ApiError } from '@/shared/api/api';
import { useNotificationSound } from '@/shared/hooks/useNotificationSound';
import type { components } from '@/shared/types/api-types';
import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type ChangePasswordDto = components['schemas']['ChangePasswordDto'];
type NotificationDto = components['schemas']['NotificationDto'];

interface LogoutOptions {
	title?: string;
	description?: string;
}

interface AuthContextType {
	isAuthenticated: boolean;
	isLoading: boolean;
	login: (username: string, password: string) => Promise<void>;
	logout: (options?: LogoutOptions) => void;
	changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
	handleOAuthCallback: (token: string) => Promise<void>;
	lockingSocket: Socket | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [lockingSocket, setLockingSocket] = useState<Socket | null>(null);
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const { playNotificationSound } = useNotificationSound();

	const performLogout = useCallback(() => {
		localStorage.removeItem('token');
		setIsAuthenticated(false);
		queryClient.removeQueries({ queryKey: ME_QUERY_KEY });
		if (lockingSocket) {
			lockingSocket.disconnect();
			setLockingSocket(null);
		}
	}, [queryClient, lockingSocket]);

	useEffect(() => {
		const checkAuthStatus = () => {
			const token = localStorage.getItem('token');
			if (token) {
				setIsAuthenticated(true);
			}
			setIsLoading(false);
		};
		checkAuthStatus();
	}, []);

	useEffect(() => {
		if (!isAuthenticated) {
			return;
		}

		const token = localStorage.getItem('token');
		const backendUrl = import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:3000';

		const notifSocket = io(backendUrl, {
			path: '/socket.io',
			auth: { token },
			transports: ['websocket'],
		});

		notifSocket.on('notification', (newNotification: NotificationDto) => {
			playNotificationSound();

			toast({
				title: 'New Notification',
				description: newNotification.message,
			});

			queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
		});

		const lockSocket = io(`${backendUrl}/locking`, {
			path: '/socket.io',
			auth: { token },
			transports: ['websocket'],
		});

		setLockingSocket(lockSocket);

		return () => {
			notifSocket.disconnect();
			lockSocket.disconnect();
		};
	}, [isAuthenticated, queryClient, playNotificationSound, toast]);

	const login = async (username: string, password: string) => {
		try {
			const loginResponse = await api.post<{ access_token: string }>(
				'/auth/login',
				{ username, password },
				{ skipGlobalErrorHandler: true },
			);

			const token = loginResponse.data.access_token;
			localStorage.setItem('token', token);
			setIsAuthenticated(true);

			await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
			toast({ title: 'Login successful', description: `Welcome back!`, duration: 2000 });
		} catch (error) {
			if (error instanceof ApiError && error.status === 401) {
				throw new Error('Invalid username or password.');
			}

			throw new Error('An unexpected error occurred during login. Please try again.');
		}
	};

	const handleOAuthCallback = async (token: string) => {
		try {
			localStorage.setItem('token', token);
			setIsAuthenticated(true);

			await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
			toast({ title: 'Login successful', description: `Welcome!`, duration: 2000 });
		} catch (error) {
			performLogout();
			throw new Error('The provided authentication token is invalid or has expired.');
		}
	};

	const logout = useCallback(
		(options?: LogoutOptions) => {
			performLogout();
			toast({
				title: options?.title || 'Logged out',
				description: options?.description || 'You have been successfully logged out.',
			});
		},
		[performLogout, toast],
	);

	const changePassword = async (currentPassword: string, newPassword: string) => {
		try {
			const payload: ChangePasswordDto = { currentPassword, newPassword };
			await api.post('/users/change-password', payload);
		} catch (error) {
			if (error instanceof ApiError && error.status === 401) {
				performLogout();
			}

			throw error;
		}
	};

	return (
		<AuthContext.Provider
			value={{
				isAuthenticated,
				isLoading,
				login,
				logout,
				changePassword,
				handleOAuthCallback,
				lockingSocket,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);

	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}

	return context;
};
