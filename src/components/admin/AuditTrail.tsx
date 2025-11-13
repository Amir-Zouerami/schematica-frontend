import { AuditLogFilters, useAuditLogs } from '@/hooks/api/useAuditLogs';
import type { components, operations } from '@/types/api-types';
import { ApiError } from '@/utils/api';
import { formatDate } from '@/utils/schemaUtils';
import { useEffect, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import SimpleCodeBlock from '../ui/SimpleCodeBlock';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type AuditLogDto = components['schemas']['AuditLogDto'];
type AuditAction = operations['AuditController_findAll_v2']['parameters']['query']['action'];

// Manually define the list of actions from the API documentation for the dropdown
const auditActions: AuditAction[] = [
	'PROJECT_CREATED',
	'PROJECT_UPDATED',
	'PROJECT_DELETED',
	'PROJECT_ACCESS_UPDATED',
	'PROJECT_SPEC_IMPORTED',
	'ENDPOINT_STATUS_UPDATED',
	'ENVIRONMENT_CREATED',
	'ENVIRONMENT_UPDATED',
	'ENVIRONMENT_DELETED',
	'SECRET_CREATED',
	'SECRET_UPDATED',
	'SECRET_DELETED',
	'SCHEMA_COMPONENT_CREATED',
	'SCHEMA_COMPONENT_UPDATED',
	'SCHEMA_COMPONENT_DELETED',
	'TEAM_CREATED',
	'TEAM_UPDATED',
	'TEAM_DELETED',
	'USER_CREATED',
	'USER_UPDATED',
	'USER_DELETED',
	'USER_PICTURE_UPDATED',
];

const AuditTrail = () => {
	const [filters, setFilters] = useState<AuditLogFilters>({});
	const [debouncedFilters, setDebouncedFilters] = useState<AuditLogFilters>({});

	const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useAuditLogs(debouncedFilters);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedFilters(filters);
		}, 500); // 500ms debounce delay

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

	const allLogs = data?.pages.flatMap((page) => page?.data ?? []) ?? [];

	return (
		<Card>
			<CardHeader>
				<CardTitle>System Audit Trail</CardTitle>
				<div className="flex items-center gap-2 pt-4">
					<Input
						placeholder="Filter by Actor ID..."
						value={filters.actorId || ''}
						onChange={(e) => handleFilterChange('actorId', e.target.value)}
						className="max-w-xs"
					/>
					<Input
						placeholder="Filter by Target ID..."
						value={filters.targetId || ''}
						onChange={(e) => handleFilterChange('targetId', e.target.value)}
						className="max-w-xs"
					/>
					<Select
						value={filters.action || ''}
						onValueChange={(value) => handleFilterChange('action', value)}
					>
						<SelectTrigger className="max-w-xs">
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
					<Button variant="outline" onClick={clearFilters}>
						Clear
					</Button>
				</div>
			</CardHeader>

			<CardContent>
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
										<Avatar className="h-8 w-8">
											<AvatarImage
												src={
													typeof log.actor?.profileImage === 'string'
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
										{log.actor?.username || 'System'}
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
												<PopoverContent className="w-96">
													<SimpleCodeBlock
														code={JSON.stringify(log.details, null, 2)}
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
