import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import AdminRoute from '@/components/auth/AdminRoute';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PageLoader from '@/components/general/PageLoader';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import Layout from './components/layout/Layout';
import { AuthProvider } from './contexts/AuthContext';
import { ApiError } from './utils/api';

// --- Lazy-loaded and Prefetched Page Components ---
const LoginPage = lazy(() => import(/* @vite-prefetch */ '@/pages/LoginPage'));
const AuthCallbackPage = lazy(() => import(/* @vite-prefetch */ '@/pages/AuthCallbackPage'));
const ProjectsPage = lazy(() => import(/* @vite-prefetch */ './pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import(/* @vite-prefetch */ './pages/ProjectDetailPage'));
const AdminPage = lazy(() => import(/* @vite-prefetch */ './pages/AdminPage'));
const NotFound = lazy(() => import(/* @vite-prefetch */ './pages/NotFound'));

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: (failureCount, error) => {
				if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
					return false;
				}
				return failureCount < 2;
			},
		},
	},
});

const App = () => {
	return (
		<React.StrictMode>
			<QueryClientProvider client={queryClient}>
				<TooltipProvider>
					<AuthProvider>
						<Toaster />
						<Sonner />
						<BrowserRouter>
							<Suspense fallback={<PageLoader />}>
								<Routes>
									<Route path="/login" element={<LoginPage />} />
									<Route path="/auth/callback" element={<AuthCallbackPage />} />
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
						</BrowserRouter>
					</AuthProvider>
				</TooltipProvider>
			</QueryClientProvider>
		</React.StrictMode>
	);
};

export default App;
