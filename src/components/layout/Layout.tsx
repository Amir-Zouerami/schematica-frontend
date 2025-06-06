import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import { Skeleton } from '@/components/ui/skeleton';

const Layout = () => {
	const { isAuthenticated, isLoading } = useAuth();

	if (isLoading) {
		return (
			<div className="min-h-screen flex flex-col">
				<div className="border-b border-border py-4">
					<div className="container mx-auto px-4 flex justify-between items-center">
						<Skeleton className="h-8 w-40" />
						<Skeleton className="h-8 w-32" />
					</div>
				</div>
				<main className="flex-grow container mx-auto px-4 py-8">
					<Skeleton className="h-12 w-full mb-6" />
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{[1, 2, 3, 4, 5, 6].map(i => (
							<Skeleton key={i} className="h-48 w-full rounded-lg" />
						))}
					</div>
				</main>
			</div>
		);
	}

	if (!isAuthenticated) {
		return (
			<div className="min-h-screen flex items-center justify-center px-4">
				<LoginForm />
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col">
			<AppHeader />

			<main className="flex-grow container mx-auto px-4 py-8">
				<Outlet />
			</main>

			<AppFooter />
		</div>
	);
};

export default Layout;
