import { useCreateUser } from '@/entities/User/api/useUsersAdmin';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/shared/api/api';
import { PlusCircle } from 'lucide-react';
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

const CreateUser = () => {
	const [isOpen, setIsOpen] = useState(false);
	const { toast } = useToast();
	const createUserMutation = useCreateUser();

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
	};

	const handleSubmit = async (formData: FormData) => {
		try {
			await createUserMutation.mutateAsync(formData);
			toast({ title: 'Success', description: 'User created successfully.' });
			handleOpenChange(false);
		} catch (err) {
			const error = err as ApiError;

			if (error.status === 409 && error.metaCode === 'USERNAME_ALREADY_EXISTS') {
				toast({
					title: 'Creation Failed',
					description: 'This username is already taken.',
					variant: 'destructive',
				});
			} else {
				toast({
					title: 'Error Creating User',
					description: error.message,
					variant: 'destructive',
				});
			}
		}
	};

	return (
		<>
			<Button onClick={() => setIsOpen(true)}>
				<PlusCircle className="mr-2 h-4 w-4" /> Create User
			</Button>

			<Dialog open={isOpen} onOpenChange={handleOpenChange}>
				<DialogContent className="w-screen h-dvh max-w-none rounded-none sm:rounded-lg sm:h-auto sm:max-w-4xl overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Create New User</DialogTitle>
						<DialogDescription>
							Add a new user to the system. They will be able to log in immediately.
						</DialogDescription>
					</DialogHeader>

					<UserForm
						onSubmit={handleSubmit}
						onCancel={() => handleOpenChange(false)}
						isSubmitting={createUserMutation.isPending}
					/>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default CreateUser;
