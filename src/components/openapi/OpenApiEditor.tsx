import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { useUpdateOpenApi } from '@/hooks/api/useProject';
import { useToast } from '@/hooks/use-toast';
import { OpenAPISpec } from '@/types/types';
import { api, ApiError } from '@/utils/api';
import { Maximize, Minimize, RefreshCcw, X } from 'lucide-react';
import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import EditorLoading from './EditorLoading';

const OpenApiMonacoEditor = lazy(() => import('./OpenApiMonacoEditor'));

interface OpenApiEditorProps {
	projectId: string;
	openApi: OpenAPISpec;
	projectUpdatedAt: string;
	isOpen: boolean;
	onClose: () => void;
}

const OpenApiEditor: React.FC<OpenApiEditorProps> = ({
	projectId,
	openApi,
	projectUpdatedAt,
	isOpen,
	onClose,
}) => {
	const { toast } = useToast();
	const updateOpenApiMutation = useUpdateOpenApi();
	const isSubmitting = updateOpenApiMutation.isPending;

	const [openApiString, setOpenApiString] = useState('');
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [jsonError, setJsonError] = useState<string | null>(null);
	const [validationError, setValidationError] = useState<string | string[] | null>(null);

	const [lastKnownProjectUpdatedAt, setLastKnownProjectUpdatedAt] =
		useState<string>(projectUpdatedAt);
	const [conflictError, setConflictError] = useState<string | null>(null);
	const [serverConflictTimestamp, setServerConflictTimestamp] = useState<string | undefined>(
		undefined,
	);

	const initialOpenStateRef = useRef(false);

	useEffect(() => {
		if (isOpen && !initialOpenStateRef.current && !conflictError) {
			setOpenApiString(JSON.stringify(openApi, null, 2));
			setLastKnownProjectUpdatedAt(projectUpdatedAt);
			setJsonError(null);
			setValidationError(null);
			setConflictError(null);
			setServerConflictTimestamp(undefined);
			initialOpenStateRef.current = true;
		} else if (!isOpen) {
			initialOpenStateRef.current = false;
		}
	}, [isOpen, openApi, projectUpdatedAt, conflictError]);

	useEffect(() => {
		const handleEscKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && isFullscreen) {
				setIsFullscreen(false);
			}
		};

		window.addEventListener('keydown', handleEscKey);
		return () => window.removeEventListener('keydown', handleEscKey);
	}, [isFullscreen]);

	const handleChange = (value: string | undefined) => {
		if (value !== undefined) {
			setOpenApiString(value);
			setJsonError(null);
			setValidationError(null);
		}
	};

	const toggleFullscreen = () => {
		setIsFullscreen(!isFullscreen);
	};

	const validateOpenApiJsonOnSave = (jsonString: string): OpenAPISpec | null => {
		try {
			const parsed = JSON.parse(jsonString);

			if (typeof parsed === 'object' && parsed !== null && parsed.openapi) {
				setJsonError(null);
				return parsed as OpenAPISpec;
			}

			setJsonError(
				'Invalid OpenAPI structure: "openapi" version field is missing or format is incorrect.',
			);
			return null;
		} catch (err) {
			setJsonError(`Invalid JSON: ${err instanceof Error ? err.message : 'Unknown error'}`);
			return null;
		}
	};

	const handleSave = async (forceOverwrite = false) => {
		setValidationError(null);
		const parsedOpenApi = validateOpenApiJsonOnSave(openApiString);
		if (!parsedOpenApi) return;

		if (!forceOverwrite) {
			setConflictError(null);
			setServerConflictTimestamp(undefined);
		}

		const mutationPayload: {
			projectId: string;
			spec: OpenAPISpec;
			lastKnownProjectUpdatedAt?: string;
		} = {
			projectId,
			spec: parsedOpenApi,
		};

		if (!forceOverwrite && lastKnownProjectUpdatedAt) {
			mutationPayload.lastKnownProjectUpdatedAt = lastKnownProjectUpdatedAt;
		}

		try {
			await updateOpenApiMutation.mutateAsync(mutationPayload);

			toast({
				title: forceOverwrite ? 'OpenAPI Overwritten' : 'OpenAPI Updated',
				description: 'The OpenAPI specification has been updated successfully',
			});

			onClose();
		} catch (error: any) {
			if (
				error instanceof ApiError &&
				error.status === 400 &&
				typeof error.errorResponse?.message === 'object'
			) {
				const detailedErrors = (error.errorResponse.message as any)?.message;
				if (Array.isArray(detailedErrors) && detailedErrors.length > 0) {
					setValidationError(detailedErrors);
				} else {
					setValidationError(
						error.message ||
							'Validation failed. Please check the structure of your specification.',
					);
				}
			} else if (error?.status === 409) {
				setServerConflictTimestamp((error.errorResponse as any)?.serverUpdatedAt);
				setConflictError(
					error.message ||
						'The OpenAPI specification has been modified by someone else since you started editing.',
				);
			} else {
				toast({
					title: 'Update Failed',
					description: error?.message || 'Failed to update OpenAPI specification',
					variant: 'destructive',
				});
			}
		}
	};

	const handleForceSubmitFromDialog = () => {
		handleSave(true);
	};

	const handleCloseConflictDialogOnly = () => {
		setConflictError(null);
		toast({
			title: 'Conflict Noted',
			description:
				'Your edits are still in the editor. Please review or copy them before proceeding.',
			duration: 7000,
		});
	};

	const handleRefreshAndDiscardEdits = async () => {
		if (!projectId) return;
		(updateOpenApiMutation.isPending as any) = true;
		setConflictError(null);

		try {
			const projectRes = await api.get<any>(`/projects/${projectId}`); // Using 'any' as Project type is local

			if (!projectRes.data) {
				throw new Error('Failed to fetch latest project details for refresh.');
			}

			const latestProjectTimestamp = projectRes.data.updatedAt;

			const specRes = await api.get<OpenAPISpec>(`/projects/${projectId}/openapi`);
			if (!specRes.data) {
				throw new Error('Failed to fetch latest OpenAPI spec for refresh.');
			}

			setOpenApiString(JSON.stringify(specRes.data, null, 2));
			setLastKnownProjectUpdatedAt(latestProjectTimestamp);
			setJsonError(null);
			setValidationError(null);
			initialOpenStateRef.current = true;

			toast({
				title: 'Editor Content Reloaded',
				description:
					'Latest version loaded into the editor. Your previous unsaved edits were discarded.',
			});
		} catch (error) {
			toast({
				title: 'Refresh Failed',
				description: (error as Error).message,
				variant: 'destructive',
			});
		} finally {
			(updateOpenApiMutation.isPending as any) = false;
		}
	};

	const renderErrorAlert = () => {
		const errors = jsonError
			? [jsonError]
			: Array.isArray(validationError)
				? validationError
				: validationError
					? [validationError]
					: [];
		if (errors.length === 0) return null;

		return (
			<Alert variant="destructive" className="mb-4 max-h-48 overflow-y-auto">
				<AlertTitle>Import Failed</AlertTitle>
				<AlertDescription>
					<ul className="list-disc pl-5 space-y-1 mt-2">
						{errors.map((err, index) => (
							<li key={index}>
								{typeof err === 'string' ? err : JSON.stringify(err)}
							</li>
						))}
					</ul>
				</AlertDescription>
			</Alert>
		);
	};

	if (isFullscreen) {
		return (
			<div className="fixed inset-0 bg-background z-50 flex flex-col p-4">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-2xl font-bold text-gradient">Edit OpenAPI Specification</h2>
					<Button
						variant="ghost"
						size="icon"
						onClick={toggleFullscreen}
						title="Exit Fullscreen"
					>
						<Minimize className="h-5 w-5" />
					</Button>
				</div>

				{renderErrorAlert()}

				<div className="flex-grow overflow-auto border border-border rounded-md">
					<Suspense fallback={<EditorLoading />}>
						<OpenApiMonacoEditor
							onChange={handleChange}
							value={openApiString}
							height="calc(100vh - 220px)"
						/>
					</Suspense>
				</div>

				<div className="flex justify-end items-center mt-4 space-x-2">
					<Button
						variant="outline"
						onClick={() => setIsFullscreen(false)}
						disabled={isSubmitting}
					>
						Exit Fullscreen
					</Button>

					<Button
						onClick={() => handleSave(false)}
						disabled={
							isSubmitting || !!conflictError || !!validationError || !!jsonError
						}
					>
						{isSubmitting ? 'Saving...' : 'Save Changes'}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<>
			<Dialog
				open={isOpen}
				onOpenChange={(openState) => {
					if (!openState && !isSubmitting) {
						onClose();
					}
				}}
			>
				<DialogContent className="max-h-[90vh] max-w-[90vw] lg:max-w-4xl xl:max-w-5xl 2xl:max-w-7xl w-full flex flex-col p-0 glass-card">
					<DialogHeader className="p-6 pb-4 border-b">
						<div className="flex justify-between items-center">
							<DialogTitle className="text-2xl font-bold text-gradient">
								Edit OpenAPI Specification
							</DialogTitle>
							<Button
								variant="ghost"
								size="icon"
								onClick={toggleFullscreen}
								title="Enter Fullscreen"
							>
								<Maximize className="h-5 w-5" />
							</Button>
						</div>
					</DialogHeader>

					<div className="p-6 flex-grow overflow-y-auto">
						{renderErrorAlert()}

						<div className="border border-border rounded-md overflow-hidden h-[65vh] min-h-[300px]">
							<Suspense fallback={<EditorLoading />}>
								<OpenApiMonacoEditor
									onChange={handleChange}
									value={openApiString}
									height="100%"
								/>
							</Suspense>
						</div>
					</div>

					<DialogFooter className="p-6 pt-4 border-t flex justify-end space-x-2">
						<Button variant="outline" onClick={onClose} disabled={isSubmitting}>
							Cancel
						</Button>

						<Button
							onClick={() => handleSave(false)}
							disabled={
								isSubmitting || !!conflictError || !!validationError || !!jsonError
							}
						>
							{isSubmitting ? 'Saving...' : 'Save Changes'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{conflictError && (
				<AlertDialog
					open={!!conflictError}
					onOpenChange={(openDialog) => {
						if (!openDialog) {
							setConflictError(null);
						}
					}}
				>
					<AlertDialogContent className="max-w-screen-lg w-[900px] overflow-y-auto max-h-screen">
						<AlertDialogHeader>
							<AlertDialogTitle>Concurrency Conflict</AlertDialogTitle>

							<AlertDialogDescription asChild>
								<div>
									<p className="mb-1">{conflictError}</p>
									<div className="my-5 leading-relaxed">
										{serverConflictTimestamp && (
											<p>
												<strong>Last server update:</strong>{' '}
												{new Date(serverConflictTimestamp).toLocaleString()}
											</p>
										)}
										<p className="mt-2">
											Your current unsaved edits are still in the editor.
										</p>
									</div>
								</div>
							</AlertDialogDescription>
						</AlertDialogHeader>

						<AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 mt-2">
							<Button
								className="w-full sm:w-auto"
								variant="outline"
								onClick={handleCloseConflictDialogOnly}
								disabled={isSubmitting}
							>
								<X className="mr-2 h-4 w-4" /> Review My Edits
							</Button>

							<Button
								className="w-full sm:w-auto"
								variant="secondary"
								onClick={handleRefreshAndDiscardEdits}
								disabled={isSubmitting}
							>
								<RefreshCcw className="mr-2 h-4 w-4" /> Refresh & Discard My Edits
							</Button>

							<Button
								className="w-full sm:w-auto"
								variant="destructive"
								onClick={handleForceSubmitFromDialog}
								disabled={isSubmitting}
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

export default OpenApiEditor;
