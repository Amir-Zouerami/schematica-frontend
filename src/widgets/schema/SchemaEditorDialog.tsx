import EditorLoading from '@/components/openapi/EditorLoading';
import { useCreateSchema, useUpdateSchema } from '@/entities/Schema/api/useSchemas';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/shared/api/api';
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
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Textarea } from '@/shared/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

const OpenApiMonacoEditor = lazy(() => import('@/components/openapi/OpenApiMonacoEditor'));

type SchemaComponentDto = components['schemas']['SchemaComponentDto'];

interface SchemaEditorDialogProps {
	projectId: string;
	isOpen: boolean;
	onClose: () => void;
	schemaToEdit?: SchemaComponentDto;
	readOnly?: boolean;
}

const schemaFormSchema = z.object({
	name: z
		.string()
		.min(1, 'Name is required')
		.regex(/^[a-zA-Z0-9_-]+$/, 'Name must be alphanumeric with underscores or hyphens only.'),
	description: z.string().optional(),
	schemaString: z.string().refine(
		(val) => {
			try {
				JSON.parse(val);
				return true;
			} catch {
				return false;
			}
		},
		{ message: 'Invalid JSON format' },
	),
});

type SchemaFormValues = z.infer<typeof schemaFormSchema>;

const DEFAULT_SCHEMA_TEMPLATE = `{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    }
  },
  "required": ["id"]
}`;

