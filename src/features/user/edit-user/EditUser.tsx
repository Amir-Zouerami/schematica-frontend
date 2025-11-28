import { useUpdateUser, useUpdateUserProfilePictureAdmin } from '@/entities/User/api/useUsersAdmin';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/shared/api/api';
import type { components } from '@/shared/types/api-types';
import { Edit } from 'lucide-react';
import { useState } from 'react';

import { UserForm } from '@/features/user/UserForm';
import { Button } from '@/shared/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/shared/ui/dialog';

type UserDto = components['schemas']['UserDto'];

interface EditUserProps {
	user: UserDto;
}

const EditUser: React.FC<EditUserProps> = ({ user }) => {
	const [isOpen, setIsOpen] = useState(false);
	const { toast } = useToast();
	const updateUserMutation = useUpdateUser();
	const updateUserProfilePictureMutation = useUpdateUserProfilePictureAdmin();

	const isSubmitting = updateUserMutation.isPending || updateUserProfilePictureMutation.isPending;

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
	};

	const handleSubmit = async (formData: FormData) => {
		try {
			const userDetailsPayload: components['schemas']['UpdateUserDto'] = {
				role: formData.get('role') as components['schemas']['Role'],
				teams: formData.getAll('teams') as string[],
			};

			const password = formData.get('password');
			if (password && typeof password === 'string') {
				userDetailsPayload.password = password;
			}

			const updatePromises: Promise<any>[] = [
				updateUserMutation.mutateAsync({
					userId: user.id,
					userData: userDetailsPayload,
				}),
			];

			const profileImageFile = formData.get('file');

			if (profileImageFile) {
				const picturePayload = new FormData();
				picturePayload.append('file', profileImageFile);

				updatePromises.push(
					updateUserProfilePictureMutation.mutateAsync({
						userId: user.id,
						fileData: picturePayload,
					}),
				);
			}

			await Promise.all(updatePromises);
			toast({ title: 'Success', description: 'User updated successfully.' });
			handleOpenChange(false);
		} catch (err) {
			const error = err as ApiError;
			toast({
				title: 'Error Updating User',
				description: error.message,
				variant: 'destructive',
			});
		}
	};

	return (
		<>
			<Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
				<Edit className="h-4 w-4" />
			</Button>

			<Dialog open={isOpen} onOpenChange={handleOpenChange}>
				<DialogContent className="max-w-4xl">
					<DialogHeader>
						<DialogTitle>Edit User: {user.username}</DialogTitle>
						<DialogDescription>
							Update user details, role, team memberships, or profile picture.
						</DialogDescription>
					</DialogHeader>

					<UserForm
						user={user}
						onSubmit={handleSubmit}
						onCancel={() => handleOpenChange(false)}
						isSubmitting={isSubmitting}
					/>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default EditUser;
