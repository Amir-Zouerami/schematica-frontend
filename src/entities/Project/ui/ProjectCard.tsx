import { useMe } from '@/entities/User/api/useMe';
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
import { Button } from '@/shared/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/shared/ui/card';
import { formatDistanceToNow } from 'date-fns';
import React from 'react';
import { useNavigate } from 'react-router-dom';

type ProjectSummaryDto = components['schemas']['ProjectSummaryDto'];

interface ProjectCardProps {
	project: ProjectSummaryDto;
	onDelete: (id: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onDelete }) => {
	const navigate = useNavigate();
	const { data: user } = useMe();

	const viewProject = () => {
		navigate(`/projects/${project.id}`);
	};

	const confirmDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		onDelete(project.id);
	};

	return (
		<Card
			className="overflow-hidden hover:shadow-lg transition-shadow duration-300 glass-card cursor-pointer flex flex-col"
			onClick={viewProject}
		>
			<CardHeader className="pb-4">
				<CardTitle
					className="text-gradient-green text-xl"
					style={{ unicodeBidi: 'plaintext' }}
				>
					{project.name}
				</CardTitle>

				<CardDescription className="text-muted-foreground text-sm">
					<div className="text-xs mb-1 mt-1">
						<span>Updated: </span>
						{formatDistanceToNow(new Date(project.updatedAt), {
							addSuffix: true,
						})}{' '}
						by {project.updatedBy.username}
					</div>
				</CardDescription>
			</CardHeader>

			<CardContent className="grow space-y-4">
				<p
					className="text-sm line-clamp-3 text-muted-foreground"
					style={{ unicodeBidi: 'plaintext' }}
				>
					{typeof project.description === 'string' && project.description
						? project.description
						: 'No description provided.'}
				</p>

				{project.servers && project.servers.length > 0 && (
					<div className="text-xs bg-secondary/30 rounded p-2 font-mono overflow-hidden">
						<div className="truncate" title={project.servers[0].url}>
							{project.servers[0].url}
						</div>
					</div>
				)}
			</CardContent>

			<CardFooter className="pt-2 flex justify-between items-center">
				<div className="text-xs text-muted-foreground">
					Created by {project.creator.username}
				</div>

				<div className="flex space-x-2">
					{user?.role === 'admin' && (
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									variant="destructive"
									size="sm"
									onClick={(e) => e.stopPropagation()}
								>
									Delete
								</Button>
							</AlertDialogTrigger>

							<AlertDialogContent
								onClick={(e) => e.stopPropagation()}
								className="max-w-3xl"
							>
								<AlertDialogHeader>
									<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>

									<AlertDialogDescription className="py-2 leading-6">
										This action cannot be undone. This will permanently delete
										the
										<strong className="mx-1">"{project.name}"</strong>
										project and all of its associated data.
									</AlertDialogDescription>
								</AlertDialogHeader>

								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>

									<AlertDialogAction
										onClick={confirmDelete}
										className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
									>
										Confirm Delete
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					)}

					<Button variant="default" size="sm" onClick={viewProject}>
						View
					</Button>
				</div>
			</CardFooter>
		</Card>
	);
};

export default ProjectCard;
