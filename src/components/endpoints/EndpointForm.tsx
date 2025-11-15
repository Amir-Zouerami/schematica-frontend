import { useCreateEndpoint, useUpdateEndpoint } from '@/hooks/api/useEndpoints';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/utils/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import React, { useEffect, useId, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

import type { components } from '@/types/api-types';
import {
	MediaTypeObject,
	OpenAPISpec,
	OperationObject,
	RequestBodyObject,
	ResponseObject,
} from '@/types/types';

import FormParametersSection from './FormSections/FormParametersSection';
import FormRequestBodySection from './FormSections/FormRequestBodySection';
import FormResponsesSection from './FormSections/FormResponsesSection';

// --- Type Definitions ---
type EndpointDto = components['schemas']['EndpointDto'];

// --- Helper for JSON validation in Zod ---
const jsonString = z.string().refine(
	(val) => {
		if (val.trim() === '') return true; // Allow empty string
		try {
			JSON.parse(val);
			return true;
		} catch {
			return false;
		}
	},
	{ message: 'Invalid JSON format.' },
);

// --- Zod Schemas for Validation ---
const parameterSchema = z.object({
	name: z.string().min(1),
	in: z.enum(['query', 'header', 'path', 'cookie']),
	description: z.string().optional(),
	required: z.boolean().optional(),
	schema: z
		.object({
			type: z.enum(['string', 'number', 'integer', 'boolean', 'array', 'object']),
		})
		.optional(),
});

const requestBodySchema = z.object({
	description: z.string().optional(),
	required: z.boolean(),
	contentType: z.string(),
	schemaString: jsonString,
	exampleString: jsonString,
});

const responseSchema = z.object({
	statusCode: z.string().min(1, 'Status code is required.'),
	description: z.string().min(1, 'Description is required.'),
	schemaString: jsonString,
	exampleString: jsonString,
});

const endpointFormSchema = z.object({
	path: z
		.string()
		.min(1, 'Path is required.')
		.startsWith('/', { message: 'Path must start with /' }),
	method: z.enum(['get', 'post', 'put', 'delete', 'patch', 'options', 'head']),
	summary: z.string().min(1, 'Summary is required.'),
	description: z.string().optional(),
	tags: z.array(z.string()),
	isDeprecated: z.boolean(),
	parameters: z.array(parameterSchema).optional(),
	requestBody: requestBodySchema.nullable().optional(),
	responses: z.array(responseSchema).min(1, 'At least one response is required.'),
});

type EndpointFormValues = z.infer<typeof endpointFormSchema>;

// --- Component Props ---
interface EndpointFormProps {
	projectId: string;
	endpoint?: EndpointDto;
	onClose: () => void;
	openApiSpec: OpenAPISpec;
}

const EndpointForm: React.FC<EndpointFormProps> = ({ projectId, endpoint, onClose }) => {
	const { toast } = useToast();
	const formId = useId();
	const createEndpointMutation = useCreateEndpoint();
	const updateEndpointMutation = useUpdateEndpoint();

	const [lastKnownUpdatedAt, setLastKnownUpdatedAt] = useState<string | undefined>(undefined);
	const [conflictDetails, setConflictDetails] = useState<any | null>(null);
	const [currentTagInput, setCurrentTagInput] = useState('');

	const formValues = useMemo(() => {
		if (!endpoint) {
			return {
				path: '',
				method: 'get' as EndpointFormValues['method'],
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
						schemaString: '{}',
						exampleString: '{}',
					},
				],
			};
		}

		const op = endpoint.operation as unknown as OperationObject;
		const requestBody = op.requestBody as RequestBodyObject | undefined;
		const contentType = requestBody
			? Object.keys(requestBody.content || {})[0] || 'application/json'
			: 'application/json';
		const mediaType = requestBody?.content?.[contentType] as MediaTypeObject | undefined;

		return {
			path: endpoint.path,
			method: endpoint.method as EndpointFormValues['method'],
			summary: op.summary || '',
			description: op.description || '',
			tags: op.tags || [],
			isDeprecated: op.deprecated || false,
			parameters: (op.parameters as any[]) || [],
			requestBody: requestBody
				? {
						description: requestBody.description || '',
						required: requestBody.required || false,
						contentType: contentType,
						schemaString: JSON.stringify(mediaType?.schema || {}, null, 2),
						exampleString: JSON.stringify(mediaType?.example || {}, null, 2),
					}
				: null,
			responses: Object.entries(op.responses as Record<string, ResponseObject>).map(
				([statusCode, resp]) => {
					const respContentType =
						Object.keys(resp.content || {})[0] || 'application/json';
					const respMediaType = resp.content?.[respContentType] as
						| MediaTypeObject
						| undefined;
					return {
						statusCode,
						description: resp.description,
						schemaString: JSON.stringify(respMediaType?.schema || {}, null, 2),
						exampleString: JSON.stringify(respMediaType?.example || {}, null, 2),
					};
				},
			),
		};
	}, [endpoint]);

	const methods = useForm<EndpointFormValues>({
		resolver: zodResolver(endpointFormSchema),
		values: formValues, // Use the memoized values to initialize the form
	});

	const { isSubmitting } = methods.formState;

	// This effect now only handles resetting the form on external changes and setting the timestamp
	useEffect(() => {
		methods.reset(formValues);
		if (endpoint) {
			setLastKnownUpdatedAt(endpoint.updatedAt);
		}
	}, [formValues, methods, endpoint]);

	const processSubmit = async (values: EndpointFormValues, forceOverwrite = false) => {
		if (!forceOverwrite) setConflictDetails(null);

		const operationForBackend: Partial<OperationObject> = {
			summary: values.summary,
			description: values.description,
			tags: values.tags,
			deprecated: values.isDeprecated,
			parameters: values.parameters,
			requestBody: values.requestBody
				? {
						description: values.requestBody.description,
						required: values.requestBody.required,
						content: {
							[values.requestBody.contentType]: {
								schema: JSON.parse(values.requestBody.schemaString || '{}'),
								example: JSON.parse(values.requestBody.exampleString || 'null'),
							},
						},
					}
				: undefined,
			responses: values.responses.reduce(
				(acc, resp) => {
					acc[resp.statusCode] = {
						description: resp.description,
						content: {
							'application/json': {
								schema: JSON.parse(resp.schemaString || '{}'),
								example: JSON.parse(resp.exampleString || 'null'),
							},
						},
					};
					return acc;
				},
				{} as Record<string, any>,
			),
		};

		try {
			if (endpoint) {
				await updateEndpointMutation.mutateAsync({
					projectId,
					endpointId: endpoint.id,
					endpointData: {
						path: values.path,
						method: values.method,
						operation: operationForBackend as any,
						lastKnownUpdatedAt: forceOverwrite ? undefined : lastKnownUpdatedAt!,
					},
				});
				toast({ title: 'Success', description: 'Endpoint updated successfully.' });
			} else {
				await createEndpointMutation.mutateAsync({
					projectId,
					endpointData: {
						path: values.path,
						method: values.method,
						operation: operationForBackend as any,
					},
				});
				toast({ title: 'Success', description: 'Endpoint created successfully.' });
			}
			onClose();
		} catch (err) {
			const error = err as ApiError;
			if (error?.status === 409) {
				if (error.message.includes('Concurrency conflict')) {
					setConflictDetails({
						message: error.message,
						serverUpdatedAt: (error.errorResponse as any)?.serverUpdatedAt,
						lastUpdatedBy: (error.errorResponse as any)?.lastUpdatedBy,
					});
				} else {
					methods.setError('path', { type: 'server', message: error.message });
				}
			} else {
				toast({ title: 'Error', description: error.message, variant: 'destructive' });
			}
		}
	};

	const onSubmit = (values: EndpointFormValues) => {
		processSubmit(values, false);
	};

	const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			const newTag = currentTagInput.trim();
			if (newTag && !methods.getValues('tags').includes(newTag)) {
				methods.setValue('tags', [...methods.getValues('tags'), newTag]);
			}
			setCurrentTagInput('');
		}
	};

	return (
		<>
			<FormProvider {...methods}>
				<Card className="p-4 max-h-[90vh] overflow-y-auto">
					<CardContent>
						<form
							id={formId}
							onSubmit={methods.handleSubmit(onSubmit)}
							className="space-y-6"
						>
							{/* Basic Info */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<FormField
									control={methods.control}
									name="path"
									render={({ field }) => (
										<FormItem className="md:col-span-2">
											<FormLabel>Path</FormLabel>
											<FormControl>
												<Input
													{...field}
													placeholder="/api/v1/users/{id}"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={methods.control}
									name="method"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Method</FormLabel>
											<Select
												onValueChange={field.onChange}
												value={field.value}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{[
														'get',
														'post',
														'put',
														'delete',
														'patch',
														'options',
														'head',
													].map((m) => (
														<SelectItem key={m} value={m}>
															{m.toUpperCase()}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<FormField
								control={methods.control}
								name="summary"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Summary</FormLabel>
										<FormControl>
											<Input {...field} placeholder="Endpoint summary" />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={methods.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Description</FormLabel>
										<FormControl>
											<Textarea
												{...field}
												placeholder="Detailed endpoint description"
												rows={3}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{/* Tags and Deprecated */}
							<div className="space-y-2">
								<FormLabel>Tags</FormLabel>
								<div className="flex items-center space-x-2">
									<Input
										value={currentTagInput}
										onChange={(e) => setCurrentTagInput(e.target.value)}
										onKeyDown={handleTagKeyDown}
										placeholder="Enter a tag and press Enter"
									/>
								</div>
								<FormField
									control={methods.control}
									name="tags"
									render={({ field }) => (
										<FormItem>
											{field.value.length > 0 && (
												<div className="flex flex-wrap gap-2 mt-2">
													{field.value.map((tag) => (
														<Badge key={tag} variant="secondary">
															{tag}
															<button
																type="button"
																className="ml-1.5 p-0.5"
																onClick={() =>
																	methods.setValue(
																		'tags',
																		field.value.filter(
																			(t) => t !== tag,
																		),
																	)
																}
															>
																<X className="h-3 w-3" />
															</button>
														</Badge>
													))}
												</div>
											)}
										</FormItem>
									)}
								/>
							</div>
							<FormField
								control={methods.control}
								name="isDeprecated"
								render={({ field }) => (
									<FormItem className="flex items-center space-x-2">
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
										<FormLabel>Deprecated</FormLabel>
									</FormItem>
								)}
							/>

							{/* Tabs for complex parts */}
							<Tabs defaultValue="parameters">
								<TabsList>
									<TabsTrigger value="parameters">Parameters</TabsTrigger>
									<TabsTrigger value="requestBody">Request Body</TabsTrigger>
									<TabsTrigger value="responses">Responses</TabsTrigger>
								</TabsList>
								<TabsContent value="parameters" className="space-y-4">
									<FormParametersSection paramType="path" />
									<FormParametersSection paramType="query" />
									<FormParametersSection paramType="header" />
								</TabsContent>
								<TabsContent value="requestBody">
									<FormRequestBodySection
										onAddRequestBody={() =>
											methods.setValue('requestBody', {
												description: '',
												required: false,
												contentType: 'application/json',
												schemaString: '{}',
												exampleString: '{}',
											})
										}
									/>
								</TabsContent>
								<TabsContent value="responses">
									<FormResponsesSection />
								</TabsContent>
							</Tabs>
						</form>
					</CardContent>
					<CardFooter className="flex justify-end space-x-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button
							type="submit"
							form={formId}
							disabled={isSubmitting || !!conflictDetails}
						>
							{isSubmitting
								? 'Saving...'
								: endpoint
									? 'Update Endpoint'
									: 'Create Endpoint'}
						</Button>
					</CardFooter>
				</Card>
			</FormProvider>

			{/* Concurrency Conflict Dialog would go here, similar to ProjectForm */}
		</>
	);
};

export default EndpointForm;
