import { ConcurrencyConflictDialog } from '@/components/general/ConcurrencyConflictDialog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { CircleDashed, FileCheck, FileX, Megaphone, TriangleAlert, X } from 'lucide-react';
import React, { useId, useState } from 'react';
import { FormProvider, SubmitHandler } from 'react-hook-form';

import type { components } from '@/shared/types/api-types';
import { OpenAPISpec } from '@/shared/types/types';

import { cn } from '@/shared/lib/utils';
import { useEndpointForm } from './hooks/useEndpointForm';
import { EndpointFormValues } from './model/endpoint-form-schema';
import FormParametersSection from './ui/FormParametersSection';
import FormRequestBodySection from './ui/FormRequestBodySection';
import FormResponsesSection from './ui/FormResponsesSection';
import MarkdownEditor from './ui/MarkdownEditor';

type EndpointDto = components['schemas']['EndpointDto'];
type EndpointStatus = components['schemas']['EndpointStatus'];

interface EndpointFormProps {
	projectId: string;
	endpoint?: EndpointDto;
	onClose: () => void;
	openApiSpec: OpenAPISpec;
}

const STATUS_OPTIONS: {
	value: EndpointStatus;
	label: string;
	icon: React.ElementType;
	color: string;
}[] = [
	{ value: 'DRAFT', label: 'Draft', icon: CircleDashed, color: 'text-slate-500' },
	{ value: 'IN_REVIEW', label: 'In Review', icon: FileCheck, color: 'text-orange-500' },
	{ value: 'PUBLISHED', label: 'Published', icon: Megaphone, color: 'text-emerald-500' },
	{ value: 'DEPRECATED', label: 'Deprecated', icon: FileX, color: 'text-red-500' },
];

