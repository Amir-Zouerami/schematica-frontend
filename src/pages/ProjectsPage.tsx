import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import ProjectForm from '@/components/projects/ProjectForm';
import ProjectCard from '@/components/projects/ProjectCard';
import { useProjects, useDeleteProject } from '@/hooks/api/useProjects';

const ProjectsPage = () => {
	const { user } = useAuth();
	const { toast } = useToast();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

	const { data: projects = [], isLoading, error } = useProjects();
	const deleteProjectMutation = useDeleteProject();

	const handleCreateProject = () => {
		setIsCreateModalOpen(true);
	};

	const handleDeleteProject = async (projectId: string) => {
		try {
			await deleteProjectMutation.mutateAsync(projectId);
			toast({
				title: 'Project Deleted',
				description: 'The project has been deleted successfully',
			});
		} catch (error) {
			toast({
				title: 'Error',
				description: error instanceof Error ? error.message : 'Failed to delete project',
				variant: 'destructive',
			});
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<Skeleton className="h-10 w-48" />
					<Skeleton className="h-9 w-32" />
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className="h-48 w-full" />
					))}
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center py-10">
				<h2 className="text-2xl font-bold text-red-500 mb-4">Error Loading Projects</h2>
				<p className="text-muted-foreground mb-6">{error instanceof Error ? error.message : 'Failed to load projects'}</p>
				<Button onClick={() => window.location.reload()}>Retry</Button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-3xl font-bold text-gradient">Projects</h1>
				{user?.accessList?.write && (
					<Button onClick={handleCreateProject}>
						<Plus className="h-4 w-4 mr-2" /> Create Project
					</Button>
				)}
			</div>

			{projects.length === 0 ? (
				<div className="text-center py-20">
					<h2 className="text-2xl font-semibold text-muted-foreground mb-4">No projects yet</h2>
					{user?.accessList?.write ? (
						<>
							<p className="text-muted-foreground mb-6">Create your first project to get started</p>
							<Button onClick={handleCreateProject}>
								<Plus className="h-4 w-4 mr-2" /> Create Your First Project
							</Button>
						</>
					) : (
						<p className="text-muted-foreground">Projects will appear here once they are created</p>
					)}
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{projects.map(project => (
						<ProjectCard key={project.id} project={project} onDelete={handleDeleteProject} />
					))}
				</div>
			)}

			{isCreateModalOpen && <ProjectForm open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />}
		</div>
	);
};

export default ProjectsPage;
