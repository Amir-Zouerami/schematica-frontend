import { deeplyResolveReferences } from '@/shared/lib/schemaUtils';
import type { components } from '@/shared/types/api-types';
import { OpenAPISpec, OperationObject } from '@/shared/types/types';
import React, { useMemo, useState } from 'react';

import EndpointForm from '@/features/endpoint/edit-endpoint/EndpointForm';
import { useEndpointEditSession } from '@/features/endpoint/edit-endpoint/hooks/useEndpointEditSession';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';

import LockConflictModal from '@/components/general/LockConflictModal';
import { useEndpointLockSocket } from '@/hooks/useEndpointLockSocket';
import { Badge } from '@/shared/ui/badge';
import { EndpointDetailFooter } from '@/widgets/endpoint/EndpointDetailFooter';
import { EndpointDetailHeader } from '@/widgets/endpoint/EndpointDetailHeader';
import { EndpointDetailTabs } from '@/widgets/endpoint/EndpointDetailTabs';

type EndpointDto = components['schemas']['EndpointDto'];

interface EndpointDetailProps {
	endpoint: EndpointDto;
	openApiSpec: OpenAPISpec;
	projectId: string;
}

const EndpointDetail: React.FC<EndpointDetailProps> = ({ endpoint, openApiSpec, projectId }) => {
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [lockConflictDetails, setLockConflictDetails] = useState<{
		username: string;
		expiresAt: string;
	} | null>(null);

	const { activeLock, isLoading: isLockLoading } = useEndpointLockSocket(endpoint.id);

	const { beginEditSession, endEditSession, isAcquiringLock } = useEndpointEditSession({
		projectId,
		endpointId: endpoint.id,
		isEditing: isEditDialogOpen,
		onEditSessionEnd: () => setIsEditDialogOpen(false),
		onLockConflict: (details) => setLockConflictDetails(details),
	});

	const operation = useMemo(() => {
		return deeplyResolveReferences<OperationObject>(
			endpoint.operation as unknown as OperationObject,
			openApiSpec,
		);
	}, [endpoint.operation, openApiSpec]);

	const handleEnterEditMode = async () => {
		const lockAcquired = await beginEditSession();
		if (lockAcquired) {
			setIsEditDialogOpen(true);
		}
	};

	return (
		<div className="px-4 py-2" id={endpoint.id}>
			<EndpointDetailHeader
				projectId={projectId}
				endpoint={endpoint}
				operation={operation}
				onEnterEditMode={handleEnterEditMode}
				isAcquiringLock={isAcquiringLock}
				isLockLoading={isLockLoading}
				activeLock={activeLock}
			/>

			<EndpointDetailTabs
				projectId={projectId}
				endpointId={endpoint.id}
				operation={operation}
				openApiSpec={openApiSpec}
			/>

			<EndpointDetailFooter
				projectId={projectId}
				endpointId={endpoint.id}
				endpointPath={endpoint.path}
				endpointMethod={endpoint.method}
				operation={operation}
				openApiSpec={openApiSpec}
			/>

			<Dialog
				open={isEditDialogOpen}
				onOpenChange={(open) => {
					if (!open) endEditSession();
				}}
			>
				<DialogContent className="w-screen h-dvh max-w-none rounded-none sm:rounded-lg sm:max-w-[95vw] sm:w-[70vw] sm:h-[95vh] p-0 flex flex-col gap-0 bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl overflow-hidden">
					<DialogHeader className="px-6 py-4 border-b border-border/40 shrink-0 bg-background/50">
						<DialogTitle className="flex items-center gap-3 min-w-0 pr-8">
							<span className="text-lg font-semibold text-muted-foreground whitespace-nowrap shrink-0">
								Editing
							</span>

							<div className="flex items-center gap-2 min-w-0 overflow-hidden">
								<Badge
									variant="outline"
									className="text-base font-bold uppercase tracking-wider px-2 py-0.5 shrink-0"
								>
									{endpoint.method}
								</Badge>

								<span
									className="text-xl font-mono text-foreground tracking-tight truncate"
									title={endpoint.path}
								>
									{endpoint.path}
								</span>
							</div>
						</DialogTitle>
					</DialogHeader>

					<div className="flex-1 overflow-hidden relative">
						<EndpointForm
							projectId={projectId}
							endpoint={endpoint}
							onClose={endEditSession}
							openApiSpec={openApiSpec}
						/>
					</div>
				</DialogContent>
			</Dialog>

			<LockConflictModal
				isOpen={!!lockConflictDetails}
				onClose={() => setLockConflictDetails(null)}
				lockDetails={lockConflictDetails}
			/>
		</div>
	);
};

export default EndpointDetail;
