import type { components } from '@/types/api-types';
import { api } from '@/utils/api';
import { useInfiniteQuery } from '@tanstack/react-query';

// Define the expected item types from the API
type UserListItem = components['schemas']['SanitizedUserDto'];
type TeamListItem = components['schemas']['TeamDto'];

// Define the generic type for the data array in the API response
type ListData = (UserListItem | TeamListItem)[];

/**
 * A reusable hook to fetch and paginate searchable lists of users or teams.
 * @param type - The type of resource to fetch ('user' or 'team').
 * @param searchTerm - The search term to filter the list by.
 */
export const useSearchableList = (type: 'user' | 'team', searchTerm: string) => {
	const queryKey = [`search-${type}s`, searchTerm];
	const endpoint = type === 'user' ? '/users' : '/teams';

	return useInfiniteQuery({
		queryKey,
		queryFn: async ({ pageParam }) => {
			// --- FIX APPLIED HERE ---
			// Only include the 'search' parameter if the term is long enough.
			// The `api.ts` helper will automatically omit `undefined` properties.
			const validSearchTerm = searchTerm.length >= 2 ? searchTerm : undefined;

			const response = await api.get<ListData>(endpoint, {
				params: { page: pageParam, limit: 20, search: validSearchTerm },
			});
			return response;
		},
		initialPageParam: 1,
		getNextPageParam: (lastPage) => {
			const { page, lastPage: totalPages } = lastPage.meta;
			if (!totalPages || page >= totalPages) {
				return undefined;
			}
			return page + 1;
		},
	});
};
