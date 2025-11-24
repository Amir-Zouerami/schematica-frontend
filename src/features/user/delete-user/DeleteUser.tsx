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
			toast({ title: 'Success', description: 'User deleted successfully.' });
			setIsOpen(false);
		} catch (err) {
			const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete user.';
			toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
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
					<AlertDialogTitle>Are you sure?</AlertDialogTitle>
				</AlertDialogHeader>

				<AlertDialogDescription className="py-1 leading-6">
					This will permanently delete the user "{user.username}". This cannot be undone.
				</AlertDialogDescription>

				<AlertDialogFooter>
					<AlertDialogCancel onClick={() => setIsOpen(false)}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={confirmDelete}
						disabled={deleteUserMutation.isPending}
						className={cn(buttonVariants({ variant: 'destructive' }))}
					>
						{deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};

export default DeleteUser;
