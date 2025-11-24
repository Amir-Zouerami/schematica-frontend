import { useCreateEndpoint, useUpdateEndpoint } from '@/entities/Endpoint/api/useEndpoints';
import { useToast } from '@/hooks/use-toast';
import { api, ApiError } from '@/shared/api/api';
import type { components } from '@/shared/types/api-types';
import {
	MediaTypeObject,
	OperationObject,
	RequestBodyObject,
	ResponseObject,
} from '@/shared/types/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { endpointFormSchema, EndpointFormValues } from '../model/endpoint-form-schema';

type EndpointDto = components['schemas']['EndpointDto'];
type OpenApiOperationDto = components['schemas']['OpenApiOperationDto'];

// Re-defining DTOs locally to allow 'Record<string, unknown>' for schemas instead of 'never'
// This allows us to pass valid schema objects to the API client without TS errors.
type SafeParameterDto = Omit<components['schemas']['ParameterObject'], 'schema'> & {
	schema?: Record<string, unknown>;
};
type SafeRequestBodyDto = Omit<components['schemas']['RequestBodyObject'], 'content'> & {
	content: { [key: string]: { schema?: Record<string, unknown>; example?: unknown } };
};
type SafeResponseDto = Omit<components['schemas']['ResponseObject'], 'content'> & {
	content?: { [key: string]: { schema?: Record<string, unknown>; example?: unknown } };
};

export interface ConflictDetails {
	message: string;
	serverUpdatedAt?: string;
	lastUpdatedBy?: string;
	serverData?: EndpointFormValues;
}

const safeJsonStringify = (val: unknown): string => {
	if (val === undefined) return '';
	return JSON.stringify(val, null, 2);
};

const safeJsonParse = (val: string | undefined | null): unknown | undefined => {
	if (!val || val.trim() === '') return undefined;
	try {
		return JSON.parse(val);
	} catch {
		return undefined;
	}
};

const transformEndpointToFormValues = (endpoint?: EndpointDto | null): EndpointFormValues => {
	if (!endpoint)
		return {
			path: '',
			method: 'get',
			status: 'DRAFT',
			summary: '',
			description: '',
			tags: [],
			isDeprecated: false,
			parameters: [],
			requestBody: null,
			responses: [
				{
					statusCode: '200',
					description: 'Successful response',
					contentType: 'application/json',
					schemaString: '{}',
					exampleString: '',
				},
			],
		};

	const op = endpoint.operation as unknown as OperationObject;
	const requestBody = op.requestBody as RequestBodyObject | undefined;

	const content = requestBody?.content || {};
	const contentType = Object.keys(content)[0] || 'application/json';
	const mediaType = content[contentType] as MediaTypeObject | undefined;

	return {
		path: endpoint.path,
		method: endpoint.method as EndpointFormValues['method'],
		status: endpoint.status as EndpointFormValues['status'],
		summary: op.summary || '',
		description: op.description || '',
		tags: op.tags || [],
		isDeprecated: op.deprecated || false,
		parameters:
			(op.parameters as any[])?.map((p) => ({
				name: p.name,
				in: p.in,
				description: p.description,
				required: p.required,
				schema: p.schema,
			})) || [],
		requestBody: requestBody
			? {
					description: requestBody.description || '',
					required: requestBody.required ?? true,
					contentType: contentType,
					schemaString: safeJsonStringify(mediaType?.schema || {}),
					exampleString: safeJsonStringify(mediaType?.example),
				}
			: null,
		responses: Object.entries(op.responses || {}).map(([statusCode, respUntyped]) => {
			const resp = respUntyped as ResponseObject;
			const respContent = resp.content || {};
			const respContentType = Object.keys(respContent)[0] || 'application/json';
			const respMediaType = respContent[respContentType] as MediaTypeObject | undefined;

			return {
				statusCode,
				description: resp.description || '',
				contentType: respContentType,
				schemaString: safeJsonStringify(respMediaType?.schema || {}),
				exampleString: safeJsonStringify(respMediaType?.example),
			};
		}),
	};
};

