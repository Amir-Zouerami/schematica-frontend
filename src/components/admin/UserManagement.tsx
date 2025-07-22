import { User } from '@/types/types';
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useTeams } from '@/hooks/api/useTeams';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, PlusCircle, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminUsers, useCreateUser, useUpdateUser, useDeleteUserAdmin } from '@/hooks/api/useUsersAdmin';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

const UserManagement = () => {
	const { data: users = [], isLoading: isLoadingUsers } = useAdminUsers();
	const { data: teams = [], isLoading: isLoadingTeams } = useTeams();
	const { toast } = useToast();

	const createUserMutation = useCreateUser();
	const updateUserMutation = useUpdateUser();
	const deleteUserMutation = useDeleteUserAdmin();

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [deletingUser, setDeletingUser] = useState<User | null>(null);
	const [formData, setFormData] = useState({
		username: '',
		password: '',
		role: 'member',
		teams: [] as string[],
		profileImage: null as File | null,
	});

	const openFormForCreate = () => {
		setEditingUser(null);
		setFormData({ username: '', password: '', role: 'member', teams: [], profileImage: null });
		setIsFormOpen(true);
	};

	const openFormForEdit = (user: User) => {
		setEditingUser(user);
		setFormData({
			username: user.username,
			password: '',
			role: user.role,
			teams: user.teams || [],
			profileImage: null,
		});
		setIsFormOpen(true);
	};

	const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData(prev => ({ ...prev, [name]: value }));
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			setFormData(prev => ({ ...prev, profileImage: e.target.files![0] }));
		}
	};

	const handleTeamToggle = (teamId: string) => {
		setFormData(prev => {
			const newTeams = prev.teams.includes(teamId) ? prev.teams.filter(t => t !== teamId) : [...prev.teams, teamId];
			return { ...prev, teams: newTeams };
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const formPayload = new FormData();
		formPayload.append('username', formData.username);

		if (formData.password && !editingUser) formPayload.append('password', formData.password);

		formPayload.append('role', formData.role);
		formData.teams.forEach(teamId => formPayload.append('teams[]', teamId));

		if (formData.profileImage) formPayload.append('profileImage', formData.profileImage);

		try {
			if (editingUser) {
				await updateUserMutation.mutateAsync({ userId: editingUser.id, userData: formPayload });
				toast({ title: 'Success', description: 'User updated successfully.' });
			}
			else {
				await createUserMutation.mutateAsync(formPayload);
				toast({ title: 'Success', description: 'User created successfully.' });
			}

			setIsFormOpen(false);
		}
		catch (error: any) {
			toast({ title: 'Error', description: error.message, variant: 'destructive' });
		}
	};

	const handleDelete = (user: User) => {
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
		}
		catch (error: any) {
			toast({ title: 'Error', description: error.message, variant: 'destructive' });
		}
	};

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
							users.map(user => (
								<TableRow key={user.id}>
									<TableCell className="font-medium flex items-center gap-2">
										<Avatar className="h-8 w-8">
											<AvatarImage src={user.profileImage} alt={user.username} />
											<AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
										</Avatar>

										{user.username}
									</TableCell>

									<TableCell className="capitalize">{user.role}</TableCell>

									<TableCell>
										{user.teams?.map(teamId => (
											<Badge key={teamId} variant="outline" className="mr-1">
												{teamId}
											</Badge>
										))}
									</TableCell>

									<TableCell className="text-right">
										<Button variant="ghost" size="icon" onClick={() => openFormForEdit(user)}>
											<Edit className="h-4 w-4" />
										</Button>

										<Button variant="ghost" size="icon" onClick={() => handleDelete(user)} className="text-red-500">
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
								placeholder={editingUser ? 'Leave blank to keep unchanged' : ''}
							/>
						</div>

						<div>
							<Label htmlFor="role" className="inline-block py-5">
								Role
							</Label>
							<Select value={formData.role} onValueChange={value => setFormData(p => ({ ...p, role: value }))}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="member">Member</SelectItem>
									<SelectItem value="admin">Admin</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label className="inline-block py-5">Teams</Label>
							<div className="flex flex-wrap gap-2 p-2 border rounded-md">
								{isLoadingTeams ? (
									<p>Loading teams...</p>
								) : (
									teams.map(team => (
										<Button
											key={team.id}
											type="button"
											variant={formData.teams.includes(team.id) ? 'default' : 'secondary'}
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
							<Input id="profileImage" name="profileImage" type="file" onChange={handleFileChange} accept="image/*" />
						</div>

						<DialogFooter>
							<Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
								Cancel
							</Button>

							<Button type="submit" disabled={createUserMutation.isPending || updateUserMutation.isPending}>
								Save
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
						This will permanently delete the user "{deletingUser?.username}". This cannot be undone.
					</DialogDescription>

					<DialogFooter>
						<Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
							Cancel
						</Button>

						<Button variant="destructive" onClick={confirmDelete} disabled={deleteUserMutation.isPending}>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	);
};

export default UserManagement;
