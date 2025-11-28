import { useDeleteProject } from '@/entities/Project/api/useProjects';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/shared/api/api';
import { cn } from '@/shared/lib/utils';
import type { components } from '@/shared/types/api-types';
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
import { Button } from '@/shared/ui/button';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type ProjectDetailDto = components['schemas']['ProjectDetailDto'];

interface DeleteProjectProps {
	project: Pick<ProjectDetailDto, 'id' | 'name'>;
	className?: string;
}

export const DeleteProject = ({ project, className }: DeleteProjectProps) => {
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const navigate = useNavigate();
	const { toast } = useToast();
	const deleteProjectMutation = useDeleteProject();

	const confirmDeleteProject = async () => {
		try {
			await deleteProjectMutation.mutateAsync(project.id);

			toast({
				title: 'Project Deleted',
				description: 'The project has been deleted successfully',
			});

			navigate('/');
		} catch (err) {
			const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete project';
			toast({ title: 'Delete Failed', description: errorMessage, variant: 'destructive' });
		} finally {
			setIsDeleteDialogOpen(false);
		}
	};

	return (
		<AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
			<AlertDialogTrigger asChild>
				<Button
					variant="destructive"
					className={cn(className)}
					onClick={(e) => e.stopPropagation()}
				>
					<Trash2 className="mr-2 h-4 w-4" /> Delete Project
				</Button>
			</AlertDialogTrigger>

			<AlertDialogContent className="max-w-3xl">
				<AlertDialogHeader>
					<AlertDialogTitle>Are you sure?</AlertDialogTitle>
					<AlertDialogDescription className="py-1 leading-6">
						This will permanently delete the project "{project.name}" and all of its
						endpoints. This action cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>

				<AlertDialogFooter>
					<AlertDialogCancel disabled={deleteProjectMutation.isPending}>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={confirmDeleteProject}
						disabled={deleteProjectMutation.isPending}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{deleteProjectMutation.isPending ? 'Deleting...' : 'Delete'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
