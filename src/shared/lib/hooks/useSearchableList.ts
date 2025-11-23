import { api } from '@/shared/api/api';
import type { components } from '@/shared/types/api-types';
import { useQuery } from '@tanstack/react-query';

type UserListItem = components['schemas']['SanitizedUserDto'];
type TeamListItem = components['schemas']['TeamDto'];
type ListData = (UserListItem | TeamListItem)[];

export const useSearchableList = (type: 'user' | 'team', searchTerm: string) => {
	const queryKey = [`search-${type}s`, searchTerm];
	const endpoint = type === 'user' ? '/users' : '/teams';
	const isSearchEnabled = searchTerm.length === 0 || searchTerm.length >= 2;

	return useQuery({
		queryKey,
		queryFn: async () => {
			const queryParams: Record<string, any> = { page: 1, limit: 100 };
			if (searchTerm) {
				queryParams.search = searchTerm;
			}
			const response = await api.get<ListData>(endpoint, {
				params: queryParams,
			});
			return response.data;
		},
		enabled: isSearchEnabled,
	});
};
