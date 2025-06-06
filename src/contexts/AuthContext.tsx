import { useToast } from '@/hooks/use-toast';
import { AuthState, User } from '../types/types';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthContextType extends Omit<AuthState, 'user'> {
	user: User | null;
	login: (username: string, password: string) => Promise<void>;
	logout: () => void;
	changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [authState, setAuthState] = useState<AuthContextType>({
		user: null,
		isAuthenticated: false,
		isLoading: true,
		login: async () => {},
		logout: () => {},
		changePassword: async () => {},
	});
	const { toast } = useToast();

	const performLogout = useCallback(() => {
		localStorage.removeItem('token');
		setAuthState(prev => ({
			...prev,
			user: null,
			isAuthenticated: false,
			isLoading: false,
		}));
	}, []);

	useEffect(() => {
		const checkAuth = async () => {
			try {
				const token = localStorage.getItem('token');

				if (!token) {
					setAuthState(prev => ({
						...prev,
						user: null,
						isAuthenticated: false,
						isLoading: false,
					}));

					return;
				}

				const response = await fetch(`/api/auth/me`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				if (response.ok) {
					const data = await response.json();

					setAuthState(prev => ({
						...prev,
						user: {
							...data.user,
							accessList: data.user.accessList || {
								read: false,
								write: false,
								update: false,
								delete: false,
							},
						} as User,
						isAuthenticated: true,
						isLoading: false,
					}));
				} else if (response.status === 401 || response.status === 403) {
					performLogout();
				} else {
					setAuthState(prev => ({
						...prev,
						isLoading: false,
					}));
				}
			} catch (error) {
				setAuthState(prev => ({
					...prev,
					isLoading: false,
				}));
			}
		};

		checkAuth();
	}, [performLogout]);

	const login = async (username: string, password: string) => {
		try {
			const response = await fetch(`/api/auth/login`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ username, password }),
			});

			const data = await response.json();

			if (response.ok) {
				localStorage.setItem('token', data.token);
				setAuthState(prev => ({
					...prev,
					user: {
						...data.user,
						accessList: data.user.accessList || {
							read: false,
							write: false,
							update: false,
							delete: false,
						},
					} as User,
					isAuthenticated: true,
					isLoading: false,
				}));
				toast({
					title: 'Login successful',
					description: `Welcome back, ${data.user.username}!`,
				});
			} else {
				toast({
					title: 'Login failed',
					description: data.message || 'Invalid credentials',
					variant: 'destructive',
				});
				throw new Error(data.message || 'Login failed');
			}
		} catch (error) {
			setAuthState(prev => ({ ...prev, isLoading: false }));
			throw error;
		}
	};

	const changePassword = async (currentPassword: string, newPassword: string) => {
		try {
			const token = localStorage.getItem('token');
			if (!token) {
				throw new Error('No token found. Please log in again.');
			}
			const response = await fetch(`/api/auth/change-password`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ currentPassword, newPassword }),
			});

			const data = await response.json();

			if (!response.ok) {
				toast({
					title: 'Password change failed',
					description: data.message || 'Failed to change password',
					variant: 'destructive',
				});

				throw new Error(data.message || 'Password change failed');
			}
		} catch (error) {
			if ((error as Error).message.includes('No token found')) {
				performLogout();
			}
			throw error;
		}
	};

	const logout = () => {
		performLogout();
		toast({
			title: 'Logged out',
			description: 'You have been successfully logged out',
		});
	};

	return (
		<AuthContext.Provider
			value={{
				user: authState.user,
				isAuthenticated: authState.isAuthenticated,
				isLoading: authState.isLoading,
				login,
				logout,
				changePassword,
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
