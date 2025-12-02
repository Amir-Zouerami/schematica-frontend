import { useAuth } from '@/app/providers/AuthContext';
import { ModernErrorState } from '@/components/general/ModernErrorState';
import { useDeleteProject, useProjects } from '@/entities/Project/api/useProjects';
import ProjectCard from '@/entities/Project/ui/ProjectCard';
import ProjectForm from '@/features/project/create-project/ProjectForm';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { ApiError } from '@/shared/api/api';
import type { components } from '@/shared/types/api-types';
import { Button } from '@/shared/ui/button';
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/shared/ui/empty';
import { Skeleton } from '@/shared/ui/skeleton';
import { FolderSearch, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type ProjectSummaryDto = components['schemas']['ProjectSummaryDto'];

const ProjectsPage = () => {
	const { canCreateProject } = usePermissions();
	const { toast } = useToast();
	const { logout } = useAuth();
	const navigate = useNavigate();
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
		const isAuthError = error instanceof ApiError && error.status === 401;
		const errorMessage =
			error instanceof ApiError ? error.message : 'An unexpected error occurred.';

		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<ModernErrorState
					title="Error Loading Projects"
					description={errorMessage}
					actionLabel={isAuthError ? 'Log Out & Login' : 'Retry'}
					onAction={
						isAuthError
							? () => {
									logout();
									navigate('/login');
								}
							: () => window.location.reload()
					}
					backLink={null as any}
				/>
			</div>
		);
	}

	const projects = response?.data || [];

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap justify-between items-center gap-2">
				<h1 className="text-3xl font-bold text-gradient-pink-sunset">All Projects</h1>
				{canCreateProject && (
					<Button onClick={handleCreateProject} className="cursor-pointer">
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
								<Button onClick={handleCreateProject} className="cursor-pointer">
									<Plus className="h-4 w-4 mr-2" /> Create Project
								</Button>
							</EmptyContent>
						)}
					</Empty>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
