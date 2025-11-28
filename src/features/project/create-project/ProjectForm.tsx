import { ConcurrencyConflictDialog } from '@/components/general/ConcurrencyConflictDialog';
import MarkdownEditor from '@/features/endpoint/edit-endpoint/ui/MarkdownEditor';
import { useProjectForm } from '@/features/project/create-project/hooks/useProjectForm';
import type { components } from '@/shared/types/api-types';
import { Button } from '@/shared/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/shared/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Server, X } from 'lucide-react';
import React from 'react';

type ProjectDetailDto = components['schemas']['ProjectDetailDto'];

interface ProjectFormProps {
	open: boolean;
	onClose: () => void;
	project?: ProjectDetailDto;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ open, onClose, project }) => {
	const {
		form,
		linkFields,
		appendLink,
		removeLink,
		serverFields,
		appendServer,
		removeServer,
		onSubmit,
		isSubmitting,
		isConflictDialogOpen,
		setIsConflictDialogOpen,
		conflictingServerData,
		handleForceOverwrite,
		handleRefreshAndDiscard,
	} = useProjectForm(open, onClose, project);

	return (
		<>
			<Dialog open={open} onOpenChange={(isOpenDialog) => !isOpenDialog && onClose()}>
				<DialogContent className="w-screen h-dvh max-w-none rounded-none sm:rounded-lg sm:max-w-2xl sm:h-[85vh] flex flex-col gap-0 p-0 bg-background/95 backdrop-blur-xl">
					<DialogHeader className="px-6 py-4 border-b shrink-0">
						<DialogTitle className="text-gradient">
							{project ? 'Edit Project' : 'Create New Project'}
						</DialogTitle>

						<DialogDescription>
							{project
								? 'Update project details.'
								: 'Create a new API documentation project.'}
						</DialogDescription>
					</DialogHeader>

					<div className="flex-1 overflow-hidden">
						<ScrollArea className="h-full w-full">
							<Form {...form}>
								<form
									id="project-form"
									onSubmit={form.handleSubmit(onSubmit)}
									className="space-y-6 p-6"
								>
									<FormField
										control={form.control}
										name="name"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Project Name</FormLabel>
												<FormControl>
													<Input
														placeholder="My API Project"
														{...field}
														disabled={isSubmitting}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="description"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Description</FormLabel>
												<FormControl>
													<MarkdownEditor
														value={field.value || ''}
														onChange={field.onChange}
														placeholder="A brief description of your API project (Markdown supported)"
														className="min-h-[150px]"
														disabled={isSubmitting}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									{/* SERVERS SECTION */}
									<div className="space-y-3 border p-4 rounded-lg bg-secondary/10">
										<div className="flex justify-between items-center">
											<Label className="flex items-center gap-2">
												<Server className="h-4 w-4" /> API Servers
											</Label>

											<Button
												type="button"
												variant="secondary"
												size="sm"
												onClick={() =>
													appendServer({ url: '', description: '' })
												}
												disabled={isSubmitting}
												className="cursor-pointer"
											>
												Add Server
											</Button>
										</div>

										{serverFields.map((item, index) => (
											<div
												key={item.id}
												className="flex items-start gap-2 animate-in slide-in-from-left-2"
											>
												<FormField
													control={form.control}
													name={`servers.${index}.url`}
													render={({ field }) => (
														<FormItem className="flex-2">
															<FormControl>
																<Input
																	placeholder="https://api.example.com"
																	{...field}
																	disabled={isSubmitting}
																	className="font-mono text-sm"
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>

												<FormField
													control={form.control}
													name={`servers.${index}.description`}
													render={({ field }) => (
														<FormItem className="flex-1">
															<FormControl>
																<Input
																	placeholder="Desc"
																	{...field}
																	disabled={isSubmitting}
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>

												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={() => removeServer(index)}
													className="h-10 w-10 text-muted-foreground hover:text-destructive cursor-pointer"
													disabled={
														isSubmitting || serverFields.length <= 1
													}
												>
													<X className="h-4 w-4" />
												</Button>
											</div>
										))}
									</div>

									{/* LINKS SECTION */}
									<div className="space-y-3">
										<div className="flex justify-between items-center mb-2">
											<Label>Related Links</Label>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => appendLink({ name: '', url: '' })}
												disabled={isSubmitting}
												className="cursor-pointer"
											>
												Add Link
											</Button>
										</div>

										{linkFields.map((item, index) => (
											<div key={item.id} className="flex items-start gap-2">
												<FormField
													control={form.control}
													name={`links.${index}.name`}
													render={({ field }) => (
														<FormItem className="flex-1">
															<FormControl>
																<Input
																	placeholder="Name"
																	{...field}
																	disabled={isSubmitting}
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>

												<FormField
													control={form.control}
													name={`links.${index}.url`}
													render={({ field }) => (
														<FormItem className="flex-1">
															<FormControl>
																<Input
																	placeholder="URL"
																	{...field}
																	disabled={isSubmitting}
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>

												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={() => removeLink(index)}
													className="h-10 w-10 text-muted-foreground hover:text-destructive cursor-pointer"
													disabled={isSubmitting}
												>
													<X className="h-4 w-4" />
												</Button>
											</div>
										))}
									</div>
								</form>
							</Form>
						</ScrollArea>
					</div>

					<DialogFooter className="px-6 py-4 border-t shrink-0 bg-muted/20">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={isSubmitting}
							className="cursor-pointer"
						>
							Cancel
						</Button>

						<Button
							type="submit"
							form="project-form"
							disabled={isSubmitting}
							className="cursor-pointer"
						>
							{isSubmitting
								? project
									? 'Updating...'
									: 'Creating...'
								: project
									? 'Update Project'
									: 'Create Project'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{conflictingServerData && (
				<ConcurrencyConflictDialog
					isOpen={isConflictDialogOpen}
					onClose={() => setIsConflictDialogOpen(false)}
					onForceOverwrite={handleForceOverwrite}
					onRefreshAndDiscard={handleRefreshAndDiscard}
					localChanges={form.getValues()}
					serverChanges={{
						name: conflictingServerData.name,
						description: conflictingServerData.description ?? '',
						servers: conflictingServerData.servers || [],
						links: conflictingServerData.links || [],
					}}
					resourceName="project"
				/>
			)}
		</>
	);
};

export default ProjectForm;
