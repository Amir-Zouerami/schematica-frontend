import { useMe } from '@/entities/User/api/useMe';
import type { components } from '@/shared/types/api-types';

type ProjectDetailDto = components['schemas']['ProjectDetailDto'];
type TeamDto = components['schemas']['TeamDto'];
type SanitizedUserDto = components['schemas']['SanitizedUserDto'];

interface AccessControlList {
	owners: { users: SanitizedUserDto[]; teams: TeamDto[] };
	viewers: { users: SanitizedUserDto[]; teams: TeamDto[] };
	deniedUsers: SanitizedUserDto[];
}

export const usePermissions = () => {
	const { data: user } = useMe();

	if (!user) {
		return {
			user: null,
			canCreateProject: false,
			isProjectOwner: () => false,
		};
	}

	const canCreateProject = user.role === 'admin' || user.role === 'member';

	const isProjectOwner = (project: ProjectDetailDto | undefined | null): boolean => {
		if (user.role === 'admin') {
			return true;
		}

		if (!project || !project.access) {
			return false;
		}

		const access = project.access as unknown as AccessControlList;
		if (access.owners.users.some((ownerUser) => ownerUser.id === user.id)) {
			return true;
		}

		if (
			user.teams?.some((team: TeamDto) =>
				access.owners.teams.some((ownerTeam) => ownerTeam.id === team.id),
			)
		) {
			return true;
		}

		return false;
	};

	return {
		user,
		canCreateProject,
		isProjectOwner,
	};
};
