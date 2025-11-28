import { useCreateSecret, useUpdateSecret } from '@/entities/Environment/api/useEnvironments';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/shared/api/api';
import type { components } from '@/shared/types/api-types';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

type SecretDto = components['schemas']['SecretDto'];

interface SecretFormDialogProps {
	projectId: string;
	environmentId: string;
	isOpen: boolean;
	onClose: () => void;
	secretToEdit?: SecretDto;
}

const secretSchema = z.object({
	key: z
		.string()
		.min(1, 'Key is required')
		.regex(
			/^[A-Z0-9_]+$/,
			'Key must be uppercase alphanumeric with underscores (e.g., API_KEY)',
		),
	value: z.string().min(1, 'Value is required'),
	description: z.string().optional(),
});

type SecretFormValues = z.infer<typeof secretSchema>;

export const SecretFormDialog: React.FC<SecretFormDialogProps> = ({
	projectId,
	environmentId,
	isOpen,
	onClose,
	secretToEdit,
}) => {
	const { toast } = useToast();
	const createMutation = useCreateSecret();
	const updateMutation = useUpdateSecret();

	const form = useForm<SecretFormValues>({
		resolver: zodResolver(secretSchema),
		defaultValues: {
			key: '',
			value: '',
			description: '',
		},
	});

	useEffect(() => {
		if (isOpen) {
			if (secretToEdit) {
				form.reset({
					key: secretToEdit.key,
					value: secretToEdit.value,
					description: secretToEdit.description || '',
				});
			} else {
				form.reset({
					key: '',
					value: '',
					description: '',
				});
			}
		}
	}, [isOpen, secretToEdit, form]);

	const onSubmit = async (values: SecretFormValues) => {
		try {
			if (secretToEdit) {
				await updateMutation.mutateAsync({
					projectId,
					environmentId,
					secretId: secretToEdit.id,
					data: {
						value: values.value,
						description: values.description,
					},
				});

				toast({ title: 'Success', description: 'Secret updated.' });
			} else {
				await createMutation.mutateAsync({
					projectId,
					environmentId,
					data: values,
				});

				toast({ title: 'Success', description: 'Secret created.' });
			}

			onClose();
		} catch (err) {
			const error = err as ApiError;

			toast({
				title: 'Error',
				description: error.message,
				variant: 'destructive',
			});
		}
	};

	const isSubmitting = createMutation.isPending || updateMutation.isPending;

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{secretToEdit ? 'Edit Secret' : 'Create Secret'}</DialogTitle>
				</DialogHeader>

				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<div className="space-y-2">
						<Label>Key</Label>

						<Input
							{...form.register('key')}
							placeholder="e.g. API_BASE_URL"
							disabled={!!secretToEdit || isSubmitting}
						/>

						{form.formState.errors.key && (
							<p className="text-xs text-red-500">
								{form.formState.errors.key.message}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label>Value</Label>

						<Input
							{...form.register('value')}
							placeholder="Secret value..."
							type="text"
							disabled={isSubmitting}
						/>

						{form.formState.errors.value && (
							<p className="text-xs text-red-500">
								{form.formState.errors.value.message}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label>Description (Optional)</Label>

						<Textarea
							{...form.register('description')}
							placeholder="What is this used for?"
							disabled={isSubmitting}
						/>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>

						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? 'Saving...' : 'Save'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};
