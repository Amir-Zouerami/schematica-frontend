/* eslint-disable no-useless-escape */

import { api } from '@/utils/api';
import { v4 as uuidv4 } from 'uuid';
import { X, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Textarea } from '@/components/ui/textarea';
import { inferSchemaFromValue } from '@/utils/openApiUtils';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogCancel,
} from '@/components/ui/alert-dialog';

import {
	EndpointFormProps,
	OperationObject,
	ParameterObject,
	ResponseObject,
	RequestBodyObject,
	AppMetadata,
	SchemaObject,
	ReferenceObject,
	OpenAPISpec,
	MediaTypeObject,
	ExampleObject,
	ApiResponse,
} from '@/types/types';

import FormParametersSection, { ManagedParameterUI as SectionManagedParameterUI } from './FormSections/FormParametersSection';
import FormRequestBodySection, { ManagedRequestBodyUI as SectionManagedRequestBodyUI } from './FormSections/FormRequestBodySection';
import FormResponsesSection, { ManagedResponseUI as SectionManagedResponseUI } from './FormSections/FormResponsesSection';

type ManagedParameterUI = SectionManagedParameterUI;
type ManagedRequestBodyUI = SectionManagedRequestBodyUI;
type ManagedResponseUI = SectionManagedResponseUI;

interface FullEndpointFormProps extends EndpointFormProps {
	openApiSpec: OpenAPISpec;
}

interface ConflictDetails {
	message: string;
	serverUpdatedAt?: string;
	lastUpdatedBy?: string;
}

