import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

interface FormRequestBodySectionProps {
	onAddRequestBody: () => void;
}

const FormRequestBodySection: React.FC<FormRequestBodySectionProps> = ({ onAddRequestBody }) => {
	const { control, formState } = useFormContext();
	const { isSubmitting } = formState;

	const requestBody = useWatch({
		control,
		name: 'requestBody',
	});

	if (requestBody === undefined || requestBody === null) {
		return (
			<div className="text-center py-4">
				<p className="text-muted-foreground">No request body defined.</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="mt-2"
					onClick={onAddRequestBody}
					disabled={isSubmitting}
				>
					Add Request Body
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-4">
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
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
							</FormControl>
							<SelectContent>
								<SelectItem value="application/json">application/json</SelectItem>
								<SelectItem value="application/xml">application/xml</SelectItem>
								<SelectItem value="text/plain">text/plain</SelectItem>
								<SelectItem value="multipart/form-data">
									multipart/form-data
								</SelectItem>
							</SelectContent>
						</Select>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={control}
				name="requestBody.description"
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

			<FormField
				control={control}
				name="requestBody.required"
				render={({ field }) => (
					<FormItem className="flex flex-row items-center space-x-2 space-y-0">
						<FormControl>
							<Switch
								checked={field.value}
								onCheckedChange={field.onChange}
								disabled={isSubmitting}
							/>
						</FormControl>
						<FormLabel>Required</FormLabel>
					</FormItem>
				)}
			/>

			<FormField
				control={control}
				name="requestBody.schemaString"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Schema (JSON)</FormLabel>
						<FormControl>
							<Textarea
								className="font-mono"
								rows={8}
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
				name="requestBody.exampleString"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Example (JSON)</FormLabel>
						<FormControl>
							<Textarea
								className="font-mono"
								rows={8}
								{...field}
								disabled={isSubmitting}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
		</div>
	);
};

export default FormRequestBodySection;
