import { AuditLogFilters, useAuditLogs } from '@/entities/AuditLog/api/useAuditLogs';
import { auditActions } from '@/entities/AuditLog/data/auditActions';
import { ApiError } from '@/shared/api/api';
import { formatDate } from '@/shared/lib/schemaUtils';
import { cn } from '@/shared/lib/utils';
import type { components } from '@/shared/types/api-types';
import { ScrollArea, ScrollBar } from '@/shared/ui/scroll-area';
import { useEffect, useState } from 'react';

import SimpleCodeBlock from '@/shared/ui/SimpleCodeBlock';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

type AuditLogDto = components['schemas']['AuditLogDto'];

const AuditTrail = () => {
	const [filters, setFilters] = useState<AuditLogFilters>({});
	const [debouncedFilters, setDebouncedFilters] = useState<AuditLogFilters>({});

	const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useAuditLogs(debouncedFilters);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedFilters(filters);
		}, 500);

		return () => {
			clearTimeout(handler);
		};
	}, [filters]);

	const handleFilterChange = (key: keyof AuditLogFilters, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value || undefined }));
	};

	const clearFilters = () => {
		setFilters({});
	};

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Audit Trail</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-destructive">
						Failed to load audit logs:{' '}
						{error instanceof ApiError ? error.message : error.message}
					</p>
				</CardContent>
			</Card>
		);
	}

	const allLogs: AuditLogDto[] = data?.pages.flatMap((page) => page?.data ?? []) ?? [];

	return (
		<Card>
			<CardHeader>
				<CardTitle>System Audit Trail</CardTitle>
				<div className="flex flex-wrap items-center gap-2 pt-4">
					<Input
						placeholder="Filter by Actor ID..."
						value={filters.actorId || ''}
						onChange={(e) => handleFilterChange('actorId', e.target.value)}
						className="max-w-xs w-full md:w-auto"
					/>

					<Input
						placeholder="Filter by Target ID..."
						value={filters.targetId || ''}
						onChange={(e) => handleFilterChange('targetId', e.target.value)}
						className="max-w-xs w-full md:w-auto"
					/>

					<Select
						value={filters.action || ''}
						onValueChange={(value) => handleFilterChange('action', value)}
					>
						<SelectTrigger className="max-w-xs w-full md:w-auto">
							<SelectValue placeholder="Filter by Action..." />
						</SelectTrigger>

						<SelectContent>
							{auditActions.map((action) => (
								<SelectItem key={action} value={action}>
									{action}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Button variant="outline" onClick={clearFilters} className="w-full md:w-auto">
						Clear
					</Button>
				</div>
			</CardHeader>

			<CardContent>
				<ScrollArea className="w-full whitespace-nowrap rounded-md border">
					<div className="min-w-[800px]">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Actor</TableHead>
									<TableHead>Action</TableHead>
									<TableHead>Target ID</TableHead>
									<TableHead>Details</TableHead>
									<TableHead>Timestamp</TableHead>
								</TableRow>
							</TableHeader>

							<TableBody>
								{isLoading ? (
									Array.from({ length: 10 }).map((_, i) => (
										<TableRow key={i}>
											<TableCell colSpan={5}>
												<Skeleton className="h-8 w-full" />
											</TableCell>
										</TableRow>
									))
								) : allLogs.length === 0 ? (
									<TableRow>
										<TableCell colSpan={5} className="text-center">
											No audit logs found.
										</TableCell>
									</TableRow>
								) : (
									allLogs.map((log) => (
										<TableRow key={log.id}>
											<TableCell className="font-medium flex items-center gap-2">
												<Avatar
													className={cn(
														'h-8 w-8',
														log.actor?.isDeleted &&
															'grayscale opacity-50',
													)}
												>
													<AvatarImage
														src={
															typeof log.actor?.profileImage ===
															'string'
																? log.actor.profileImage
																: undefined
														}
														alt={log.actor?.username}
													/>

													<AvatarFallback>
														{log.actor?.username
															.substring(0, 2)
															.toUpperCase() || 'SYS'}
													</AvatarFallback>
												</Avatar>
												<span
													className={cn(
														log.actor?.isDeleted &&
															'text-muted-foreground line-through decoration-muted-foreground/50',
													)}
												>
													{log.actor?.username || 'System'}
												</span>
											</TableCell>

											<TableCell>
												<Badge variant="secondary">{log.action}</Badge>
											</TableCell>

											<TableCell className="font-mono text-xs">
												{log.targetId}
											</TableCell>

											<TableCell>
												{log.details && (
													<Popover>
														<PopoverTrigger asChild>
															<Button variant="outline" size="sm">
																View JSON
															</Button>
														</PopoverTrigger>

														<PopoverContent className="w-80 md:w-96">
															<SimpleCodeBlock
																code={JSON.stringify(
																	log.details,
																	null,
																	2,
																)}
																language="json"
															/>
														</PopoverContent>
													</Popover>
												)}
											</TableCell>

											<TableCell className="text-muted-foreground text-xs">
												{formatDate(log.createdAt)}
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>

					<ScrollBar orientation="horizontal" />
				</ScrollArea>

				{hasNextPage && (
					<div className="mt-6 flex justify-center">
						<Button
							onClick={() => fetchNextPage()}
							disabled={isFetchingNextPage}
							variant="outline"
						>
							{isFetchingNextPage ? 'Loading...' : 'Load More'}
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
};

export default AuditTrail;
