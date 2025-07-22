import React, { useState } from 'react';
import { OpenAPISpec } from '@/types/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Textarea } from '@/components/ui/textarea';
import { parseCurlToOpenApi } from '@/utils/openApiUtils';
import { useCreateEndpoint } from '@/hooks/api/useEndpoints';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface CurlConverterProps {
	projectId: string;
	openApiSpec: OpenAPISpec;
}

const CurlConverter: React.FC<CurlConverterProps> = ({ projectId, openApiSpec }) => {
	const { user } = useAuth();
	const { toast } = useToast();
	const [curlCommand, setCurlCommand] = useState('');
	const createEndpointMutation = useCreateEndpoint();

	const handleSubmit = async () => {
		if (!curlCommand.trim()) {
			toast({
				title: 'Validation Error',
				description: 'Please enter a CURL command',
				variant: 'destructive',
			});
			return;
		}

		try {
			const parsedEndpoint = await parseCurlToOpenApi(curlCommand, user?.username || 'unknown');

			if (!parsedEndpoint) {
				throw new Error('Failed to parse CURL command');
			}

			const isDuplicate = checkForDuplicateEndpoint(parsedEndpoint.path, parsedEndpoint.method);
			if (isDuplicate) {
				throw new Error(`Endpoint ${parsedEndpoint.method.toUpperCase()} ${parsedEndpoint.path} already exists`);
			}

			await createEndpointMutation.mutateAsync({ projectId, endpointData: parsedEndpoint });

			toast({
				title: 'Endpoint Added',
				description: `${parsedEndpoint.method.toUpperCase()} ${parsedEndpoint.path} has been added to the project`,
			});

			setCurlCommand('');
		}
		catch (error) {
			toast({
				title: 'Conversion Error',
				description: error instanceof Error ? error.message : 'Failed to convert CURL to OpenAPI',
				variant: 'destructive',
			});
		}
	};

	const checkForDuplicateEndpoint = (path: string, method: string): boolean => {
		if (!openApiSpec || !openApiSpec.paths) {
			return false;
		}

		const normalizedPath = path.startsWith('/') ? path : `/${path}`;

		const pathItem = openApiSpec.paths[normalizedPath] || openApiSpec.paths[path];

		if (!pathItem) {
			return false;
		}

		return !!pathItem[method.toLowerCase()];
	};

	return (
		<Card className="glass-card">
			<CardHeader>
				<CardTitle className="text-gradient-tropical text-xl">Add Endpoint from CURL</CardTitle>
				<CardDescription>Paste a CURL command to add a new endpoint to your API documentation</CardDescription>
			</CardHeader>
			<CardContent>
				<Textarea
					value={curlCommand}
					onChange={e => setCurlCommand(e.target.value)}
					placeholder="curl -X GET 'https://api.example.com/users' -H 'Authorization: Bearer token'"
					className="font-mono min-h-[120px]"
				/>
			</CardContent>
			<CardFooter>
				<Button onClick={handleSubmit} disabled={createEndpointMutation.isPending || !curlCommand.trim()} className="w-full">
					{createEndpointMutation.isPending ? 'Converting...' : 'Convert & Add Endpoint'}
				</Button>
			</CardFooter>
		</Card>
	);
};

export default CurlConverter;
