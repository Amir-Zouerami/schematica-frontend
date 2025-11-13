import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/utils/api';
import React, { useState } from 'react';
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
	const { toast } = useToast();
	const navigate = useNavigate();

	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const resetForm = () => {
		setCurrentPassword('');
		setNewPassword('');
		setConfirmPassword('');
		setIsLoading(false);
	};

	const handleModalClose = () => {
		if (!isLoading) {
			resetForm();
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

		if (currentPassword === newPassword) {
			toast({
				title: 'Validation Error',
				description: 'New password cannot be the same as the current password.',
				variant: 'destructive',
			});
			return;
		}

		setIsLoading(true);
		try {
			await changePassword(currentPassword, newPassword);

			toast({
				title: 'Password Changed Successfully',
				description: 'Your password has been updated. You will now be logged out.',
				variant: 'default',
				duration: 3000,
			});

			await logout();
			onClose();
			navigate(redirectTo, { replace: true });

			resetForm();
		} catch (err) {
			let errorMessage = 'An unexpected error occurred. Please try again.';
			if (err instanceof ApiError) {
				errorMessage = err.message;
			} else if (err instanceof Error) {
				errorMessage = err.message;
			}
			toast({
				title: 'Change Password Failed',
				description: errorMessage,
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
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
					<DialogTitle>Change Password</DialogTitle>
					<DialogDescription>
						Enter your current password and choose a new password. The new password must
						be at least 8 characters long.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
							{isLoading ? 'Changing...' : 'Change Password'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};

export default ChangePasswordModal;
