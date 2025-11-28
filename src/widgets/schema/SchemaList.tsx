import { useProject } from '@/entities/Project/api/useProject';
import { useDeleteSchema, useSchemas } from '@/entities/Schema/api/useSchemas';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate } from '@/shared/lib/schemaUtils';
import type { components } from '@/shared/types/api-types';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/shared/ui/alert-dialog';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';
import { Box, Edit, Eye, Plus, Search, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { SchemaEditorDialog } from './SchemaEditorDialog';

type SchemaComponentDto = components['schemas']['SchemaComponentDto'];

interface SchemaListProps {
	projectId: string;
}

export const SchemaList: React.FC<SchemaListProps> = ({ projectId }) => {
	const { data: project } = useProject(projectId);
	const { isProjectOwner } = usePermissions();
	const canEdit = isProjectOwner(project);

	const { data: schemas, isLoading, error } = useSchemas(projectId);
	const deleteMutation = useDeleteSchema();

	const [search, setSearch] = useState('');
	const [isEditorOpen, setIsEditorOpen] = useState(false);
	const [schemaToEdit, setSchemaToEdit] = useState<SchemaComponentDto | undefined>(undefined);

	const filteredSchemas = schemas?.filter((s) =>
		s.name.toLowerCase().includes(search.toLowerCase()),
	);

	const handleViewOrEdit = (schema: SchemaComponentDto) => {
		setSchemaToEdit(schema);
		setIsEditorOpen(true);
	};

	const handleCreate = () => {
		setSchemaToEdit(undefined);
		setIsEditorOpen(true);
	};

	const handleDelete = async (name: string) => {
		try {
			await deleteMutation.mutateAsync({ projectId, name });
		} catch (e) {
			console.error(e);
		}
	};

	if (isLoading) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton key={i} className="h-32 w-full" />
				))}
			</div>
		);
	}

	if (error) {
		return <div className="text-destructive">Failed to load schemas.</div>;
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap justify-between items-center gap-3">
				<div className="relative w-full max-w-sm">
					<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search schemas..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-8"
					/>
				</div>

				{canEdit && (
					<Button onClick={handleCreate} className="w-full md:w-auto">
						<Plus className="h-4 w-4 mr-2" /> Create Schema
					</Button>
				)}
			</div>

			{filteredSchemas?.length === 0 ? (
				<div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
					<Box className="h-10 w-10 mx-auto mb-3 opacity-20" />
					<p>No schemas found.</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{filteredSchemas?.map((schema) => (
						<Card
							key={schema.id}
							className="group hover:border-primary/50 transition-colors cursor-pointer"
							onClick={() => handleViewOrEdit(schema)}
						>
							<CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
								<CardTitle
									className="text-base font-mono truncate"
									title={schema.name}
								>
									{schema.name}
								</CardTitle>

								<Badge variant="secondary" className="text-[10px] font-normal">
									{formatDate(schema.updatedAt)}
								</Badge>
							</CardHeader>

							<CardContent>
								<p className="text-sm text-muted-foreground line-clamp-2 min-h-10 mb-4">
									{schema.description || 'No description provided.'}
								</p>

								<div
									className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
									onClick={(e) => e.stopPropagation()}
								>
									<Button
										variant="secondary"
										size="sm"
										onClick={() => handleViewOrEdit(schema)}
									>
										{canEdit ? (
											<Edit className="h-3 w-3 mr-1" />
										) : (
											<Eye className="h-3 w-3 mr-1" />
										)}
										{canEdit ? 'Edit' : 'View'}
									</Button>

									{canEdit && (
										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 text-destructive hover:bg-destructive/10"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</AlertDialogTrigger>

											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>
														Delete Schema?
													</AlertDialogTitle>

													<AlertDialogDescription>
														Deleting <strong>{schema.name}</strong>{' '}
														might break endpoints referencing it. Are
														you sure you want to continue?
													</AlertDialogDescription>
												</AlertDialogHeader>

												<AlertDialogFooter>
													<AlertDialogCancel>Cancel</AlertDialogCancel>
													<AlertDialogAction
														className="bg-destructive"
														onClick={() => handleDelete(schema.name)}
													>
														Delete
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									)}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			<SchemaEditorDialog
				projectId={projectId}
				isOpen={isEditorOpen}
				onClose={() => setIsEditorOpen(false)}
				schemaToEdit={schemaToEdit}
				readOnly={!canEdit}
			/>
		</div>
	);
};
