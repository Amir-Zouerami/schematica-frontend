import { useEndpoints } from '@/entities/Endpoint/api/useEndpoints';
import { useProject } from '@/entities/Project/api/useProject';
import { usePermissions } from '@/hooks/usePermissions';
import { ApiError } from '@/shared/api/api';
import { OpenAPISpec } from '@/shared/types/types';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/shared/ui/accordion';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import EndpointDetailLoader from './EndpointDetailLoader';

interface EndpointsListProps {
	openApiSpec: OpenAPISpec;
	projectId: string;
	endpointId?: string;
}

const EndpointsList: React.FC<EndpointsListProps> = ({ openApiSpec, projectId, endpointId }) => {
	const { isProjectOwner } = usePermissions();
	const { data: project } = useProject(projectId);
	const location = useLocation();
	const navigate = useNavigate();

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

	const openAndScrollToEndpoint = (endpointClientSideId: string) => {
		if (!openAccordionItems.includes(endpointClientSideId)) {
			setOpenAccordionItems((prev) => [...prev, endpointClientSideId]);
		}

		setItemToScrollTo(endpointClientSideId);

		if (location.hash) {
			navigate(location.pathname, { replace: true });
		}
	};

	useEffect(() => {
		if (allEndpoints.length > 0) {
			let targetEndpoint;

			if (endpointId) {
				targetEndpoint = allEndpoints.find((ep) => ep.id === endpointId);
			} else if (location.hash) {
				const elementIdFromHash = location.hash.substring(1);
				targetEndpoint = allEndpoints.find((ep) => ep.id === elementIdFromHash);
			}

			if (targetEndpoint) {
				openAndScrollToEndpoint(targetEndpoint.id);
			}
		}
	}, [endpointId, location.hash, allEndpoints, navigate]);

	useEffect(() => {
		if (itemToScrollTo && openAccordionItems.includes(itemToScrollTo)) {
			const element = document.getElementById(itemToScrollTo);
			if (element) {
				// Increased timeout to 300ms to allow Accordion animation (200ms) to finish
				setTimeout(() => {
					element.scrollIntoView({ behavior: 'smooth', block: 'center' });
					setItemToScrollTo(null);
				}, 300);
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
						{endpointsInGroup.map((endpoint) => (
							<AccordionItem
								key={endpoint.id}
								value={endpoint.id}
								id={endpoint.id}
								className="border border-border rounded-lg overflow-hidden"
							>
								<AccordionTrigger className="px-4 py-2 hover:bg-secondary/30 transition-colors cursor-pointer data-[state=open]:border-b">
									<div className="flex flex-col items-start gap-2 w-full text-left md:flex-row md:items-center md:gap-4">
										<Badge
											className={`uppercase text-white font-bold w-[70px] text-center justify-center shrink-0 ${
												methodColors[endpoint.method] || 'bg-gray-500'
											}`}
										>
											{endpoint.method}
										</Badge>

										<div className="grow min-w-0 flex flex-col md:flex-row md:items-center gap-1 md:gap-4 w-full md:w-auto">
											<span className="font-mono font-semibold text-sm truncate">
												{endpoint.path}
											</span>

											{endpoint.summary && (
												<span
													className="text-xs text-muted-foreground truncate max-w-[300px]"
													style={{ unicodeBidi: 'plaintext' }}
												>
													{endpoint.summary}
												</span>
											)}
										</div>

										{endpoint.status === 'DEPRECATED' && (
											<Badge variant="outline" className="ml-auto shrink-0">
												Deprecated
											</Badge>
										)}
									</div>
								</AccordionTrigger>

								<AccordionContent className="p-0">
									<EndpointDetailLoader
										projectId={projectId}
										endpointId={endpoint.id}
										openApiSpec={openApiSpec}
									/>
								</AccordionContent>
							</AccordionItem>
						))}
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
