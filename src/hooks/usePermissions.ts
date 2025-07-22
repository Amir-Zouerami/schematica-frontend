import { useAuth } from '@/contexts/AuthContext';
import { Project } from '@/types/types';

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

	const isProjectOwner = (project: Project | undefined | null): boolean => {
		if (user.role === 'admin') {
			return true;
		}

		if (!project || !project.access) {
			return false;
		}

		if (project.access.owners.users.includes(user.id)) {
			return true;
		}

		if (user.teams?.some(team => project.access?.owners.teams.includes(team))) {
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
