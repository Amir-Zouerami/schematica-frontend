import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';
import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';

const FormResponsesSection: React.FC = () => {
	const { control, formState } = useFormContext();
	const { fields, append, remove } = useFieldArray({
		control,
		name: 'responses',
	});

	const { isSubmitting } = formState;

	const addResponse = () => {
		append({
			statusCode: '',
			description: '',
			schemaString: '{}',
			exampleString: '{}',
		});
	};

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-md font-medium">Responses</h3>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={addResponse}
					disabled={isSubmitting}
				>
					<Plus className="h-4 w-4 mr-1" /> Add Response
				</Button>
			</div>

			{fields.length > 0 ? (
				<div className="space-y-8">
					{fields.map((field, index) => (
						<div
							key={field.id}
							className="p-4 border border-border rounded-lg space-y-4 relative"
						>
							<div className="flex justify-between items-start">
								<div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
									<FormField
										control={control}
										name={`responses.${index}.statusCode`}
										render={({ field }) => (
											<FormItem>
												<FormLabel>Status Code</FormLabel>
												<FormControl>
													<Input
														className="font-mono"
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
										name={`responses.${index}.description`}
										render={({ field }) => (
											<FormItem>
												<FormLabel>Description</FormLabel>
												<FormControl>
													<Input {...field} disabled={isSubmitting} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => remove(index)}
									disabled={isSubmitting}
									className="absolute top-2 right-2"
								>
									<X className="h-4 w-4" />
								</Button>
							</div>

							<FormField
								control={control}
								name={`responses.${index}.schemaString`}
								render={({ field }) => (
									<FormItem>
										<FormLabel>Schema (JSON)</FormLabel>
										<FormControl>
											<Textarea
												className="font-mono"
												rows={6}
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
								name={`responses.${index}.exampleString`}
								render={({ field }) => (
									<FormItem>
										<FormLabel>Example (JSON)</FormLabel>
										<FormControl>
											<Textarea
												className="font-mono"
												rows={6}
												{...field}
												disabled={isSubmitting}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					))}
				</div>
			) : (
				<p className="text-center text-muted-foreground py-4">No responses defined.</p>
			)}
		</div>
	);
};

export default FormResponsesSection;
