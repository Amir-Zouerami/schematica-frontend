import ProjectCard from '@/components/projects/ProjectCard';
import ProjectForm from '@/components/projects/ProjectForm';
import { Button } from '@/components/ui/button';
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeleteProject, useProjects } from '@/hooks/api/useProjects';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import type { components } from '@/types/api-types';
import { ApiError } from '@/utils/api';
import { FolderSearch, Plus } from 'lucide-react';
import { useState } from 'react';

type ProjectSummaryDto = components['schemas']['ProjectSummaryDto'];

const ProjectsPage = () => {
	const { canCreateProject } = usePermissions();
	const { toast } = useToast();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

	const { data: response, isPending, error } = useProjects();
	const deleteProjectMutation = useDeleteProject();

	const handleCreateProject = () => {
		setIsCreateModalOpen(true);
	};

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
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<Skeleton className="h-10 w-48" />
					<Skeleton className="h-9 w-32" />
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className="h-48 w-full rounded-lg" />
					))}
				</div>
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

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-3xl font-bold text-gradient">Projects</h1>
				{canCreateProject && (
					<Button onClick={handleCreateProject}>
						<Plus className="h-4 w-4 mr-2" /> Create Project
					</Button>
				)}
			</div>

			{projects.length === 0 ? (
				<div className="py-20">
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<FolderSearch />
							</EmptyMedia>
							<EmptyTitle>No Projects Found</EmptyTitle>
							<EmptyDescription>
								{canCreateProject
									? 'Get started by creating your first project.'
									: 'Projects you have access to will appear here.'}
							</EmptyDescription>
						</EmptyHeader>
						{canCreateProject && (
							<EmptyContent>
								<Button onClick={handleCreateProject}>
									<Plus className="h-4 w-4 mr-2" /> Create Project
								</Button>
							</EmptyContent>
						)}
					</Empty>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{projects.map((project: ProjectSummaryDto) => (
						<ProjectCard
							key={project.id}
							project={project}
							onDelete={handleDeleteProject}
						/>
					))}
				</div>
			)}

			{isCreateModalOpen && (
				<ProjectForm open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
			)}
		</div>
	);
};

export default ProjectsPage;
