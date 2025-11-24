import { DiffEditorDialog } from '@/components/general/DiffEditorDialog';
import EditorLoading from '@/components/openapi/EditorLoading';
import { useUpdateOpenApi } from '@/entities/Project/api/useProject';
import { useToast } from '@/hooks/use-toast';
import { api, ApiError } from '@/shared/api/api';
import type { components } from '@/shared/types/api-types';
import { OpenAPISpec } from '@/shared/types/types';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import { Code2, Maximize, Minimize, Save, X } from 'lucide-react';
import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';

const OpenApiMonacoEditor = lazy(() => import('@/components/openapi/OpenApiMonacoEditor'));

type ProjectDetailDto = components['schemas']['ProjectDetailDto'];

interface OpenApiEditorProps {
	projectId: string;
	openApi: OpenAPISpec;
	projectUpdatedAt: string;
	isOpen: boolean;
	onClose: () => void;
}
interface ValidationErrors {
	errors: string[];
}
function hasValidationErrors(obj: unknown): obj is ValidationErrors {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'errors' in obj &&
		Array.isArray((obj as ValidationErrors).errors)
	);
}

const OpenApiEditor: React.FC<OpenApiEditorProps> = ({
	projectId,
	openApi,
	projectUpdatedAt: initialProjectUpdatedAt,
	isOpen,
	onClose,
}) => {
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const updateOpenApiMutation = useUpdateOpenApi();
	const isSubmitting = updateOpenApiMutation.isPending;
	const [openApiString, setOpenApiString] = useState('');
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [jsonError, setJsonError] = useState<string | null>(null);
	const [validationError, setValidationError] = useState<string | string[] | null>(null);
	const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
	const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
	const [conflictingServerSpec, setConflictingServerSpec] = useState<OpenAPISpec | null>(null);

	const [currentUpdatedAt, setCurrentUpdatedAt] = useState(initialProjectUpdatedAt);
	const initialOpenStateRef = useRef(false);

	useEffect(() => {
		if (isOpen && !initialOpenStateRef.current) {
			setOpenApiString(JSON.stringify(openApi, null, 2));
			setJsonError(null);
			setValidationError(null);
			setIsConflictDialogOpen(false);
			setConflictingServerSpec(null);
			setIsDiscardDialogOpen(false);
			setCurrentUpdatedAt(initialProjectUpdatedAt);
			initialOpenStateRef.current = true;
		} else if (!isOpen) {
			initialOpenStateRef.current = false;
		}
	}, [isOpen, openApi, initialProjectUpdatedAt]);

	const hasUnsavedChanges = useMemo(() => {
		return openApiString !== JSON.stringify(openApi, null, 2);
	}, [openApiString, openApi]);

	const handleCloseAttempt = () => {
		if (hasUnsavedChanges) {
			setIsDiscardDialogOpen(true);
		} else {
			onClose();
		}
	};

	const fetchFreshSpec = async () => {
		const res = await api.get<OpenAPISpec>(`/projects/${projectId}/openapi?_t=${Date.now()}`);
		return res.data;
	};

	const fetchFreshProjectDetails = async () => {
		const res = await api.get<ProjectDetailDto>(`/projects/${projectId}?_t=${Date.now()}`);
		return res.data;
	};

	useEffect(() => {
		if (isConflictDialogOpen && projectId) {
			const fetchServerSpec = async () => {
				try {
					const data = await fetchFreshSpec();
					setConflictingServerSpec(data);
				} catch (error) {
					toast({
						title: 'Error',
						description: 'Could not fetch latest spec for comparison.',
						variant: 'destructive',
					});
					setIsConflictDialogOpen(false);
				}
			};

			fetchServerSpec();
		}
	}, [isConflictDialogOpen, projectId, toast]);

	useEffect(() => {
		const handleEscKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				if (isFullscreen) {
					setIsFullscreen(false);
				}
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
	const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

	const validateAndParseSpec = (jsonString: string): OpenAPISpec | null => {
		try {
			const parsed = JSON.parse(jsonString);
			if (typeof parsed === 'object' && parsed !== null && parsed.openapi) {
				setJsonError(null);
				return parsed as OpenAPISpec;
			}

			setJsonError('Invalid OpenAPI structure: "openapi" missing.');
			return null;
		} catch (err) {
			setJsonError(`Invalid JSON: ${err instanceof Error ? err.message : 'Unknown error'}`);
			return null;
		}
	};

	const handleSave = async (timestampOverride?: string) => {
		setValidationError(null);
		const parsedOpenApi = validateAndParseSpec(openApiString);
		if (!parsedOpenApi) return;

		try {
			await updateOpenApiMutation.mutateAsync({
				projectId,
				spec: parsedOpenApi,
				lastKnownUpdatedAt: timestampOverride || currentUpdatedAt,
			});

			toast({
				title: timestampOverride ? 'Overwritten' : 'Updated',
				description: 'Spec updated successfully.',
			});

			onClose();
		} catch (error: any) {
			if (
				error instanceof ApiError &&
				error.status === 409 &&
				error.metaCode === 'PROJECT_CONCURRENCY_CONFLICT'
			) {
				setIsConflictDialogOpen(true);
			} else if (
				error instanceof ApiError &&
				error.status === 400 &&
				error.metaCode === 'SPEC_LINTING_FAILED' &&
				error.errorResponse
			) {
				const messageObj = error.errorResponse.message;
				if (typeof messageObj === 'object' && hasValidationErrors(messageObj))
					setValidationError(messageObj.errors);
				else setValidationError(error.message);
			} else {
				toast({
					title: 'Update Failed',
					description: error?.message,
					variant: 'destructive',
				});
			}
		}
	};

	const handleForceOverwrite = async () => {
		try {
			const projectData = await fetchFreshProjectDetails();
			setIsConflictDialogOpen(false);
			handleSave(projectData.updatedAt);
		} catch (e) {
			toast({
				title: 'Error',
				description: 'Could not fetch latest version to overwrite.',
				variant: 'destructive',
			});
		}
	};

	const handleRefreshAndDiscard = async () => {
		try {
			const freshSpec = await fetchFreshSpec();
			const freshProject = await fetchFreshProjectDetails();

			setOpenApiString(JSON.stringify(freshSpec, null, 2));
			setCurrentUpdatedAt(freshProject.updatedAt);

			queryClient.setQueryData(['openapi', projectId], freshSpec);
			queryClient.setQueryData(['project', projectId], freshProject);

			setIsConflictDialogOpen(false);
			toast({
				title: 'Reloaded',
				description: 'Changes discarded. Loaded latest server version.',
			});
		} catch (e) {
			toast({
				title: 'Error',
				description: 'Failed to refresh data.',
				variant: 'destructive',
			});
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
			<div className="absolute bottom-14 left-4 right-4 z-50">
				<Alert
					variant="destructive"
					className="shadow-2xl bg-destructive text-destructive-foreground border-none pr-12 relative"
				>
					<button
						onClick={() => {
							setJsonError(null);
							setValidationError(null);
						}}
						className="absolute top-4 right-4 text-white/80 hover:text-white"
					>
						<X className="h-4 w-4" />
					</button>

					<AlertTitle className="flex items-center gap-2 font-bold">
						Validation Failed
					</AlertTitle>

					<AlertDescription>
						<ul className="list-disc pl-5 space-y-1 mt-2 max-h-32 overflow-y-auto">
							{errors.map((err, index) => (
								<li key={index}>
									{typeof err === 'string' ? err : JSON.stringify(err)}
								</li>
							))}
						</ul>
					</AlertDescription>
				</Alert>
			</div>
		);
	};

	const editorContent = (
		<div className="relative h-full w-full bg-[#1e1e1e]">
			{renderErrorAlert()}
			<Suspense fallback={<EditorLoading />}>
				<OpenApiMonacoEditor onChange={handleChange} value={openApiString} height="100%" />
			</Suspense>
		</div>
	);

	if (isFullscreen)
		return (
			<div className="fixed inset-0 bg-[#1e1e1e] z-100 flex flex-col animate-in fade-in duration-200">
				<div className="flex justify-between items-center px-4 h-14 border-b border-white/10 bg-[#252526] text-white shrink-0">
					<div className="flex items-center gap-2 text-sm font-mono text-blue-400">
						<Code2 className="h-4 w-4" />
						<span>openapi.json</span>
					</div>

					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="icon"
							onClick={toggleFullscreen}
							className="text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
							title="Exit Fullscreen"
						>
							<Minimize className="h-4 w-4" />
						</Button>
					</div>
				</div>

				<div className="grow overflow-hidden relative">{editorContent}</div>

				<div className="h-16 border-t border-white/10 bg-[#252526] flex justify-end items-center px-6 gap-3 shrink-0">
					<Button
						variant="secondary"
						onClick={() => setIsFullscreen(false)}
						disabled={isSubmitting}
						className="cursor-pointer bg-white/10 hover:bg-white/20 text-white border-none"
					>
						Exit Fullscreen
					</Button>

					<Button
						variant="default"
						onClick={() => handleSave()}
						disabled={isSubmitting || !!jsonError || !!validationError}
						className="cursor-pointer"
					>
						<Save className="h-4 w-4 mr-2" />
						{isSubmitting ? 'Saving...' : 'Save Changes'}
					</Button>
				</div>
			</div>
		);

	return (
		<>
			<Dialog open={isOpen} onOpenChange={(openState) => !openState && handleCloseAttempt()}>
				<DialogContent
					showCloseButton={false}
					className="w-screen h-dvh max-w-none rounded-none sm:rounded-lg sm:max-w-[90vw] sm:w-[90vw] sm:h-[85vh] flex flex-col p-0 gap-0 bg-[#1e1e1e] border-border/50 shadow-2xl overflow-hidden"
				>
					<DialogHeader className="px-4 h-14 flex-row items-center justify-between border-b border-white/10 bg-[#252526] space-y-0 shrink-0">
						<DialogTitle className="flex items-center gap-2 text-sm font-mono text-blue-400 m-0">
							<Code2 className="h-4 w-4" />
							openapi.json
						</DialogTitle>

						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								onClick={toggleFullscreen}
								className="text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
								title="Fullscreen"
							>
								<Maximize className="h-4 w-4" />
							</Button>
						</div>
					</DialogHeader>

					<div className="grow overflow-hidden relative">{editorContent}</div>

					<DialogFooter className="px-6 h-16 border-t border-white/10 bg-[#252526] flex items-center justify-end gap-3 shrink-0">
						<Button
							variant="secondary"
							onClick={handleCloseAttempt}
							disabled={isSubmitting}
							className="cursor-pointer bg-white/10 hover:bg-white/20 text-white border-none"
						>
							Cancel
						</Button>

						<Button
							variant="default"
							onClick={() => handleSave()}
							disabled={isSubmitting || !!jsonError || !!validationError}
							className="cursor-pointer"
						>
							{isSubmitting ? 'Saving...' : 'Save Changes'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{conflictingServerSpec && (
				<DiffEditorDialog
					isOpen={isConflictDialogOpen}
					onClose={() => setIsConflictDialogOpen(false)}
					onForceOverwrite={handleForceOverwrite}
					onRefreshAndDiscard={handleRefreshAndDiscard}
					originalContent={JSON.stringify(conflictingServerSpec, null, 2)}
					modifiedContent={openApiString}
					title="OpenAPI Spec Conflict"
				/>
			)}

			<AlertDialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Discard Unsaved Changes?</AlertDialogTitle>
						<AlertDialogDescription>
							You have edited the OpenAPI specification manually. Closing this window
							will discard your changes.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<AlertDialogFooter>
						<AlertDialogCancel className="cursor-pointer">
							Keep Editing
						</AlertDialogCancel>

						<AlertDialogAction
							onClick={() => {
								setIsDiscardDialogOpen(false);
								onClose();
							}}
							className="bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
						>
							Discard Changes
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};
export default OpenApiEditor;
