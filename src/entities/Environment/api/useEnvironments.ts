import { AUDIT_LOGS_QUERY_KEY } from '@/entities/AuditLog/api/useAuditLogs';
import { api } from '@/shared/api/api';
import type { components } from '@/shared/types/api-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type EnvironmentDto = components['schemas']['EnvironmentDto'];
type CreateEnvironmentDto = components['schemas']['CreateEnvironmentDto'];
type UpdateEnvironmentDto = components['schemas']['UpdateEnvironmentDto'];

type SecretDto = components['schemas']['SecretDto'];
type CreateSecretDto = components['schemas']['CreateSecretDto'];
type UpdateSecretDto = components['schemas']['UpdateSecretDto'];

export const ENVIRONMENTS_QUERY_KEY = 'environments';
export const SECRETS_QUERY_KEY = 'secrets';

// --- Environments ---

export const useEnvironments = (projectId: string) => {
	return useQuery({
		queryKey: [ENVIRONMENTS_QUERY_KEY, projectId],
		queryFn: async () => {
			const response = await api.get<EnvironmentDto[]>(`/projects/${projectId}/environments`);
			return response.data;
		},
		enabled: !!projectId,
	});
};

export const useCreateEnvironment = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			projectId,
			data,
		}: {
			projectId: string;
			data: CreateEnvironmentDto;
		}) => {
			const response = await api.post<EnvironmentDto>(
				`/projects/${projectId}/environments`,
				data,
			);
			return response.data;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: [ENVIRONMENTS_QUERY_KEY, variables.projectId],
			});
			queryClient.invalidateQueries({ queryKey: [AUDIT_LOGS_QUERY_KEY] });
		},
	});
};

export const useUpdateEnvironment = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			projectId,
			environmentId,
			data,
		}: {
			projectId: string;
			environmentId: string;
			data: UpdateEnvironmentDto;
		}) => {
			const response = await api.put<EnvironmentDto>(
				`/projects/${projectId}/environments/${environmentId}`,
				data,
			);
			return response.data;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: [ENVIRONMENTS_QUERY_KEY, variables.projectId],
			});
			queryClient.invalidateQueries({ queryKey: [AUDIT_LOGS_QUERY_KEY] });
		},
	});
};

export const useDeleteEnvironment = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			projectId,
			environmentId,
		}: {
			projectId: string;
			environmentId: string;
		}) => {
			await api.delete<null>(`/projects/${projectId}/environments/${environmentId}`);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: [ENVIRONMENTS_QUERY_KEY, variables.projectId],
			});
			queryClient.invalidateQueries({ queryKey: [AUDIT_LOGS_QUERY_KEY] });
		},
	});
};

// --- Secrets ---

export const useSecrets = (projectId: string, environmentId: string | null) => {
	return useQuery({
		queryKey: [SECRETS_QUERY_KEY, projectId, environmentId],
		queryFn: async () => {
			if (!environmentId) return [];
			const response = await api.get<SecretDto[]>(
				`/projects/${projectId}/environments/${environmentId}/secrets`,
			);
			return response.data;
		},
		enabled: !!projectId && !!environmentId,
	});
};

export const useCreateSecret = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			projectId,
			environmentId,
			data,
		}: {
			projectId: string;
			environmentId: string;
			data: CreateSecretDto;
		}) => {
			const response = await api.post<SecretDto>(
				`/projects/${projectId}/environments/${environmentId}/secrets`,
				data,
			);
			return response.data;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: [SECRETS_QUERY_KEY, variables.projectId, variables.environmentId],
			});
			queryClient.invalidateQueries({ queryKey: [AUDIT_LOGS_QUERY_KEY] });
		},
	});
};

export const useUpdateSecret = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			projectId,
			environmentId,
			secretId,
			data,
		}: {
			projectId: string;
			environmentId: string;
			secretId: number;
			data: UpdateSecretDto;
		}) => {
			const response = await api.patch<SecretDto>(
				`/projects/${projectId}/environments/${environmentId}/secrets/${secretId}`,
				data,
			);
			return response.data;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: [SECRETS_QUERY_KEY, variables.projectId, variables.environmentId],
			});
			queryClient.invalidateQueries({ queryKey: [AUDIT_LOGS_QUERY_KEY] });
		},
	});
};

export const useDeleteSecret = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			projectId,
			environmentId,
			secretId,
		}: {
			projectId: string;
			environmentId: string;
			secretId: number;
		}) => {
			await api.delete<null>(
				`/projects/${projectId}/environments/${environmentId}/secrets/${secretId}`,
			);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: [SECRETS_QUERY_KEY, variables.projectId, variables.environmentId],
			});
			queryClient.invalidateQueries({ queryKey: [AUDIT_LOGS_QUERY_KEY] });
		},
	});
};
