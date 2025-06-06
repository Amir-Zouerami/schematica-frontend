/* eslint-disable no-useless-escape */

import { useToast } from '@/hooks/use-toast';
import EndpointDetail from './EndpointDetail';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Copy, Link as LinkIcon } from 'lucide-react';
import { convertOpenApiToCurl } from '@/utils/openApiUtils';
import { useLocation, useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useMemo } from 'react';
import { resolveRef, isRefObject } from '@/utils/schemaUtils';
import { OpenAPISpec, OperationObject, ReferenceObject, PathItemObject } from '@/types/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useDeleteEndpoint } from '@/hooks/api/useEndpoints';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EndpointsListProps {
	openApiSpec: OpenAPISpec;
	projectId: string;
}

const EndpointsList: React.FC<EndpointsListProps> = ({ openApiSpec, projectId }) => {
	const { user } = useAuth();
	const { toast } = useToast();
	const location = useLocation();
	const navigate = useNavigate();

	const deleteEndpointMutation = useDeleteEndpoint();
	const [endpointToDelete, setEndpointToDelete] = useState<{ path: string; method: string } | null>(null);
	const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
	const [itemToScrollTo, setItemToScrollTo] = useState<string | null>(null);

	useEffect(() => {
		if (location.hash) {
			const elementIdFromHash = location.hash.substring(1);
			if (elementIdFromHash) {
				const allGeneratedIds = Object.values(groupedEndpoints)
					.flat()
					.map(ep => generateEndpointId(ep.method, ep.path, ep.originalIndex));

				if (allGeneratedIds.includes(elementIdFromHash)) {
					if (!openAccordionItems.includes(elementIdFromHash)) {
						setOpenAccordionItems(prev => {
							if (prev.includes(elementIdFromHash)) return prev;
							return [...prev, elementIdFromHash];
						});
					}

					setItemToScrollTo(elementIdFromHash);
				} else {
					setItemToScrollTo(null);
				}
			} else {
				setItemToScrollTo(null);
			}
		} else {
			setItemToScrollTo(null);
		}
	}, [location.hash, openApiSpec]);

	useEffect(() => {
		if (itemToScrollTo && openAccordionItems.includes(itemToScrollTo)) {
			const element = document.getElementById(itemToScrollTo);

			if (element) {
				const timer = setTimeout(() => {
					element.scrollIntoView({ behavior: 'smooth', block: 'start' });
					setItemToScrollTo(null);
				}, 200);

				return () => clearTimeout(timer);
			} else {
				const retryTimer = setTimeout(() => {
					const el = document.getElementById(itemToScrollTo);
					if (el) {
						el.scrollIntoView({ behavior: 'smooth', block: 'start' });
						setItemToScrollTo(null);
					}
				}, 400);

				return () => clearTimeout(retryTimer);
			}
		}
	}, [itemToScrollTo, openAccordionItems]);

	const methodColors: Record<string, string> = {
		get: 'bg-emerald-600 hover:bg-emerald-700',
		post: 'bg-orange-600 hover:bg-orange-700',
		put: 'bg-sky-600 hover:bg-sky-700',
		delete: 'bg-red-600 hover:bg-red-700',
		patch: 'bg-violet-600 hover:bg-violet-700',
		options: 'bg-cyan-600 hover:bg-cyan-700',
		head: 'bg-gray-600 hover:bg-gray-700',
	};

	const handleCopyCurl = (path: string, method: string, operationOrRef: OperationObject | ReferenceObject) => {
		try {
			if (!openApiSpec || !openApiSpec.servers || openApiSpec.servers.length === 0) {
				toast({ title: 'Configuration Error', description: 'No server URL defined.', variant: 'destructive' });
				return;
			}

			let operationToUse: OperationObject | null = null;
			if (isRefObject(operationOrRef)) {
				const resolved = resolveRef(operationOrRef.$ref, openApiSpec);
				operationToUse = resolved && !isRefObject(resolved) ? (resolved as OperationObject) : null;
			} else {
				operationToUse = operationOrRef as OperationObject;
			}

			if (!operationToUse) {
				toast({ title: 'Error', description: 'Operation data for CURL unavailable.', variant: 'destructive' });
				return;
			}

			const baseServerUrl = openApiSpec.servers[0].url;
			const curlCommand = convertOpenApiToCurl(baseServerUrl, path, method, operationToUse, openApiSpec);

			navigator.clipboard
				.writeText(curlCommand)
				.then(() => {
					toast({ title: 'Copied to clipboard', description: 'CURL command has been copied.' });
				})
				.catch(err => {
					toast({ title: 'Copy Failed', description: 'Could not copy to clipboard.', variant: 'destructive' });
				});
		} catch (error) {
			toast({ title: 'CURL Generation Failed', description: error instanceof Error ? error.message : 'Error.', variant: 'destructive' });
		}
	};

	const handleShareEndpoint = (endpointId: string) => {
		const url = `${window.location.origin}${location.pathname}#${endpointId}`;
		navigator.clipboard.writeText(url);
		toast({ title: 'URL Copied', description: 'Link to this endpoint copied.' });
	};

	const confirmDeleteEndpoint = (path: string, method: string) => {
		setEndpointToDelete({ path, method });
	};
	const cancelDelete = () => {
		setEndpointToDelete(null);
	};

	const handleDeleteEndpoint = async () => {
		if (!endpointToDelete) return;

		try {
			const { path, method } = endpointToDelete;
			await deleteEndpointMutation.mutateAsync({ projectId, path, method });

			toast({ title: 'Endpoint deleted', description: `${method.toUpperCase()} ${path} removed` });

			if (location.hash.includes(generateEndpointId(method, path, 0).split('--').slice(0, -1).join('--'))) {
				navigate(location.pathname, { replace: true });
			}
		} catch (error) {
			toast({ title: 'Delete failed', description: error instanceof Error ? error.message : 'Error.', variant: 'destructive' });
		} finally {
			setEndpointToDelete(null);
		}
	};

	const generateEndpointId = (method: string, path: string, index: number): string => {
		const sanitizedPath = path.replace(/[\/\s{}.@]/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
		return `ep--${method}--${sanitizedPath}--${index}`;
	};

	const handleAccordionValueChange = (newOpenValues: string[]) => {
		setOpenAccordionItems(newOpenValues);
	};

	const groupedEndpoints = useMemo(() => {
		const groups: Record<string, { path: string; method: string; operation: OperationObject | ReferenceObject; originalIndex: number }[]> = {};
		let globalIndex = 0;

		Object.entries(openApiSpec.paths || {}).forEach(([path, pathItemUntyped]) => {
			const pathItem = pathItemUntyped as PathItemObject;

			Object.entries(pathItem).forEach(([method, operationOrRef]) => {
				if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method.toLowerCase())) {
					let currentOperationForTag: OperationObject | null = null;

					if (isRefObject(operationOrRef)) {
						const resolved = resolveRef(operationOrRef.$ref, openApiSpec);
						if (resolved && !isRefObject(resolved)) currentOperationForTag = resolved as OperationObject;
					} else {
						currentOperationForTag = operationOrRef as OperationObject;
					}

					const tagName =
						currentOperationForTag?.tags && currentOperationForTag.tags.length > 0 ? currentOperationForTag.tags[0] : 'Default';

					if (!groups[tagName]) {
						groups[tagName] = [];
					}

					groups[tagName].push({ path, method: method.toLowerCase(), operation: operationOrRef, originalIndex: globalIndex++ });
				}
			});
		});

		const sortedTagNames = Object.keys(groups).sort((a, b) => {
			if (a === 'Default' && b !== 'Default') return 1;
			if (b === 'Default' && a !== 'Default') return -1;
			return a.localeCompare(b);
		});

		const orderedGroups: Record<
			string,
			Array<{ path: string; method: string; operation: OperationObject | ReferenceObject; originalIndex: number }>
		> = {};

		sortedTagNames.forEach(tagName => {
			orderedGroups[tagName] = groups[tagName];
		});

		return orderedGroups;
	}, [openApiSpec]);

	const allEndpointCount = Object.values(groupedEndpoints).reduce((acc, group) => acc + group.length, 0);

	if (allEndpointCount === 0) {
		return (
			<div className="text-center py-10">
				<p className="text-muted-foreground mb-4">No endpoints defined yet.</p>
				{user?.accessList?.write && <p>Use CURL converter to add.</p>}
			</div>
		);
	}

	return (
		<div>
			{Object.entries(groupedEndpoints).map(([tagName, endpointsInGroup], groupIdx) => (
				<div key={tagName} className={groupIdx === 0 ? 'mt-10' : 'mt-16'}>
					<h3 className="text-xl font-semibold text-gradient-pink-sunset mb-4 capitalize">
						{tagName.replace(/([A-Z])|@\d+/g, (match, p1) => (p1 ? ` ${p1}` : '')).trim() || 'General'}
					</h3>

					<Accordion type="multiple" className="space-y-4" value={openAccordionItems} onValueChange={handleAccordionValueChange}>
						{endpointsInGroup.map(({ path, method, operation: operationOrRef, originalIndex }) => {
							const endpointId = generateEndpointId(method, path, originalIndex);
							let displayOpSummary: string | undefined;
							let displayOpDeprecated: boolean | undefined;

							if (isRefObject(operationOrRef)) {
								const resolved = resolveRef(operationOrRef.$ref, openApiSpec);

								if (resolved && !isRefObject(resolved)) {
									displayOpSummary = (resolved as OperationObject).summary;
									displayOpDeprecated = (resolved as OperationObject).deprecated;
								}
							} else {
								displayOpSummary = (operationOrRef as OperationObject).summary;
								displayOpDeprecated = (operationOrRef as OperationObject).deprecated;
							}

							return (
								<AccordionItem
									key={endpointId}
									value={endpointId}
									id={endpointId}
									className="border border-border rounded-lg overflow-hidden"
								>
									<AccordionTrigger className="px-4 py-2 hover:bg-secondary/30 transition-colors data-[state=open]:border-b">
										<div className="flex items-center space-x-3 w-full text-left">
											<Badge
												className={`uppercase text-white font-bold w-[70px] text-center justify-center ${
													methodColors[method] || 'bg-gray-500 hover:bg-gray-600'
												}`}
											>
												{method}
											</Badge>

											<span className="font-mono font-semibold text-sm truncate flex-grow min-w-0">{path}</span>

											{displayOpSummary && (
												<span
													className="text-xs text-muted-foreground truncate hidden md:block ml-4 max-w-[300px] flex-shrink"
													style={{ unicodeBidi: 'plaintext' }}
												>
													{displayOpSummary}
												</span>
											)}

											{displayOpDeprecated && (
												<Badge variant="outline" className="ml-auto flex-shrink-0">
													Deprecated
												</Badge>
											)}
										</div>
									</AccordionTrigger>

									<AccordionContent className="px-0 !pb-0">
										<div className="border-t border-border">
											<EndpointDetail
												path={path}
												method={method}
												operation={operationOrRef}
												openApiSpec={openApiSpec}
												projectId={projectId}
												endpointId={endpointId}
											/>

											<div className="flex justify-end space-x-2 p-4 bg-secondary/20 border-t border-border">
												<Button variant="outline" size="sm" onClick={() => handleShareEndpoint(endpointId)}>
													<LinkIcon className="h-4 w-4 mr-1" /> Share Link
												</Button>

												<Button variant="outline" size="sm" onClick={() => handleCopyCurl(path, method, operationOrRef)}>
													<Copy className="h-4 w-4 mr-1" /> Copy CURL
												</Button>

												{user?.accessList?.delete && (
													<Button variant="destructive" size="sm" onClick={() => confirmDeleteEndpoint(path, method)}>
														Delete Endpoint
													</Button>
												)}
											</div>
										</div>
									</AccordionContent>
								</AccordionItem>
							);
						})}
					</Accordion>
				</div>
			))}

			<AlertDialog open={!!endpointToDelete} onOpenChange={cancelDelete}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you sure?</AlertDialogTitle>

						<AlertDialogDescription>
							This will permanently delete the endpoint
							{endpointToDelete && (
								<span className="font-mono font-bold">
									{' '}
									{endpointToDelete.method.toUpperCase()} {endpointToDelete.path}
								</span>
							)}
							. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<AlertDialogFooter>
						<AlertDialogCancel onClick={cancelDelete} disabled={deleteEndpointMutation.isPending}>
							Cancel
						</AlertDialogCancel>

						<AlertDialogAction
							onClick={handleDeleteEndpoint}
							disabled={deleteEndpointMutation.isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteEndpointMutation.isPending ? 'Deleting...' : 'Delete'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default EndpointsList;
