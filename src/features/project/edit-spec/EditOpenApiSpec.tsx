import { usePermissions } from '@/hooks/usePermissions';
import type { components } from '@/shared/types/api-types';
import type { OpenAPISpec } from '@/shared/types/types';
import { Button } from '@/shared/ui/button';
import { Edit3 } from 'lucide-react';
import { useState } from 'react';
import OpenApiEditor from './OpenApiEditor';

type ProjectDetailDto = components['schemas']['ProjectDetailDto'];

interface EditOpenApiSpecProps {
	project: ProjectDetailDto;
	openApiSpec: OpenAPISpec | null;
}

export const EditOpenApiSpec = ({ project, openApiSpec }: EditOpenApiSpecProps) => {
	const [isOpenApiEditorOpen, setIsOpenApiEditorOpen] = useState(false);
	const { isProjectOwner } = usePermissions();

	const emptySpec: OpenAPISpec = {
		openapi: '3.0.0',
		info: {
			title: project.name || 'Untitled API',
			version: '1.0.0',
		},
		paths: {},
	};

	if (!isProjectOwner(project)) {
		return null;
	}

	return (
		<>
			<Button variant="outline" onClick={() => setIsOpenApiEditorOpen(true)}>
				<Edit3 className="mr-2 h-4 w-4" /> Edit Open API
			</Button>

			{isOpenApiEditorOpen && (
				<OpenApiEditor
					projectId={project.id}
					openApi={openApiSpec || emptySpec}
					projectUpdatedAt={project.updatedAt}
					isOpen={isOpenApiEditorOpen}
					onClose={() => setIsOpenApiEditorOpen(false)}
				/>
			)}
		</>
	);
};
