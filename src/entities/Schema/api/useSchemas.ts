import { AUDIT_LOGS_QUERY_KEY } from '@/entities/AuditLog/api/useAuditLogs';
import { api } from '@/shared/api/api';
import type { components } from '@/shared/types/api-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type SchemaComponentDto = components['schemas']['SchemaComponentDto'];
type CreateSchemaComponentDto = components['schemas']['CreateSchemaComponentDto'];
type UpdateSchemaComponentDto = components['schemas']['UpdateSchemaComponentDto'];

export const SCHEMAS_QUERY_KEY = 'schemas';

export const useSchemas = (projectId: string) => {
	return useQuery({
		queryKey: [SCHEMAS_QUERY_KEY, projectId],
		queryFn: async () => {
			const response = await api.get<SchemaComponentDto[]>(`/projects/${projectId}/schemas`);
			return response.data;
		},
		enabled: !!projectId,
	});
};

export const useSchema = (projectId: string, name: string | undefined) => {
	return useQuery({
		queryKey: [SCHEMAS_QUERY_KEY, projectId, name],
		queryFn: async () => {
			if (!name) return null;
			const response = await api.get<SchemaComponentDto>(
				`/projects/${projectId}/schemas/${name}`,
			);
			return response.data;
		},
		enabled: !!projectId && !!name,
	});
};

export const useCreateSchema = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			projectId,
			data,
		}: {
			projectId: string;
			data: CreateSchemaComponentDto;
		}) => {
			const response = await api.post<SchemaComponentDto>(
				`/projects/${projectId}/schemas`,
				data,
			);
			return response.data;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: [SCHEMAS_QUERY_KEY, variables.projectId],
			});
			queryClient.invalidateQueries({ queryKey: ['openapi', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['changelog', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: [AUDIT_LOGS_QUERY_KEY] });
		},
	});
};

export const useUpdateSchema = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			projectId,
			name,
			data,
		}: {
			projectId: string;
			name: string;
			data: UpdateSchemaComponentDto;
		}) => {
			const response = await api.put<SchemaComponentDto>(
				`/projects/${projectId}/schemas/${name}`,
				data,
			);
			return response.data;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: [SCHEMAS_QUERY_KEY, variables.projectId],
			});
			queryClient.invalidateQueries({
				queryKey: [SCHEMAS_QUERY_KEY, variables.projectId, variables.name],
			});
			queryClient.invalidateQueries({ queryKey: ['openapi', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['changelog', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: [AUDIT_LOGS_QUERY_KEY] });
		},
	});
};

export const useDeleteSchema = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ projectId, name }: { projectId: string; name: string }) => {
			await api.delete<null>(`/projects/${projectId}/schemas/${name}`);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: [SCHEMAS_QUERY_KEY, variables.projectId],
			});
			queryClient.invalidateQueries({ queryKey: ['openapi', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: ['changelog', variables.projectId] });
			queryClient.invalidateQueries({ queryKey: [AUDIT_LOGS_QUERY_KEY] });
		},
	});
};
