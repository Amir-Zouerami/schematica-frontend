import { SchemaAwareTextarea } from '@/features/endpoint/edit-endpoint/ui/SchemaAwareTextarea';
import { useToast } from '@/hooks/use-toast';
import { inferSchemaFromValue } from '@/shared/lib/openApiUtils';
import { Button } from '@/shared/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
import { Trash2, Wand2 } from 'lucide-react';
import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

interface FormRequestBodySectionProps {
	projectId: string;
	onAddRequestBody: () => void;
}

const FormRequestBodySection: React.FC<FormRequestBodySectionProps> = ({
	projectId,
	onAddRequestBody,
}) => {
	const { control, formState, setValue, getValues } = useFormContext();
	const { isSubmitting } = formState;
	const { toast } = useToast();

	const requestBody = useWatch({ control, name: 'requestBody' });
	const contentType = useWatch({ control, name: 'requestBody.contentType' });

	const isJson = contentType?.includes('json') ?? true;

	const handleRemove = () => {
		setValue('requestBody', null, { shouldDirty: true, shouldValidate: true });
	};

	const handleGenerateSchema = () => {
		try {
			const exampleStr = getValues('requestBody.exampleString');
			if (!exampleStr || exampleStr.trim() === '') return;

			const parsedExample = JSON.parse(exampleStr);
			const inferredSchema = inferSchemaFromValue(parsedExample);

			setValue('requestBody.schemaString', JSON.stringify(inferredSchema, null, 2), {
				shouldDirty: true,
				shouldValidate: true,
			});

			toast({ title: 'Schema Generated', description: 'JSON Schema inferred from example.' });
		} catch (e) {
			toast({
				title: 'Generation Failed',
				description: 'Invalid JSON in Example field.',
				variant: 'destructive',
			});
		}
	};

	if (requestBody === undefined || requestBody === null) {
		return (
			<div className="py-12 text-center border border-dashed rounded-xl bg-secondary/5">
				<p className="text-muted-foreground text-sm mb-3">No request body defined.</p>

				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={onAddRequestBody}
					disabled={isSubmitting}
					className="cursor-pointer"
				>
					Add Request Body
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center border-b pb-2 mb-4">
				<h3 className="text-lg font-medium">Request Body Settings</h3>

				<Button
					variant="ghost"
					size="sm"
					onClick={handleRemove}
					className="text-destructive hover:bg-destructive/10 cursor-pointer"
				>
					<Trash2 className="h-4 w-4 mr-2" /> Remove Body
				</Button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
				<div className="md:col-span-12">
					<FormField
						control={control}
						name="requestBody.contentType"
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
										<SelectItem
											value="application/json"
											className="cursor-pointer"
										>
											application/json
										</SelectItem>

										<SelectItem
											value="application/xml"
											className="cursor-pointer"
										>
											application/xml
										</SelectItem>

										<SelectItem value="text/plain" className="cursor-pointer">
											text/plain
										</SelectItem>

										<SelectItem
											value="multipart/form-data"
											className="cursor-pointer"
										>
											multipart/form-data
										</SelectItem>

										<SelectItem
											value="application/x-www-form-urlencoded"
											className="cursor-pointer"
										>
											application/x-www-form-urlencoded
										</SelectItem>
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
			</div>

			<FormField
				control={control}
				name="requestBody.description"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Description</FormLabel>

						<FormControl>
							<Input
								{...field}
								disabled={isSubmitting}
								placeholder="e.g. The user object to create"
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<FormField
					control={control}
					name="requestBody.exampleString"
					render={({ field }) => (
						<FormItem className="flex flex-col h-full">
							<FormLabel className="flex justify-between items-center mb-3">
								{isJson ? 'Example (JSON)' : 'Example (Raw)'}

								{isJson && (
									<span className="text-xs text-muted-foreground font-normal">
										Paste here to auto-generate schema
									</span>
								)}
							</FormLabel>

							<FormControl>
								<Textarea
									className="font-mono text-sm min-h-[300px] flex-1"
									{...field}
									disabled={isSubmitting}
									placeholder={
										isJson ? '{ "name": "John" }' : 'Raw data example...'
									}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={control}
					name="requestBody.schemaString"
					render={({ field }) => (
						<FormItem className="flex flex-col h-full">
							<div className="flex justify-between items-center mb-3">
								<FormLabel className="m-0">
									{isJson ? 'Schema (JSON)' : 'Schema (Structure)'}
								</FormLabel>

								<div className="flex items-center gap-2">
									<span className="text-[10px] text-muted-foreground">
										Type '#' to insert ref
									</span>

									{isJson && (
										<button
											type="button"
											onMouseDown={(e) => e.preventDefault()}
											onClick={handleGenerateSchema}
											className="text-[10px] flex items-center gap-1 text-primary hover:underline uppercase font-semibold cursor-pointer"
										>
											<Wand2 className="h-3 w-3" /> Auto-Generate
										</button>
									)}
								</div>
							</div>

							<FormControl>
								<SchemaAwareTextarea
									projectId={projectId}
									className="min-h-[300px] flex-1 bg-muted/20"
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
	);
};

export default FormRequestBodySection;
