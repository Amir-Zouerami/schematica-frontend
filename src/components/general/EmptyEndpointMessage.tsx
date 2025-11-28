import { cn } from '@/shared/lib/utils';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/shared/ui/empty';
import { PackageX } from 'lucide-react';

interface EmptyEndpointMessageProps {
	type: string;
	className?: string;
}

function EmptyEndpointMessage({ type, className }: EmptyEndpointMessageProps) {
	return (
		<div className={cn('flex h-full items-center justify-center', className)}>
			<Empty className="border-none shadow-none p-0 md:p-0 min-h-0 flex-none bg-transparent">
				<EmptyHeader>
					<EmptyMedia variant="icon" className="mx-auto">
						<PackageX />
					</EmptyMedia>

					<EmptyTitle>No {type} Defined</EmptyTitle>

					<EmptyDescription>
						Edit this endpoint to add {type.toLowerCase()}.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		</div>
	);
}

export default EmptyEndpointMessage;
