import { useAuth } from '@/contexts/AuthContext';
import type { components } from '@/types/api-types';

type ProjectDetailDto = components['schemas']['ProjectDetailDto'];
type TeamDto = components['schemas']['TeamDto'];

// Re-defining a stricter type for ACL until it's fixed in the generator
interface AccessControlList {
	owners: { users: string[]; teams: string[] };
	viewers: { users: string[]; teams: string[] };
	deniedUsers: string[];
}

export const usePermissions = () => {
	const { user } = useAuth();

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

		if (access.owners.users.includes(user.id)) {
			return true;
		}

		if (user.teams?.some((team: TeamDto) => access.owners.teams.includes(team.id))) {
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
