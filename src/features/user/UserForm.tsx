import { useTeams } from '@/entities/Team/api/useTeams';
import type { components } from '@/shared/types/api-types';
import { MultiSelect, MultiSelectOption } from '@/shared/ui/multi-select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/shared/ui/button';
import { DialogFooter } from '@/shared/ui/dialog';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

type UserDto = components['schemas']['UserDto'];

const baseUserSchema = z.object({
	role: z.enum(['admin', 'member', 'guest']),
	teams: z.array(z.string()).optional(),
	profileImage: z
		.any()
		.refine((file) => !file || file.size <= MAX_FILE_SIZE, `Max image size is 5MB.`)
		.refine(
			(file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type),
			'Only .jpg, .jpeg, .png, .webp, and .gif formats are supported.',
		)
		.optional(),
});

const createUserFormSchema = baseUserSchema.extend({
	username: z.string().min(1, 'Username is required.'),
	password: z.string().min(8, 'Password must be at least 8 characters long.'),
});

const editUserFormSchema = baseUserSchema
	.extend({
		password: z
			.string()
			.min(8, 'New password must be at least 8 characters long.')
			.optional()
			.or(z.literal('')),
		confirmPassword: z.string().optional(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match.",
		path: ['confirmPassword'],
	});

export type UserFormValues = z.infer<typeof createUserFormSchema | typeof editUserFormSchema>;

interface UserFormProps {
	user?: UserDto;
	onSubmit: (values: FormData) => Promise<void>;
	onCancel: () => void;
	isSubmitting: boolean;
}

export const UserForm: React.FC<UserFormProps> = ({ user, onSubmit, onCancel, isSubmitting }) => {
	const [teamSearch, setTeamSearch] = useState('');
	const [debouncedTeamSearch, setDebouncedTeamSearch] = useState('');
	const {
		data: teamsResponse,
		isLoading: isLoadingTeams,
		error: teamsError,
	} = useTeams(1, 100, debouncedTeamSearch);

	const isEditMode = !!user;

	const form = useForm<UserFormValues>({
		resolver: zodResolver(isEditMode ? editUserFormSchema : createUserFormSchema),
		defaultValues: isEditMode
			? {
					role: user.role,
					teams: user.teams?.map((t) => t.id) || [],
					profileImage: null,
					password: '',
					confirmPassword: '',
				}
			: {
					username: '',
					password: '',
					role: 'member',
					teams: [],
					profileImage: null,
				},
	});

	useEffect(() => {
		const handler = setTimeout(() => setDebouncedTeamSearch(teamSearch), 300);
		return () => clearTimeout(handler);
	}, [teamSearch]);

	const teamOptions: MultiSelectOption[] = useMemo(
		() => teamsResponse?.data?.map((t) => ({ value: t.id, label: t.name })) || [],
		[teamsResponse],
	);

	const handleFormSubmit = async (values: UserFormValues) => {
		const formData = new FormData();

		formData.append('role', values.role);
		(values.teams || []).forEach((teamId) => formData.append('teams', teamId));
		if (values.profileImage) {
			formData.append('file', values.profileImage);
		}

		if (isEditMode) {
			const editValues = values as z.infer<typeof editUserFormSchema>;
			if (editValues.password) {
				formData.append('password', editValues.password);
			}
		} else {
			const createValues = values as z.infer<typeof createUserFormSchema>;
			formData.append('username', createValues.username);
			formData.append('password', createValues.password);
		}

		await onSubmit(formData);
	};

	return (
		<FormProvider {...form}>
			<form onSubmit={form.handleSubmit(handleFormSubmit)} className="py-4 space-y-4">
				<FormField
					control={form.control}
					name="username"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Username</FormLabel>
							<FormControl>
								<Input
									{...field}
									required
									disabled={isEditMode}
									defaultValue={isEditMode ? user.username : ''}
								/>
							</FormControl>

							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="password"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								{isEditMode ? 'New Password (Optional)' : 'Password'}
							</FormLabel>

							<FormControl>
								<Input
									type="password"
									{...field}
									required={!isEditMode}
									placeholder={isEditMode ? 'Leave blank to keep current' : ''}
								/>
							</FormControl>

							<FormMessage />
						</FormItem>
					)}
				/>

				{isEditMode && (
					<FormField
						control={form.control}
						name="confirmPassword"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Confirm New Password</FormLabel>
								<FormControl>
									<Input type="password" {...field} />
								</FormControl>

								<FormMessage />
							</FormItem>
						)}
					/>
				)}

				<FormField
					control={form.control}
					name="role"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Role</FormLabel>
							<Select onValueChange={field.onChange} value={field.value}>
								<FormControl>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
								</FormControl>

								<SelectContent>
									<SelectItem value="member">Member</SelectItem>
									<SelectItem value="admin">Admin</SelectItem>
									<SelectItem value="guest">Guest</SelectItem>
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="teams"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Teams</FormLabel>
							{teamsError ? (
								<p className="text-sm text-destructive">
									Failed to load teams: {teamsError.message}
								</p>
							) : (
								<MultiSelect
									options={teamOptions}
									selected={field.value || []}
									onChange={field.onChange}
									placeholder="Select teams..."
									isLoading={isLoadingTeams}
									onSearch={setTeamSearch}
								/>
							)}
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="profileImage"
					render={({ field: { value, onChange, ...rest } }) => (
						<FormItem>
							<FormLabel>Profile Image</FormLabel>
							<FormControl>
								<Input
									type="file"
									accept="image/*"
									onChange={(e) =>
										onChange(e.target.files ? e.target.files[0] : null)
									}
									{...rest}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? 'Saving...' : 'Save'}
					</Button>
				</DialogFooter>
			</form>
		</FormProvider>
	);
};
