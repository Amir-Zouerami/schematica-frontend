import { useAuth } from '@/app/providers/AuthContext';
import { useMe } from '@/entities/User/api/useMe';
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import PageLoader from '../general/PageLoader';

const AdminRoute: React.FC = () => {
	const { isLoading: isAuthLoading } = useAuth();
	const { data: user, isLoading: isUserLoading } = useMe();

	const isLoading = isAuthLoading || isUserLoading;

	if (isLoading) {
		return <PageLoader />;
	}

	if (!user || user.role !== 'admin') {
		return <Navigate to="/" replace />;
	}

	return <Outlet />;
};

export default AdminRoute;
