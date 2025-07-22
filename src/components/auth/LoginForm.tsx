import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const LoginForm = () => {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { login } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	const fromLocation = location.state?.from;
	const redirectTo = fromLocation && fromLocation.pathname !== '/login' ? fromLocation : '/';

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setIsLoading(true);

		try {
			await login(username, password);
			navigate(redirectTo, { replace: true });
		}
		catch (err) {
			setError(err instanceof Error ? err.message : 'Login failed');
		}
		finally {
			setIsLoading(false);
		}
	};

	return (
		<Card className="w-full max-w-md mx-auto glass-card">
			<CardHeader>
				<CardTitle className="text-gradient text-2xl font-bold">{import.meta.env.VITE_BRAND_NAME} API Docs</CardTitle>
				<CardDescription>Enter your credentials to access the platform</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
					{error && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Error</AlertTitle>
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}
					<div className="space-y-2">
						<Label htmlFor="username">Username</Label>
						<Input
							id="username"
							type="text"
							name="username"
							autoComplete="username"
							value={username}
							onChange={e => setUsername(e.target.value)}
							required
							className="bg-background/50"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="password">Password</Label>
						<Input
							id="password"
							type="password"
							name="password"
							autoComplete="current-password"
							value={password}
							onChange={e => setPassword(e.target.value)}
							required
							className="bg-background/50"
						/>
					</div>
					<Button type="submit" disabled={isLoading} className="w-full mt-5">
						{isLoading ? 'Logging in...' : 'Login'}
					</Button>
				</form>
			</CardContent>
			<CardFooter>
				<p className="text-xs text-muted-foreground">Please contact {import.meta.env.VITE_BRAND_NAME} team for support.</p>
			</CardFooter>
		</Card>
	);
};

export default LoginForm;
