import { useAuth } from '@/contexts/AuthContext';
import { useCreateEndpoint, useUpdateEndpoint } from '@/hooks/api/useEndpoints';
import { useToast } from '@/hooks/use-toast';
import { api, ApiError } from '@/utils/api';
import { inferSchemaFromValue } from '@/utils/openApiUtils';
import { RefreshCw, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
	ExampleObject,
	MediaTypeObject,
	OpenAPISpec,
	OperationObject,
	ParameterObject,
	ReferenceObject,
	RequestBodyObject,
	ResponseObject,
} from '@/types/types';

import FormParametersSection, {
	ManagedParameterUI as SectionManagedParameterUI,
} from './FormSections/FormParametersSection';
import FormRequestBodySection, {
	ManagedRequestBodyUI as SectionManagedRequestBodyUI,
} from './FormSections/FormRequestBodySection';
import FormResponsesSection, {
	ManagedResponseUI as SectionManagedResponseUI,
} from './FormSections/FormResponsesSection';

// --- START: Corrected Type Definitions ---
// These types inherit from the incorrect generated DTOs but fix the 'operation' property.
type CorrectedCreateEndpointDto = Omit<components['schemas']['CreateEndpointDto'], 'operation'> & {
	operation: OperationObject;
};
type CorrectedUpdateEndpointDto = Omit<components['schemas']['UpdateEndpointDto'], 'operation'> & {
	operation: OperationObject;
};
// --- END: Corrected Type Definitions ---

type EndpointDto = components['schemas']['EndpointDto'];
type ManagedParameterUI = SectionManagedParameterUI;
type ManagedRequestBodyUI = SectionManagedRequestBodyUI;
type ManagedResponseUI = SectionManagedResponseUI;

interface FullEndpointFormProps {
	projectId: string;
	endpoint?: EndpointDto;
	onClose: () => void;
	onSubmit: (data: any) => void;
	openApiSpec: OpenAPISpec;
}

interface ConflictDetails {
	message: string;
	serverUpdatedAt?: string;
	lastUpdatedBy?: string;
}

