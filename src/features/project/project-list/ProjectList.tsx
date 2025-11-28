import { useDeleteProject, useProjects } from '@/entities/Project/api/useProjects';
import ProjectCard from '@/entities/Project/ui/ProjectCard';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/shared/api/api';
import type { components } from '@/shared/types/api-types';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

type ProjectSummaryDto = components['schemas']['ProjectSummaryDto'];

export const ProjectList = () => {
	const { toast } = useToast();
	const { data: response, isPending, error } = useProjects();
	const deleteProjectMutation = useDeleteProject();

	const handleDeleteProject = async (projectId: string) => {
		try {
			await deleteProjectMutation.mutateAsync(projectId);
			toast({
				title: 'Project Deleted',
				description: 'The project has been successfully deleted.',
			});
		} catch (err) {
			let description = 'An unexpected error occurred while deleting the project.';

			if (err instanceof ApiError) {
				if (err.status === 403) {
					description =
						'You do not have the required permissions to delete this project.';
				} else if (err.status === 404) {
					description =
						'This project could not be found. It may have already been deleted by someone else.';
				} else {
					description = err.message;
				}
			}

			toast({
				title: 'Delete Failed',
				description,
				variant: 'destructive',
			});
		}
	};

	if (isPending) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton key={i} className="h-48 w-full rounded-lg" />
				))}
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center py-10">
				<h2 className="text-2xl font-bold text-red-500 mb-4">Error Loading Projects</h2>

				<p className="text-muted-foreground mb-6">
					{error instanceof ApiError ? error.message : 'An unexpected error occurred.'}
				</p>

				<Button onClick={() => window.location.reload()}>Retry</Button>
			</div>
		);
	}

	const projects = response?.data || [];

	if (projects.length === 0) {
		return null;
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{projects.map((project: ProjectSummaryDto) => (
				<ProjectCard key={project.id} project={project} onDelete={handleDeleteProject} />
			))}
		</div>
	);
};
