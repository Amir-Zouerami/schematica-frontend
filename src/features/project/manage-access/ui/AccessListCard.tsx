import UserTeamSelector, { type SelectableItem } from '@/components/projects/UserTeamSelector';
import type { components } from '@/shared/types/api-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/shared/ui/table';
import { Users as TeamsIcon, X } from 'lucide-react';
import React from 'react';

type SanitizedUserDto = components['schemas']['SanitizedUserDto'];
type TeamDto = components['schemas']['TeamDto'];

interface AccessListCardProps {
	title: string;
	users: SanitizedUserDto[];
	teams?: TeamDto[];
	onAddUser: (item: SelectableItem) => void;
	onAddTeam?: (item: SelectableItem) => void;
	onRemoveUser: (userId: string) => void;
	onRemoveTeam?: (teamId: string) => void;
	allAssignedUserIds: string[];
	allAssignedTeamIds: string[];
}

export const AccessListCard: React.FC<AccessListCardProps> = ({
	title,
	users,
	teams = [],
	onAddUser,
	onAddTeam,
	onRemoveUser,
	onRemoveTeam,
	allAssignedUserIds,
	allAssignedTeamIds,
}) => {
	return (
		<Card>
			<CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
				<CardTitle className="text-base font-medium">{title}</CardTitle>

				<div className="flex gap-2 w-full sm:w-auto">
					<UserTeamSelector
						type="user"
						onSelect={onAddUser}
						disabledIds={allAssignedUserIds}
						triggerText="Add User"
					/>
					{onAddTeam && (
						<UserTeamSelector
							type="team"
							onSelect={onAddTeam}
							disabledIds={allAssignedTeamIds}
							triggerText="Add Team"
						/>
					)}
				</div>
			</CardHeader>

			<CardContent className="p-0">
				<div className="max-h-32 overflow-y-auto overflow-x-auto border-t">
					{users.length === 0 && teams.length === 0 ? (
						<div className="p-4 text-center text-muted-foreground text-sm">
							No entries.
						</div>
					) : (
						<Table className="min-w-full">
							<TableBody>
								{users.map((user) => (
									<TableRow key={`user-${user.id}`}>
										<TableCell className="flex items-center gap-2 py-2 whitespace-nowrap">
											<Avatar className="h-6 w-6">
												<AvatarImage src={user.profileImage || undefined} />
												<AvatarFallback className="text-xs">
													{user.username.substring(0, 2).toUpperCase()}
												</AvatarFallback>
											</Avatar>

											<span className="text-sm">{user.username}</span>
										</TableCell>

										<TableCell className="text-right py-2">
											<Button
												variant="ghost"
												size="sm"
												className="h-6 w-6 p-0"
												onClick={() => onRemoveUser(user.id)}
											>
												<X className="h-3 w-3" />
											</Button>
										</TableCell>
									</TableRow>
								))}

								{teams.map((team) => (
									<TableRow key={`team-${team.id}`}>
										<TableCell className="flex items-center gap-2 py-2 whitespace-nowrap">
											<TeamsIcon className="h-4 w-4 text-muted-foreground" />
											<span className="text-sm">{team.name}</span>
										</TableCell>

										<TableCell className="text-right py-2">
											{onRemoveTeam && (
												<Button
													variant="ghost"
													size="sm"
													className="h-6 w-6 p-0"
													onClick={() => onRemoveTeam(team.id)}
												>
													<X className="h-3 w-3" />
												</Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</div>
			</CardContent>
		</Card>
	);
};
