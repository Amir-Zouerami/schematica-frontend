import { useAuth } from '@/app/providers/AuthContext';
import { useMe } from '@/entities/User/api/useMe';
import { useSetPassword } from '@/entities/User/api/useUsers';
import { ApiError } from '@/shared/api/api';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '@/shared/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/shared/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

interface ChangePasswordModalProps {
	isOpen: boolean;
	onClose: () => void;
	redirectTo?: string;
}

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
	const navigate = useNavigate();
	const { data: user } = useMe();
	const { changePassword, logout } = useAuth();
	const setPasswordMutation = useSetPassword();

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
			form.reset();
			if (user?.hasPassword === false) {
				setFormMode('set');
			} else {
				setFormMode('change');
			}
		}
	}, [isOpen, user, form]);

	const onSubmit = async (values: FormValues) => {
		if (formMode === 'change') {
			try {
				await changePassword(values.currentPassword!, values.newPassword);
				onClose();

				logout({
					title: 'Password Changed Successfully',
					description: 'Your password has been updated. Please log in again.',
				});

				navigate(redirectTo, { replace: true });
			} catch (err) {
				const errorMessage =
					err instanceof ApiError ? err.message : 'An unexpected error occurred.';
				form.setError('currentPassword', { type: 'server', message: errorMessage });
			}
		} else {
			try {
				await setPasswordMutation.mutateAsync({ newPassword: values.newPassword });
				onClose();

				logout({
					title: 'Password Set Successfully',
					description: 'Your password has been set. Please log in again.',
				});

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
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{formMode === 'change' ? 'Change Password' : 'Set Password'}
					</DialogTitle>

					<DialogDescription>
						{formMode === 'change'
							? 'Enter your current password and choose a new password.'
							: 'Choose a password for your account to enable logging in locally.'}
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
