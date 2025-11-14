import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useEndpoints } from '@/hooks/api/useEndpoints';
import { useProject } from '@/hooks/api/useProject';
import { usePermissions } from '@/hooks/usePermissions';
import { OpenAPISpec } from '@/types/types';
import { ApiError } from '@/utils/api';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import EndpointDetailLoader from './EndpointDetailLoader';

interface EndpointsListProps {
	openApiSpec: OpenAPISpec;
	projectId: string;
}

const EndpointsList: React.FC<EndpointsListProps> = ({ openApiSpec, projectId }) => {
	const { isProjectOwner } = usePermissions();
	const { data: project } = useProject(projectId);
	const location = useLocation();

	const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useEndpoints(projectId);

	const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
	const [itemToScrollTo, setItemToScrollTo] = useState<string | null>(null);

	const allEndpoints = useMemo(
		() => data?.pages.flatMap((page) => page?.data ?? []) ?? [],
		[data],
	);

	const groupedEndpoints = useMemo(() => {
		if (!allEndpoints) return {};
		const groups: Record<string, typeof allEndpoints> = {};
		allEndpoints.forEach((endpoint) => {
			const tagName = endpoint.tags?.[0] || 'Default';
			if (!groups[tagName]) groups[tagName] = [];
			groups[tagName].push(endpoint);
		});
		const sortedTagNames = Object.keys(groups).sort((a, b) => {
			if (a === 'Default') return 1;
			if (b === 'Default') return -1;
			return a.localeCompare(b);
		});
		const orderedGroups: Record<string, typeof allEndpoints> = {};
		sortedTagNames.forEach((tagName) => {
			orderedGroups[tagName] = groups[tagName];
		});
		return orderedGroups;
	}, [allEndpoints]);

	const generateClientSideId = (method: string, path: string): string => {
		const methodPart = method.toLowerCase();
		const pathPart = path
			.replace(/^\//, '')
			.replace(/[\/{}]/g, '-')
			.replace(/[^a-zA-Z0-9-]/g, '');
		return `${methodPart}-${pathPart}`;
	};

	useEffect(() => {
		if (location.hash && allEndpoints) {
			const elementIdFromHash = location.hash.substring(1);
			const endpointMatch = allEndpoints.find(
				(ep) => generateClientSideId(ep.method, ep.path) === elementIdFromHash,
			);
			if (endpointMatch) {
				const clientSideId = generateClientSideId(endpointMatch.method, endpointMatch.path);
				if (!openAccordionItems.includes(clientSideId)) {
					setOpenAccordionItems((prev) => [...prev, clientSideId]);
				}
				setItemToScrollTo(clientSideId);
			}
		}
	}, [location.hash, allEndpoints]);

	useEffect(() => {
		if (itemToScrollTo && openAccordionItems.includes(itemToScrollTo)) {
			const element = document.getElementById(itemToScrollTo);
			if (element) {
				setTimeout(() => {
					element.scrollIntoView({ behavior: 'smooth', block: 'start' });
					setItemToScrollTo(null);
				}, 200);
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

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
			</div>
		);
	}

	if (error) {
		return (
			<p className="text-destructive text-center py-8">
				Failed to load endpoints:{' '}
				{error instanceof ApiError ? error.message : error.message}
			</p>
		);
	}

	if (allEndpoints.length === 0) {
		return (
			<div className="text-center py-10">
				<p className="text-muted-foreground mb-4">No endpoints defined yet.</p>
				{isProjectOwner(project) && (
					<p>Use the CURL converter above to add your first endpoint.</p>
				)}
			</div>
		);
	}

	return (
		<div>
			{Object.entries(groupedEndpoints).map(([tagName, endpointsInGroup], groupIdx) => (
				<div key={tagName} className={groupIdx === 0 ? 'mt-10' : 'mt-16'}>
					<h3 className="text-xl font-semibold text-gradient-pink-sunset mb-4 capitalize">
						{tagName}
					</h3>

					<Accordion
						type="multiple"
						className="space-y-4"
						value={openAccordionItems}
						onValueChange={setOpenAccordionItems}
					>
						{endpointsInGroup.map((endpoint) => {
							const clientSideId = generateClientSideId(
								endpoint.method,
								endpoint.path,
							);
							return (
								<AccordionItem
									key={endpoint.id}
									value={clientSideId}
									id={clientSideId}
									className="border border-border rounded-lg overflow-hidden"
								>
									<AccordionTrigger className="px-4 py-2 hover:bg-secondary/30 transition-colors data-[state=open]:border-b">
										<div className="flex items-center space-x-3 w-full text-left">
											<Badge
												className={`uppercase text-white font-bold w-[70px] text-center justify-center ${
													methodColors[endpoint.method] || 'bg-gray-500'
												}`}
											>
												{endpoint.method}
											</Badge>
											<span className="font-mono font-semibold text-sm truncate flex-grow min-w-0">
												{endpoint.path}
											</span>
											{endpoint.summary && (
												<span
													className="text-xs text-muted-foreground truncate hidden md:block ml-4 max-w-[300px] flex-shrink"
													style={{ unicodeBidi: 'plaintext' }}
												>
													{endpoint.summary}
												</span>
											)}
											{endpoint.status === 'DEPRECATED' && (
												<Badge
													variant="outline"
													className="ml-auto flex-shrink-0"
												>
													Deprecated
												</Badge>
											)}
										</div>
									</AccordionTrigger>
									<AccordionContent className="p-0">
										<div className="pt-4">
											<div className="border-t border-border">
												<EndpointDetailLoader
													projectId={projectId}
													endpointId={endpoint.id}
													openApiSpec={openApiSpec}
												/>
											</div>
										</div>
									</AccordionContent>
								</AccordionItem>
							);
						})}
					</Accordion>
				</div>
			))}
			{hasNextPage && (
				<div className="mt-6 flex justify-center">
					<Button
						onClick={() => fetchNextPage()}
						disabled={isFetchingNextPage}
						variant="outline"
					>
						{isFetchingNextPage ? 'Loading more...' : 'Load More'}
					</Button>
				</div>
			)}
		</div>
	);
};

export default EndpointsList;
