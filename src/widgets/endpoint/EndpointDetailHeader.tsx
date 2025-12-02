import { useProject } from '@/entities/Project/api/useProject';
import MarkdownRenderer from '@/features/endpoint/edit-endpoint/ui/MarkdownRenderer';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate } from '@/shared/lib/schemaUtils';
import { cn } from '@/shared/lib/utils';
import type { components } from '@/shared/types/api-types';
import type { OperationObject } from '@/shared/types/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { CircleDashed, Edit3, FileCheck, FileX, Lock, Megaphone } from 'lucide-react';
import React from 'react';

type EndpointDto = components['schemas']['EndpointDto'];
type EndpointStatus = components['schemas']['EndpointStatus'];

interface EndpointDetailHeaderProps {
	projectId: string;
	endpoint: EndpointDto;
	operation: OperationObject;
	onEnterEditMode: () => void;
	isAcquiringLock: boolean;
	isLockLoading: boolean;
	activeLock: { username: string } | null;
}

const STATUS_CONFIG: Record<
	EndpointStatus,
	{ label: string; color: string; icon: React.ElementType }
> = {
	DRAFT: { label: 'Draft', color: 'text-slate-500 border-slate-500/30', icon: CircleDashed },
	IN_REVIEW: {
		label: 'In Review',
		color: 'text-orange-500 border-orange-500/30',
		icon: FileCheck,
	},
	PUBLISHED: {
		label: 'Published',
		color: 'text-emerald-500 border-emerald-500/30',
		icon: Megaphone,
	},
	DEPRECATED: { label: 'Deprecated', color: 'text-red-500 border-red-500/30', icon: FileX },
};

export const EndpointDetailHeader: React.FC<EndpointDetailHeaderProps> = ({
	projectId,
	endpoint,
	operation,
	onEnterEditMode,
	isAcquiringLock,
	isLockLoading,
	activeLock,
}) => {
	const { user, isProjectOwner } = usePermissions();
	const { data: project } = useProject(projectId);

	const createdBy = endpoint.creator.username || 'Unknown';
	const createdAt = formatDate(endpoint.createdAt);
	const lastEditedBy = endpoint.updatedBy.username;
	const lastEditedAt = formatDate(endpoint.updatedAt);

	const isLockedByOtherUser = activeLock && activeLock.username !== user?.username;
	const currentStatus = STATUS_CONFIG[endpoint.status] || STATUS_CONFIG.DRAFT;
	const StatusIcon = currentStatus.icon;

	return (
		<div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4 mt-3">
			<div className="flex-1 min-w-0 w-full">
				<div className="flex items-center gap-4">
					<h3 className="text-lg font-semibold truncate">
						{operation.summary || `${endpoint.method.toUpperCase()} ${endpoint.path}`}
					</h3>

					<Badge
						variant="outline"
						className={cn(
							'px-2 py-0.5 flex items-center gap-1.5 font-normal bg-background shrink-0',
							currentStatus.color,
						)}
					>
						<StatusIcon className="h-3.5 w-3.5" />
						{currentStatus.label}
					</Badge>
				</div>

				{operation.description && (
					<div className="mt-2 max-w-[900px]">
						<MarkdownRenderer content={operation.description} />
					</div>
				)}
			</div>

			<div className="flex flex-col w-full md:w-auto justify-center items-start space-y-2 sm:space-y-3 shrink-0">
				<div className="flex items-center space-x-2 text-sm text-muted-foreground">
					<Avatar
						className={cn(
							'h-6 w-6',
							endpoint.creator.isDeleted && 'grayscale opacity-50',
						)}
					>
						<AvatarImage
							src={
								typeof endpoint.creator.profileImage === 'string'
									? endpoint.creator.profileImage
									: undefined
							}
							alt={createdBy}
						/>
						<AvatarFallback>{createdBy.substring(0, 2).toUpperCase()}</AvatarFallback>
					</Avatar>

					<span className="text-xs">
						Added by{' '}
						<span
							className={cn(
								endpoint.creator.isDeleted &&
									'line-through decoration-muted-foreground/50',
							)}
						>
							{createdBy}
						</span>{' '}
						on {createdAt}
					</span>
				</div>

				{lastEditedBy && lastEditedAt && (
					<div className="flex items-center space-x-2 text-sm text-muted-foreground">
						<Avatar
							className={cn(
								'h-6 w-6',
								endpoint.updatedBy.isDeleted && 'grayscale opacity-50',
							)}
						>
							<AvatarImage
								src={
									typeof endpoint.updatedBy.profileImage === 'string'
										? endpoint.updatedBy.profileImage
										: undefined
								}
								alt={lastEditedBy}
							/>
							<AvatarFallback>
								{lastEditedBy.substring(0, 2).toUpperCase()}
							</AvatarFallback>
						</Avatar>

						<span className="text-xs">
							Last edited by{' '}
							<span
								className={cn(
									endpoint.updatedBy.isDeleted &&
										'line-through decoration-muted-foreground/50',
								)}
							>
								{lastEditedBy}
							</span>{' '}
							on {lastEditedAt}
						</span>
					</div>
				)}

				{isProjectOwner(project) && (
					<div className="w-full pt-2">
						{isLockedByOtherUser && (
							<Badge
								variant="secondary"
								className="mb-2 w-full justify-center text-xs py-1"
							>
								<Lock className="h-3 w-3 mr-1.5" />
								Locked by {activeLock.username}
							</Badge>
						)}

						<Button
							variant="outline"
							size="sm"
							onClick={onEnterEditMode}
							className="w-full cursor-pointer"
							disabled={isLockLoading || isLockedByOtherUser || isAcquiringLock}
						>
							{isAcquiringLock ? (
								'Locking...'
							) : (
								<>
									<Edit3 className="h-4 w-4 mr-2" /> Edit Endpoint
								</>
							)}
						</Button>
					</div>
				)}
			</div>
		</div>
	);
};
