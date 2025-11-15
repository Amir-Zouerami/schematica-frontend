import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Trash } from 'lucide-react';
import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';

interface FormParametersSectionProps {
	paramType: 'path' | 'query' | 'header';
}

const FormParametersSection: React.FC<FormParametersSectionProps> = ({ paramType }) => {
	const { control, formState } = useFormContext();
	const { fields, append, remove } = useFieldArray({
		control,
		name: 'parameters',
	});

	const { isSubmitting } = formState;

	const filteredFields = fields
		.map((field, index) => ({ ...field, originalIndex: index }))
		.filter((field: any) => field.in === paramType);

	const addParameter = () => {
		append({
			name: '',
			in: paramType,
			required: paramType === 'path',
			description: '',
			schema: { type: 'string' },
		});
	};

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-md font-medium capitalize">{paramType} Parameters</h3>
				<Button
					type="button"
					size="sm"
					variant="outline"
					onClick={addParameter}
					disabled={isSubmitting}
				>
					Add {paramType} Param
				</Button>
			</div>

			{filteredFields.length > 0 ? (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Required</TableHead>
							<TableHead>Description</TableHead>
							<TableHead className="w-[50px]"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredFields.map((field) => (
							<TableRow key={field.id}>
								<TableCell>
									<FormField
										control={control}
										name={`parameters.${field.originalIndex}.name`}
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<Input {...field} disabled={isSubmitting} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</TableCell>
								<TableCell>
									<FormField
										control={control}
										name={`parameters.${field.originalIndex}.required`}
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<Switch
														checked={field.value}
														onCheckedChange={field.onChange}
														disabled={
															paramType === 'path' || isSubmitting
														}
													/>
												</FormControl>
											</FormItem>
										)}
									/>
								</TableCell>
								<TableCell>
									<FormField
										control={control}
										name={`parameters.${field.originalIndex}.description`}
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<Input {...field} disabled={isSubmitting} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</TableCell>
								<TableCell>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={() => remove(field.originalIndex)}
										disabled={isSubmitting}
									>
										<Trash className="h-4 w-4" />
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			) : (
				<p className="text-center text-muted-foreground py-4">
					No {paramType} parameters defined.
				</p>
			)}
		</div>
	);
};

export default FormParametersSection;
