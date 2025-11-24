import { api } from '@/shared/api/api';
import type { components, operations } from '@/shared/types/api-types';
import { useInfiniteQuery } from '@tanstack/react-query';

type AuditLogDto = components['schemas']['AuditLogDto'];
type AuditAction = operations['AuditController_findAll_v2']['parameters']['query']['action'];

export interface AuditLogFilters {
	actorId?: string;
	targetId?: string;
	action?: AuditAction;
}

export const AUDIT_LOGS_QUERY_KEY = 'auditLogs';

/**
 * Fetches the system-wide audit trail for admins, with support for filtering and infinite scrolling.
 */
export const useAuditLogs = (filters: AuditLogFilters, limit = 25) => {
	return useInfiniteQuery({
		queryKey: [AUDIT_LOGS_QUERY_KEY, filters],
		queryFn: async ({ pageParam = 1 }) => {
			const response = await api.get<AuditLogDto[]>('/admin/audit-logs', {
				params: {
					page: pageParam,
					limit,
					...filters,
				},
			});
			return response;
		},
		initialPageParam: 1,
		getNextPageParam: (lastPage) => {
			if (!lastPage || !lastPage.meta) return undefined;
			const { page, lastPage: totalPages } = lastPage.meta;
			if (page >= totalPages) {
				return undefined;
			}
			return page + 1;
		},
	});
};