export const useEndpointForm = (projectId: string, onClose: () => void, endpoint?: EndpointDto) => {
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const createEndpointMutation = useCreateEndpoint();
	const updateEndpointMutation = useUpdateEndpoint();

	const [lastKnownUpdatedAt, setLastKnownUpdatedAt] = useState<string | undefined>(undefined);
	const [conflictDetails, setConflictDetails] = useState<ConflictDetails | null>(null);
	const [currentTagInput, setCurrentTagInput] = useState('');

	const formValues = useMemo(() => transformEndpointToFormValues(endpoint), [endpoint]);

	const form = useForm<EndpointFormValues>({
		resolver: zodResolver(endpointFormSchema),
		values: formValues,
	});

	const watchedPath = useWatch({ control: form.control, name: 'path' });

	useEffect(() => {
		const matches = (watchedPath || '').match(/\{([^}]+)\}/g);
		const pathVarNames = matches ? matches.map((m) => m.slice(1, -1)) : [];

		const currentAllParams = form.getValues('parameters') || [];
		const otherParams = currentAllParams.filter((p) => p.in !== 'path');
		const existingPathParams = currentAllParams.filter((p) => p.in === 'path');

		const newPathParams = pathVarNames.map((name) => {
			const existing = existingPathParams.find((p) => p.name === name);
			return existing
				? existing
				: {
						name: name,
						in: 'path' as const,
						description: '',
						required: true,
						schema: { type: 'string' as const },
					};
		});

		const hasChanged =
			newPathParams.length !== existingPathParams.length ||
			newPathParams.some((p, i) => p.name !== existingPathParams[i]?.name);

		if (hasChanged) {
			form.setValue('parameters', [...newPathParams, ...otherParams]);
		}
	}, [watchedPath, form]);

	useEffect(() => {
		if (!form.formState.isDirty) {
			form.reset(formValues);
		}

		if (endpoint) setLastKnownUpdatedAt(endpoint.updatedAt);
	}, [formValues, form, endpoint]);

	const fetchFreshServerData = async () => {
		if (!endpoint) return null;

		const response = await api.get<EndpointDto>(
			`/projects/${projectId}/endpoints/${endpoint.id}?_t=${Date.now()}`,
		);

		return response.data;
	};

	const processSubmit = async (values: EndpointFormValues, forceOverwrite = false) => {
		if (!forceOverwrite) setConflictDetails(null);

		let timestampToSubmit = lastKnownUpdatedAt;

		if (forceOverwrite && endpoint) {
			try {
				const freshData = await fetchFreshServerData();
				if (freshData) {
					timestampToSubmit = freshData.updatedAt;
					setLastKnownUpdatedAt(timestampToSubmit);
				}
			} catch (error) {
				toast({
					title: 'Error',
					description: 'Could not fetch latest version for overwrite.',
					variant: 'destructive',
				});
				return;
			}
		}

		// --- Request Body Construction using Safe Types ---
		const requestBodyDto: SafeRequestBodyDto | undefined = values.requestBody
			? {
					description: values.requestBody.description,
					required: true,
					content: {
						[values.requestBody.contentType]: {
							schema: safeJsonParse(values.requestBody.schemaString) as Record<
								string,
								unknown
							>,
							example: safeJsonParse(values.requestBody.exampleString),
						},
					},
				}
			: undefined;

		// --- Responses Construction ---
		const responsesDto: Record<string, SafeResponseDto> = values.responses.reduce(
			(acc, resp) => {
				acc[resp.statusCode] = {
					description: resp.description,
					content: {
						[resp.contentType]: {
							schema: safeJsonParse(resp.schemaString) as Record<string, unknown>,
							example: safeJsonParse(resp.exampleString),
						},
					},
				};
				return acc;
			},
			{} as Record<string, SafeResponseDto>,
		);

		const parametersDto = values.parameters
			? (values.parameters.map((p) => ({
					...p,
					schema: p.schema as Record<string, unknown>,
				})) as SafeParameterDto[])
			: undefined;

		// Bridge: Cast our "Safe" locally defined types to the "Strict" Backend DTOs.
		// This is safe because at runtime, `Record<string, unknown>` satisfies `Record<string, never>`.
		const operationForBackend: OpenApiOperationDto = {
			summary: values.summary,
			description: values.description,
			tags: values.tags,
			deprecated: values.isDeprecated,
			parameters: parametersDto as unknown as components['schemas']['ParameterObject'][],
			requestBody: requestBodyDto as unknown as components['schemas']['RequestBodyObject'],
			responses: responsesDto as unknown as Record<
				string,
				components['schemas']['ResponseObject']
			>,
		};

		try {
			if (endpoint) {
				await updateEndpointMutation.mutateAsync({
					projectId,
					endpointId: endpoint.id,
					endpointData: {
						path: values.path,
						method: values.method,
						operation: operationForBackend,
						lastKnownUpdatedAt: timestampToSubmit!,
						status: values.status,
					},
				});
				toast({ title: 'Success', description: 'Endpoint updated successfully.' });
			} else {
				await createEndpointMutation.mutateAsync({
					projectId,
					endpointData: {
						path: values.path,
						method: values.method,
						operation: operationForBackend,
						status: values.status,
					},
				});
				toast({ title: 'Success', description: 'Endpoint created successfully.' });
			}

			onClose();
		} catch (err) {
			const error = err as ApiError;

			if (error?.status === 409 && error.metaCode === 'ENDPOINT_CONCURRENCY_CONFLICT') {
				try {
					const freshServerData = await fetchFreshServerData();

					if (freshServerData) {
						const serverFormValues = transformEndpointToFormValues(freshServerData);
						setConflictDetails({
							message: error.message,
							serverUpdatedAt: freshServerData.updatedAt,
							lastUpdatedBy: freshServerData.updatedBy?.username,
							serverData: serverFormValues,
						});
					}
				} catch (e) {
					toast({
						title: 'Conflict Detected',
						description: 'But failed to load the server version for comparison.',
						variant: 'destructive',
					});
				}
			} else if (error?.status === 409 && error.metaCode === 'ENDPOINT_ALREADY_EXISTS') {
				form.setError('path', {
					type: 'server',
					message: 'An endpoint with this method and path already exists.',
				});
			} else {
				toast({ title: 'Error', description: error.message, variant: 'destructive' });
			}
		}
	};

	const onSubmit = (values: EndpointFormValues) => processSubmit(values, false);

	const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			const newTag = currentTagInput.trim();
			if (newTag && !form.getValues('tags').includes(newTag))
				form.setValue('tags', [...form.getValues('tags'), newTag]);
			setCurrentTagInput('');
		}
	};

	const handleForceSubmitFromDialog = () => processSubmit(form.getValues(), true);

	const handleRefreshAndDiscardEdits = useCallback(async () => {
		if (!endpoint?.id) return;

		try {
			const freshData = await fetchFreshServerData();
			if (freshData) {
				setLastKnownUpdatedAt(freshData.updatedAt);
				const newFormValues = transformEndpointToFormValues(freshData);
				form.reset(newFormValues);
				await queryClient.invalidateQueries({
					queryKey: ['endpoint', projectId, endpoint.id],
				});
				setConflictDetails(null);
				toast({ title: 'Refreshed', description: 'Form updated with server version.' });
			}
		} catch (err) {
			toast({
				title: 'Refresh Failed',
				description: 'Could not fetch data from server.',
				variant: 'destructive',
			});
		}
	}, [endpoint, projectId, form, toast, queryClient]);

	const handleCloseConflictDialogOnly = () => {
		setConflictDetails(null);
		toast({
			title: 'Conflict Noted',
			description: 'Unsaved edits remain locally.',
			duration: 5000,
		});
	};

	return {
		form,
		onSubmit,
		isSubmitting: form.formState.isSubmitting,
		isDirty: form.formState.isDirty,
		conflictDetails,
		currentTagInput,
		setCurrentTagInput,
		handleTagKeyDown,
		handleForceSubmitFromDialog,
		handleRefreshAndDiscardEdits,
		handleCloseConflictDialogOnly,
		setConflictDetails,
	};
};
