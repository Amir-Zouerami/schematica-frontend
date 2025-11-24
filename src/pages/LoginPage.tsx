import { useAuth } from '@/app/providers/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
	const { isAuthenticated, isLoading } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (isLoading) {
			return;
		}

		if (isAuthenticated) {
			navigate('/', { replace: true });
		}
	}, [isAuthenticated, isLoading, navigate]);

	if (isLoading) {
		return <div>Loading...</div>;
	}

	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				minHeight: '100vh',
			}}
		>
			<LoginForm />
		</div>
	);
};

export default LoginPage;
