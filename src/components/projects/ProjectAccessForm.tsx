import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useTeams } from '@/hooks/api/useTeams';
import { useUsers } from '@/hooks/api/useUsers';
import React, { useState, useEffect } from 'react';
import { useUpdateProject } from '@/hooks/api/useProjects';
import { Project, AccessControlList } from '@/types/types';
import { X, ChevronsUpDown, Users as TeamsIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

interface ProjectAccessFormProps {
	project: Project;
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
	const availableItems = items.filter(item => !disabledIds.includes(item.id));

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline" role="combobox" aria-expanded={open} className="w-[150px] justify-between">
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
							{availableItems.map(item => (
								<CommandItem
									key={item.id}
									value={item.name}
									onSelect={() => {
										onSelect(item.id);
										setOpen(false);
									}}>
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
	const { data: allUsers = [] } = useUsers();
	const { data: allTeams = [] } = useTeams();

	const { toast } = useToast();
	const updateProjectMutation = useUpdateProject();

	const [access, setAccess] = useState<AccessControlList>({
		owners: { users: [], teams: [] },
		allow: { users: [], teams: [] },
		deny: { users: [] },
	});

	useEffect(() => {
		if (project.access) {
			setAccess(JSON.parse(JSON.stringify(project.access)));
		}
	}, [project.access, isOpen]);

	const getUserById = (id: string) => allUsers.find(u => u.id === id);

	const handleModify = (action: 'add' | 'remove', list: keyof AccessControlList, type: 'users' | 'teams', value: string) => {
		setAccess(prev => {
			const newAccess = JSON.parse(JSON.stringify(prev));
			const currentList = (newAccess[list] as any)[type] as string[];

			if (action === 'add' && !currentList.includes(value)) {
				currentList.push(value);
			} else if (action === 'remove') {
				(newAccess[list] as any)[type] = currentList.filter(item => item !== value);
			}
			return newAccess;
		});
	};

	const handleSubmit = async () => {
		try {
			const projectData = {
				name: project.name,
				description: project.description,
				serverUrl: project.serverUrl,
				links: project.links,
				access,
			};

			await updateProjectMutation.mutateAsync({ projectId: project.id, projectData });

			toast({ title: 'Success', description: 'Project access updated successfully.' });
			onClose();
		} catch (error: any) {
			toast({
				title: 'Error',
				description: error.error || 'Failed to update project access.',
				variant: 'destructive',
			});
		}
	};

	const renderAccessList = (title: string, list: keyof Omit<AccessControlList, 'deny'>) => {
		const userItems = access[list].users;
		const teamItems = access[list].teams;
		const allAssignedUserIds = [...access.owners.users, ...access.allow.users, ...access.deny.users];
		const allAssignedTeamIds = [...access.owners.teams, ...access.allow.teams];

		return (
			<Card>
				<CardHeader className="flex flex-row items-center justify-between pb-2">
					<CardTitle className="text-base font-medium">{title}</CardTitle>
					<div className="flex gap-2">
						<Selector
							items={allUsers.map(u => ({ id: u.id, name: u.username }))}
							onSelect={id => handleModify('add', list, 'users', id)}
							disabledIds={allAssignedUserIds}
							triggerText="Add User"
						/>
						<Selector
							items={allTeams.map(t => ({ id: t.id, name: t.name }))}
							onSelect={id => handleModify('add', list, 'teams', id)}
							disabledIds={allAssignedTeamIds}
							triggerText="Add Team"
						/>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					<div className="max-h-32 overflow-y-auto border-t">
						{userItems.length === 0 && teamItems.length === 0 ? (
							<div className="p-4 text-center text-muted-foreground text-sm">No entries.</div>
						) : (
							<Table>
								<TableBody>
									{userItems.map(userId => {
										const user = getUserById(userId);
										return (
											<TableRow key={`user-${userId}`}>
												<TableCell className="flex items-center gap-2 py-2">
													<Avatar className="h-6 w-6">
														<AvatarImage src={user?.profileImage} />
														<AvatarFallback className="text-xs">
															{user?.username.substring(0, 2).toUpperCase()}
														</AvatarFallback>
													</Avatar>
													<span className="text-sm">{user?.username || 'Unknown User'}</span>
												</TableCell>
												<TableCell className="text-right py-2">
													<Button
														variant="ghost"
														size="sm"
														className="h-6 w-6 p-0"
														onClick={() => handleModify('remove', list, 'users', userId)}>
														<X className="h-3 w-3" />
													</Button>
												</TableCell>
											</TableRow>
										);
									})}

									{teamItems.map(teamId => {
										const team = allTeams.find(t => t.id === teamId);
										return (
											<TableRow key={`team-${teamId}`}>
												<TableCell className="flex items-center gap-2 py-2">
													<TeamsIcon className="h-4 w-4 text-muted-foreground" />
													<span className="text-sm">{team?.name || 'Unknown Team'}</span>
												</TableCell>
												<TableCell className="text-right py-2">
													<Button
														variant="ghost"
														size="sm"
														className="h-6 w-6 p-0"
														onClick={() => handleModify('remove', list, 'teams', teamId)}>
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
				<DialogHeader className="flex-shrink-0">
					<DialogTitle>Manage Access for "{project.name}"</DialogTitle>
					<DialogDescription>
						Control who can see and manage this project. Changes are not saved until you click the save button.
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto space-y-4 py-4">
					{renderAccessList('Project Owners', 'owners')}
					{renderAccessList('General Access', 'allow')}

					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<CardTitle className="text-base font-medium">Denied Users</CardTitle>
							<Selector
								items={allUsers.map(u => ({ id: u.id, name: u.username }))}
								onSelect={id => handleModify('add', 'deny', 'users', id)}
								disabledIds={[...access.owners.users, ...access.allow.users, ...access.deny.users]}
								triggerText="Add User"
							/>
						</CardHeader>

						<CardContent className="p-0">
							<div className="max-h-32 overflow-y-auto border-t">
								{access.deny.users.length > 0 ? (
									<Table>
										<TableBody>
											{access.deny.users.map(userId => {
												const user = getUserById(userId);
												return (
													<TableRow key={`deny-${userId}`}>
														<TableCell className="flex items-center gap-2 py-2">
															<Avatar className="h-6 w-6">
																<AvatarImage src={user?.profileImage} />
																<AvatarFallback className="text-xs">
																	{user?.username.substring(0, 2).toUpperCase()}
																</AvatarFallback>
															</Avatar>
															<span className="text-sm">{user?.username || 'Unknown User'}</span>
														</TableCell>
														<TableCell className="text-right py-2">
															<Button
																variant="ghost"
																size="sm"
																className="h-6 w-6 p-0"
																onClick={() => handleModify('remove', 'deny', 'users', userId)}>
																<X className="h-3 w-3" />
															</Button>
														</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								) : (
									<div className="p-4 text-center text-muted-foreground text-sm">No entries.</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>

				<DialogFooter className="flex-shrink-0">
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={updateProjectMutation.isPending}>
						{updateProjectMutation.isPending ? 'Saving...' : 'Save Changes'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default ProjectAccessForm;
