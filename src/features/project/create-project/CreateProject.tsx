import { useProjects } from '@/entities/Project/api/useProjects';
import CreateProject from '@/features/project/create-project/CreateProject';
import { ProjectList } from '@/features/project/project-list/ProjectList';
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/shared/ui/empty';
import { Skeleton } from '@/shared/ui/skeleton';
import { FolderSearch } from 'lucide-react';

const ProjectsPage = () => {
	const { data: response, isPending } = useProjects();
	const projects = response?.data || [];

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-3xl font-bold text-gradient">Projects</h1>
				<CreateProject />
			</div>

			{isPending && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className="h-48 w-full rounded-lg" />
					))}
				</div>
			)}

			{!isPending && projects.length === 0 && (
				<div className="py-20">
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<FolderSearch />
							</EmptyMedia>

							<EmptyTitle>No Projects Found</EmptyTitle>

							<EmptyDescription>
								Get started by creating your first project.
							</EmptyDescription>
						</EmptyHeader>

						<EmptyContent>
							<CreateProject />
						</EmptyContent>
					</Empty>
				</div>
			)}

			{!isPending && projects.length > 0 && <ProjectList />}
		</div>
	);
};

export default ProjectsPage;
