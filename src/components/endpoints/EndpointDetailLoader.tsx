import { useEndpoint } from '@/hooks/api/useEndpoints';
import { Skeleton } from '@/components/ui/skeleton';
import EndpointDetail from './EndpointDetail';
import { OpenAPISpec } from '@/types/types';

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
				<Skeleton className="h-6 w-3/4" />
				<Skeleton className="h-4 w-1/2" />
				<div className="pt-4">
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
