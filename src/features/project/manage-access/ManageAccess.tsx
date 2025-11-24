import ProjectAccessForm from '@/features/project/manage-access/ProjectAccessForm';
import { cn } from '@/shared/lib/utils';
import type { components } from '@/shared/types/api-types';
import { Button } from '@/shared/ui/button';
import { Users } from 'lucide-react';
import { useState } from 'react';

type ProjectDetailDto = components['schemas']['ProjectDetailDto'];

interface ManageAccessProps {
	project: ProjectDetailDto;
	className?: string;
}

export const ManageAccess = ({ project, className }: ManageAccessProps) => {
	const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

	return (
		<>
			<Button
				variant="outline"
				className={cn(className)}
				onClick={() => setIsAccessModalOpen(true)}
			>
				<Users className="mr-2 h-4 w-4" /> Manage Access
			</Button>

			{isAccessModalOpen && (
				<ProjectAccessForm
					project={project}
					isOpen={isAccessModalOpen}
					onClose={() => setIsAccessModalOpen(false)}
				/>
			)}
		</>
	);
};
