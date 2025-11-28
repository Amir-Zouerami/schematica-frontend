import { useCreateEndpoint } from '@/entities/Endpoint/api/useEndpoints';
import { useMe } from '@/entities/User/api/useMe';
import { useToast } from '@/hooks/use-toast';
import { parseCurlToOpenApi } from '@/shared/lib/openApiUtils';
import { OpenAPISpec } from '@/shared/types/types';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/shared/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/shared/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/shared/ui/form';
import { Textarea } from '@/shared/ui/textarea';

interface CurlConverterProps {
	projectId: string;
	openApiSpec: OpenAPISpec;
}

const curlFormSchema = z.object({
	curlCommand: z.string().min(1, { message: 'Please enter a cURL command.' }),
});
type CurlFormValues = z.infer<typeof curlFormSchema>;

const CurlConverter: React.FC<CurlConverterProps> = ({ projectId, openApiSpec }) => {
	const { data: user } = useMe();
	const { toast } = useToast();
	const createEndpointMutation = useCreateEndpoint();

	const form = useForm<CurlFormValues>({
		resolver: zodResolver(curlFormSchema),
		defaultValues: {
			curlCommand: '',
		},
	});

	const { isSubmitting } = form.formState;

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

	const onSubmit = async (values: CurlFormValues) => {
		try {
			const parsedEndpoint = await parseCurlToOpenApi(
				values.curlCommand,
				user?.username || 'unknown',
			);

			if (!parsedEndpoint) {
				throw new Error('Failed to parse cURL command. Please check the format.');
			}

			if (checkForDuplicateEndpoint(parsedEndpoint.path, parsedEndpoint.method)) {
				throw new Error(
					`Endpoint ${parsedEndpoint.method.toUpperCase()} ${
						parsedEndpoint.path
					} already exists.`,
				);
			}

			await createEndpointMutation.mutateAsync({ projectId, endpointData: parsedEndpoint });

			toast({
				title: 'Endpoint Added',
				description: `${parsedEndpoint.method.toUpperCase()} ${
					parsedEndpoint.path
				} has been added.`,
			});

			form.reset();
		} catch (error) {
			toast({
				title: 'Conversion Error',
				description:
					error instanceof Error ? error.message : 'Failed to convert cURL to OpenAPI',
				variant: 'destructive',
			});
		}
	};

	return (
		<Card className="glass-card">
			<CardHeader>
				<CardTitle className="text-gradient-tropical text-xl">
					Add Endpoint from cURL
				</CardTitle>

				<CardDescription>
					Paste a cURL command to add a new endpoint to your API documentation.
				</CardDescription>
			</CardHeader>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<CardContent>
						<FormField
							control={form.control}
							name="curlCommand"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<Textarea
											placeholder="curl -X GET 'https://api.example.com/users' -H 'Authorization: Bearer token'"
											className="font-mono min-h-[120px]"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</CardContent>
					<CardFooter>
						<Button
							type="submit"
							disabled={isSubmitting}
							className="w-full mt-4 cursor-pointer"
						>
							{isSubmitting ? 'Converting...' : 'Convert & Add Endpoint'}
						</Button>
					</CardFooter>
				</form>
			</Form>
		</Card>
	);
};

export default CurlConverter;
