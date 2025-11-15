// Path: src/pages/AuthCallbackPage.tsx
import PageLoader from '@/components/general/PageLoader';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallbackPage: React.FC = () => {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { handleOAuthCallback } = useAuth();
	const { toast } = useToast();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const processToken = async () => {
			const token = searchParams.get('token');

			if (!token) {
				setError('Authentication token was not found. Redirecting to login.');
				toast({
					title: 'Authentication Failed',
					description: 'No authentication token provided in the callback.',
					variant: 'destructive',
				});
				setTimeout(() => navigate('/login', { replace: true }), 3000);
				return;
			}

			try {
				await handleOAuthCallback(token);
				navigate('/', { replace: true });
			} catch (err) {
				setError('Failed to validate authentication token. Redirecting to login.');
				toast({
					title: 'Authentication Failed',
					description: err instanceof Error ? err.message : 'An unknown error occurred.',
					variant: 'destructive',
				});
				setTimeout(() => navigate('/login', { replace: true }), 3000);
			}
		};

		processToken();
	}, [searchParams, navigate, handleOAuthCallback, toast]);

	if (error) {
		return (
			<div className="flex h-screen w-full flex-col items-center justify-center bg-background">
				<p className="text-destructive">{error}</p>
			</div>
		);
	}

	return <PageLoader />;
};

export default AuthCallbackPage;
