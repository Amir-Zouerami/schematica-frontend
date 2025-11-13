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
import { Edit, PlusCircle, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

type UserDto = components['schemas']['UserDto'];
type TeamDto = components['schemas']['TeamDto'];
type Role = components['schemas']['Role'];

const UserManagement = () => {
	const { data: usersResponse, isLoading: isLoadingUsers, error: usersError } = useAdminUsers();
	const { data: teamsResponse, isLoading: isLoadingTeams } = useTeams();
	const users = usersResponse?.data || [];
	const teams = teamsResponse?.data || [];
	const { toast } = useToast();

	const createUserMutation = useCreateUser();
	const updateUserMutation = useUpdateUser();
	const updateUserProfilePictureMutation = useUpdateUserProfilePictureAdmin();
	const deleteUserMutation = useDeleteUserAdmin();
	const isMutating =
		createUserMutation.isPending ||
		updateUserMutation.isPending ||
		updateUserProfilePictureMutation.isPending;

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<UserDto | null>(null);
	const [deletingUser, setDeletingUser] = useState<UserDto | null>(null);
	const [formData, setFormData] = useState({
		username: '',
		password: '',
		role: 'member' as Role,
		teams: [] as string[],
		profileImage: null as File | null,
	});

	const openFormForCreate = () => {
		setEditingUser(null);
		setFormData({
			username: '',
			password: '',
			role: 'member',
			teams: [],
			profileImage: null,
		});
		setIsFormOpen(true);
	};

	const openFormForEdit = (user: UserDto) => {
		setEditingUser(user);
		setFormData({
			username: user.username,
			password: '',
			role: user.role,
			teams: user.teams?.map((t: TeamDto) => t.id) || [],
			profileImage: null,
		});
		setIsFormOpen(true);
	};

	const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			setFormData((prev) => ({ ...prev, profileImage: e.target.files![0] }));
		}
	};

	const handleTeamToggle = (teamId: string) => {
		setFormData((prev) => {
			const newTeams = prev.teams.includes(teamId)
				? prev.teams.filter((t) => t !== teamId)
				: [...prev.teams, teamId];
			return { ...prev, teams: newTeams };
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			if (editingUser) {
				const updatePromises: Promise<any>[] = [];

				const userDetailsPayload = {
					role: formData.role,
					teams: formData.teams,
				};
				updatePromises.push(
					updateUserMutation.mutateAsync({
						userId: editingUser.id,
						userData: userDetailsPayload,
					}),
				);

				if (formData.profileImage) {
					const picturePayload = new FormData();
					picturePayload.append('file', formData.profileImage);
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
				const createPayload = new FormData();
				createPayload.append('username', formData.username);
				createPayload.append('password', formData.password);
				createPayload.append('role', formData.role);
				formData.teams.forEach((teamId) => createPayload.append('teams', teamId));
				if (formData.profileImage) {
					createPayload.append('file', formData.profileImage);
				}

				await createUserMutation.mutateAsync(createPayload);
				toast({ title: 'Success', description: 'User created successfully.' });
			}

			setIsFormOpen(false);
		} catch (err) {
			const errorMessage =
				err instanceof ApiError ? err.message : 'An unexpected error occurred.';
			toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
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
					<p className="text-destructive">
						Failed to load users:{' '}
						{usersError instanceof ApiError ? usersError.message : usersError.message}
					</p>
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
							<TableRow>
								<TableCell colSpan={4}>Loading users...</TableCell>
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
			</CardContent>

			<Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
				<DialogContent className="max-w-4xl">
					<DialogHeader>
						<DialogTitle>{editingUser ? 'Edit User' : 'Create New User'}</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleSubmit} className="py-4 space-y-4">
						<div>
							<Label htmlFor="username" className="inline-block py-5">
								Username
							</Label>
							<Input
								id="username"
								name="username"
								value={formData.username}
								onChange={handleFormChange}
								required
								disabled={!!editingUser}
							/>
						</div>
						{!editingUser && (
							<div>
								<Label htmlFor="password" className="inline-block py-5">
									Password
								</Label>
								<Input
									id="password"
									name="password"
									type="password"
									value={formData.password}
									onChange={handleFormChange}
									required={!editingUser}
								/>
							</div>
						)}
						<div>
							<Label htmlFor="role" className="inline-block py-5">
								Role
							</Label>
							<Select
								value={formData.role}
								onValueChange={(value) =>
									setFormData((p) => ({ ...p, role: value as Role }))
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="member">Member</SelectItem>
									<SelectItem value="admin">Admin</SelectItem>
									<SelectItem value="guest">Guest</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label className="inline-block py-5">Teams</Label>
							<div className="flex flex-wrap gap-2 p-2 border rounded-md">
								{isLoadingTeams ? (
									<p>Loading teams...</p>
								) : (
									teams.map((team) => (
										<Button
											key={team.id}
											type="button"
											variant={
												formData.teams.includes(team.id)
													? 'default'
													: 'secondary'
											}
											onClick={() => handleTeamToggle(team.id)}
										>
											{team.name}
										</Button>
									))
								)}
							</div>
						</div>
						<div>
							<Label htmlFor="profileImage" className="inline-block py-5">
								Profile Image
							</Label>
							<Input
								id="profileImage"
								name="profileImage"
								type="file"
								onChange={handleFileChange}
								accept="image/*"
							/>
						</div>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsFormOpen(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isMutating}>
								{isMutating ? 'Saving...' : 'Save'}
							</Button>
						</DialogFooter>
					</form>
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
