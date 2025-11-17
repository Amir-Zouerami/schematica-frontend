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

	// Only enable the query if the search term is empty or has 2+ characters
	const isSearchEnabled = searchTerm.length === 0 || searchTerm.length >= 2;

	return useInfiniteQuery({
		queryKey,
		queryFn: async ({ pageParam }) => {
			const queryParams: Record<string, any> = { page: pageParam, limit: 20 };
			// Only add the search param if the term is valid
			if (searchTerm) {
				queryParams.search = searchTerm;
			}
			const response = await api.get<ListData>(endpoint, {
				params: queryParams,
			});
			return response;
		},
		initialPageParam: 1,
		getNextPageParam: (lastPage) => {
			// The API for these lists returns a flat structure.
			// The meta is directly on the response object from our api wrapper.
			const { page, lastPage: totalPages } = lastPage.meta;
			if (!totalPages || page >= totalPages) {
				return undefined;
			}
			return page + 1;
		},
		// Add the 'enabled' flag here
		enabled: isSearchEnabled,
	});
};
