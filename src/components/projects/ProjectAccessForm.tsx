import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { useUpdateProjectAccess } from '@/hooks/api/useProjects';
import { useTeams } from '@/hooks/api/useTeams';
import { useUsers } from '@/hooks/api/useUsers';
import { useToast } from '@/hooks/use-toast';
import type { components } from '@/types/api-types';
import { ApiError } from '@/utils/api';
import { ChevronsUpDown, Users as TeamsIcon, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

// Correctly imported types
type ProjectDetailDto = components['schemas']['ProjectDetailDto'];
type UpdateAccessDto = components['schemas']['UpdateAccessDto'];
type SanitizedUserDto = components['schemas']['SanitizedUserDto'];
type TeamDto = components['schemas']['TeamDto'];

// Stricter local type for state management
interface AccessControlState {
	owners: { users: string[]; teams: string[] };
	viewers: { users: string[]; teams: string[] };
	deniedUsers: string[];
}

interface ProjectAccessFormProps {
	project: ProjectDetailDto;
	isOpen: boolean;
	onClose: () => void;
}

const Selector = ({
	items,
	onSelect,
	disabledIds,
	triggerText,
}: {
	items: { id: string; name: string }[];
	onSelect: (id: string) => void;
	disabledIds: string[];
	triggerText: string;
}) => {
	const [open, setOpen] = useState(false);
	const availableItems = items.filter((item) => !disabledIds.includes(item.id));

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-[150px] justify-between"
				>
					{triggerText}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>

			<PopoverContent className="w-[200px] p-0">
				<Command>
					<CommandInput placeholder={`Search ${triggerText.toLowerCase()}...`} />

					<CommandList>
						<CommandEmpty>No results found.</CommandEmpty>
						<CommandGroup>
							{availableItems.map((item) => (
								<CommandItem
									key={item.id}
									value={item.name}
									onSelect={() => {
										onSelect(item.id);
										setOpen(false);
									}}
								>
									{item.name}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
};

const ProjectAccessForm: React.FC<ProjectAccessFormProps> = ({ project, isOpen, onClose }) => {
	const { data: usersResponse } = useUsers();
	const { data: teamsResponse } = useTeams();
	const allUsers = usersResponse?.data || [];
	const allTeams = teamsResponse?.data || [];

	const { toast } = useToast();
	const updateAccessMutation = useUpdateProjectAccess();

	const [access, setAccess] = useState<AccessControlState>({
		owners: { users: [], teams: [] },
		viewers: { users: [], teams: [] },
		deniedUsers: [],
	});

	useEffect(() => {
		if (project.access) {
			setAccess(JSON.parse(JSON.stringify(project.access as unknown as AccessControlState)));
		}
	}, [project.access, isOpen]);

	const getUserById = (id: string): SanitizedUserDto | undefined =>
		allUsers.find((u) => u.id === id);

	const handleModify = (
		action: 'add' | 'remove',
		list: keyof AccessControlState,
		type: 'users' | 'teams',
		value: string,
	) => {
		setAccess((prev) => {
			const newAccess = { ...prev };

			if (type === 'teams' && list !== 'deniedUsers') {
				const currentList = newAccess[list].teams;
				if (action === 'add' && !currentList.includes(value)) {
					newAccess[list].teams = [...currentList, value];
				} else if (action === 'remove') {
					newAccess[list].teams = currentList.filter((item) => item !== value);
				}
			} else if (type === 'users') {
				const listKey = list as 'owners' | 'viewers' | 'deniedUsers';
				const currentList =
					listKey === 'deniedUsers' ? newAccess.deniedUsers : newAccess[listKey].users;

				if (action === 'add' && !currentList.includes(value)) {
					if (listKey === 'deniedUsers') newAccess.deniedUsers = [...currentList, value];
					else newAccess[listKey].users = [...currentList, value];
				} else if (action === 'remove') {
					const filteredList = currentList.filter((item) => item !== value);
					if (listKey === 'deniedUsers') newAccess.deniedUsers = filteredList;
					else newAccess[listKey].users = filteredList;
				}
			}
			return newAccess;
		});
	};

	const handleSubmit = async () => {
		try {
			const accessData: UpdateAccessDto = {
				...access,
				lastKnownUpdatedAt: project.updatedAt,
			};

			await updateAccessMutation.mutateAsync({ projectId: project.id, accessData });

			toast({ title: 'Success', description: 'Project access updated successfully.' });
			onClose();
		} catch (err) {
			const errorMessage =
				err instanceof ApiError ? err.message : 'Failed to update project access.';
			toast({
				title: 'Error',
				description: errorMessage,
				variant: 'destructive',
			});
		}
	};

	const renderAccessList = (title: string, list: 'owners' | 'viewers') => {
		const userItems = access[list].users;
		const teamItems = access[list].teams;
		const allAssignedUserIds = [
			...access.owners.users,
			...access.viewers.users,
			...access.deniedUsers,
		];
		const allAssignedTeamIds = [...access.owners.teams, ...access.viewers.teams];

		return (
			<Card>
				<CardHeader className="flex flex-row items-center justify-between pb-2">
					<CardTitle className="text-base font-medium">{title}</CardTitle>
					<div className="flex gap-2">
						<Selector
							items={allUsers.map((u) => ({ id: u.id, name: u.username }))}
							onSelect={(id) => handleModify('add', list, 'users', id)}
							disabledIds={allAssignedUserIds}
							triggerText="Add User"
						/>
						<Selector
							items={allTeams.map((t) => ({ id: t.id, name: t.name }))}
							onSelect={(id) => handleModify('add', list, 'teams', id)}
							disabledIds={allAssignedTeamIds}
							triggerText="Add Team"
						/>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					<div className="max-h-32 overflow-y-auto border-t">
						{userItems.length === 0 && teamItems.length === 0 ? (
							<div className="p-4 text-center text-muted-foreground text-sm">
								No entries.
							</div>
						) : (
							<Table>
								<TableBody>
									{userItems.map((userId) => {
										const user = getUserById(userId);
										return (
											<TableRow key={`user-${userId}`}>
												<TableCell className="flex items-center gap-2 py-2">
													<Avatar className="h-6 w-6">
														<AvatarImage
															src={
																typeof user?.profileImage ===
																'string'
																	? user.profileImage
																	: undefined
															}
														/>
														<AvatarFallback className="text-xs">
															{user?.username
																.substring(0, 2)
																.toUpperCase()}
														</AvatarFallback>
													</Avatar>
													<span className="text-sm">
														{user?.username || 'Unknown User'}
													</span>
												</TableCell>
												<TableCell className="text-right py-2">
													<Button
														variant="ghost"
														size="sm"
														className="h-6 w-6 p-0"
														onClick={() =>
															handleModify(
																'remove',
																list,
																'users',
																userId,
															)
														}
													>
														<X className="h-3 w-3" />
													</Button>
												</TableCell>
											</TableRow>
										);
									})}

									{teamItems.map((teamId) => {
										const team = allTeams.find((t) => t.id === teamId);
										return (
											<TableRow key={`team-${teamId}`}>
												<TableCell className="flex items-center gap-2 py-2">
													<TeamsIcon className="h-4 w-4 text-muted-foreground" />
													<span className="text-sm">
														{team?.name || 'Unknown Team'}
													</span>
												</TableCell>
												<TableCell className="text-right py-2">
													<Button
														variant="ghost"
														size="sm"
														className="h-6 w-6 p-0"
														onClick={() =>
															handleModify(
																'remove',
																list,
																'teams',
																teamId,
															)
														}
													>
														<X className="h-3 w-3" />
													</Button>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						)}
					</div>
				</CardContent>
			</Card>
		);
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
				<DialogHeader className="shrink-0">
					<DialogTitle>Manage Access for "{project.name}"</DialogTitle>
					<DialogDescription>
						Control who can see and manage this project. Changes are not saved until you
						click the save button.
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto space-y-4 py-4">
					{renderAccessList('Project Owners', 'owners')}
					{renderAccessList('General Access', 'viewers')}

					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<CardTitle className="text-base font-medium">Denied Users</CardTitle>
							<Selector
								items={allUsers.map((u) => ({ id: u.id, name: u.username }))}
								onSelect={(id) => handleModify('add', 'deniedUsers', 'users', id)}
								disabledIds={[
									...access.owners.users,
									...access.viewers.users,
									...access.deniedUsers,
								]}
								triggerText="Add User"
							/>
						</CardHeader>

						<CardContent className="p-0">
							<div className="max-h-32 overflow-y-auto border-t">
								{access.deniedUsers.length > 0 ? (
									<Table>
										<TableBody>
											{access.deniedUsers.map((userId) => {
												const user = getUserById(userId);
												return (
													<TableRow key={`deny-${userId}`}>
														<TableCell className="flex items-center gap-2 py-2">
															<Avatar className="h-6 w-6">
																<AvatarImage
																	src={
																		typeof user?.profileImage ===
																		'string'
																			? user.profileImage
																			: undefined
																	}
																/>
																<AvatarFallback className="text-xs">
																	{user?.username
																		.substring(0, 2)
																		.toUpperCase()}
																</AvatarFallback>
															</Avatar>
															<span className="text-sm">
																{user?.username || 'Unknown User'}
															</span>
														</TableCell>
														<TableCell className="text-right py-2">
															<Button
																variant="ghost"
																size="sm"
																className="h-6 w-6 p-0"
																onClick={() =>
																	handleModify(
																		'remove',
																		'deniedUsers',
																		'users',
																		userId,
																	)
																}
															>
																<X className="h-3 w-3" />
															</Button>
														</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								) : (
									<div className="p-4 text-center text-muted-foreground text-sm">
										No entries.
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>

				<DialogFooter className="shrink-0">
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={updateAccessMutation.isPending}>
						{updateAccessMutation.isPending ? 'Saving...' : 'Save Changes'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default ProjectAccessForm;
