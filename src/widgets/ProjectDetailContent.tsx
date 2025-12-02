import { useProjectStore } from '@/app/store/useProjectStore';
import ChangelogTabContent from '@/features/changelog/view-changelog/ChangelogTabContent';
import CurlConverter from '@/features/endpoint/add-from-curl/CurlConverter';
import { EditOpenApiSpec } from '@/features/project/edit-spec/EditOpenApiSpec';
import { ExportProjectSpec } from '@/features/project/export-project-spec/ExportProjectSpec';
import { usePermissions } from '@/hooks/usePermissions';
import type { components } from '@/shared/types/api-types';
import type { OpenAPISpec } from '@/shared/types/types';
import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import EndpointsList from '@/widgets/EndpointsList';
import { EnvironmentManager } from '@/widgets/environment/EnvironmentManager';
import { SchemaList } from '@/widgets/schema/SchemaList';
import { Server, SquareArrowOutUpRight } from 'lucide-react';
import { useEffect } from 'react';

type ProjectDetailDto = components['schemas']['ProjectDetailDto'];

interface ProjectDetailContentProps {
	project: ProjectDetailDto;
	openApiSpec: OpenAPISpec | null;
	projectId: string;
	endpointId?: string;
}

export const ProjectDetailContent = ({
	project,
	openApiSpec,
	projectId,
	endpointId,
}: ProjectDetailContentProps) => {
	const { isProjectOwner } = usePermissions();

	const { activeServerUrl, setActiveServerUrl, setActiveProjectId } = useProjectStore();

	useEffect(() => {
		setActiveProjectId(projectId);
	}, [projectId, setActiveProjectId]);

	useEffect(() => {
		if (project.servers && project.servers.length > 0) {
			const isValidServer = project.servers.some((s) => s.url === activeServerUrl);

			if (!activeServerUrl || !isValidServer) {
				setActiveServerUrl(project.servers[0].url);
			}
		} else {
			setActiveServerUrl(null);
		}
	}, [project.servers, activeServerUrl, setActiveServerUrl]);

	return (
		<>
			{project.servers && project.servers.length > 0 && (
				<div className="bg-secondary/40 rounded-lg p-4 mb-4 border border-border/50 flex flex-col md:flex-row md:items-center gap-4">
					<div className="flex items-center gap-2 text-sm text-muted-foreground font-medium shrink-0">
						<Server className="h-4 w-4" /> Active Server:
					</div>

					<div className="flex-1 w-full md:max-w-xl">
						<Select value={activeServerUrl || ''} onValueChange={setActiveServerUrl}>
							<SelectTrigger className="bg-background/80 border-border/60 cursor-pointer h-10 w-full">
								<SelectValue placeholder="Select a server" />
							</SelectTrigger>

							<SelectContent>
								{project.servers.map((server, idx) => (
									<SelectItem
										key={idx}
										value={server.url}
										className="cursor-pointer"
									>
										<span className="font-mono mr-2 truncate max-w-[200px] md:max-w-none inline-block align-bottom">
											{server.url}
										</span>

										{server.description && (
											<span className="text-muted-foreground text-xs hidden sm:inline">
												({server.description})
											</span>
										)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			)}

			{project.links && project.links.length > 0 && (
				<div className="flex flex-wrap gap-2 mb-8">
					{project.links.map((link, index) => (
						<Button
							key={index}
							variant="outline"
							size="sm"
							className="text-xs cursor-pointer"
							onClick={() =>
								window.open(
									link.url.startsWith('http') ? link.url : 'https://' + link.url,
									'_blank',
									'noopener,noreferrer',
								)
							}
						>
							<SquareArrowOutUpRight className="h-3 w-3 mr-1.5" /> {link.name}
						</Button>
					))}
				</div>
			)}

			<div className="flex flex-wrap justify-between items-center gap-4 mt-8!">
				<h2 className="text-2xl font-bold text-gradient-green">API Documentation</h2>
				<div className="flex flex-wrap gap-2">
					<ExportProjectSpec project={project} openApiSpec={openApiSpec} />
					<EditOpenApiSpec project={project} openApiSpec={openApiSpec} />
				</div>
			</div>

			<Tabs defaultValue="endpoints" className="space-y-4">
				<div className="w-full overflow-x-auto pb-1 no-scrollbar">
					<TabsList className="w-full justify-start md:w-auto inline-flex">
						<TabsTrigger
							value="endpoints"
							className="cursor-pointer flex-1 md:flex-none"
						>
							Endpoints
						</TabsTrigger>

						<TabsTrigger value="schemas" className="cursor-pointer flex-1 md:flex-none">
							Schemas
						</TabsTrigger>

						<TabsTrigger
							value="environments"
							className="cursor-pointer flex-1 md:flex-none"
						>
							Environments
						</TabsTrigger>

						<TabsTrigger
							value="changelog"
							className="cursor-pointer flex-1 md:flex-none"
						>
							Changelog
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="endpoints" tabIndex={-1}>
					{isProjectOwner(project) && openApiSpec && (
						<div className="space-y-6 mb-6">
							<CurlConverter projectId={projectId} openApiSpec={openApiSpec} />
						</div>
					)}

					{openApiSpec ? (
						<EndpointsList
							openApiSpec={openApiSpec}
							projectId={projectId}
							endpointId={endpointId}
						/>
					) : (
						<p className="text-muted-foreground text-center py-8">
							No API specification loaded for this project. Admins can import one
							using the "Edit Open API" button.
						</p>
					)}
				</TabsContent>

				<TabsContent value="schemas" tabIndex={-1}>
					<SchemaList projectId={projectId} />
				</TabsContent>

				<TabsContent value="environments" tabIndex={-1}>
					<EnvironmentManager projectId={projectId} />
				</TabsContent>

				<TabsContent value="changelog" tabIndex={-1}>
					<ChangelogTabContent projectId={projectId} />
				</TabsContent>
			</Tabs>
		</>
	);
};
