import { useTeams } from '@/hooks/api/useTeams';
import {
	useAdminUsers,
	useCreateUser,
	useDeleteUserAdmin,
	useUpdateUser,
	useUpdateUserProfilePictureAdmin,
} from '@/hooks/api/useUsersAdmin';
import { useToast } from '@/hooks/use-toast';
import type { components } from '@/types/api-types';
import { ApiError } from '@/utils/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit, PlusCircle, Search, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from '@/components/ui/pagination';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Skeleton } from '../ui/skeleton';

// --- Type Definitions ---
type UserDto = components['schemas']['UserDto'];
type TeamDto = components['schemas']['TeamDto'];
type Role = components['schemas']['Role'];
type UpdateUserDto = components['schemas']['UpdateUserDto'];

// --- Zod Schema for Validation ---
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

// Base schema for fields present in both create and edit modes
const baseUserSchema = z.object({
	username: z.string().min(1, 'Username is required.'),
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

// Schema for creating a new user (requires password)
const createUserSchema = baseUserSchema.extend({
	password: z.string().min(8, 'Password must be at least 8 characters long.'),
});

// Schema for editing an existing user (password is optional)
const editUserSchema = baseUserSchema
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

type CreateUserFormValues = z.infer<typeof createUserSchema>;
type EditUserFormValues = z.infer<typeof editUserSchema>;

const UserManagement = () => {
	const [page, setPage] = useState(1);
	const [searchTerm, setSearchTerm] = useState('');
	const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedSearchTerm(searchTerm);
			setPage(1);
		}, 500);
		return () => clearTimeout(handler);
	}, [searchTerm]);

	const {
		data: usersResponse,
		isLoading: isLoadingUsers,
		error: usersError,
	} = useAdminUsers(page, 10, debouncedSearchTerm);

	const { data: teamsResponse, isLoading: isLoadingTeams } = useTeams();

	const users = usersResponse?.data || [];
	const meta = usersResponse?.meta;
	const teams = teamsResponse?.data || [];
	const { toast } = useToast();

	const createUserMutation = useCreateUser();
	const updateUserMutation = useUpdateUser();
	const updateUserProfilePictureMutation = useUpdateUserProfilePictureAdmin();
	const deleteUserMutation = useDeleteUserAdmin();

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<UserDto | null>(null);
	const [deletingUser, setDeletingUser] = useState<UserDto | null>(null);

	const formSchema = editingUser ? editUserSchema : createUserSchema;

	const form = useForm<CreateUserFormValues | EditUserFormValues>({
		resolver: zodResolver(formSchema),
	});

	const { isSubmitting } = form.formState;

	useEffect(() => {
		if (isFormOpen) {
			if (editingUser) {
				form.reset({
					username: editingUser.username,
					role: editingUser.role,
					teams: editingUser.teams?.map((t: TeamDto) => t.id) || [],
					profileImage: null,
					password: '',
					confirmPassword: '',
				});
			} else {
				form.reset({
					username: '',
					password: '',
					role: 'member',
					teams: [],
					profileImage: null,
				});
			}
		}
	}, [isFormOpen, editingUser, form]);

	const openFormForCreate = () => {
		setEditingUser(null);
		setIsFormOpen(true);
	};

	const openFormForEdit = (user: UserDto) => {
		setEditingUser(user);
		setIsFormOpen(true);
	};

	const onSubmit = async (values: CreateUserFormValues | EditUserFormValues) => {
		try {
			if (editingUser) {
				const editValues = values as EditUserFormValues;
				const updatePromises: Promise<any>[] = [];

				const userDetailsPayload: UpdateUserDto = {
					role: editValues.role,
					teams: editValues.teams || [],
				};

				// Conditionally add password to payload if provided
				if (editValues.password) {
					userDetailsPayload.password = editValues.password;
				}

				updatePromises.push(
					updateUserMutation.mutateAsync({
						userId: editingUser.id,
						userData: userDetailsPayload,
					}),
				);

				if (editValues.profileImage) {
					const picturePayload = new FormData();
					picturePayload.append('file', editValues.profileImage);
					updatePromises.push(
						updateUserProfilePictureMutation.mutateAsync({
							userId: editingUser.id,
							fileData: picturePayload,
						}),
					);
				}

				await Promise.all(updatePromises);
				toast({ title: 'Success', description: 'User updated successfully.' });
			} else {
				const createValues = values as CreateUserFormValues;
				const createPayload = new FormData();
				createPayload.append('username', createValues.username);
				createPayload.append('password', createValues.password);
				createPayload.append('role', createValues.role);
				(createValues.teams || []).forEach((teamId) =>
					createPayload.append('teams', teamId),
				);
				if (createValues.profileImage) {
					createPayload.append('file', createValues.profileImage);
				}

				await createUserMutation.mutateAsync(createPayload);
				toast({ title: 'Success', description: 'User created successfully.' });
			}
			setIsFormOpen(false);
		} catch (err) {
			const apiError = err as ApiError;
			if (apiError.status === 409) {
				let errorMessage = apiError.message;
				try {
					const parsedError = JSON.parse(errorMessage);
					if (parsedError && typeof parsedError.message === 'string') {
						errorMessage = parsedError.message;
					}
				} catch (e) {
					// Not a JSON string, use as is.
				}
				form.setError('username', { type: 'server', message: errorMessage });
			} else {
				toast({
					title: 'Error',
					description: apiError.message || 'An unexpected error occurred.',
					variant: 'destructive',
				});
			}
		}
	};

	const handleDelete = (user: UserDto) => {
		setDeletingUser(user);
		setIsDeleteDialogOpen(true);
	};

	const confirmDelete = async () => {
		if (!deletingUser) return;
		try {
			await deleteUserMutation.mutateAsync(deletingUser.id);
			toast({ title: 'Success', description: 'User deleted successfully.' });
			setIsDeleteDialogOpen(false);
			setDeletingUser(null);
		} catch (err) {
			const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete user.';
			toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
		}
	};

	if (usersError) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Users</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-destructive">Failed to load users: {usersError.message}</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex justify-between items-center">
					Users
					<Button onClick={openFormForCreate}>
						<PlusCircle className="mr-2 h-4 w-4" /> Create User
					</Button>
				</CardTitle>
				<div className="relative mt-4">
					<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search by username..."
						value={searchTerm}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setSearchTerm(e.target.value)
						}
						className="w-full rounded-lg bg-background pl-8"
					/>
				</div>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>User</TableHead>
							<TableHead>Role</TableHead>
							<TableHead>Teams</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoadingUsers ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell colSpan={4}>
										<Skeleton className="h-10 w-full" />
									</TableCell>
								</TableRow>
							))
						) : users.length === 0 ? (
							<TableRow>
								<TableCell colSpan={4} className="h-24 text-center">
									No users found.
								</TableCell>
							</TableRow>
						) : (
							users.map((user) => (
								<TableRow key={user.id}>
									<TableCell className="font-medium flex items-center gap-2">
										<Avatar className="h-8 w-8">
											<AvatarImage
												src={
													typeof user.profileImage === 'string'
														? user.profileImage
														: undefined
												}
												alt={user.username}
											/>
											<AvatarFallback>
												{user.username.substring(0, 2).toUpperCase()}
											</AvatarFallback>
										</Avatar>
										{user.username}
									</TableCell>
									<TableCell className="capitalize">{user.role}</TableCell>
									<TableCell>
										{user.teams?.map((team: TeamDto) => (
											<Badge key={team.id} variant="outline" className="mr-1">
												{team.name}
											</Badge>
										))}
									</TableCell>
									<TableCell className="text-right">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => openFormForEdit(user)}
										>
											<Edit className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleDelete(user)}
											className="text-red-500"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
				{meta && meta.total > meta.limit && (
					<div className="mt-4 flex items-center justify-end">
						<Pagination>
							<PaginationContent>
								<PaginationItem>
									<PaginationPrevious
										href="#"
										size="default"
										onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
											e.preventDefault();
											setPage((old) => Math.max(old - 1, 1));
										}}
										className={
											page === 1 ? 'pointer-events-none opacity-50' : ''
										}
									/>
								</PaginationItem>
								<span className="text-sm text-muted-foreground mx-2">
									Page {meta.page} of {meta.lastPage}
								</span>
								<PaginationItem>
									<PaginationNext
										href="#"
										size="default"
										onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
											e.preventDefault();
											if (page < meta.lastPage) {
												setPage((old) => old + 1);
											}
										}}
										className={
											page === meta.lastPage
												? 'pointer-events-none opacity-50'
												: ''
										}
									/>
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					</div>
				)}
			</CardContent>

			<Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
				<DialogContent className="max-w-4xl">
					<DialogHeader>
						<DialogTitle>{editingUser ? 'Edit User' : 'Create New User'}</DialogTitle>
					</DialogHeader>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="py-4 space-y-4">
							<FormField
								control={form.control}
								name="username"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Username</FormLabel>
										<FormControl>
											<Input {...field} required disabled={!!editingUser} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							{editingUser ? (
								<>
									<FormField
										control={form.control}
										name="password"
										render={({ field }) => (
											<FormItem>
												<FormLabel>New Password (Optional)</FormLabel>
												<FormControl>
													<Input
														type="password"
														placeholder="Leave blank to keep current password"
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
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
								</>
							) : (
								<FormField
									control={form.control}
									name="password"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Password</FormLabel>
											<FormControl>
												<Input type="password" {...field} required />
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
										<Select
											onValueChange={field.onChange}
											value={field.value as Role}
										>
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
										<div className="flex flex-wrap gap-2 p-2 border rounded-md">
											{isLoadingTeams ? (
												<p>Loading teams...</p>
											) : (
												teams.map((team) => (
													<Button
														key={team.id}
														type="button"
														variant={
															(field.value || []).includes(team.id)
																? 'default'
																: 'secondary'
														}
														onClick={() => {
															const currentTeams = field.value || [];
															const newTeams = currentTeams.includes(
																team.id,
															)
																? currentTeams.filter(
																		(t) => t !== team.id,
																	)
																: [...currentTeams, team.id];
															field.onChange(newTeams);
														}}
													>
														{team.name}
													</Button>
												))
											)}
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="profileImage"
								render={({ field: { onChange, value, ...rest } }) => (
									<FormItem>
										<FormLabel>Profile Image</FormLabel>
										<FormControl>
											<Input
												type="file"
												accept="image/*"
												onChange={(e) =>
													onChange(
														e.target.files ? e.target.files[0] : null,
													)
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
									onClick={() => setIsFormOpen(false)}
									disabled={isSubmitting}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting ? 'Saving...' : 'Save'}
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>

			<Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Are you sure?</DialogTitle>
					</DialogHeader>
					<DialogDescription className="py-1 leading-6">
						This will permanently delete the user "{deletingUser?.username}". This
						cannot be undone.
					</DialogDescription>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={confirmDelete}
							disabled={deleteUserMutation.isPending}
						>
							{deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	);
};

export default UserManagement;
