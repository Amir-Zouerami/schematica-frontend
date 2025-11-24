import { ModernErrorState } from '@/components/general/ModernErrorState';
import { useOpenApiSpec, useProject } from '@/entities/Project/api/useProject';
import { ApiError } from '@/shared/api/api';
import { Skeleton } from '@/shared/ui/skeleton';
import { ProjectDetailContent } from '@/widgets/ProjectDetailContent';
import { ProjectDetailHeader } from '@/widgets/ProjectDetailHeader';
import { useNavigate, useParams } from 'react-router-dom';

const ProjectDetailPage = () => {
	const { projectId, endpointId } = useParams<{ projectId: string; endpointId?: string }>();
	const navigate = useNavigate();

	const { data: project, isLoading: projectLoading, error: projectError } = useProject(projectId);
	const { data: openApiSpec, isLoading: specLoading } = useOpenApiSpec(projectId);

	const isLoading = projectLoading || specLoading;

	if (isLoading) {
		return (
			<div className="space-y-6 p-4 md:p-6 lg:p-8">
				<div className="flex items-center justify-between">
					<Skeleton className="h-10 w-3/5" />
					<Skeleton className="h-9 w-24" />
				</div>

				<Skeleton className="h-16 w-full" />
				<Skeleton className="h-10 w-full" />

				<div className="space-y-4 mt-8">
					<Skeleton className="h-8 w-1/3" />
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-24 w-full" />
				</div>
			</div>
		);
	}

	if (projectError || !project) {
		const errorMsg =
			projectError instanceof ApiError
				? projectError.status === 403
					? 'You do not have permission to view this project.'
					: projectError.message
				: `The project with ID '${projectId}' could not be found.`;

		return (
			<ModernErrorState
				title="Error Loading Project"
				description={errorMsg}
				actionLabel="Back to Projects"
				onAction={() => navigate('/')}
			/>
		);
	}

	return (
		<div className="space-y-6">
			<ProjectDetailHeader project={project} />
			<ProjectDetailContent
				project={project}
				openApiSpec={openApiSpec}
				projectId={projectId!}
				endpointId={endpointId}
			/>
		</div>
	);
};

export default ProjectDetailPage;
