import { useProjectStore } from '@/app/store/useProjectStore';
import { useToast } from '@/hooks/use-toast';
import {
	convertOpenApiToPostmanCollection,
	convertToYaml,
	sanitizeOpenApiSpecForDownload,
} from '@/shared/lib/openApiUtils';
import type { components } from '@/shared/types/api-types';
import type { OpenAPISpec } from '@/shared/types/types';
import { Button } from '@/shared/ui/button';
import { Download } from 'lucide-react';

type ProjectDetailDto = components['schemas']['ProjectDetailDto'];

interface ExportProjectSpecProps {
	project: ProjectDetailDto;
	openApiSpec: OpenAPISpec | null;
}

export const ExportProjectSpec = ({ project, openApiSpec }: ExportProjectSpecProps) => {
	const { toast } = useToast();
	const { activeServerUrl } = useProjectStore();

	const downloadFileHelper = (content: string, filename: string, contentType: string) => {
		const blob = new Blob([content], { type: contentType });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const getSpecWithSelectedServer = () => {
		if (!openApiSpec) return null;
		const specClone = JSON.parse(JSON.stringify(openApiSpec)) as OpenAPISpec;

		if (activeServerUrl) {
			const fullServerObj = project.servers?.find((s) => s.url === activeServerUrl);
			specClone.servers = [
				{
					url: activeServerUrl,
					description: fullServerObj?.description || 'Selected Server',
				},
			];
		}

		return specClone;
	};

	const handleDownloadOpenApiSpecJson = () => {
		const specToExport = getSpecWithSelectedServer();
		if (!specToExport) {
			toast({
				title: 'Download Error',
				description: 'OpenAPI data is not loaded.',
				variant: 'destructive',
			});

			return;
		}

		const sanitizedSpec = sanitizeOpenApiSpecForDownload(specToExport);
		let specString;

		try {
			specString = JSON.stringify(sanitizedSpec, null, 2);
		} catch (err) {
			toast({
				title: 'Download Error',
				description: 'Could not prepare data for download.',
				variant: 'destructive',
			});
			return;
		}

		const projectNameForFile = project.name.replace(/\s+/g, '_').toLowerCase();
		downloadFileHelper(specString, `${projectNameForFile}.openapi.json`, 'application/json');
		toast({ title: 'Download Started', description: 'Sanitized OpenAPI JSON is downloading.' });
	};

	const handleDownloadOpenApiSpecYaml = () => {
		const specToExport = getSpecWithSelectedServer();

		if (!specToExport) {
			toast({
				title: 'Download Error',
				description: 'OpenAPI data is not loaded.',
				variant: 'destructive',
			});
			return;
		}

		const sanitizedSpec = sanitizeOpenApiSpecForDownload(specToExport);
		let specString;

		try {
			specString = convertToYaml(sanitizedSpec);
		} catch (err) {
			toast({
				title: 'Download Error',
				description: 'Could not prepare YAML data.',
				variant: 'destructive',
			});
			return;
		}

		const projectNameForFile = project.name.replace(/\s+/g, '_').toLowerCase();
		downloadFileHelper(specString, `${projectNameForFile}.openapi.yaml`, 'application/x-yaml');
		toast({ title: 'Download Started', description: 'Sanitized OpenAPI YAML is downloading.' });
	};

	const handleDownloadPostmanCollection = () => {
		const specToExport = getSpecWithSelectedServer();
		if (!specToExport) {
			toast({
				title: 'Download Error',
				description: 'OpenAPI data not loaded.',
				variant: 'destructive',
			});
			return;
		}

		const postmanCollection = convertOpenApiToPostmanCollection(specToExport);

		if (!postmanCollection) {
			toast({
				title: 'Conversion Failed',
				description: 'Could not convert to Postman collection.',
				variant: 'destructive',
			});
			return;
		}

		let collectionString;

		try {
			collectionString = JSON.stringify(postmanCollection, null, 2);
		} catch (err) {
			toast({
				title: 'Download Error',
				description: 'Could not prepare Postman data.',
				variant: 'destructive',
			});
			return;
		}

		const collectionNameForFile = (project.name || 'api-collection')
			.replace(/[^a-z0-9_.-]/gi, '_')
			.toLowerCase();

		downloadFileHelper(
			collectionString,
			`${collectionNameForFile}.postman_collection.json`,
			'application/json',
		);

		toast({ title: 'Download Started', description: 'Postman collection is downloading.' });
	};

	return (
		<div className="flex flex-wrap items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onClick={handleDownloadOpenApiSpecJson}
				disabled={!openApiSpec}
				className="cursor-pointer"
			>
				<Download className="mr-2 h-4 w-4" /> OpenAPI (JSON)
			</Button>

			<Button
				variant="outline"
				size="sm"
				onClick={handleDownloadOpenApiSpecYaml}
				disabled={!openApiSpec}
				className="cursor-pointer"
			>
				<Download className="mr-2 h-4 w-4" /> OpenAPI (YAML)
			</Button>

			<Button
				variant="outline"
				size="sm"
				onClick={handleDownloadPostmanCollection}
				disabled={!openApiSpec}
				className="cursor-pointer"
			>
				<Download className="mr-2 h-4 w-4" /> Postman
			</Button>
		</div>
	);
};
