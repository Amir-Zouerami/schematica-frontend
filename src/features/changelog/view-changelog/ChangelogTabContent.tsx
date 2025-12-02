import { useChangelog } from '@/entities/Changelog/api/useChangelog';
import { ApiError } from '@/shared/api/api';
import { formatDate } from '@/shared/lib/schemaUtils';
import { getStorageUrl } from '@/shared/lib/storage';
import { cn } from '@/shared/lib/utils';
import type { components } from '@/shared/types/api-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import React from 'react';

type ChangelogDto = components['schemas']['ChangelogDto'];

interface ChangelogTabContentProps {
	projectId: string;
}

const ChangelogEntry: React.FC<{ entry: ChangelogDto }> = ({ entry }) => {
	const actorUsername = entry.actor?.username || 'System';

	return (
		<div className="flex items-start space-x-4 py-4">
			<Avatar className={cn('h-8 w-8', entry.actor?.isDeleted && 'grayscale opacity-50')}>
				<AvatarImage src={getStorageUrl(entry.actor?.profileImage)} alt={actorUsername} />

				<AvatarFallback>{actorUsername.substring(0, 2).toUpperCase()}</AvatarFallback>
			</Avatar>

			<div className="flex-1">
				<p className="text-sm text-foreground" style={{ unicodeBidi: 'plaintext' }}>
					<span
						className={cn(
							'font-semibold mr-1',
							entry.actor?.isDeleted &&
								'text-muted-foreground line-through decoration-muted-foreground/50',
						)}
					>
						{actorUsername}
					</span>
					{entry.message.replace(actorUsername, '').trim()}
				</p>

				<p className="text-xs text-muted-foreground mt-1">{formatDate(entry.createdAt)}</p>
			</div>
		</div>
	);
};

const ChangelogTabContent: React.FC<ChangelogTabContentProps> = ({ projectId }) => {
	const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useChangelog(projectId);

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-16 w-full" />
				<Skeleton className="h-16 w-full" />
				<Skeleton className="h-16 w-full" />
			</div>
		);
	}

	if (error) {
		return (
			<p className="text-destructive text-center py-8">
				Failed to load changelog:{' '}
				{error instanceof ApiError ? error.message : error.message}
			</p>
		);
	}

	const allChangelogEntries = data?.pages.flatMap((page) => page?.data ?? []) ?? [];

	if (allChangelogEntries.length === 0) {
		return (
			<p className="text-muted-foreground text-center py-8">
				No changelog entries found for this project.
			</p>
		);
	}

	return (
		<div>
			<div className="divide-y">
				{allChangelogEntries.map((entry) => (
					<ChangelogEntry key={entry.id} entry={entry} />
				))}
			</div>

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

export default ChangelogTabContent;
