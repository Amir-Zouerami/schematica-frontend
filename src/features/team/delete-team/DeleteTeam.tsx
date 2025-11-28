import { useDeleteTeam } from '@/entities/Team/api/useTeams';
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

type TeamDto = components['schemas']['TeamDto'];

interface DeleteTeamProps {
	team: Pick<TeamDto, 'id' | 'name'>;
}

const DeleteTeam: React.FC<DeleteTeamProps> = ({ team }) => {
	const [isOpen, setIsOpen] = useState(false);
	const { toast } = useToast();
	const deleteTeamMutation = useDeleteTeam();

	const confirmDelete = async () => {
		try {
			await deleteTeamMutation.mutateAsync(team.id);
			toast({ title: 'Success', description: 'Team deleted successfully.' });
			setIsOpen(false);
		} catch (err) {
			const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete team.';
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
					<AlertDialogDescription className="py-1 leading-6">
						This will permanently delete the team "{team.name}". This action cannot be
						undone.
					</AlertDialogDescription>
				</AlertDialogHeader>

				<AlertDialogFooter>
					<AlertDialogCancel onClick={() => setIsOpen(false)}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={confirmDelete}
						disabled={deleteTeamMutation.isPending}
						className={cn(buttonVariants({ variant: 'destructive' }))}
					>
						{deleteTeamMutation.isPending ? 'Deleting...' : 'Delete'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};

export default DeleteTeam;
