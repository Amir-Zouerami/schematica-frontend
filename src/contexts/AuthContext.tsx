import { NOTIFICATIONS_QUERY_KEY } from '@/hooks/api/useNotifications';
import { useToast } from '@/hooks/use-toast';
import type { components } from '@/types/api-types';
import { api, ApiError, ApiResponse } from '@/utils/api';
import { InfiniteData, useQueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// --- TYPE UPDATE ---
// The authenticated user object now uses the more detailed MeDto
type User = components['schemas']['MeDto'];
type ChangePasswordDto = components['schemas']['ChangePasswordDto'];
type NotificationDto = components['schemas']['NotificationDto'];

type NotificationsResponse = {
	data: NotificationDto[];
	meta: components['schemas']['PaginationMetaDto'];
};

interface AuthContextType {
	user: User | null; // This now refers to MeDto
	isAuthenticated: boolean;
	isLoading: boolean;
	login: (username: string, password: string) => Promise<void>;
	logout: () => void;
	changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
	handleOAuthCallback: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<User | null>(null);
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const { toast } = useToast();
	const queryClient = useQueryClient();

	useEffect(() => {
		if (!isAuthenticated) {
			return;
		}

		const backendUrl = import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:3000';

		const socket = io(backendUrl, {
			path: '/socket.io',
			auth: { token: localStorage.getItem('token') },
		});

		socket.on('notification', (newNotification: NotificationDto) => {
			console.log('New notification received:', newNotification);

			queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });

			queryClient.setQueryData<InfiniteData<ApiResponse<NotificationsResponse>>>(
				NOTIFICATIONS_QUERY_KEY,
				(oldData) => {
					if (!oldData || !oldData.pages || oldData.pages.length === 0) {
						return {
							pages: [
								{
									data: {
										data: [newNotification],
										meta: { total: 1, page: 1, limit: 10, lastPage: 1 },
									},
									meta: {
										requestId: '',
										apiVersion: '2',
										timestamp: new Date().toISOString(),
									},
								},
							],
							pageParams: [1],
						};
					}

					const firstPage = oldData.pages[0];
					const existingArray = firstPage?.data?.data;
					const safeArray = Array.isArray(existingArray) ? existingArray : [];
					const updatedFirstPage = {
						...firstPage,
						data: {
							...firstPage.data,
							data: [newNotification, ...safeArray],
						},
					};

					return {
						...oldData,
						pages: [updatedFirstPage, ...oldData.pages.slice(1)],
					};
				},
			);
		});

		return () => {
			socket.off('connect');
			socket.off('disconnect');
			socket.off('connect_error');
			socket.off('notification');
			socket.disconnect();
		};
	}, [isAuthenticated, queryClient]);

	const performLogout = useCallback(() => {
		localStorage.removeItem('token');
		setUser(null);
		setIsAuthenticated(false);
	}, []);

	useEffect(() => {
		const checkAuthStatus = async () => {
			const token = localStorage.getItem('token');
			if (!token) {
				setIsLoading(false);
				return;
			}

			try {
				// --- TYPE UPDATE ---
				// Fetching the user profile now expects the MeDto type
				const response = await api.get<User>('/auth/me');
				setUser(response.data);
				setIsAuthenticated(true);
			} catch (error) {
				performLogout();
			} finally {
				setIsLoading(false);
			}
		};

		checkAuthStatus();
	}, [performLogout]);

	const login = async (username, password) => {
		setIsLoading(true);
		try {
			const loginResponse = await api.post<{ access_token: string }>('/auth/login', {
				username,
				password,
			});
			const token = loginResponse.data.access_token;
			localStorage.setItem('token', token);

			// --- TYPE UPDATE ---
			const profileResponse = await api.get<User>('/auth/me');
			setUser(profileResponse.data);
			setIsAuthenticated(true);

			toast({
				title: 'Login successful',
				description: `Welcome back, ${profileResponse.data.username}!`,
				duration: 2000,
			});
		} catch (error) {
			const errorMessage =
				error instanceof ApiError ? error.message : 'Login failed. Please try again.';
			toast({
				title: 'Login failed',
				description: errorMessage,
				variant: 'destructive',
			});
			throw error;
		} finally {
			setIsLoading(false);
		}
	};

	const handleOAuthCallback = async (token: string) => {
		setIsLoading(true);
		try {
			localStorage.setItem('token', token);
			// --- TYPE UPDATE ---
			const profileResponse = await api.get<User>('/auth/me');
			setUser(profileResponse.data);
			setIsAuthenticated(true);

			toast({
				title: 'Login successful',
				description: `Welcome, ${profileResponse.data.username}!`,
				duration: 2000,
			});
		} catch (error) {
			performLogout();
			throw new Error('The provided authentication token is invalid or has expired.');
		} finally {
			setIsLoading(false);
		}
	};

	const logout = useCallback(() => {
		performLogout();
		toast({
			title: 'Logged out',
			description: 'You have been successfully logged out.',
		});
	}, [performLogout, toast]);

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
				user,
				isAuthenticated,
				isLoading,
				login,
				logout,
				changePassword,
				handleOAuthCallback,
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
