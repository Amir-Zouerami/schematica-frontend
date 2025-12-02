import { useDeleteUserAdmin } from '@/entities/User/api/useUsersAdmin';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/shared/api/api';
import type { components } from '@/shared/types/api-types';
import { Trash2 } from 'lucide-react';
import React, { useState } from 'react';

import { cn } from '@/shared/lib/utils';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/shared/ui/alert-dialog';
import { Button, buttonVariants } from '@/shared/ui/button';

type UserDto = components['schemas']['UserDto'];

interface DeleteUserProps {
	user: Pick<UserDto, 'id' | 'username'>;
}

const DeleteUser: React.FC<DeleteUserProps> = ({ user }) => {
	const [isOpen, setIsOpen] = useState(false);
	const { toast } = useToast();
	const deleteUserMutation = useDeleteUserAdmin();

	const confirmDelete = async () => {
		try {
			await deleteUserMutation.mutateAsync(user.id);
			toast({ title: 'Success', description: 'User deactivated successfully.' });
			setIsOpen(false);
		} catch (err) {
			const error = err as ApiError;
			let title = 'Error';
			let description = 'Failed to deactivate user.';

			if (error.status === 404) {
				title = 'Already Deactivated';
				description = 'This user has already been deactivated.';
				setIsOpen(false);
			} else if (error.status === 403) {
				title = 'Action Forbidden';
				description = 'You cannot deactivate the Root Admin or your own account.';
			} else {
				description = error.message;
			}

			toast({ title, description, variant: 'destructive' });
		}
	};

	return (
		<AlertDialog open={isOpen} onOpenChange={setIsOpen}>
			<AlertDialogTrigger asChild>
				<Button variant="ghost" size="icon" className="text-red-500">
					<Trash2 className="h-4 w-4" />
				</Button>
			</AlertDialogTrigger>

			<AlertDialogContent className="max-w-3xl">
				<AlertDialogHeader>
					<AlertDialogTitle>Deactivate User?</AlertDialogTitle>
				</AlertDialogHeader>

				<AlertDialogDescription className="py-1 leading-6">
					Are you sure you want to deactivate "{user.username}"?
					<br />
					<span className="mt-2 block text-xs text-muted-foreground">
						This will immediately revoke their access and invalidate their sessions.
						Historical data (like notes and audits) will be preserved.
					</span>
				</AlertDialogDescription>

				<AlertDialogFooter>
					<AlertDialogCancel onClick={() => setIsOpen(false)}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={confirmDelete}
						disabled={deleteUserMutation.isPending}
						className={cn(buttonVariants({ variant: 'destructive' }))}
					>
						{deleteUserMutation.isPending ? 'Deactivating...' : 'Deactivate'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};

export default DeleteUser;
