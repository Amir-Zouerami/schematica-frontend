import {
	useCreateEnvironment,
	useCreateSecret,
	useDeleteEnvironment,
	useDeleteSecret,
	useEnvironments,
	useSecrets,
	useUpdateSecret,
} from '@/entities/Environment/api/useEnvironments';
import { useProject } from '@/entities/Project/api/useProject';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import type { components } from '@/shared/types/api-types';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Textarea } from '@/shared/ui/textarea';
import { Copy, Edit, Eye, EyeOff, Globe, Lock, Plus, Search, Trash2, Upload } from 'lucide-react';
import React, { useState } from 'react';
import { SecretFormDialog } from './SecretFormDialog';

type SecretDto = components['schemas']['SecretDto'];

interface EnvironmentManagerProps {
	projectId: string;
}

export const EnvironmentManager: React.FC<EnvironmentManagerProps> = ({ projectId }) => {
	const { data: project } = useProject(projectId);
	const { isProjectOwner } = usePermissions();
	const canEdit = isProjectOwner(project);

	const { data: environments, isLoading: isEnvLoading } = useEnvironments(projectId);
	const createEnvMutation = useCreateEnvironment();
	const deleteEnvMutation = useDeleteEnvironment();
	const createSecretMutation = useCreateSecret();
	const deleteSecretMutation = useDeleteSecret();
	const updateSecretMutation = useUpdateSecret();
	const { toast } = useToast();

	const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
	const [newEnvName, setNewEnvName] = useState('');
	const [isSecretModalOpen, setIsSecretModalOpen] = useState(false);
	const [isImportModalOpen, setIsImportModalOpen] = useState(false);
	const [envFileContent, setEnvFileContent] = useState('');
	const [secretToEdit, setSecretToEdit] = useState<SecretDto | undefined>(undefined);
	const [visibleSecrets, setVisibleSecrets] = useState<Record<number, boolean>>({});
	const [secretSearchTerm, setSecretSearchTerm] = useState('');

	const { data: secrets, isLoading: isSecretsLoading } = useSecrets(
		projectId,
		canEdit ? selectedEnvId : null,
	);

	const filteredSecrets = secrets?.filter(
		(secret) =>
			secret.key.toLowerCase().includes(secretSearchTerm.toLowerCase()) ||
			(secret.description &&
				secret.description.toLowerCase().includes(secretSearchTerm.toLowerCase())),
	);

	if (!canEdit) {
		return (
			<div className="flex flex-col items-center justify-center h-[400px] border rounded-lg bg-background shadow-sm text-muted-foreground">
				<Lock className="h-16 w-16 mb-4 opacity-10" />
				<h3 className="text-lg font-medium mb-2">Access Restricted</h3>

				<p className="max-w-md text-center px-4">
					Only Project Owners and Admins can view or manage environments and secrets to
					ensure security.
				</p>
			</div>
		);
	}

	const handleCreateEnv = async () => {
		if (!newEnvName.trim()) return;

		try {
			await createEnvMutation.mutateAsync({
				projectId,
				data: { name: newEnvName },
			});

			setNewEnvName('');
		} catch (error) {
			console.error('Failed to create env', error);
		}
	};

	const handleDeleteEnv = async (envId: string) => {
		try {
			await deleteEnvMutation.mutateAsync({ projectId, environmentId: envId });
			if (selectedEnvId === envId) setSelectedEnvId(null);
		} catch (error) {
			console.error('Failed to delete env', error);
		}
	};

	const handleDeleteSecret = async (secretId: number) => {
		if (!selectedEnvId) return;

		try {
			await deleteSecretMutation.mutateAsync({
				projectId,
				environmentId: selectedEnvId,
				secretId,
			});

			toast({ title: 'Secret Deleted', description: 'Secret removed successfully.' });
		} catch (error) {
			console.error('Failed to delete secret', error);
		}
	};

	const handleImportEnv = async () => {
		if (!selectedEnvId || !envFileContent.trim()) return;

		const lines = envFileContent.split('\n');
		let created = 0;
		let updated = 0;
		let ignored = 0;

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;

			const match = trimmed.match(/^([^=]+)=(.*)$/);
			if (match) {
				const key = match[1].trim();
				const value = match[2].trim();

				if (key && value) {
					const existingSecret = secrets?.find((s) => s.key === key);

					if (existingSecret) {
						if (existingSecret.value === value) {
							ignored++;
						} else {
							try {
								await updateSecretMutation.mutateAsync({
									projectId,
									environmentId: selectedEnvId,
									secretId: existingSecret.id,
									data: {
										value,
										description:
											existingSecret.description || 'Updated via .env',
									},
								});

								updated++;
							} catch (e) {
								console.error(`Failed to update ${key}`, e);
							}
						}
					} else {
						try {
							await createSecretMutation.mutateAsync({
								projectId,
								environmentId: selectedEnvId,
								data: { key, value, description: 'Imported via .env' },
							});

							created++;
						} catch (e) {
							console.error(`Failed to create ${key}`, e);
						}
					}
				}
			}
		}

		toast({
			title: 'Import Summary',
			description: `Created: ${created}, Updated: ${updated}, Ignored (Unchanged): ${ignored}`,
		});

		setEnvFileContent('');
		setIsImportModalOpen(false);
	};

	const toggleSecretVisibility = (id: number) => {
		setVisibleSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
	};

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		toast({ title: 'Copied', description: 'Secret value copied to clipboard.' });
	};

	return (
		<div className="flex flex-col md:flex-row h-[calc(100vh-200px)] border rounded-lg overflow-hidden bg-background shadow-sm">
			{/* Sidebar: Environment List */}
			<div className="w-full md:w-64 border-b md:border-b-0 md:border-r bg-muted/10 flex flex-col max-h-[200px] md:max-h-none shrink-0">
				<div className="p-4 border-b">
					<h3 className="font-semibold mb-2 flex items-center gap-2">
						<Globe className="h-4 w-4" /> Environments
					</h3>

					<div className="flex gap-2">
						<Input
							placeholder="New Env Name"
							value={newEnvName}
							onChange={(e) => setNewEnvName(e.target.value)}
							className="h-8 text-xs"
						/>

						<Button
							size="sm"
							className="h-8 px-2 cursor-pointer"
							onClick={handleCreateEnv}
							disabled={createEnvMutation.isPending || !newEnvName}
						>
							<Plus className="h-4 w-4" />
						</Button>
					</div>
				</div>

				<ScrollArea className="flex-1">
					<div className="p-2 space-y-1">
						{isEnvLoading && <Skeleton className="h-8 w-full" />}

						{environments?.map((env) => (
							<div
								key={env.id}
								className={`group flex items-center justify-between px-3 py-2 text-sm rounded-md cursor-pointer transition-colors ${
									selectedEnvId === env.id
										? 'bg-primary/10 text-primary font-medium'
										: 'hover:bg-muted'
								}`}
								onClick={() => setSelectedEnvId(env.id)}
							>
								<span className="truncate">{env.name}</span>

								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
											onClick={(e) => e.stopPropagation()}
										>
											<Trash2 className="h-3 w-3 text-destructive" />
										</Button>
									</AlertDialogTrigger>

									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>Delete Environment?</AlertDialogTitle>
											<AlertDialogDescription>
												This will permanently delete{' '}
												<strong>{env.name}</strong> and all its secrets.
											</AlertDialogDescription>
										</AlertDialogHeader>

										<AlertDialogFooter>
											<AlertDialogCancel>Cancel</AlertDialogCancel>
											<AlertDialogAction
												className="bg-destructive"
												onClick={() => handleDeleteEnv(env.id)}
											>
												Delete
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</div>
						))}

						{!isEnvLoading && environments?.length === 0 && (
							<div className="text-xs text-center text-muted-foreground py-4">
								No environments created.
							</div>
						)}
					</div>
				</ScrollArea>
			</div>

			{/* Main Content */}
			<div className="flex-1 flex flex-col bg-card min-w-0">
				{selectedEnvId ? (
					<>
						<div className="p-4 md:p-6 border-b space-y-4">
							<div className="flex flex-wrap justify-between items-center gap-2">
								<div>
									<h2 className="text-lg font-bold flex items-center gap-2">
										<Lock className="h-4 w-4 text-primary" />
										Secrets for{' '}
										{environments?.find((e) => e.id === selectedEnvId)?.name}
									</h2>

									<p className="text-sm text-muted-foreground hidden sm:block">
										Manage API keys and environment variables.
									</p>
								</div>

								<div className="flex gap-2 w-full sm:w-auto">
									<Button
										variant="outline"
										onClick={() => setIsImportModalOpen(true)}
										className="cursor-pointer flex-1 sm:flex-none"
										size="sm"
									>
										<Upload className="h-4 w-4 mr-2" /> Import
									</Button>

									<Button
										onClick={() => {
											setSecretToEdit(undefined);
											setIsSecretModalOpen(true);
										}}
										className="cursor-pointer flex-1 sm:flex-none"
										size="sm"
									>
										<Plus className="h-4 w-4 mr-2" /> Add
									</Button>
								</div>
							</div>

							<div className="relative max-w-md">
								<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />

								<Input
									placeholder="Search secrets..."
									value={secretSearchTerm}
									onChange={(e) => setSecretSearchTerm(e.target.value)}
									className="pl-9 bg-background"
								/>
							</div>
						</div>

						<div className="flex-1 p-4 md:p-6 overflow-auto">
							{isSecretsLoading ? (
								<div className="space-y-2">
									<Skeleton className="h-10 w-full" />
									<Skeleton className="h-10 w-full" />
								</div>
							) : filteredSecrets && filteredSecrets.length > 0 ? (
								<div className="border rounded-md overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead className="min-w-[150px]">Key</TableHead>
												<TableHead className="min-w-[200px]">
													Value
												</TableHead>

												<TableHead className="min-w-[150px]">
													Description
												</TableHead>

												<TableHead className="text-right">
													Actions
												</TableHead>
											</TableRow>
										</TableHeader>

										<TableBody>
											{filteredSecrets.map((secret) => (
												<TableRow key={secret.id}>
													<TableCell className="font-mono font-medium">
														{secret.key}
													</TableCell>

													<TableCell className="font-mono text-xs">
														<div className="flex items-center gap-2">
															<span className="bg-muted px-2 py-1 rounded min-w-[100px] inline-block truncate max-w-[200px]">
																{visibleSecrets[secret.id]
																	? secret.value
																	: '•'.repeat(12)}
															</span>

															<Button
																variant="ghost"
																size="icon"
																className="h-6 w-6 cursor-pointer shrink-0"
																onClick={() =>
																	toggleSecretVisibility(
																		secret.id,
																	)
																}
															>
																{visibleSecrets[secret.id] ? (
																	<EyeOff className="h-3 w-3" />
																) : (
																	<Eye className="h-3 w-3" />
																)}
															</Button>

															<Button
																variant="ghost"
																size="icon"
																className="h-6 w-6 cursor-pointer shrink-0"
																onClick={() =>
																	copyToClipboard(secret.value)
																}
															>
																<Copy className="h-3 w-3" />
															</Button>
														</div>
													</TableCell>

													<TableCell
														className="text-muted-foreground max-w-[200px] truncate"
														title={secret.description || ''}
													>
														{secret.description || '-'}
													</TableCell>

													<TableCell className="text-right">
														<div className="flex justify-end gap-1">
															<Button
																variant="ghost"
																size="icon"
																className="h-8 w-8 cursor-pointer"
																onClick={() => {
																	setSecretToEdit(secret);
																	setIsSecretModalOpen(true);
																}}
															>
																<Edit className="h-4 w-4" />
															</Button>

															<AlertDialog>
																<AlertDialogTrigger asChild>
																	<Button
																		variant="ghost"
																		size="icon"
																		className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
																	>
																		<Trash2 className="h-4 w-4" />
																	</Button>
																</AlertDialogTrigger>

																<AlertDialogContent>
																	<AlertDialogHeader>
																		<AlertDialogTitle>
																			Delete Secret?
																		</AlertDialogTitle>

																		<AlertDialogDescription>
																			Delete{' '}
																			<strong>
																				{secret.key}
																			</strong>{' '}
																			permanently?
																		</AlertDialogDescription>
																	</AlertDialogHeader>

																	<AlertDialogFooter>
																		<AlertDialogCancel>
																			Cancel
																		</AlertDialogCancel>
																		<AlertDialogAction
																			className="bg-destructive cursor-pointer"
																			onClick={() =>
																				handleDeleteSecret(
																					secret.id,
																				)
																			}
																		>
																			Delete
																		</AlertDialogAction>
																	</AlertDialogFooter>
																</AlertDialogContent>
															</AlertDialog>
														</div>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							) : (
								<div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
									{secrets && secrets.length > 0 ? (
										<>
											<Search className="h-10 w-10 mb-4 opacity-20" />
											<p>No secrets match your search.</p>
										</>
									) : (
										<>
											<Lock className="h-10 w-10 mb-4 opacity-20" />
											<p>No secrets found in this environment.</p>
										</>
									)}
								</div>
							)}
						</div>
					</>
				) : (
					<div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
						<Globe className="h-12 w-12 mb-4 opacity-20" />
						<p>Select an environment from the menu to manage secrets.</p>
					</div>
				)}
			</div>

			{selectedEnvId && (
				<>
					<SecretFormDialog
						projectId={projectId}
						environmentId={selectedEnvId}
						isOpen={isSecretModalOpen}
						onClose={() => setIsSecretModalOpen(false)}
						secretToEdit={secretToEdit}
					/>

					<Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
						<DialogContent className="w-[95vw] md:max-w-lg rounded-lg">
							<DialogHeader>
								<DialogTitle>Import from .env</DialogTitle>

								<DialogDescription>
									Paste the contents of your .env file below. Comments (starting
									with #) will be ignored.
								</DialogDescription>
							</DialogHeader>

							<Textarea
								value={envFileContent}
								onChange={(e) => setEnvFileContent(e.target.value)}
								className="min-h-[300px] font-mono text-xs"
								placeholder="API_KEY=12345&#10;BASE_URL=https://api.example.com"
							/>

							<DialogFooter>
								<Button
									variant="outline"
									onClick={() => setIsImportModalOpen(false)}
									className="cursor-pointer"
								>
									Cancel
								</Button>

								<Button
									onClick={handleImportEnv}
									disabled={!envFileContent.trim()}
									className="cursor-pointer"
								>
									Import Secrets
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</>
			)}
		</div>
	);
};
