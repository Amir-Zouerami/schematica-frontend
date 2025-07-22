import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

const AdminRoute: React.FC = () => {
	const { user, isLoading } = useAuth();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div>Loading...</div>
			</div>
		);
	}

	if (!user || user.role !== 'admin') {
		return <Navigate to="/" replace />;
	}

	return <Outlet />;
};

export default AdminRoute;