const EndpointForm: React.FC<FullEndpointFormProps> = ({
	projectId,
	endpoint,
	onClose,
	openApiSpec,
}) => {
	const { user } = useAuth();
	const { toast } = useToast();
	const createEndpointMutation = useCreateEndpoint();
	const updateEndpointMutation = useUpdateEndpoint();
	const isSubmitting = createEndpointMutation.isPending || updateEndpointMutation.isPending;

	const [path, setPath] = useState('');
	const [method, setMethod] = useState('get');
	const [summary, setSummary] = useState('');
	const [description, setDescription] = useState('');
	const [tags, setTags] = useState<string[]>([]);
	const [currentTagInput, setCurrentTagInput] = useState('');
	const [isDeprecated, setIsDeprecated] = useState(false);
	const [lastKnownUpdatedAt, setLastKnownUpdatedAt] = useState<string | undefined>(undefined);

	const [parameters, setParameters] = useState<ManagedParameterUI[]>([]);
	const [requestBodyState, setRequestBodyState] = useState<ManagedRequestBodyUI | undefined>(
		undefined,
	);
	const [managedResponses, setManagedResponses] = useState<ManagedResponseUI[]>([]);
	const [conflictDetails, setConflictDetails] = useState<ConflictDetails | null>(null);

	const formId = useMemo(
		() => `endpointForm_${projectId}_${endpoint?.id || 'new'}`,
		[projectId, endpoint],
	);

	const populateFormFields = (endpointData: EndpointDto | undefined) => {
		const op = endpointData?.operation as OperationObject | undefined;
		setPath(endpointData?.path || '');
		setMethod(endpointData?.method || 'get');
		setSummary(op?.summary || '');
		setDescription(op?.description || '');
		setTags(op?.tags || []);
		setCurrentTagInput('');
		setIsDeprecated(op?.deprecated || false);
		setLastKnownUpdatedAt(endpointData?.updatedAt);

		if (op?.parameters) {
			setParameters(
				(op.parameters as ParameterObject[]).map((p) => ({ _id: uuidv4(), ...p })),
			);
		} else {
			setParameters([]);
		}

		const resolvedRb = op?.requestBody as RequestBodyObject | undefined;
		if (resolvedRb) {
			const contentType = Object.keys(resolvedRb.content || {})[0] || 'application/json';
			const mediaType = resolvedRb.content?.[contentType] as MediaTypeObject | undefined;
			let exampleForForm: any = {};
			let exampleNameForForm: string | undefined = undefined;

			if (mediaType?.examples && Object.keys(mediaType.examples).length > 0) {
				const firstExampleKey = Object.keys(mediaType.examples)[0];
				exampleNameForForm = firstExampleKey;
				const firstExampleObject = mediaType.examples[firstExampleKey] as
					| ExampleObject
					| ReferenceObject
					| undefined;
				if (firstExampleObject && 'value' in firstExampleObject)
					exampleForForm = (firstExampleObject as ExampleObject).value;
			} else if (mediaType?.example !== undefined) {
				exampleForForm = mediaType.example;
			}

			setRequestBodyState({
				description: resolvedRb.description || '',
				required: resolvedRb.required || false,
				contentType: contentType,
				schemaString: JSON.stringify(mediaType?.schema || {}, null, 2),
				exampleString: JSON.stringify(exampleForForm, null, 2),
				exampleName: exampleNameForForm,
			});
		} else {
			setRequestBodyState(undefined);
		}

		if (op?.responses && Object.keys(op.responses).length > 0) {
			setManagedResponses(
				Object.entries(op.responses as Record<string, ResponseObject>).map(
					([statusCode, respData]) => {
						const appJsonContent = respData.content?.['application/json'] as
							| MediaTypeObject
							| undefined;
						let exampleForForm: any = {};
						let exampleNameForForm: string | undefined = undefined;

						if (
							appJsonContent?.examples &&
							Object.keys(appJsonContent.examples).length > 0
						) {
							const firstExampleKey = Object.keys(appJsonContent.examples)[0];
							exampleNameForForm = firstExampleKey;
							const firstExampleObject = appJsonContent.examples[firstExampleKey] as
								| ExampleObject
								| ReferenceObject
								| undefined;
							if (firstExampleObject && 'value' in firstExampleObject)
								exampleForForm = (firstExampleObject as ExampleObject).value;
						} else if (appJsonContent?.example !== undefined) {
							exampleForForm = appJsonContent.example;
						}

						return {
							_id: uuidv4(),
							statusCode,
							description: respData.description,
							content: {
								'application/json': {
									schemaString: JSON.stringify(
										appJsonContent?.schema || {},
										null,
										2,
									),
									exampleString: JSON.stringify(exampleForForm, null, 2),
									exampleName: exampleNameForForm,
								},
							},
						};
					},
				),
			);
		} else {
			setManagedResponses([
				{
					_id: uuidv4(),
					statusCode: '200',
					description: 'Successful response',
					content: { 'application/json': { schemaString: '{}', exampleString: '{}' } },
				},
			]);
		}
	};

	useEffect(() => {
		if (!conflictDetails) {
			populateFormFields(endpoint);
		}
	}, [endpoint, conflictDetails]);

	const addParameter = (paramType: 'path' | 'query' | 'header') => {
		setParameters((prev) => [
			...prev,
			{
				_id: uuidv4(),
				name: '',
				in: paramType,
				required: paramType === 'path',
				schema: { type: 'string' },
			},
		]);
	};
	const removeParameter = (id: string) => {
		setParameters((prev) => prev.filter((p) => p._id !== id));
	};
	const updateParameter = (
		id: string,
		field: keyof Omit<ManagedParameterUI, '_id'>,
		value: any,
	) => {
		setParameters((prev) => prev.map((p) => (p._id === id ? { ...p, [field]: value } : p)));
	};
	const updateRequestBodyStateDirect = (field: keyof ManagedRequestBodyUI, value: any) => {
		setRequestBodyState((prev) => {
			const base: ManagedRequestBodyUI = prev || {
				description: '',
				required: false,
				contentType: 'application/json',
				schemaString: '{}',
				exampleString: '{}',
			};
			let newSchemaString = base.schemaString;
			if (field === 'exampleString') {
				try {
					const parsedExample = JSON.parse(value);
					newSchemaString = JSON.stringify(inferSchemaFromValue(parsedExample), null, 2);
				} catch (e) {
					/* Intentionally empty */
				}
				return { ...base, exampleString: value, schemaString: newSchemaString };
			}
			return { ...base, [field]: value };
		});
	};
	const ensureRequestBodyStateExists = () => {
		if (!requestBodyState)
			setRequestBodyState({
				description: '',
				required: false,
				contentType: 'application/json',
				schemaString: '{}',
				exampleString: '{}',
			});
	};
	const handleAddNewResponseEntry = () => {
		setManagedResponses((prev) => [
			...prev,
			{
				_id: uuidv4(),
				statusCode: '',
				description: '',
				content: { 'application/json': { schemaString: '{}', exampleString: '{}' } },
			},
		]);
	};
	const removeManagedResponse = (id: string) => {
		setManagedResponses((prev) => prev.filter((r) => r._id !== id));
	};
	const updateManagedResponseValue = (
		id: string,
		field: 'statusCode' | 'description',
		value: string,
	) => {
		setManagedResponses((prev) =>
			prev.map((r) => (r._id === id ? { ...r, [field]: value } : r)),
		);
	};
	const updateResponseContentString = (
		id: string,
		type: 'schemaString' | 'exampleString',
		value: string,
	) => {
		setManagedResponses((prev) =>
			prev.map((r) => {
				if (r._id === id) {
					const currentAppJson = r.content?.['application/json'] || {
						schemaString: '',
						exampleString: '',
					};
					let newSchemaString =
						type === 'schemaString' ? value : currentAppJson.schemaString;
					const newExampleString =
						type === 'exampleString' ? value : currentAppJson.exampleString;
					if (type === 'exampleString') {
						try {
							const parsedExample = JSON.parse(value);
							newSchemaString = JSON.stringify(
								inferSchemaFromValue(parsedExample),
								null,
								2,
							);
						} catch (e) {
							/* Intentionally empty */
						}
					}
					return {
						...r,
						content: {
							'application/json': {
								...currentAppJson,
								schemaString: newSchemaString,
								exampleString: newExampleString,
							},
						},
					};
				}
				return r;
			}),
		);
	};

	const handleAddTag = () => {
		const newTag = currentTagInput.trim();
		if (newTag && !tags.includes(newTag)) setTags((prev) => [...prev, newTag]);
		setCurrentTagInput('');
	};
	const handleRemoveTag = (tagToRemove: string) => {
		setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
	};

	const handleSubmit = async (e?: React.FormEvent, forceOverwrite = false) => {
		if (e) e.preventDefault();
		if (!forceOverwrite) setConflictDetails(null);

		let submissionError = false;
		const finalParameters: ParameterObject[] = parameters.map(
			({ _id, ...paramData }) => paramData as ParameterObject,
		);
		let finalRequestBody: RequestBodyObject | undefined = undefined;

		if (requestBodyState) {
			try {
				const schema = requestBodyState.schemaString.trim()
					? JSON.parse(requestBodyState.schemaString)
					: undefined;
				const example = requestBodyState.exampleString.trim()
					? JSON.parse(requestBodyState.exampleString)
					: undefined;
				finalRequestBody = {
					description: requestBodyState.description,
					required: requestBodyState.required,
					content: { [requestBodyState.contentType]: { schema, example } },
				};
			} catch (err) {
				toast({
					title: 'Error',
					description: 'Invalid JSON in Request Body.',
					variant: 'destructive',
				});
				submissionError = true;
			}
		}

		const finalResponses: Record<string, ResponseObject> = {};
		managedResponses.forEach((mr_ui) => {
			if (!mr_ui.statusCode.trim()) {
				toast({
					title: 'Error',
					description: 'Response status code cannot be empty.',
					variant: 'destructive',
				});
				submissionError = true;
				return;
			}
			try {
				const schema = mr_ui.content?.['application/json']?.schemaString?.trim()
					? JSON.parse(mr_ui.content['application/json'].schemaString)
					: undefined;
				const example = mr_ui.content?.['application/json']?.exampleString?.trim()
					? JSON.parse(mr_ui.content['application/json'].exampleString)
					: undefined;
				finalResponses[mr_ui.statusCode.trim()] = {
					description: mr_ui.description,
					content: { 'application/json': { schema, example } },
				};
			} catch (err) {
				toast({
					title: 'Error',
					description: `Invalid JSON in Response ${mr_ui.statusCode}.`,
					variant: 'destructive',
				});
				submissionError = true;
			}
		});

		if (submissionError) return;

		const operationForBackend: OperationObject = {
			summary,
			description,
			tags,
			deprecated: isDeprecated,
			parameters: finalParameters.length > 0 ? finalParameters : undefined,
			requestBody: finalRequestBody,
			responses: Object.keys(finalResponses).length > 0 ? finalResponses : undefined,
		};

		try {
			if (endpoint) {
				if (!lastKnownUpdatedAt && !forceOverwrite)
					throw new Error('Missing last known update timestamp for concurrency control.');

				const payload: CorrectedUpdateEndpointDto = {
					path,
					method: method as CorrectedUpdateEndpointDto['method'],
					operation: operationForBackend,
					lastKnownUpdatedAt: forceOverwrite ? undefined : lastKnownUpdatedAt,
				};
				await updateEndpointMutation.mutateAsync({
					projectId,
					endpointId: endpoint.id,
					endpointData: payload as any,
				});
				toast({ title: 'Success', description: 'Endpoint updated successfully.' });
			} else {
				const payload: CorrectedCreateEndpointDto = {
					path,
					method: method as CorrectedCreateEndpointDto['method'],
					operation: operationForBackend,
				};
				await createEndpointMutation.mutateAsync({
					projectId,
					endpointData: payload as any,
				});
				toast({ title: 'Success', description: 'Endpoint created successfully.' });
			}
			onClose();
		} catch (err) {
			const error = err as ApiError;
			if (error?.status === 409 && endpoint) {
				setConflictDetails({
					message: error.message || 'This endpoint was updated by someone else.',
					serverUpdatedAt: (error.errorResponse as any)?.serverUpdatedAt,
					lastUpdatedBy: (error.errorResponse as any)?.lastUpdatedBy,
				});
			} else {
				const errorMessage =
					error instanceof ApiError ? error.message : 'Failed to save endpoint.';
				toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
			}
		}
	};

	const handleForceSubmitFromDialog = () => handleSubmit(undefined, true);
	const handleCloseConflictDialogOnly = () => {
		setConflictDetails(null);
		toast({
			title: 'Conflict Noted',
			description:
				'Your edits are still in the form. Please review or copy them before proceeding.',
			duration: 7000,
		});
	};
	const handleRefreshAndDiscardEdits = async () => {
		if (!projectId || !endpoint) return;
		setConflictDetails(null);
		try {
			const response = await api.get<EndpointDto>(
				`/projects/${projectId}/endpoints/${endpoint.id}`,
			);
			if (response.data) {
				populateFormFields(response.data);
				toast({
					title: 'Data Refreshed',
					description:
						'Form has been updated with the latest server data. Your previous edits were discarded.',
				});
			} else {
				throw new Error('Could not fetch latest endpoint data.');
			}
		} catch (err) {
			const errorMessage = err instanceof ApiError ? err.message : 'Refresh failed.';
			toast({ title: 'Refresh Failed', description: errorMessage, variant: 'destructive' });
		}
	};

	const formFieldsDisabled = isSubmitting && !conflictDetails;

	return (
		<>
			<Card className="p-4 max-h-[90vh] overflow-y-auto">
				<CardHeader>
					<CardTitle className="text-gradient-green">
						{endpoint ? 'Edit Endpoint' : 'Create New Endpoint'}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} id={`${formId}-mainForm`} className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div className="md:col-span-2">
								<Label htmlFor={`${formId}-path`}>Path</Label>
								<Input
									id={`${formId}-path`}
									value={path}
									onChange={(e) => setPath(e.target.value)}
									placeholder="/api/{id}"
									required
									disabled={formFieldsDisabled}
								/>
							</div>
							<div>
								<Label htmlFor={`${formId}-method`}>Method</Label>
								<Select
									value={method}
									onValueChange={(val) => setMethod(val)}
									disabled={formFieldsDisabled}
								>
									<SelectTrigger id={`${formId}-method`}>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="get">GET</SelectItem>
										<SelectItem value="post">POST</SelectItem>
										<SelectItem value="put">PUT</SelectItem>
										<SelectItem value="delete">DELETE</SelectItem>
										<SelectItem value="patch">PATCH</SelectItem>
										<SelectItem value="options">OPTIONS</SelectItem>
										<SelectItem value="head">HEAD</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
						<div>
							<Label htmlFor={`${formId}-summary`}>Summary</Label>
							<Input
								id={`${formId}-summary`}
								value={summary}
								onChange={(e) => setSummary(e.target.value)}
								placeholder="Endpoint summary"
								disabled={formFieldsDisabled}
							/>
						</div>
						<div>
							<Label htmlFor={`${formId}-description`}>Description</Label>
							<Textarea
								id={`${formId}-description`}
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Endpoint description"
								rows={3}
								disabled={formFieldsDisabled}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={`${formId}-tags-input`}>Tags</Label>
							<div className="flex items-center space-x-2">
								<Input
									id={`${formId}-tags-input`}
									value={currentTagInput}
									onChange={(e) => setCurrentTagInput(e.target.value)}
									placeholder="Enter a tag"
									onKeyDown={(e) => {
										if (e.key === 'Enter' || e.key === ',') {
											e.preventDefault();
											handleAddTag();
										}
									}}
									disabled={formFieldsDisabled}
								/>
								<Button
									type="button"
									variant="outline"
									onClick={handleAddTag}
									disabled={formFieldsDisabled}
								>
									Add Tag
								</Button>
							</div>
							{tags.length > 0 && (
								<div className="flex flex-wrap gap-2 mt-2">
									{tags.map((tag) => (
										<Badge
											key={tag}
											variant="secondary"
											className="flex items-center"
										>
											{tag}
											<button
												type="button"
												className="ml-1.5 p-0.5 rounded-full hover:bg-muted-foreground/20"
												onClick={() => handleRemoveTag(tag)}
												disabled={formFieldsDisabled}
											>
												<X className="h-3 w-3" />
											</button>
										</Badge>
									))}
								</div>
							)}
						</div>
						<div className="flex items-center space-x-2">
							<Switch
								id={`${formId}-deprecated`}
								checked={isDeprecated}
								onCheckedChange={setIsDeprecated}
								disabled={formFieldsDisabled}
							/>
							<Label htmlFor={`${formId}-deprecated`}>Deprecated</Label>
						</div>
						<Tabs defaultValue="parameters" className="space-y-4">
							<TabsList>
								<TabsTrigger value="parameters">Parameters</TabsTrigger>
								<TabsTrigger value="requestBody">Request Body</TabsTrigger>
								<TabsTrigger value="responses">Responses</TabsTrigger>
							</TabsList>
							<TabsContent value="parameters">
								<FormParametersSection
									parameters={parameters}
									onAddParameter={addParameter}
									onRemoveParameter={removeParameter}
									onUpdateParameter={updateParameter}
									isSubmittingForm={formFieldsDisabled}
								/>
							</TabsContent>
							<TabsContent value="requestBody">
								<FormRequestBodySection
									requestBodyState={requestBodyState}
									onUpdateRequestBodyState={updateRequestBodyStateDirect}
									onEnsureRequestBodyStateExists={ensureRequestBodyStateExists}
									isSubmittingForm={formFieldsDisabled}
									formIdPrefix={`${formId}-rb`}
								/>
							</TabsContent>
							<TabsContent value="responses">
								<FormResponsesSection
									managedResponses={managedResponses}
									onAddResponseClick={handleAddNewResponseEntry}
									onRemoveManagedResponse={removeManagedResponse}
									onUpdateManagedResponseValue={updateManagedResponseValue}
									onUpdateResponseContentString={updateResponseContentString}
									isSubmittingForm={formFieldsDisabled}
								/>
							</TabsContent>
						</Tabs>
					</form>
				</CardContent>
				<CardFooter className="flex justify-end space-x-2">
					<Button
						type="button"
						variant="outline"
						onClick={onClose}
						disabled={isSubmitting && !!conflictDetails}
					>
						Cancel
					</Button>
					<Button
						type="submit"
						form={`${formId}-mainForm`}
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

			{conflictDetails && (
				<AlertDialog
					open={!!conflictDetails}
					onOpenChange={(isOpen) => !isOpen && setConflictDetails(null)}
				>
					<AlertDialogContent className="max-w-screen-lg w-[900px]">
						<AlertDialogHeader>
							<AlertDialogTitle>Concurrency Conflict</AlertDialogTitle>
							<AlertDialogDescription>
								<p className="mb-1">{conflictDetails.message}</p>
								<div className="my-5 leading-relaxed">
									{conflictDetails.serverUpdatedAt && (
										<p>
											<strong>Last Server Update:</strong>{' '}
											{new Date(
												conflictDetails.serverUpdatedAt,
											).toLocaleString()}
										</p>
									)}
									{conflictDetails.lastUpdatedBy && (
										<p className="mt-1">
											<strong>Last Updated By:</strong>{' '}
											{conflictDetails.lastUpdatedBy}
										</p>
									)}
									<p className="mt-2">
										Your current unsaved edits are still in the form.
									</p>
								</div>
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 mt-2">
							<Button
								className="w-full sm:w-auto"
								variant="outline"
								onClick={handleCloseConflictDialogOnly}
							>
								<X className="mr-2 h-4 w-4" /> Review My Edits
							</Button>
							<Button
								className="w-full sm:w-auto"
								variant="secondary"
								onClick={handleRefreshAndDiscardEdits}
							>
								<RefreshCw className="mr-2 h-4 w-4" /> Refresh & Discard
							</Button>
							<Button
								className="w-full sm:w-auto"
								variant="destructive"
								onClick={handleForceSubmitFromDialog}
							>
								Force Overwrite
							</Button>
						</AlertDialogFooter>
						<AlertDialogCancel
							onClick={handleCloseConflictDialogOnly}
							className="absolute right-4 top-4"
						>
							<X className="h-4 w-4" />
							<span className="sr-only">Close</span>
						</AlertDialogCancel>
					</AlertDialogContent>
				</AlertDialog>
			)}
		</>
	);
};

export default EndpointForm;