const EndpointForm: React.FC<EndpointFormProps> = ({ projectId, endpoint, onClose }) => {
	const formId = useId();
	const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);

	const {
		form,
		onSubmit,
		isSubmitting,
		isDirty,
		conflictDetails,
		currentTagInput,
		setCurrentTagInput,
		handleTagKeyDown,
		handleForceSubmitFromDialog,
		handleRefreshAndDiscardEdits,
		handleCloseConflictDialogOnly,
	} = useEndpointForm(projectId, onClose, endpoint);

	const handleFormSubmit: SubmitHandler<EndpointFormValues> = (values) => {
		return onSubmit(values);
	};

	const handleDiscardClick = () => {
		if (isDirty) {
			setIsDiscardDialogOpen(true);
		} else {
			onClose();
		}
	};

	const getErrorMessage = (errors: any) => {
		if (!errors || Object.keys(errors).length === 0) return null;
		return 'Please fix the errors above before submitting.';
	};

	const errorMessage = getErrorMessage(form.formState.errors);

	return (
		<>
			<FormProvider {...form}>
				<form
					id={formId}
					onSubmit={form.handleSubmit(handleFormSubmit)}
					className="flex flex-col h-full overflow-hidden"
				>
					<Tabs defaultValue="general" className="flex flex-col h-full overflow-hidden">
						<div className="px-4 md:px-8 border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-10 shrink-0">
							<div className="w-full overflow-x-auto no-scrollbar">
								<TabsList className="w-full justify-start h-14 bg-transparent p-0 gap-4 md:gap-8 inline-flex">
									{['General', 'Parameters', 'Request Body', 'Responses'].map(
										(tab) => (
											<TabsTrigger
												key={tab}
												value={tab.toLowerCase().replace(' ', '')}
												className="h-14 rounded-none border-b-2 border-transparent px-2 font-medium text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-none text-sm cursor-pointer whitespace-nowrap"
											>
												{tab}
											</TabsTrigger>
										),
									)}
								</TabsList>
							</div>
						</div>

						<div className="grow overflow-y-auto p-4 md:p-8 scroll-smooth">
							<TabsContent
								value="general"
								className="space-y-8 mt-0 animate-in fade-in-50 duration-300 outline-none"
							>
								<div className="grid grid-cols-1 md:grid-cols-12 gap-6">
									<FormField
										control={form.control}
										name="method"
										render={({ field }) => (
											<FormItem className="col-span-12 md:col-span-2">
												<FormLabel>Method</FormLabel>
												<Select
													onValueChange={field.onChange}
													value={field.value}
												>
													<FormControl>
														<SelectTrigger className="h-10 font-semibold uppercase cursor-pointer">
															<SelectValue />
														</SelectTrigger>
													</FormControl>

													<SelectContent>
														{[
															'get',
															'post',
															'put',
															'delete',
															'patch',
															'options',
															'head',
														].map((m) => (
															<SelectItem
																key={m}
																value={m}
																className="uppercase font-semibold cursor-pointer"
															>
																{m}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="path"
										render={({ field }) => (
											<FormItem className="col-span-12 md:col-span-7">
												<FormLabel>Path</FormLabel>
												<FormControl>
													<Input
														{...field}
														placeholder="/api/v1/users/{id}"
														className="font-mono h-10"
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="status"
										render={({ field }) => (
											<FormItem className="col-span-12 md:col-span-3">
												<FormLabel>Status</FormLabel>

												<Select
													onValueChange={field.onChange}
													value={field.value}
												>
													<FormControl>
														<SelectTrigger className="h-10 cursor-pointer">
															<SelectValue />
														</SelectTrigger>
													</FormControl>

													<SelectContent>
														{STATUS_OPTIONS.map((option) => (
															<SelectItem
																key={option.value}
																value={option.value}
																className="cursor-pointer"
															>
																<div className="flex items-center gap-2">
																	<option.icon
																		className={cn(
																			'h-4 w-4',
																			option.color,
																		)}
																	/>
																	<span>{option.label}</span>
																</div>
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								<div className="space-y-6">
									<FormField
										control={form.control}
										name="summary"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Summary</FormLabel>
												<FormControl>
													<Input
														{...field}
														placeholder="e.g. Get User Profile"
														className="h-10"
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
														placeholder="Detailed explanation... (Markdown supported)"
														className="h-64"
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								<div className="space-y-3">
									<FormLabel>Tags</FormLabel>

									<div className="flex items-center space-x-2">
										<Input
											value={currentTagInput}
											onChange={(e) => setCurrentTagInput(e.target.value)}
											onKeyDown={handleTagKeyDown}
											placeholder="Type tag & press Enter"
											className="h-10 max-w-md"
										/>
									</div>

									<FormField
										control={form.control}
										name="tags"
										render={({ field }) => (
											<FormItem>
												<div className="flex flex-wrap gap-2 min-h-8">
													{field.value.map((tag) => (
														<Badge
															key={tag}
															variant="secondary"
															className="pl-2 pr-1 py-1 text-sm"
														>
															{tag}
															<button
																type="button"
																className="ml-1 hover:bg-destructive/20 hover:text-destructive rounded-full p-0.5 transition-colors cursor-pointer"
																onClick={() =>
																	form.setValue(
																		'tags',
																		field.value.filter(
																			(t) => t !== tag,
																		),
																	)
																}
															>
																<X className="h-3 w-3" />
															</button>
														</Badge>
													))}
												</div>
											</FormItem>
										)}
									/>
								</div>
							</TabsContent>

							<TabsContent
								value="parameters"
								className="space-y-8 mt-0 animate-in fade-in-50 duration-300 outline-none"
							>
								<FormParametersSection paramType="path" />
								<div className="border-t border-border/50 my-6" />

								<FormParametersSection paramType="query" />
								<div className="border-t border-border/50 my-6" />

								<FormParametersSection paramType="header" />
							</TabsContent>

							<TabsContent
								value="requestbody"
								className="mt-0 animate-in fade-in-50 duration-300 outline-none"
							>
								<FormRequestBodySection
									projectId={projectId}
									onAddRequestBody={() =>
										form.setValue('requestBody', {
											description: '',
											required: true,
											contentType: 'application/json',
											schemaString: '{}',
											exampleString: '',
										})
									}
								/>
							</TabsContent>

							<TabsContent
								value="responses"
								className="mt-0 animate-in fade-in-50 duration-300 outline-none"
							>
								<FormResponsesSection projectId={projectId} />
							</TabsContent>
						</div>
					</Tabs>

					{/* Footer Actions */}
					<div className="flex flex-col justify-end p-4 md:p-6 border-t border-border/40 bg-background/50 backdrop-blur z-20 shrink-0 gap-4">
						{errorMessage && (
							<div className="flex items-center gap-3 p-3 border border-red-600 rounded-lg bg-red-950/30">
								<TriangleAlert className="h-4 w-4 text-red-400 shrink-0" />
								<span className="text-sm text-red-400">{errorMessage}</span>
							</div>
						)}

						<div className="flex flex-wrap justify-end gap-4">
							<Button
								type="button"
								variant="ghost"
								onClick={handleDiscardClick}
								className="text-muted-foreground hover:text-foreground cursor-pointer order-2 md:order-1 w-full md:w-auto"
							>
								Discard Changes
							</Button>

							<Button
								type="submit"
								form={formId}
								disabled={isSubmitting || !!conflictDetails}
								className="min-w-[150px] shadow-lg shadow-primary/20 cursor-pointer order-1 md:order-2 w-full md:w-auto"
							>
								{isSubmitting
									? 'Saving...'
									: endpoint
										? 'Save Changes'
										: 'Create Endpoint'}
							</Button>
						</div>
					</div>
				</form>
			</FormProvider>

			<AlertDialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Discard Unsaved Changes?</AlertDialogTitle>
						<AlertDialogDescription>
							You have unsaved changes in this form. Closing it will lose all
							progress.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<AlertDialogFooter>
						<AlertDialogCancel className="cursor-pointer">
							Keep Editing
						</AlertDialogCancel>

						<AlertDialogAction
							onClick={onClose}
							className="bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
						>
							Discard Changes
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{conflictDetails && (
				<ConcurrencyConflictDialog
					isOpen={!!conflictDetails}
					onClose={handleCloseConflictDialogOnly}
					onForceOverwrite={handleForceSubmitFromDialog}
					onRefreshAndDiscard={handleRefreshAndDiscardEdits}
					localChanges={form.getValues()}
					serverChanges={conflictDetails.serverData || {}}
					resourceName="endpoint"
				/>
			)}
		</>
	);
};

export default EndpointForm;
