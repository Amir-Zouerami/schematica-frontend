import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/utils/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// 1. Define the Zod schema for the form
const formSchema = z.object({
	username: z.string().min(1, { message: 'Username is required.' }),
	password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof formSchema>;

const LoginForm = () => {
	const { login } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	const fromLocation = location.state?.from;
	const redirectTo = fromLocation && fromLocation.pathname !== '/login' ? fromLocation : '/';

	// 2. Initialize the form with react-hook-form
	const form = useForm<LoginFormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			username: '',
			password: '',
		},
	});

	const { isSubmitting } = form.formState;

	// 3. Define the submit handler
	const onSubmit = async (values: LoginFormValues) => {
		try {
			await login(values.username, values.password);
			navigate(redirectTo, { replace: true });
		} catch (err) {
			if (err instanceof ApiError && (err.status === 401 || err.status === 400)) {
				// Set a general form error, not tied to a specific field
				form.setError('root.serverError', {
					type: 'manual',
					message: err.message || 'Invalid username or password.',
				});
			} else {
				form.setError('root.serverError', {
					type: 'manual',
					message: 'An unexpected error occurred during login.',
				});
			}
		}
	};

	return (
		<Card className="w-full max-w-md mx-auto glass-card">
			<CardHeader>
				<CardTitle className="text-gradient text-2xl font-bold">
					{import.meta.env.VITE_BRAND_NAME} API Docs
				</CardTitle>
				<CardDescription>Enter your credentials to access the platform</CardDescription>
			</CardHeader>
			<CardContent>
				{/* 4. Use the Shadcn Form component */}
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-4"
						autoComplete="on"
					>
						{form.formState.errors.root?.serverError && (
							<div className="flex items-center gap-x-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-red-500 dark:text-red-400">
								<AlertCircle className="h-4 w-4" />
								<span>{form.formState.errors.root.serverError.message}</span>
							</div>
						)}
						<FormField
							control={form.control}
							name="username"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Username</FormLabel>
									<FormControl>
										<Input
											type="text"
											autoComplete="username"
											className="bg-background/50"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Password</FormLabel>
									<FormControl>
										<Input
											type="password"
											autoComplete="current-password"
											className="bg-background/50"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button type="submit" disabled={isSubmitting} className="w-full mt-5">
							{isSubmitting ? 'Logging in...' : 'Login'}
						</Button>
					</form>
				</Form>
			</CardContent>
			<CardFooter>
				<p className="text-xs text-muted-foreground">
					Please contact {import.meta.env.VITE_BRAND_NAME} team for support.
				</p>
			</CardFooter>
		</Card>
	);
};

export default LoginForm;