const EndpointForm: React.FC<FullEndpointFormProps> = ({ projectId, initialEndpoint, onClose, onSubmit, openApiSpec }) => {
	const { user } = useAuth();
	const { toast } = useToast();
	const initialEndpointRef = useRef<typeof initialEndpoint | undefined>(undefined);
	const hasInitializedFromProps = useRef(false);
	const currentInitialEndpointId = useRef<string | null>(null);

	const [path, setPath] = useState('');
	const [method, setMethod] = useState('get');
	const [summary, setSummary] = useState('');
	const [description, setDescription] = useState('');
	const [tags, setTags] = useState<string[]>([]);
	const [currentTagInput, setCurrentTagInput] = useState('');
	const [isDeprecated, setIsDeprecated] = useState(false);
	const [lastKnownOperationUpdatedAt, setLastKnownOperationUpdatedAt] = useState<string | undefined>(undefined);

	const [parameters, setParameters] = useState<ManagedParameterUI[]>([]);
	const [requestBodyState, setRequestBodyState] = useState<ManagedRequestBodyUI | undefined>(undefined);
	const [managedResponses, setManagedResponses] = useState<ManagedResponseUI[]>([]);

	const [isSubmittingForm, setIsSubmittingForm] = useState(false);
	const [conflictDetails, setConflictDetails] = useState<ConflictDetails | null>(null);

	const formId = useMemo(
		() =>
			`endpointForm_${projectId}_${initialEndpoint?.method || 'newMethod'}_${(initialEndpoint?.path || 'newPath').replace(
				/[\/{}]/g,
				'_',
			)}`,
		[projectId, initialEndpoint?.method, initialEndpoint?.path],
	);

	const populateFormFields = (endpointData: typeof initialEndpoint | undefined) => {
		const op = endpointData?.operation;
		setPath(endpointData?.path || '');
		setMethod(endpointData?.method || 'get');
		setSummary(op?.summary || '');
		setDescription(op?.description || '');
		setTags(op?.tags || []);
		setCurrentTagInput('');
		setIsDeprecated(op?.deprecated || false);
		setLastKnownOperationUpdatedAt(op?.['x-app-metadata']?.lastEditedAt);

		if (op?.parameters) {
			setParameters((op.parameters as ParameterObject[]).map(p => ({ _id: uuidv4(), ...p })));
		}
		else {
			setParameters([]);
		}
		const resolvedRb = op?.requestBody as RequestBodyObject | undefined;
		if (resolvedRb) {
			const contentType = Object.keys(resolvedRb.content || {})[0] || 'application/json';
			const mediaType = resolvedRb.content?.[contentType] as MediaTypeObject | undefined;

			let exampleForForm: any = {};
			let exampleNameForForm: string | undefined = undefined;

			if (mediaType) {
				if (mediaType.examples && Object.keys(mediaType.examples).length > 0) {
					const firstExampleKey = Object.keys(mediaType.examples)[0];
					exampleNameForForm = firstExampleKey;

					const firstExampleObject = mediaType.examples[firstExampleKey] as ExampleObject | ReferenceObject | undefined;

					if (firstExampleObject && 'value' in firstExampleObject) exampleForForm = (firstExampleObject as ExampleObject).value;
					else exampleForForm = firstExampleObject;
				}
				else if (mediaType.example !== undefined) exampleForForm = mediaType.example;
			}
			setRequestBodyState({
				description: resolvedRb.description || '',
				required: resolvedRb.required || false,
				contentType: contentType,
				schemaString: JSON.stringify(mediaType?.schema || {}, null, 2),
				exampleString: JSON.stringify(exampleForForm, null, 2),
				exampleName: exampleNameForForm,
			});
		}
		else {
			setRequestBodyState(undefined);
		}

		if (op?.responses && Object.keys(op.responses).length > 0) {
			setManagedResponses(
				Object.entries(op.responses as Record<string, ResponseObject>).map(([statusCode, respData]) => {
					const appJsonContent = respData.content?.['application/json'] as MediaTypeObject | undefined;
					let exampleForForm: any = {};
					let exampleNameForForm: string | undefined = undefined;

					if (appJsonContent) {
						if (appJsonContent.examples && Object.keys(appJsonContent.examples).length > 0) {
							const firstExampleKey = Object.keys(appJsonContent.examples)[0];
							exampleNameForForm = firstExampleKey;

							const firstExampleObject = appJsonContent.examples[firstExampleKey] as
								| ExampleObject
								| ReferenceObject
								| undefined;

							if (firstExampleObject && 'value' in firstExampleObject)
								exampleForForm = (firstExampleObject as ExampleObject).value;
							else exampleForForm = firstExampleObject;
						}
						else if (appJsonContent.example !== undefined) exampleForForm = appJsonContent.example;
					}

					return {
						_id: uuidv4(),
						statusCode,
						description: respData.description,
						content: respData.content
							? {
								'application/json': {
									schemaString: JSON.stringify(appJsonContent?.schema || {}, null, 2),
									exampleString: JSON.stringify(exampleForForm, null, 2),
									exampleName: exampleNameForForm,
								},
							}
							: undefined,
					};
				}),
			);
		}
		else {
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
		const newEndpointIdentifier = initialEndpoint ? `${initialEndpoint.path}-${initialEndpoint.method}` : null;

		if (
			initialEndpoint &&
			(!currentInitialEndpointId.current || currentInitialEndpointId.current !== newEndpointIdentifier) &&
			!conflictDetails
		) {
			populateFormFields(initialEndpoint);
			initialEndpointRef.current = initialEndpoint;
			currentInitialEndpointId.current = newEndpointIdentifier;
			hasInitializedFromProps.current = true;
			setConflictDetails(null);
			setIsSubmittingForm(false);
		}
		else if (
			initialEndpoint &&
			currentInitialEndpointId.current === newEndpointIdentifier &&
			!hasInitializedFromProps.current &&
			!conflictDetails
		) {
			populateFormFields(initialEndpoint);
			hasInitializedFromProps.current = true;
		}

		if (!initialEndpoint && currentInitialEndpointId.current !== null) {
			populateFormFields(undefined);
			initialEndpointRef.current = undefined;
			currentInitialEndpointId.current = null;
			hasInitializedFromProps.current = false;
			setConflictDetails(null);
			setIsSubmittingForm(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialEndpoint, conflictDetails]);

	const addParameter = (paramType: 'path' | 'query' | 'header') => {
		setParameters(prev => [
			...prev,
			{ _id: uuidv4(), name: '', in: paramType, required: paramType === 'path', schema: { type: 'string' } },
		]);
	};
	const removeParameter = (id: string) => {
		setParameters(prev => prev.filter(p => p._id !== id));
	};
	const updateParameter = (id: string, field: keyof Omit<ManagedParameterUI, '_id'>, value: any) => {
		setParameters(prev => prev.map(p => (p._id === id ? { ...p, [field]: value } : p)));
	};

	const updateRequestBodyStateDirect = (field: keyof ManagedRequestBodyUI, value: any) => {
		setRequestBodyState(prev => {
			const base: ManagedRequestBodyUI = prev || {
				description: '',
				required: false,
				contentType: 'application/json',
				schemaString: '{}',
				exampleString: '{}',
				exampleName: undefined,
			};

			let newSchemaString = base.schemaString;
			const currentExampleString = field === 'exampleString' ? value : base.exampleString;
			let currentExampleName = base.exampleName;

			if (field === 'exampleString') {
				try {
					const parsedExample = JSON.parse(value);
					const inferredSchema = inferSchemaFromValue(parsedExample);
					newSchemaString = JSON.stringify(inferredSchema, null, 2);
					currentExampleName = undefined;
				}
				catch (e) {
					/* Keep old schema */
				}

				return { ...base, exampleString: currentExampleString, schemaString: newSchemaString, exampleName: currentExampleName };
			}

			return { ...base, [field]: value };
		});
	};

	const ensureRequestBodyStateExists = () => {
		if (!requestBodyState) {
			setRequestBodyState({
				description: '',
				required: false,
				contentType: 'application/json',
				schemaString: '{}',
				exampleString: '{}',
				exampleName: undefined,
			});
		}
	};

	const handleAddNewResponseEntry = () => {
		setManagedResponses(prev => [
			...prev,
			{
				_id: uuidv4(),
				statusCode: '',
				description: '',
				content: { 'application/json': { schemaString: '{}', exampleString: '{}', exampleName: undefined } },
			},
		]);
	};

	const removeManagedResponse = (id: string) => {
		setManagedResponses(prev => prev.filter(r => r._id !== id));
	};

	const updateManagedResponseValue = (id: string, field: 'statusCode' | 'description', value: string) => {
		setManagedResponses(prev =>
			prev.map(r => (r._id === id ? { ...r, [field]: field === 'statusCode' ? String(value).trim() : value } : r)),
		);
	};

	const updateResponseContentString = (id: string, type: 'schemaString' | 'exampleString', value: string) => {
		setManagedResponses(prev =>
			prev.map(r => {
				if (r._id === id) {
					const currentAppJson = r.content?.['application/json'] || {
						schemaString: '',
						exampleString: '',
						exampleName: undefined,
					};
					let newSchemaString = type === 'schemaString' ? value : currentAppJson.schemaString;
					const newExampleString = type === 'exampleString' ? value : currentAppJson.exampleString;
					let newExampleName = currentAppJson.exampleName;

					if (type === 'exampleString') {
						try {
							const parsedExample = JSON.parse(value);
							const inferredSchema = inferSchemaFromValue(parsedExample);
							newSchemaString = JSON.stringify(inferredSchema, null, 2);
							newExampleName = undefined;
						}
						catch (e) {
							/* Keep old schema */
						}
					}

					return {
						...r,
						content: {
							'application/json': {
								...currentAppJson,
								schemaString: newSchemaString,
								exampleString: newExampleString,
								exampleName: newExampleName,
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

		if (newTag && !tags.includes(newTag)) {
			setTags(prev => [...prev, newTag]);
		}

		setCurrentTagInput('');
	};

	const handleRemoveTag = (tagToRemove: string) => {
		setTags(prev => prev.filter(tag => tag !== tagToRemove));
	};

	const handleCloseConflictDialogOnly = () => {
		setConflictDetails(null);
		setIsSubmittingForm(false);
		toast({
			title: 'Conflict Noted',
			description: 'Your edits are still in the form. Please review or copy them before proceeding.',
			duration: 7000,
		});
	};

	const handleSubmit = async (e?: React.FormEvent, forceOverwrite = false) => {
		if (e) e.preventDefault();
		setIsSubmittingForm(true);

		if (!forceOverwrite) {
			setConflictDetails(null);
		}

		let submissionError = false;

		const finalParameters: ParameterObject[] = parameters.map(p_ui => {
			const { _id, ...paramData } = p_ui;
			return paramData as ParameterObject;
		});

		let finalRequestBody: RequestBodyObject | undefined = undefined;

		if (requestBodyState) {
			let currentRbSchema: SchemaObject | ReferenceObject | undefined;
			let currentRbExampleData: any | undefined;

			try {
				if (requestBodyState.schemaString.trim() && requestBodyState.schemaString.trim() !== '{}')
					currentRbSchema = JSON.parse(requestBodyState.schemaString);

				if (requestBodyState.exampleString.trim() && requestBodyState.exampleString.trim() !== '{}')
					currentRbExampleData = JSON.parse(requestBodyState.exampleString);
			}
			catch (err) {
				toast({ title: 'Error', description: 'Invalid JSON in Request Body.', variant: 'destructive' });
				submissionError = true;
			}

			if (!submissionError) {
				const rbConstruct: RequestBodyObject = { description: requestBodyState.description, required: requestBodyState.required };

				if (currentRbSchema || currentRbExampleData) {
					rbConstruct.content = { [requestBodyState.contentType]: {} };
					const mediaTypeTarget = rbConstruct.content[requestBodyState.contentType] as MediaTypeObject;

					if (currentRbSchema) mediaTypeTarget.schema = currentRbSchema;
					if (currentRbExampleData) {
						if (requestBodyState.exampleName)
							mediaTypeTarget.examples = { [requestBodyState.exampleName]: { value: currentRbExampleData } };
						else mediaTypeTarget.example = currentRbExampleData;
					}

					if (Object.keys(mediaTypeTarget).length === 0) delete rbConstruct.content[requestBodyState.contentType];
					if (rbConstruct.content && Object.keys(rbConstruct.content).length === 0) delete rbConstruct.content;
				}

				if (rbConstruct.description || rbConstruct.required || rbConstruct.content) finalRequestBody = rbConstruct;
			}
		}

		if (submissionError) {
			setIsSubmittingForm(false);
			return;
		}

		const finalResponses: Record<string, ResponseObject> = {};

		managedResponses.forEach(mr_ui => {
			if (submissionError) return;

			if (!mr_ui.statusCode.trim()) {
				toast({ title: 'Error', description: 'Response status code cannot be empty.', variant: 'destructive' });
				submissionError = true;
				return;
			}

			const respConstruct: ResponseObject = { description: mr_ui.description };
			let currentRespSchema: SchemaObject | ReferenceObject | undefined;
			let currentRespExampleData: any | undefined;
			const appJsonContentStrings = mr_ui.content?.['application/json'];

			try {
				if (appJsonContentStrings?.schemaString?.trim() && appJsonContentStrings.schemaString.trim() !== '{}')
					currentRespSchema = JSON.parse(appJsonContentStrings.schemaString);

				if (appJsonContentStrings?.exampleString?.trim() && appJsonContentStrings.exampleString.trim() !== '{}')
					currentRespExampleData = JSON.parse(appJsonContentStrings.exampleString);
			}
			catch (err) {
				toast({ title: 'Error', description: `Invalid JSON in Response ${mr_ui.statusCode}.`, variant: 'destructive' });
				submissionError = true;
				return;
			}

			if (currentRespSchema || currentRespExampleData) {
				respConstruct.content = { 'application/json': {} };
				const mediaTypeTarget = respConstruct.content['application/json'] as MediaTypeObject;

				if (currentRespSchema) mediaTypeTarget.schema = currentRespSchema;

				if (currentRespExampleData) {
					const exampleNameFromState = appJsonContentStrings?.exampleName;
					if (exampleNameFromState) mediaTypeTarget.examples = { [exampleNameFromState]: { value: currentRespExampleData } };
					else mediaTypeTarget.example = currentRespExampleData;
				}

				if (Object.keys(mediaTypeTarget).length === 0) delete respConstruct.content['application/json'];
				if (respConstruct.content && Object.keys(respConstruct.content).length === 0) delete respConstruct.content;
			}
			finalResponses[mr_ui.statusCode.trim()] = respConstruct;
		});

		if (submissionError) {
			setIsSubmittingForm(false);
			return;
		}

		const operationBase = {
			summary,
			description,
			tags,
			deprecated: isDeprecated,
			parameters: finalParameters.length > 0 ? finalParameters : undefined,
			requestBody: finalRequestBody,
			responses: Object.keys(finalResponses).length > 0 ? finalResponses : undefined,
		};

		let appMetadata: AppMetadata;
		const metadataSource = initialEndpoint?.operation?.['x-app-metadata'];

		if (metadataSource) {
			appMetadata = { ...metadataSource, lastEditedBy: user?.username || 'unknown', lastEditedAt: new Date().toISOString() };
		}
		else {
			appMetadata = {
				createdBy: user?.username || 'unknown',
				createdAt: new Date().toISOString(),
				lastEditedBy: user?.username || 'unknown',
				lastEditedAt: new Date().toISOString(),
				notes: [],
			};
		}

		const operationForBackend: OperationObject = {
			...(operationBase as Omit<OperationObject, 'x-app-metadata'>),
			'x-app-metadata': appMetadata,
		};
		const payloadForParent = {
			path,
			method,
			operation: operationForBackend,
			_lastKnownOperationUpdatedAt: initialEndpoint && !forceOverwrite ? lastKnownOperationUpdatedAt : undefined,
		};

		try {
			await onSubmit(payloadForParent);
		}
		catch (error) {
			const apiResponseError = error as ApiResponse<any>;

			if (apiResponseError && typeof apiResponseError.error === 'string' && apiResponseError.status === 409) {
				setConflictDetails({
					message: apiResponseError.error || 'This endpoint was updated by someone else.',
					serverUpdatedAt: apiResponseError.errorData?.serverUpdatedAt,
					lastUpdatedBy: apiResponseError.errorData?.lastUpdatedBy,
				});

				setIsSubmittingForm(false);
				return;
			}

			setIsSubmittingForm(false);
		}
	};

	const handleForceSubmitFromDialog = () => {
		handleSubmit(undefined, true);
	};

	const handleRefreshAndDiscardEdits = async () => {
		if (!projectId || !initialEndpoint) return;
		setIsSubmittingForm(true);
		setConflictDetails(null);

		try {
			const specResponse = await api.get<OpenAPISpec>(`/projects/${projectId}/openapi`);
			if (specResponse.error || !specResponse.data) {
				throw new Error(specResponse.error || 'Failed to fetch latest spec.');
			}

			const latestSpec = specResponse.data;
			const pathItem = latestSpec.paths[initialEndpoint.path];

			if (!pathItem) throw new Error('Endpoint path no longer exists in the latest spec.');

			const latestOperationOrRef = pathItem[initialEndpoint.method.toLowerCase() as keyof typeof pathItem] as
				| OperationObject
				| ReferenceObject
				| undefined;

			if (!latestOperationOrRef) throw new Error('Endpoint method no longer exists for this path.');

			const latestResolvedOperation = latestOperationOrRef as OperationObject;

			if (latestResolvedOperation && !(latestResolvedOperation as ReferenceObject).$ref) {
				const newInitialEndpointData = {
					path: initialEndpoint.path,
					method: initialEndpoint.method,
					operation: latestResolvedOperation,
				};

				populateFormFields(newInitialEndpointData);
				initialEndpointRef.current = newInitialEndpointData;
				currentInitialEndpointId.current = `${newInitialEndpointData.path}-${newInitialEndpointData.method}`;
				hasInitializedFromProps.current = true;

				setLastKnownOperationUpdatedAt(latestResolvedOperation['x-app-metadata']?.lastEditedAt);
				toast({
					title: 'Data Refreshed',
					description: 'Form has been updated with the latest server data. Your previous edits were discarded.',
				});
			}
			else {
				throw new Error('Could not resolve latest operation to get its timestamp or it was a ref.');
			}
		}
		catch (error) {
			toast({ title: 'Refresh Failed', description: (error as Error).message, variant: 'destructive' });
		}
		finally {
			setIsSubmittingForm(false);
		}
	};

	const formFieldsDisabled = isSubmittingForm && !conflictDetails;
	const mainButtonsDisabled = isSubmittingForm || !!conflictDetails;

	return (
		<>
			<Card className="p-4 max-h-[90vh] overflow-y-auto">
				<CardHeader>
					<CardTitle className="text-gradient-green">{initialEndpoint ? 'Edit Endpoint' : 'Create New Endpoint'}</CardTitle>
				</CardHeader>

				<CardContent>
					<form onSubmit={handleSubmit} id={`${formId}-mainForm`} className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div className="md:col-span-2">
								<Label htmlFor={`${formId}-path`}>Path</Label>
								<Input
									id={`${formId}-path`}
									value={path}
									onChange={e => setPath(e.target.value)}
									placeholder="/api/{id}"
									required
									disabled={formFieldsDisabled}
								/>
							</div>

							<div>
								<Label htmlFor={`${formId}-method`}>Method</Label>
								<Select value={method} onValueChange={val => setMethod(val)} disabled={formFieldsDisabled}>
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
								onChange={e => setSummary(e.target.value)}
								placeholder="Endpoint summary"
								disabled={formFieldsDisabled}
							/>
						</div>

						<div>
							<Label htmlFor={`${formId}-description`}>Description</Label>
							<Textarea
								id={`${formId}-description`}
								value={description}
								onChange={e => setDescription(e.target.value)}
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
									onChange={e => setCurrentTagInput(e.target.value)}
									placeholder="Enter a tag"
									onKeyDown={e => {
										if (e.key === 'Enter' || e.key === ',') {
											e.preventDefault();
											handleAddTag();
										}
									}}
									disabled={formFieldsDisabled}
								/>
								<Button type="button" variant="outline" onClick={handleAddTag} disabled={formFieldsDisabled}>
									Add Tag
								</Button>
							</div>

							{tags.length > 0 && (
								<div className="flex flex-wrap gap-2 mt-2">
									{tags.map(tag => (
										<Badge key={tag} variant="secondary" className="flex items-center">
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
					<Button type="button" variant="outline" onClick={onClose} disabled={isSubmittingForm && !!conflictDetails}>
						Cancel
					</Button>

					<Button type="submit" form={`${formId}-mainForm`} disabled={mainButtonsDisabled}>
						{isSubmittingForm && !conflictDetails ? 'Saving...' : initialEndpoint ? 'Update Endpoint' : 'Create Endpoint'}
					</Button>
				</CardFooter>
			</Card>

			{conflictDetails && (
				<AlertDialog
					open={!!conflictDetails}
					onOpenChange={isOpenDialog => {
						if (!isOpenDialog && conflictDetails) {
							handleCloseConflictDialogOnly();
						}
					}}
				>
					<AlertDialogContent className="max-w-screen-lg w-[900px] overflow-y-auto max-h-screen">
						<AlertDialogHeader>
							<AlertDialogTitle>Concurrency Conflict</AlertDialogTitle>
							<AlertDialogDescription className="text-base">
								<p>{conflictDetails.message}</p>
								<div className="my-5 leading-relaxed">
									{conflictDetails.serverUpdatedAt && (
										<>
											<p>
												<strong>Last server update EN:</strong>{' '}
												{new Date(conflictDetails.serverUpdatedAt).toLocaleString()}
											</p>
											<p>
												<strong>Last server update FA:</strong>{' '}
												{new Date(conflictDetails.serverUpdatedAt).toLocaleString('fa-IR')}
											</p>
										</>
									)}
									{conflictDetails.lastUpdatedBy && (
										<p className="mt-1">
											<strong>Last updated by:</strong> {conflictDetails.lastUpdatedBy}
										</p>
									)}
									<p className="mt-2">Your current unsaved edits are still in the form.</p>
								</div>
							</AlertDialogDescription>
						</AlertDialogHeader>

						<AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 mt-2">
							<Button
								className="w-full sm:w-auto"
								variant="outline"
								onClick={handleCloseConflictDialogOnly}
								disabled={isSubmittingForm}
							>
								<X className="mr-2 h-4 w-4" /> Review My Edits
							</Button>

							<Button
								className="w-full sm:w-auto"
								variant="secondary"
								onClick={handleRefreshAndDiscardEdits}
								disabled={isSubmittingForm}
							>
								<RefreshCw className="mr-2 h-4 w-4" /> Refresh & Discard My Edits
							</Button>

							<Button
								className="w-full sm:w-auto"
								variant="destructive"
								onClick={handleForceSubmitFromDialog}
								disabled={isSubmittingForm}
							>
								Force Overwrite With My Edits
							</Button>
						</AlertDialogFooter>

						<AlertDialogCancel
							onClick={handleCloseConflictDialogOnly}
							className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
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
