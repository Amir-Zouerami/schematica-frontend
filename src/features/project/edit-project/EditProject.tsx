import ProjectForm from '@/features/project/create-project/ProjectForm';
import { cn } from '@/shared/lib/utils';
import type { components } from '@/shared/types/api-types';
import { Button } from '@/shared/ui/button';
import { Edit3 } from 'lucide-react';
import { useState } from 'react';

type ProjectDetailDto = components['schemas']['ProjectDetailDto'];

interface EditProjectProps {
	project: ProjectDetailDto;
	className?: string;
}

export const EditProject = ({ project, className }: EditProjectProps) => {
	const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);

	return (
		<>
			<Button
				variant="outline"
				className={cn(className)}
				onClick={() => setIsEditProjectModalOpen(true)}
			>
				<Edit3 className="mr-2 h-4 w-4" /> Edit Project
			</Button>

			{isEditProjectModalOpen && (
				<ProjectForm
					open={isEditProjectModalOpen}
					onClose={() => setIsEditProjectModalOpen(false)}
					project={project}
				/>
			)}
		</>
	);
};
