import { SelectableItem } from '@/components/projects/UserTeamSelector';
import type { components } from '@/shared/types/api-types';
import { useCallback, useState } from 'react';

type SanitizedUserDto = components['schemas']['SanitizedUserDto'];
type TeamDto = components['schemas']['TeamDto'];
type ProjectDetailDto = components['schemas']['ProjectDetailDto'];

export interface AccessControlState {
	owners: { users: SanitizedUserDto[]; teams: TeamDto[] };
	viewers: { users: SanitizedUserDto[]; teams: TeamDto[] };
	deniedUsers: SanitizedUserDto[];
}

export const useProjectAccess = (project: ProjectDetailDto) => {
	const [access, setAccess] = useState<AccessControlState>({
		owners: {
			users: project.access?.owners?.users || [],
			teams: project.access?.owners?.teams || [],
		},
		viewers: {
			users: project.access?.viewers?.users || [],
			teams: project.access?.viewers?.teams || [],
		},
		deniedUsers: project.access?.deniedUsers || [],
	});

	const getAllUserIds = useCallback(() => {
		return [
			...access.owners.users.map((u) => u.id),
			...access.viewers.users.map((u) => u.id),
			...access.deniedUsers.map((u) => u.id),
		];
	}, [access]);

	const getAllTeamIds = useCallback(() => {
		return [...access.owners.teams.map((t) => t.id), ...access.viewers.teams.map((t) => t.id)];
	}, [access]);

	const addUser = useCallback(
		(targetList: 'owners' | 'viewers' | 'deniedUsers', item: SelectableItem) => {
			setAccess((prev) => {
				const newAccess: AccessControlState = JSON.parse(JSON.stringify(prev));

				newAccess.owners.users = newAccess.owners.users.filter((u) => u.id !== item.id);
				newAccess.viewers.users = newAccess.viewers.users.filter((u) => u.id !== item.id);
				newAccess.deniedUsers = newAccess.deniedUsers.filter((u) => u.id !== item.id);

				const userToAdd: SanitizedUserDto = {
					id: item.id,
					username: item.name,
					profileImage: item.image || null,
				};

				if (targetList === 'deniedUsers') {
					newAccess.deniedUsers.push(userToAdd);
				} else {
					newAccess[targetList].users.push(userToAdd);
				}

				return newAccess;
			});
		},
		[],
	);

	const addTeam = useCallback((targetList: 'owners' | 'viewers', item: SelectableItem) => {
		setAccess((prev) => {
			const newAccess: AccessControlState = JSON.parse(JSON.stringify(prev));

			newAccess.owners.teams = newAccess.owners.teams.filter((t) => t.id !== item.id);
			newAccess.viewers.teams = newAccess.viewers.teams.filter((t) => t.id !== item.id);

			const teamToAdd: TeamDto = {
				id: item.id,
				name: item.name,
				createdAt: '',
				updatedAt: '',
			};

			newAccess[targetList].teams.push(teamToAdd);

			return newAccess;
		});
	}, []);

	const removeUser = useCallback(
		(targetList: 'owners' | 'viewers' | 'deniedUsers', userId: string) => {
			setAccess((prev) => {
				const newAccess: AccessControlState = JSON.parse(JSON.stringify(prev));

				if (targetList === 'deniedUsers') {
					newAccess.deniedUsers = newAccess.deniedUsers.filter((u) => u.id !== userId);
				} else {
					newAccess[targetList].users = newAccess[targetList].users.filter(
						(u) => u.id !== userId,
					);
				}

				return newAccess;
			});
		},
		[],
	);

	const removeTeam = useCallback((targetList: 'owners' | 'viewers', teamId: string) => {
		setAccess((prev) => {
			const newAccess: AccessControlState = JSON.parse(JSON.stringify(prev));

			newAccess[targetList].teams = newAccess[targetList].teams.filter(
				(t) => t.id !== teamId,
			);

			return newAccess;
		});
	}, []);

	const resetAccess = useCallback((serverData: ProjectDetailDto) => {
		setAccess({
			owners: {
				users: serverData.access?.owners?.users || [],
				teams: serverData.access?.owners?.teams || [],
			},
			viewers: {
				users: serverData.access?.viewers?.users || [],
				teams: serverData.access?.viewers?.teams || [],
			},
			deniedUsers: serverData.access?.deniedUsers || [],
		});
	}, []);

	return {
		access,
		addUser,
		addTeam,
		removeUser,
		removeTeam,
		resetAccess,
		getAllUserIds,
		getAllTeamIds,
	};
};
