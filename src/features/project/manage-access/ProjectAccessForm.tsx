import { ConcurrencyConflictDialog } from '@/components/general/ConcurrencyConflictDialog';
import { useUpdateProjectAccess } from '@/entities/Project/api/useProjects';
import { useMe } from '@/entities/User/api/useMe';
import { useProjectAccess } from '@/features/project/manage-access/hooks/useProjectAccess';
import { AccessListCard } from '@/features/project/manage-access/ui/AccessListCard';
import { useToast } from '@/hooks/use-toast';
import { api, ApiError } from '@/shared/api/api';
import { sanitizeUserForApi } from '@/shared/lib/utils';
import type { components } from '@/shared/types/api-types';
import { Button } from '@/shared/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/shared/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import React, { useEffect, useState } from 'react';

type ProjectDetailDto = components['schemas']['ProjectDetailDto'];

interface ProjectAccessFormProps {
	project: ProjectDetailDto;
	isOpen: boolean;
	onClose: () => void;
}

const ProjectAccessForm: React.FC<ProjectAccessFormProps> = ({ project, isOpen, onClose }) => {
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const updateAccessMutation = useUpdateProjectAccess();
	const { data: currentUser } = useMe();

	const {
		access,
		addUser,
		addTeam,
		removeUser,
		removeTeam,
		resetAccess,
		getAllUserIds,
		getAllTeamIds,
	} = useProjectAccess(project);

	const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
	const [conflictingServerData, setConflictingServerData] = useState<ProjectDetailDto | null>(
		null,
	);

	const [currentUpdatedAt, setCurrentUpdatedAt] = useState(project.updatedAt);

	useEffect(() => {
		if (isOpen) {
			resetAccess(project);
			setCurrentUpdatedAt(project.updatedAt);
			setIsConflictDialogOpen(false);
			setConflictingServerData(null);
		}
	}, [isOpen, project, resetAccess]);

	const fetchFreshData = async () => {
		const res = await api.get<ProjectDetailDto>(`/projects/${project.id}?_t=${Date.now()}`);
		return res.data;
	};

	const handleSubmit = async (forceOverwrite = false) => {
		let timestampToSubmit = currentUpdatedAt;

		if (forceOverwrite) {
			try {
				const freshData = await fetchFreshData();
				timestampToSubmit = freshData.updatedAt;
				setCurrentUpdatedAt(timestampToSubmit);
			} catch (e) {
				toast({
					title: 'Error',
					description: 'Could not fetch latest version.',
					variant: 'destructive',
				});

				return;
			}
		}

		const sanitizedAccess = {
			owners: {
				...access.owners,
				users: access.owners.users.map(sanitizeUserForApi),
			},
			viewers: {
				...access.viewers,
				users: access.viewers.users.map(sanitizeUserForApi),
			},
			deniedUsers: access.deniedUsers.map(sanitizeUserForApi),
		};

		try {
			await updateAccessMutation.mutateAsync({
				projectId: project.id,
				accessData: {
					...sanitizedAccess,
					lastKnownUpdatedAt: timestampToSubmit,
				},
			});

			toast({ title: 'Success', description: 'Project access updated successfully.' });
			onClose();
		} catch (err) {
			const error = err as ApiError;

			if (error.status === 409 && error.metaCode === 'PROJECT_CONCURRENCY_CONFLICT') {
				try {
					const freshData = await fetchFreshData();
					setConflictingServerData(freshData);
					setIsConflictDialogOpen(true);
				} catch (e) {
					toast({
						title: 'Conflict',
						description: 'Failed to load server version.',
						variant: 'destructive',
					});
				}
			} else {
				toast({ title: 'Error', description: error.message, variant: 'destructive' });
			}
		}
	};

	const handleForceOverwrite = () => {
		setIsConflictDialogOpen(false);
		handleSubmit(true);
	};

	const handleRefreshAndDiscard = () => {
		if (conflictingServerData) {
			resetAccess(conflictingServerData);
			setCurrentUpdatedAt(conflictingServerData.updatedAt);
			queryClient.invalidateQueries({ queryKey: ['project', project.id] });
		}

		setIsConflictDialogOpen(false);
		toast({ title: 'Access List Reloaded', description: 'Your changes have been discarded.' });
	};

	return (
		<>
			<Dialog open={isOpen} onOpenChange={onClose}>
				<DialogContent className="sm:max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
					<DialogHeader className="shrink-0">
						<DialogTitle>Manage Access for "{project.name}"</DialogTitle>
						<DialogDescription>
							Control who can see and manage this project.
						</DialogDescription>
					</DialogHeader>

					{currentUser?.role === 'admin' && (
						<div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-3 text-sm text-amber-600 dark:text-amber-400 shrink-0">
							<ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />

							<div>
								<p className="font-semibold">Admin Override Active</p>
								<p className="opacity-90">
									As an Administrator, you have full access to this project
									regardless of the list below.
								</p>
							</div>
						</div>
					)}

					<div className="flex-1 overflow-y-auto space-y-4 py-4">
						<AccessListCard
							title="Project Owners"
							users={access.owners.users}
							teams={access.owners.teams}
							onAddUser={(i) => addUser('owners', i)}
							onAddTeam={(i) => addTeam('owners', i)}
							onRemoveUser={(id) => removeUser('owners', id)}
							onRemoveTeam={(id) => removeTeam('owners', id)}
							allAssignedUserIds={getAllUserIds()}
							allAssignedTeamIds={getAllTeamIds()}
						/>

						<AccessListCard
							title="General Access (Viewers)"
							users={access.viewers.users}
							teams={access.viewers.teams}
							onAddUser={(i) => addUser('viewers', i)}
							onAddTeam={(i) => addTeam('viewers', i)}
							onRemoveUser={(id) => removeUser('viewers', id)}
							onRemoveTeam={(id) => removeTeam('viewers', id)}
							allAssignedUserIds={getAllUserIds()}
							allAssignedTeamIds={getAllTeamIds()}
						/>

						<AccessListCard
							title="Denied Users"
							users={access.deniedUsers}
							onAddUser={(i) => addUser('deniedUsers', i)}
							onRemoveUser={(id) => removeUser('deniedUsers', id)}
							allAssignedUserIds={getAllUserIds()}
							allAssignedTeamIds={getAllTeamIds()}
						/>
					</div>

					<DialogFooter className="shrink-0">
						<Button variant="outline" onClick={onClose} className="cursor-pointer">
							Cancel
						</Button>

						<Button
							onClick={() => handleSubmit(false)}
							disabled={updateAccessMutation.isPending}
							className="cursor-pointer"
						>
							{updateAccessMutation.isPending ? 'Saving...' : 'Save Changes'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{conflictingServerData?.access && (
				<ConcurrencyConflictDialog
					isOpen={isConflictDialogOpen}
					onClose={() => setIsConflictDialogOpen(false)}
					onForceOverwrite={handleForceOverwrite}
					onRefreshAndDiscard={handleRefreshAndDiscard}
					localChanges={access}
					serverChanges={{
						owners: conflictingServerData.access?.owners || { users: [], teams: [] },
						viewers: conflictingServerData.access?.viewers || { users: [], teams: [] },
						deniedUsers: conflictingServerData.access?.deniedUsers || [],
					}}
					resourceName="access list"
				/>
			)}
		</>
	);
};

export default ProjectAccessForm;