export const SchemaEditorDialog: React.FC<SchemaEditorDialogProps> = ({
	projectId,
	isOpen,
	onClose,
	schemaToEdit,
	readOnly = false,
}) => {
	const { toast } = useToast();
	const createMutation = useCreateSchema();
	const updateMutation = useUpdateSchema();
	const [activeTab, setActiveTab] = useState<'metadata' | 'editor'>('metadata');

	const form = useForm<SchemaFormValues>({
		resolver: zodResolver(schemaFormSchema),
		defaultValues: {
			name: '',
			description: '',
			schemaString: DEFAULT_SCHEMA_TEMPLATE,
		},
	});

	useEffect(() => {
		if (isOpen) {
			if (schemaToEdit) {
				form.reset({
					name: schemaToEdit.name,
					description: schemaToEdit.description || '',
					schemaString: JSON.stringify(schemaToEdit.schema, null, 2),
				});
			} else {
				form.reset({
					name: '',
					description: '',
					schemaString: DEFAULT_SCHEMA_TEMPLATE,
				});
			}
			setActiveTab('metadata');
		}
	}, [isOpen, schemaToEdit, form]);

	const onSubmit = async (values: SchemaFormValues) => {
		if (readOnly) return;

		try {
			const parsedSchema = JSON.parse(values.schemaString);

			if (schemaToEdit) {
				await updateMutation.mutateAsync({
					projectId,
					name: schemaToEdit.name,
					data: {
						name: values.name !== schemaToEdit.name ? values.name : undefined,
						description: values.description,
						schema: parsedSchema,
					},
				});

				toast({ title: 'Success', description: 'Schema updated successfully.' });
			} else {
				await createMutation.mutateAsync({
					projectId,
					data: {
						name: values.name,
						description: values.description,
						schema: parsedSchema,
					},
				});

				toast({ title: 'Success', description: 'Schema created successfully.' });
			}

			onClose();
		} catch (err) {
			const error = err as ApiError;
			if (error.status === 409) {
				form.setError('name', { message: 'A schema with this name already exists.' });
			} else if (
				error.metaCode === 'SPEC_LINTING_FAILED' ||
				error.metaCode === 'SPEC_VALIDATION_FAILED'
			) {
				const details = error.errorResponse?.message;
				let errorMsg = 'Validation failed.';

				if (
					typeof details === 'object' &&
					details !== null &&
					'errors' in details &&
					Array.isArray((details as any).errors)
				) {
					const validations = (details as any).errors;
					const list = validations
						.map((v: any) => `• ${v.message} at ${v.path?.join('/')}`)
						.join('\n');
					errorMsg = `Schema validation failed:\n${list}`;
				} else if (typeof details === 'object' && 'message' in details) {
					errorMsg = (details as any).message;
				}

				toast({
					title: 'Validation Error',
					description: <pre className="whitespace-pre-wrap text-xs mt-2">{errorMsg}</pre>,
					variant: 'destructive',
					duration: 10000,
				});
			} else {
				toast({
					title: 'Error',
					description: error.message,
					variant: 'destructive',
				});
			}
		}
	};

	const isSubmitting = createMutation.isPending || updateMutation.isPending;

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="w-screen h-dvh max-w-none rounded-none sm:rounded-lg sm:max-w-4xl sm:h-[80vh] flex flex-col p-0 gap-0">
				<DialogHeader className="px-6 py-4 border-b shrink-0">
					<DialogTitle>
						{readOnly
							? `View Schema: ${schemaToEdit?.name}`
							: schemaToEdit
								? `Edit Schema: ${schemaToEdit.name}`
								: 'Create Reusable Schema'}
					</DialogTitle>

					<DialogDescription className="hidden sm:block">
						{readOnly ? 'View the schema definition.' : 'Define a reusable data model.'}
					</DialogDescription>
				</DialogHeader>

				<form
					id="schema-form"
					onSubmit={form.handleSubmit(onSubmit)}
					className="flex-1 flex flex-col overflow-hidden"
				>
					<Tabs
						value={activeTab}
						onValueChange={(v) => setActiveTab(v as any)}
						className="flex-1 flex flex-col"
					>
						<TabsList className="grid w-full grid-cols-2 mb-4 shrink-0 rounded-none bg-muted/30 p-1">
							<TabsTrigger value="metadata">Metadata</TabsTrigger>
							<TabsTrigger value="editor">JSON Schema</TabsTrigger>
						</TabsList>

						<TabsContent
							value="metadata"
							className="space-y-6 mt-0 flex-1 p-6"
							tabIndex={-1}
						>
							<div className="space-y-4 max-w-md mx-auto">
								<div className="space-y-2">
									<Label>Name</Label>
									<Input
										{...form.register('name')}
										placeholder="e.g. User"
										disabled={isSubmitting || readOnly}
									/>

									<p className="text-xs text-muted-foreground break-all">
										Ref:{' '}
										<code className="bg-muted px-1 rounded text-primary">
											$ref: '#/components/schemas/...'
										</code>
									</p>

									{form.formState.errors.name && (
										<p className="text-xs text-red-500">
											{form.formState.errors.name.message}
										</p>
									)}
								</div>

								<div className="space-y-2">
									<Label>Description</Label>
									<Textarea
										{...form.register('description')}
										placeholder="What does this object represent?"
										disabled={isSubmitting || readOnly}
										className="h-32"
									/>
								</div>
							</div>
						</TabsContent>

						<TabsContent
							value="editor"
							className="flex-1 mt-0 relative min-h-[300px] border-t w-full"
							tabIndex={-1}
						>
							<Controller
								name="schemaString"
								control={form.control}
								render={({ field }) => (
									<Suspense fallback={<EditorLoading />}>
										<OpenApiMonacoEditor
											value={field.value}
											onChange={readOnly ? undefined : field.onChange}
											height="100%"
										/>
									</Suspense>
								)}
							/>

							{form.formState.errors.schemaString && (
								<div className="absolute bottom-4 left-4 right-4 bg-red-500/10 border border-red-500/20 text-red-500 p-2 rounded text-xs backdrop-blur-sm z-10">
									{form.formState.errors.schemaString.message}
								</div>
							)}
						</TabsContent>
					</Tabs>
				</form>

				<DialogFooter className="px-6 py-4 border-t shrink-0 flex flex-col gap-2 sm:flex-row sm:justify-end">
					<Button
						type="button"
						variant="outline"
						onClick={onClose}
						disabled={isSubmitting}
						className="w-full sm:w-auto"
					>
						Close
					</Button>

					{!readOnly && (
						<Button
							type="submit"
							form="schema-form"
							disabled={isSubmitting}
							className="w-full sm:w-auto"
						>
							{isSubmitting ? 'Saving...' : 'Save Schema'}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
