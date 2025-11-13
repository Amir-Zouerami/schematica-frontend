import type { components } from '@/types/api-types';
import { api } from '@/utils/api';
import { useInfiniteQuery } from '@tanstack/react-query';

type ChangelogDto = components['schemas']['ChangelogDto'];
type PaginationMetaDto = components['schemas']['PaginationMetaDto'];

interface ChangelogResponse {
	data: ChangelogDto[];
	meta: PaginationMetaDto;
}

export const useChangelog = (projectId: string | undefined, limit = 20) => {
	return useInfiniteQuery({
		queryKey: ['changelog', projectId],
		queryFn: async ({ pageParam = 1 }) => {
			if (!projectId) return null;

			const response = await api.get<ChangelogResponse>(`/projects/${projectId}/changelog`, {
				params: { page: pageParam, limit },
			});

			return response;
		},
		initialPageParam: 1,
		getNextPageParam: (lastPage) => {
			if (!lastPage || !lastPage.meta) return undefined;

			const currentPage = lastPage.meta.page;
			const totalPages = lastPage.meta.lastPage;

			if (currentPage >= totalPages) {
				return undefined;
			}
			return currentPage + 1;
		},
		enabled: !!projectId,
	});
};
