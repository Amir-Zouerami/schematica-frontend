import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { FormControl, FormField, FormItem, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Switch } from '@/shared/ui/switch';
import { Plus, Trash2, TriangleAlert } from 'lucide-react';
import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { EndpointFormValues } from '../model/endpoint-form-schema';

interface FormParametersSectionProps {
	paramType: 'path' | 'query' | 'header';
}

const FormParametersSection: React.FC<FormParametersSectionProps> = ({ paramType }) => {
	const { control, formState, watch } = useFormContext<EndpointFormValues>();
	const { fields, append, remove } = useFieldArray({
		control,
		name: 'parameters',
	});

	const { isSubmitting, errors } = formState;
	const allParameters = watch('parameters') || [];

	const filteredFields = fields
		.map((field, index) => ({ ...field, originalIndex: index }))
		.filter((field) => field.in === paramType);

	const addParameter = () => {
		append({
			name: '',
			in: paramType,
			required: false,
			description: '',
			schema: { type: 'string' },
		});
	};

	const hasDuplicatesInSection = () => {
		const paramsInSection = allParameters.filter((p) => p.in === paramType);
		const seen = new Set<string>();
		for (const p of paramsInSection) {
			if (!p.name) continue;
			const key = p.name.toLowerCase();
			if (seen.has(key)) return true;
			seen.add(key);
		}
		return false;
	};

	const parametersError =
		(errors.parameters as any)?.root?.message && hasDuplicatesInSection()
			? (errors.parameters as any).root.message
			: null;

	const SectionHeader = () => (
		<div className="flex justify-between items-center mb-4">
			<div>
				<h3 className="text-lg font-medium capitalize flex items-center gap-2">
					{paramType} Parameters
					<Badge variant="outline" className="text-xs font-normal text-muted-foreground">
						{filteredFields.length}
					</Badge>
				</h3>

				<p className="text-sm text-muted-foreground">
					{paramType === 'path'
						? 'Defined automatically by the endpoint URL path.'
						: `Add ${paramType} parameters expected by this endpoint.`}
				</p>
			</div>
			{paramType !== 'path' && (
				<Button
					type="button"
					size="sm"
					variant="secondary"
					onClick={addParameter}
					disabled={isSubmitting}
					className="cursor-pointer"
				>
					<Plus className="h-4 w-4 mr-2" /> Add{' '}
					{paramType === 'header' ? 'Header' : 'Param'}
				</Button>
			)}
		</div>
	);

	// Grid Header (Labels) - Desktop Only
	const GridHeader = () => (
		<div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 bg-muted/40 border-y border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
			<div className="col-span-3">Name</div>
			<div className="col-span-2">Type</div>
			<div className="col-span-1 text-center">Required</div>
			<div className="col-span-5">Description</div>
			<div className="col-span-1"></div>
		</div>
	);

	// Path Parameters
	if (paramType === 'path') {
		return (
			<div className="space-y-1">
				<SectionHeader />
				{parametersError && (
					<div className="flex items-center gap-2 p-3 mb-4 border border-red-600 rounded-lg bg-red-950/30 text-red-400 text-sm">
						<TriangleAlert className="h-4 w-4 shrink-0" />
						<span className="font-medium">{parametersError}</span>
					</div>
				)}
				{filteredFields.length === 0 ? (
					<div className="p-6 border border-dashed rounded-xl bg-secondary/10 text-center text-muted-foreground text-sm">
						No path variables detected. Add them to the <strong>Path</strong> field
						(e.g. <code className="bg-muted px-1 rounded">/users/{'{id}'}</code>).
					</div>
				) : (
					<div className="border rounded-xl overflow-hidden shadow-sm bg-card">
						<GridHeader />
						<div className="divide-y divide-border/50">
							{filteredFields.map((field) => (
								<div
									key={field.id}
									className="grid grid-cols-1 gap-y-4 p-4 md:grid-cols-12 md:gap-4 md:p-3 items-start hover:bg-secondary/20 transition-colors"
								>
									<div className="md:col-span-3 md:pt-2">
										<span className="text-xs font-bold text-muted-foreground uppercase mb-1 block md:hidden">
											Name
										</span>

										<Badge
											variant="secondary"
											className="font-mono text-sm px-2 py-1"
										>
											{field.name}
										</Badge>

										<input
											type="hidden"
											{...control.register(
												`parameters.${field.originalIndex}.name`,
											)}
										/>
									</div>

									<div className="md:col-span-2">
										<span className="text-xs font-bold text-muted-foreground uppercase mb-1 block md:hidden">
											Type
										</span>

										<FormField
											control={control}
											name={`parameters.${field.originalIndex}.schema.type`}
											render={({ field }) => (
												<FormItem className="space-y-0">
													<Select
														onValueChange={field.onChange}
														value={field.value}
														disabled={isSubmitting}
													>
														<FormControl>
															<SelectTrigger className="h-9 text-xs">
																<SelectValue />
															</SelectTrigger>
														</FormControl>

														<SelectContent>
															<SelectItem value="string">
																String
															</SelectItem>

															<SelectItem value="integer">
																Integer
															</SelectItem>

															<SelectItem value="number">
																Number
															</SelectItem>

															<SelectItem value="boolean">
																Boolean
															</SelectItem>

															<SelectItem value="uuid">
																UUID
															</SelectItem>
														</SelectContent>
													</Select>
												</FormItem>
											)}
										/>
									</div>

									<div className="md:col-span-1 flex md:justify-center md:pt-2 items-center justify-between">
										<span className="text-xs font-bold text-muted-foreground uppercase md:hidden">
											Required
										</span>

										<Badge
											variant="outline"
											className="opacity-50 cursor-not-allowed"
										>
											Yes
										</Badge>
									</div>

									<div className="md:col-span-5">
										<span className="text-xs font-bold text-muted-foreground uppercase mb-1 block md:hidden">
											Description
										</span>

										<FormField
											control={control}
											name={`parameters.${field.originalIndex}.description`}
											render={({ field }) => (
												<FormItem className="space-y-0">
													<FormControl>
														<Input
															{...field}
															placeholder="Description"
															className="h-9 text-sm"
															disabled={isSubmitting}
														/>
													</FormControl>
												</FormItem>
											)}
										/>
									</div>

									<div className="md:col-span-1"></div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		);
	}

	// Query / Header Parameters
	return (
		<div className="space-y-1">
			<SectionHeader />

			{parametersError && (
				<div className="flex items-center gap-2 p-3 mb-4 border border-red-600 rounded-lg bg-red-950/30 text-red-400 text-sm">
					<TriangleAlert className="h-4 w-4 shrink-0" />
					<span className="font-medium">{parametersError}</span>
				</div>
			)}

			{filteredFields.length > 0 ? (
				<div className="border rounded-xl overflow-hidden shadow-sm bg-card">
					<GridHeader />

					<div className="divide-y divide-border/50">
						{filteredFields.map((field) => (
							<div
								key={field.id}
								className="grid grid-cols-1 gap-y-4 p-4 md:grid-cols-12 md:gap-4 md:p-3 items-start group hover:bg-secondary/20 transition-colors relative"
							>
								<div className="md:col-span-3">
									<span className="text-xs font-bold text-muted-foreground uppercase mb-1 block md:hidden">
										Name
									</span>

									<FormField
										control={control}
										name={`parameters.${field.originalIndex}.name`}
										render={({ field }) => (
											<FormItem className="space-y-0">
												<FormControl>
													<Input
														{...field}
														placeholder="Name"
														className="h-9 font-mono text-sm"
														disabled={isSubmitting}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								<div className="md:col-span-2">
									<span className="text-xs font-bold text-muted-foreground uppercase mb-1 block md:hidden">
										Type
									</span>

									<FormField
										control={control}
										name={`parameters.${field.originalIndex}.schema.type`}
										render={({ field }) => (
											<FormItem className="space-y-0">
												<Select
													onValueChange={field.onChange}
													value={field.value}
													disabled={isSubmitting}
												>
													<FormControl>
														<SelectTrigger className="h-9 text-xs">
															<SelectValue />
														</SelectTrigger>
													</FormControl>

													<SelectContent>
														<SelectItem value="string">
															String
														</SelectItem>

														<SelectItem value="integer">
															Integer
														</SelectItem>

														<SelectItem value="number">
															Number
														</SelectItem>

														<SelectItem value="boolean">
															Boolean
														</SelectItem>

														<SelectItem value="array">Array</SelectItem>
														<SelectItem value="object">
															Object
														</SelectItem>
													</SelectContent>
												</Select>
											</FormItem>
										)}
									/>
								</div>

								<div className="md:col-span-1 flex md:justify-center md:pt-2 items-center justify-between">
									<span className="text-xs font-bold text-muted-foreground uppercase md:hidden">
										Required
									</span>

									<FormField
										control={control}
										name={`parameters.${field.originalIndex}.required`}
										render={({ field: { value, onChange, disabled } }) => (
											<FormItem className="space-y-0">
												<FormControl>
													<Switch
														checked={!!value}
														onCheckedChange={onChange}
														disabled={disabled || isSubmitting}
													/>
												</FormControl>
											</FormItem>
										)}
									/>
								</div>

								<div className="md:col-span-5">
									<span className="text-xs font-bold text-muted-foreground uppercase mb-1 block md:hidden">
										Description
									</span>

									<FormField
										control={control}
										name={`parameters.${field.originalIndex}.description`}
										render={({ field }) => (
											<FormItem className="space-y-0">
												<FormControl>
													<Input
														{...field}
														placeholder="Description"
														className="h-9 text-sm"
														disabled={isSubmitting}
													/>
												</FormControl>
											</FormItem>
										)}
									/>
								</div>

								<div className="md:col-span-1 flex justify-end absolute top-2 right-2 md:static">
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
										onClick={() => remove(field.originalIndex)}
										disabled={isSubmitting}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</div>
						))}
					</div>
				</div>
			) : (
				<div className="py-12 text-center border border-dashed rounded-xl bg-secondary/5">
					<p className="text-muted-foreground text-sm">
						No {paramType} parameters defined.
					</p>

					<Button
						variant="link"
						size="sm"
						onClick={addParameter}
						className="mt-1 text-primary cursor-pointer"
					>
						+ Add one now
					</Button>
				</div>
			)}
		</div>
	);
};

export default FormParametersSection;
