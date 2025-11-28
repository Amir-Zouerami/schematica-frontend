import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { lazy, Suspense, useEffect, useRef } from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';

import { AuthProvider, useAuth } from '@/app/providers/AuthContext';
import ErrorBoundary from '@/app/providers/ErrorBoundary';
import AdminRoute from '@/components/auth/AdminRoute';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PageLoader from '@/components/general/PageLoader';
import { ApiError } from '@/shared/api/api';
import { audioService } from '@/shared/lib/audio-service';
import { appEventBus, AppEvents } from '@/shared/lib/event-bus';
import { Toaster as Sonner } from '@/shared/ui/sonner';
import { Toaster } from '@/shared/ui/toaster';
import { TooltipProvider } from '@/shared/ui/tooltip';
import Layout from './components/layout/Layout';

const LoginPage = lazy(() => import(/* @vite-prefetch */ '@/pages/LoginPage'));
const AuthCallbackPage = lazy(() => import(/* @vite-prefetch */ '@/pages/AuthCallbackPage'));
const ProjectsPage = lazy(() => import(/* @vite-prefetch */ './pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import(/* @vite-prefetch */ './pages/ProjectDetailPage'));
const AdminPage = lazy(() => import(/* @vite-prefetch */ './pages/AdminPage'));
const NotFound = lazy(() => import(/* @vite-prefetch */ './pages/NotFound'));

let unauthorizedHandler: ((error: unknown) => void) | null = null;

const handleUnauthorizedGlobally = (error: unknown) => {
	unauthorizedHandler?.(error);
};

const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: handleUnauthorizedGlobally,
	}),
	mutationCache: new MutationCache({
		onError: handleUnauthorizedGlobally,
	}),
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5,
			gcTime: 1000 * 60 * 10,
			refetchOnWindowFocus: false,
			retry: (failureCount, error) => {
				if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
					return false;
				}
				return failureCount < 2;
			},
		},
	},
});

const GlobalEventListener: React.FC = () => {
	const { logout } = useAuth();
	const navigate = useNavigate();
	const isHandlingUnauthorized = useRef(false);

	useEffect(() => {
		const unlockAudio = () => {
			audioService.unlock().then(() => {
				window.removeEventListener('click', unlockAudio);
				window.removeEventListener('keydown', unlockAudio);
			});
		};

		window.addEventListener('click', unlockAudio);
		window.addEventListener('keydown', unlockAudio);

		return () => {
			window.removeEventListener('click', unlockAudio);
			window.removeEventListener('keydown', unlockAudio);
		};
	}, []);

	useEffect(() => {
		const handleUnauthorized = () => {
			if (isHandlingUnauthorized.current) return;
			isHandlingUnauthorized.current = true;

			logout({
				title: 'Session Expired',
				description: 'Your session has expired. Please log in again.',
			});

			navigate('/login', { replace: true });

			setTimeout(() => {
				isHandlingUnauthorized.current = false;
			}, 3000);
		};

		appEventBus.on(AppEvents.API_UNAUTHORIZED, handleUnauthorized);

		return () => {
			appEventBus.off(AppEvents.API_UNAUTHORIZED, handleUnauthorized);
		};
	}, [logout, navigate]);

	return null;
};

const App = () => {
	return (
		<React.StrictMode>
			<BrowserRouter>
				<QueryClientProvider client={queryClient}>
					<TooltipProvider>
						<AuthProvider>
							<GlobalEventListener />
							<Toaster />
							<Sonner />
							<ErrorBoundary>
								<Suspense fallback={<PageLoader />}>
									<Routes>
										<Route path="/login" element={<LoginPage />} />
										<Route
											path="/auth/callback"
											element={<AuthCallbackPage />}
										/>
										<Route element={<ProtectedRoute />}>
											<Route element={<Layout />}>
												<Route path="/" element={<ProjectsPage />} />
												<Route
													path="/projects/:projectId"
													element={<ProjectDetailPage />}
												/>
												<Route
													path="/projects/:projectId/endpoints/:endpointId"
													element={<ProjectDetailPage />}
												/>
												<Route element={<AdminRoute />}>
													<Route path="/admin" element={<AdminPage />} />
												</Route>
											</Route>
										</Route>
										<Route path="*" element={<NotFound />} />
									</Routes>
								</Suspense>
							</ErrorBoundary>
						</AuthProvider>
					</TooltipProvider>
				</QueryClientProvider>
			</BrowserRouter>
		</React.StrictMode>
	);
};

export default App;
