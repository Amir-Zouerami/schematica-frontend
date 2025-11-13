import { api } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import EditorLoading from './EditorLoading';
import { Button } from '@/components/ui/button';
import { useUpdateOpenApi } from '@/hooks/api/useProject';
import { OpenAPISpec, Project } from '@/types/types';
import { Maximize, Minimize, RefreshCcw, X } from 'lucide-react';
import React, { useState, useEffect, lazy, Suspense, useRef } from 'react';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogCancel,
} from '@/components/ui/alert-dialog';

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
		const parsedOpenApi = validateOpenApiJsonOnSave(openApiString);
		if (!parsedOpenApi) return;

		if (!forceOverwrite) {
			setConflictError(null);
			setServerConflictTimestamp(undefined);
		}

		const mutationPayload: {
			projectId: string;
			specData: OpenAPISpec;
			lastKnownProjectUpdatedAt?: string;
		} = {
			projectId,
			specData: parsedOpenApi,
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
			if (error?.status === 409) {
				setServerConflictTimestamp(error.errorData?.serverUpdatedAt);
				setConflictError(
					error.error ||
						'The OpenAPI specification has been modified by someone else since you started editing.',
				);
				return;
			}

			toast({
				title: 'Update Failed',
				description:
					error?.error ||
					(error instanceof Error
						? error.message
						: 'Failed to update OpenAPI specification'),
				variant: 'destructive',
			});
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
			const projectRes = await api.get<Project>(`/projects/${projectId}`);

			if (projectRes.error || !projectRes.data) {
				throw new Error(
					projectRes.error || 'Failed to fetch latest project details for refresh.',
				);
			}

			const latestProjectTimestamp = projectRes.data.updatedAt;

			const specRes = await api.get<OpenAPISpec>(`/projects/${projectId}/openapi`);
			if (specRes.error || !specRes.data) {
				throw new Error(
					specRes.error || 'Failed to fetch latest OpenAPI spec for refresh.',
				);
			}

			setOpenApiString(JSON.stringify(specRes.data, null, 2));
			setLastKnownProjectUpdatedAt(latestProjectTimestamp);
			setJsonError(null);
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

				{jsonError && (
					<div className="bg-destructive/20 border border-destructive text-destructive-foreground p-3 rounded-md mb-3 text-xs">
						{jsonError}
					</div>
				)}

				<div className="flex-grow overflow-auto border border-border rounded-md">
					<Suspense fallback={<EditorLoading />}>
						<OpenApiMonacoEditor
							onChange={handleChange}
							value={openApiString}
							height="calc(100vh - 160px)"
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
						disabled={isSubmitting || !!conflictError}
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
						{jsonError && (
							<div className="bg-destructive/20 border border-destructive text-destructive-foreground p-3 rounded-md mb-3 text-xs">
								{jsonError}
							</div>
						)}

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
							disabled={isSubmitting || !!conflictError}
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

							<AlertDialogDescription>
								<p className="mb-1">{conflictError}</p>
								<div className="my-5 leading-relaxed">
									{serverConflictTimestamp && (
										<>
											<p>
												<strong>Last server update EN:</strong>{' '}
												{new Date(serverConflictTimestamp).toLocaleString()}
											</p>
											<p>
												<strong>Last server update FA:</strong>{' '}
												{new Date(serverConflictTimestamp).toLocaleString(
													'fa-IR',
												)}
											</p>
										</>
									)}
									<p className="mt-2">
										Your current unsaved edits are still in the editor.
									</p>
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
						<AlertDialogCancel className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
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
