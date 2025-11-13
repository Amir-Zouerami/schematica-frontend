import { useToast } from '@/hooks/use-toast';
import type { components } from '@/types/api-types';
import { api, ApiError } from '@/utils/api';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

type User = components['schemas']['UserDto'];
type ChangePasswordDto = components['schemas']['ChangePasswordDto'];

interface AuthContextType {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	login: (username: string, password: string) => Promise<void>;
	logout: () => void;
	changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<User | null>(null);
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const { toast } = useToast();

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
			// Step 1: Log in to get the access token.
			const loginResponse = await api.post<{ access_token: string }>('/auth/login', {
				username,
				password,
			});
			const token = loginResponse.data.access_token;
			localStorage.setItem('token', token);

			// Step 2: Immediately fetch the user profile with the new token.
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
			// Re-throw the error so the calling component (LoginForm) can handle its own state.
			throw error;
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
			// Re-throw so the modal can display the specific error message and handle its state.
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
