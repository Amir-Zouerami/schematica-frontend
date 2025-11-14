import { useEndpoint } from '@/hooks/api/useEndpoints';
import { Skeleton } from '@/components/ui/skeleton';
import EndpointDetail from './EndpointDetail';
import { OpenAPISpec } from '@/types/types';
import { useEffect } from 'react';

interface EndpointDetailLoaderProps {
	projectId: string;
	endpointId: string;
	openApiSpec: OpenAPISpec;
}

const EndpointDetailLoader: React.FC<EndpointDetailLoaderProps> = ({
	projectId,
	endpointId,
	openApiSpec,
}) => {
	const { data: endpoint, isLoading, error } = useEndpoint(projectId, endpointId);

	if (isLoading) {
		return (
			<div className="p-4 space-y-4">
				<div className="flex justify-between items-start">
					<div className="space-y-2">
						<Skeleton className="h-6 w-72" />
						<Skeleton className="h-4 w-48" />
					</div>
					<div className="space-y-2 flex flex-col items-end">
						<Skeleton className="h-5 w-40" />
						<Skeleton className="h-5 w-44" />
					</div>
				</div>
				<div className="pt-4">
					<Skeleton className="h-10 w-full" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-8 w-full" />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4 text-center text-destructive bg-destructive/10">
				Error loading endpoint details: {error.message}
			</div>
		);
	}

	if (!endpoint) {
		return (
			<div className="p-4 text-center text-muted-foreground">
				Could not find details for this endpoint.
			</div>
		);
	}

	return <EndpointDetail endpoint={endpoint} openApiSpec={openApiSpec} projectId={projectId} />;
};

export default EndpointDetailLoader;
