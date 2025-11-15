import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty';
import { PackageX } from 'lucide-react';

function EmptyEndpointMessage({ type }: { type: string }) {
	return (
		<div className="py-4">
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
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
