import MarkdownRenderer from '@/features/endpoint/edit-endpoint/ui/MarkdownRenderer';
import { DeleteProject } from '@/features/project/delete-project/DeleteProject';
import { EditProject } from '@/features/project/edit-project/EditProject';
import { ManageAccess } from '@/features/project/manage-access/ManageAccess';
import { usePermissions } from '@/hooks/usePermissions';
import type { components } from '@/shared/types/api-types';

type ProjectDetailDto = components['schemas']['ProjectDetailDto'];

interface ProjectDetailHeaderProps {
	project: ProjectDetailDto;
}

export const ProjectDetailHeader = ({ project }: ProjectDetailHeaderProps) => {
	const { isProjectOwner } = usePermissions();

	return (
		<div className="flex flex-col md:flex-row gap-4 md:items-center justify-between mt-4 mb-12">
			<div className="flex-1 min-w-0">
				<h1
					className="text-3xl font-bold text-gradient"
					style={{ unicodeBidi: 'plaintext' }}
				>
					{project.name}
				</h1>

				{typeof project.description === 'string' && project.description && (
					<div className="mt-3 max-w-[1200px]">
						<MarkdownRenderer content={project.description} />
					</div>
				)}
			</div>

			<div className="flex flex-col sm:flex-row md:flex-col gap-2 self-start md:self-center shrink-0">
				{isProjectOwner(project) && (
					<>
						<ManageAccess project={project} className="w-full sm:w-auto md:w-full" />
						<EditProject project={project} className="w-full sm:w-auto md:w-full" />
						<DeleteProject project={project} className="w-full sm:w-auto md:w-full" />
					</>
				)}
			</div>
		</div>
	);
};
