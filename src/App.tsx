import React from 'react';
import NotFound from './pages/NotFound';
import LoginPage from '@/pages/LoginPage';
import AdminPage from './pages/AdminPage';
import Layout from './components/layout/Layout';
import ProjectsPage from './pages/ProjectsPage';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from './contexts/AuthContext';
import AdminRoute from '@/components/auth/AdminRoute';
import ProjectDetailPage from './pages/ProjectDetailPage';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster as Sonner } from '@/components/ui/sonner';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const App = () => {
	return (
		<React.StrictMode>
			<QueryClientProvider client={queryClient}>
				<TooltipProvider>
					<AuthProvider>
						<Toaster />
						<Sonner />
						<BrowserRouter>
							<Routes>
								<Route path="/login" element={<LoginPage />} />

								<Route element={<ProtectedRoute />}>
									<Route element={<Layout />}>
										<Route path="/" element={<ProjectsPage />} />
										<Route path="/projects/:projectId" element={<ProjectDetailPage />} />
										<Route element={<AdminRoute />}>
											<Route path="/admin" element={<AdminPage />} />
										</Route>
									</Route>
								</Route>
								<Route path="*" element={<NotFound />} />
							</Routes>
						</BrowserRouter>
					</AuthProvider>
				</TooltipProvider>
			</QueryClientProvider>
		</React.StrictMode>
	);
};

export default App;
