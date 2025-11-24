import { useAuth } from '@/app/providers/AuthContext';
import PageLoader from '@/components/general/PageLoader';
import { useUpdateProfilePicture } from '@/entities/User/api/useMe';
import { useToast } from '@/hooks/use-toast';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallbackPage: React.FC = () => {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { handleOAuthCallback } = useAuth();
	const { toast } = useToast();
	const updateProfilePictureMutation = useUpdateProfilePicture();
	const [error, setError] = useState<string | null>(null);

	const handleProfileImageSync = async (imageUrl: string) => {
		try {
			const response = await fetch(imageUrl);
			const blob = await response.blob();
			const file = new File([blob], 'gitlab-avatar.jpg', { type: blob.type });

			const formData = new FormData();
			formData.append('file', file);

			await updateProfilePictureMutation.mutateAsync(formData);
			console.log('GitLab profile picture synced successfully');
		} catch (e) {
			console.error('Failed to sync GitLab profile picture:', e);
		}
	};

	useEffect(() => {
		const processAuth = async () => {
			const token = searchParams.get('token');
			const avatarUrl = searchParams.get('avatar') || searchParams.get('picture');

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

				if (avatarUrl) {
					handleProfileImageSync(avatarUrl);
				}

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

		processAuth();
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
