import { useAuth } from '@/contexts/AuthContext';
import { useSetPassword } from '@/hooks/api/useUsers';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/utils/api';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ChangePasswordModalProps {
	isOpen: boolean;
	onClose: () => void;
	redirectTo?: string;
}

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
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	// Reset all state when the modal is closed or opened.
	useEffect(() => {
		if (isOpen) {
			setFormMode('change');
			setCurrentPassword('');
			setNewPassword('');
			setConfirmPassword('');
			setIsLoading(false);
		}
	}, [isOpen]);

	const handleModalClose = () => {
		if (!isLoading) {
			onClose();
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (newPassword !== confirmPassword) {
			toast({
				title: 'Validation Error',
				description: 'New passwords do not match.',
				variant: 'destructive',
			});
			return;
		}

		if (newPassword.length < 8) {
			toast({
				title: 'Validation Error',
				description: 'New password must be at least 8 characters long.',
				variant: 'destructive',
			});
			return;
		}

		if (formMode === 'change' && currentPassword === newPassword) {
			toast({
				title: 'Validation Error',
				description: 'New password cannot be the same as the current password.',
				variant: 'destructive',
			});
			return;
		}

		setIsLoading(true);

		if (formMode === 'change') {
			try {
				await changePassword(currentPassword, newPassword);
				toast({
					title: 'Password Changed Successfully',
					description: 'Your password has been updated. You will now be logged out.',
					duration: 3000,
				});
				await logout();
				onClose();
				navigate(redirectTo, { replace: true });
			} catch (err) {
				// This is the key logic: check for the specific error to switch to "set" mode.
				// We rely on the API's error message string for this detection.
				if (
					err instanceof ApiError &&
					err.status === 400 &&
					err.message.includes('OAuth')
				) {
					setFormMode('set');
					toast({
						title: 'Set Your Password',
						description:
							'Your account was created via an external provider. Please set a password to enable local login.',
					});
				} else {
					const errorMessage =
						err instanceof ApiError ? err.message : 'An unexpected error occurred.';
					toast({
						title: 'Change Password Failed',
						description: errorMessage,
						variant: 'destructive',
					});
				}
			} finally {
				setIsLoading(false);
			}
		} else {
			// Handle "set" password mode
			try {
				await setPasswordMutation.mutateAsync({ newPassword });
				toast({
					title: 'Password Set Successfully',
					description:
						'Your password has been set. You will be logged out to log in again with your new credentials.',
					duration: 3000,
				});
				await logout();
				onClose();
				navigate(redirectTo, { replace: true });
			} catch (err) {
				const errorMessage =
					err instanceof ApiError ? err.message : 'An unexpected error occurred.';
				toast({
					title: 'Set Password Failed',
					description: errorMessage,
					variant: 'destructive',
				});
			} finally {
				setIsLoading(false);
			}
		}
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) {
					handleModalClose();
				}
			}}
		>
			<DialogContent className="sm:max-w-md max-w-4xl">
				<DialogHeader>
					<DialogTitle>
						{formMode === 'change' ? 'Change Password' : 'Set Password'}
					</DialogTitle>
					<DialogDescription>
						{formMode === 'change'
							? 'Enter your current password and choose a new password.'
							: 'Choose a password for your account to enable logging in with a username and password.'}
						{' The new password must be at least 8 characters long.'}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 pt-2">
					{formMode === 'change' && (
						<div className="space-y-2">
							<Label htmlFor="currentPassword">Current Password</Label>
							<Input
								id="currentPassword"
								type="password"
								value={currentPassword}
								onChange={(e) => setCurrentPassword(e.target.value)}
								required
								disabled={isLoading}
								autoComplete="current-password"
							/>
						</div>
					)}
					<div className="space-y-2">
						<Label htmlFor="newPassword">New Password</Label>
						<Input
							id="newPassword"
							type="password"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							required
							disabled={isLoading}
							autoComplete="new-password"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="confirmPassword">Confirm New Password</Label>
						<Input
							id="confirmPassword"
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							required
							disabled={isLoading}
							autoComplete="new-password"
						/>
					</div>
					<DialogFooter className="mt-6">
						<Button
							type="button"
							variant="outline"
							onClick={handleModalClose}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading
								? 'Saving...'
								: formMode === 'change'
									? 'Change Password'
									: 'Set Password'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};

export default ChangePasswordModal;
