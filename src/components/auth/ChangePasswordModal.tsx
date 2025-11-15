import { useAuth } from '@/contexts/AuthContext';
import { useSetPassword } from '@/hooks/api/useUsers';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/utils/api';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface ChangePasswordModalProps {
	isOpen: boolean;
	onClose: () => void;
	redirectTo?: string;
}

// A factory function to create a Zod schema based on the form mode
const getFormSchema = (mode: 'change' | 'set') => {
	let schema = z
		.object({
			currentPassword: z.string().optional(),
			newPassword: z
				.string()
				.min(8, { message: 'New password must be at least 8 characters long.' }),
			confirmPassword: z.string(),
		})
		.refine((data) => data.newPassword === data.confirmPassword, {
			message: 'New passwords do not match.',
			path: ['confirmPassword'],
		});

	if (mode === 'change') {
		schema = schema
			.refine((data) => data.currentPassword && data.currentPassword.length > 0, {
				message: 'Current password is required.',
				path: ['currentPassword'],
			})
			.refine((data) => data.currentPassword !== data.newPassword, {
				message: 'New password cannot be the same as the current password.',
				path: ['newPassword'],
			});
	}

	return schema;
};

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
	isOpen,
	onClose,
	redirectTo = '/login',
}) => {
	const { changePassword, logout } = useAuth();
	const setPasswordMutation = useSetPassword();
	const { toast } = useToast();
	const navigate = useNavigate();

	const [formMode, setFormMode] = useState<'change' | 'set'>('change');

	const formSchema = getFormSchema(formMode);
	type FormValues = z.infer<typeof formSchema>;

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			currentPassword: '',
			newPassword: '',
			confirmPassword: '',
		},
	});

	const { isSubmitting } = form.formState;

	useEffect(() => {
		if (isOpen) {
			// Reset the form state whenever the modal is opened
			form.reset();
			setFormMode('change');
		}
	}, [isOpen, form]);

	// Re-validate the form if the mode changes (e.g., from 'change' to 'set')
	useEffect(() => {
		form.trigger();
	}, [formMode, form.trigger]);

	const onSubmit = async (values: FormValues) => {
		if (formMode === 'change') {
			try {
				await changePassword(values.currentPassword!, values.newPassword);
				toast({
					title: 'Password Changed Successfully',
					description: 'Your password has been updated. You will now be logged out.',
					duration: 3000,
				});
				await logout();
				onClose();
				navigate(redirectTo, { replace: true });
			} catch (err) {
				if (
					err instanceof ApiError &&
					err.errorResponse?.type === 'OAUTH_USER_NO_PASSWORD_SET'
				) {
					setFormMode('set');
					form.clearErrors(); // Clear validation errors for the new mode
					toast({
						title: 'Set Your Password',
						description:
							'Your account was created via an external provider. Please set a password to enable local login.',
					});
				} else {
					const errorMessage =
						err instanceof ApiError ? err.message : 'An unexpected error occurred.';
					form.setError('currentPassword', { type: 'server', message: errorMessage });
				}
			}
		} else {
			// 'set' mode
			try {
				await setPasswordMutation.mutateAsync({ newPassword: values.newPassword });
				toast({
					title: 'Password Set Successfully',
					description:
						'Your password has been set. You will be logged out to log in again.',
					duration: 3000,
				});
				await logout();
				onClose();
				navigate(redirectTo, { replace: true });
			} catch (err) {
				const errorMessage =
					err instanceof ApiError ? err.message : 'An unexpected error occurred.';
				form.setError('root.serverError', { message: errorMessage });
			}
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-md max-w-4xl">
				<DialogHeader>
					<DialogTitle>
						{formMode === 'change' ? 'Change Password' : 'Set Password'}
					</DialogTitle>
					<DialogDescription>
						{formMode === 'change'
							? 'Enter your current password and choose a new password.'
							: 'Choose a password for your account to enable logging in locally.'}
						{' The new password must be at least 8 characters long.'}
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
						{form.formState.errors.root?.serverError && (
							<p className="text-sm font-medium text-red-500 dark:text-red-400">
								{form.formState.errors.root.serverError.message}
							</p>
						)}

						{formMode === 'change' && (
							<FormField
								control={form.control}
								name="currentPassword"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Current Password</FormLabel>
										<FormControl>
											<Input
												type="password"
												autoComplete="current-password"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						<FormField
							control={form.control}
							name="newPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>New Password</FormLabel>
									<FormControl>
										<Input
											type="password"
											autoComplete="new-password"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="confirmPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Confirm New Password</FormLabel>
									<FormControl>
										<Input
											type="password"
											autoComplete="new-password"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter className="mt-6">
							<Button
								type="button"
								variant="outline"
								onClick={onClose}
								disabled={isSubmitting}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting
									? 'Saving...'
									: formMode === 'change'
										? 'Change Password'
										: 'Set Password'}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
};

export default ChangePasswordModal;
