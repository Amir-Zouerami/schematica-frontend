import { SchemaAwareTextarea } from '@/features/endpoint/edit-endpoint/ui/SchemaAwareTextarea';
import { useToast } from '@/hooks/use-toast';
import { inferSchemaFromValue } from '@/shared/lib/openApiUtils';
import { Button } from '@/shared/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
import { Plus, Trash2, Wand2 } from 'lucide-react';
import React from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

interface FormResponsesSectionProps {
	projectId: string;
}

const FormResponsesSection: React.FC<FormResponsesSectionProps> = ({ projectId }) => {
	const { control, formState, getValues, setValue } = useFormContext();
	const { fields, append, remove } = useFieldArray({
		control,
		name: 'responses',
	});
	const responses = useWatch({ control, name: 'responses' });

	const { toast } = useToast();
	const { isSubmitting } = formState;

	const addResponse = () => {
		append({
			statusCode: '200',
			description: '',
			contentType: 'application/json',
			schemaString: '{}',
			exampleString: '',
		});
	};

	const handleGenerateSchema = (index: number) => {
		try {
			const exampleStr = getValues(`responses.${index}.exampleString`);
			if (!exampleStr || exampleStr.trim() === '') return;

			const parsedExample = JSON.parse(exampleStr);
			const inferredSchema = inferSchemaFromValue(parsedExample);

			setValue(`responses.${index}.schemaString`, JSON.stringify(inferredSchema, null, 2), {
				shouldDirty: true,
				shouldValidate: true,
			});

			toast({
				title: 'Schema Generated',
				description: `Schema for Response ${index + 1} generated.`,
			});
		} catch (e) {
			toast({
				title: 'Generation Failed',
				description: 'Invalid JSON.',
				variant: 'destructive',
			});
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center mb-2">
				<h3 className="text-lg font-medium">Responses</h3>
				<Button
					type="button"
					variant="secondary"
					size="sm"
					onClick={addResponse}
					disabled={isSubmitting}
					className="cursor-pointer"
				>
					<Plus className="h-4 w-4 mr-2" /> Add Response
				</Button>
			</div>

			{fields.length > 0 ? (
				<div className="space-y-6">
					{fields.map((field, index) => {
						const isJson = responses?.[index]?.contentType?.includes('json') ?? true;

						return (
							<div
								key={field.id}
								className="border border-border rounded-xl bg-card shadow-sm relative group transition-all hover:border-border/80 overflow-hidden"
							>
								<div className="bg-muted/30 p-3 border-b flex justify-between items-center">
									<span className="text-xs font-semibold uppercase text-muted-foreground px-2">
										Response #{index + 1}
									</span>

									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => remove(index)}
										disabled={isSubmitting}
										className="h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
									>
										<Trash2 className="h-4 w-4 mr-1" /> Delete
									</Button>
								</div>

								<div className="p-6 pt-4">
									<div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
										<div className="md:col-span-2">
											<FormField
												control={control}
												name={`responses.${index}.statusCode`}
												render={({ field }) => (
													<FormItem>
														<FormLabel>Status</FormLabel>
														<FormControl>
															<Input
																className="font-mono font-bold text-center"
																{...field}
																disabled={isSubmitting}
																placeholder="200"
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>

										<div className="md:col-span-7">
											<FormField
												control={control}
												name={`responses.${index}.description`}
												render={({ field }) => (
													<FormItem>
														<FormLabel>Description</FormLabel>
														<FormControl>
															<Input
																{...field}
																disabled={isSubmitting}
																placeholder="e.g. Successful operation"
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>

										<div className="md:col-span-3">
											<FormField
												control={control}
												name={`responses.${index}.contentType`}
												render={({ field }) => (
													<FormItem>
														<FormLabel>Content Type</FormLabel>

														<Select
															onValueChange={field.onChange}
															value={field.value}
															disabled={isSubmitting}
														>
															<FormControl>
																<SelectTrigger className="cursor-pointer">
																	<SelectValue />
																</SelectTrigger>
															</FormControl>

															<SelectContent>
																<SelectItem value="application/json">
																	JSON
																</SelectItem>

																<SelectItem value="application/xml">
																	XML
																</SelectItem>

																<SelectItem value="text/plain">
																	Text
																</SelectItem>

																<SelectItem value="application/octet-stream">
																	File/Binary
																</SelectItem>
															</SelectContent>
														</Select>
													</FormItem>
												)}
											/>
										</div>
									</div>

									<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
										<FormField
											control={control}
											name={`responses.${index}.exampleString`}
											render={({ field }) => (
												<FormItem className="flex flex-col">
													<FormLabel className="mb-3">
														{isJson
															? 'Example (JSON)'
															: 'Example (Raw)'}
													</FormLabel>

													<FormControl>
														<Textarea
															className="font-mono text-sm min-h-[200px]"
															{...field}
															disabled={isSubmitting}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={control}
											name={`responses.${index}.schemaString`}
											render={({ field }) => (
												<FormItem className="flex flex-col">
													<div className="flex justify-between items-center mb-3">
														<FormLabel className="m-0">
															{isJson
																? 'Schema (JSON)'
																: 'Schema (Structure)'}
														</FormLabel>

														<div className="flex items-center gap-2">
															<span className="text-[10px] text-muted-foreground">
																Type '#' to insert ref
															</span>

															{isJson && (
																<button
																	type="button"
																	onMouseDown={(e) =>
																		e.preventDefault()
																	}
																	onClick={() =>
																		handleGenerateSchema(index)
																	}
																	className="text-[10px] flex items-center gap-1 text-primary hover:underline uppercase font-semibold cursor-pointer"
																>
																	<Wand2 className="h-3 w-3" />{' '}
																	Auto-Generate
																</button>
															)}
														</div>
													</div>

													<FormControl>
														<SchemaAwareTextarea
															projectId={projectId}
															className="min-h-[200px] bg-muted/20"
															{...field}
															isSubmitting={isSubmitting}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			) : (
				<div className="py-12 text-center border border-dashed rounded-xl bg-secondary/5">
					<p className="text-muted-foreground text-sm mb-3">No responses defined.</p>

					<Button
						type="button"
						variant="link"
						size="sm"
						onClick={addResponse}
						className="text-primary cursor-pointer"
					>
						+ Add Default 200 Response
					</Button>
				</div>
			)}
		</div>
	);
};

export default FormResponsesSection;
