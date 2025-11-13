import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTeams, useCreateTeam, useUpdateTeam, useDeleteTeam } from '@/hooks/api/useTeams';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '@/components/ui/dialog';

const TeamManagement = () => {
	const { data: teams = [], isLoading } = useTeams();
	const { toast } = useToast();

	const createTeamMutation = useCreateTeam();
	const updateTeamMutation = useUpdateTeam();
	const deleteTeamMutation = useDeleteTeam();

	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const [newTeamName, setNewTeamName] = useState('');
	const [editingTeam, setEditingTeam] = useState<{ id: string; name: string } | null>(null);
	const [deletingTeam, setDeletingTeam] = useState<{ id: string; name: string } | null>(null);

	const handleCreate = async () => {
		if (!newTeamName.trim()) {
			toast({
				title: 'Error',
				description: 'Team name cannot be empty.',
				variant: 'destructive',
				duration: 2000,
			});
			return;
		}
		try {
			await createTeamMutation.mutateAsync(newTeamName);
			toast({ title: 'Success', description: 'Team created successfully.' });

			setIsCreateDialogOpen(false);
			setNewTeamName('');
		} catch (error: any) {
			toast({ title: 'Error', description: error.message, variant: 'destructive' });
		}
	};

	const handleEdit = (team: { id: string; name: string }) => {
		setEditingTeam(team);
		setNewTeamName(team.name);
		setIsEditDialogOpen(true);
	};

	const handleUpdate = async () => {
		if (!editingTeam || !newTeamName.trim()) {
			toast({
				title: 'Error',
				description: 'Team name cannot be empty.',
				variant: 'destructive',
			});
			return;
		}

		try {
			await updateTeamMutation.mutateAsync({ teamId: editingTeam.id, newName: newTeamName });

			toast({ title: 'Success', description: 'Team updated successfully.' });
			setIsEditDialogOpen(false);
			setEditingTeam(null);
			setNewTeamName('');
		} catch (error: any) {
			toast({ title: 'Error', description: error.message, variant: 'destructive' });
		}
	};

	const handleDelete = (team: { id: string; name: string }) => {
		setDeletingTeam(team);
		setIsDeleteDialogOpen(true);
	};

	const confirmDelete = async () => {
		if (!deletingTeam) return;

		try {
			await deleteTeamMutation.mutateAsync(deletingTeam.id);

			toast({ title: 'Success', description: 'Team deleted successfully.' });
			setIsDeleteDialogOpen(false);
			setDeletingTeam(null);
		} catch (error: any) {
			toast({ title: 'Error', description: error.message, variant: 'destructive' });
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex justify-between items-center">
					Teams
					<Button onClick={() => setIsCreateDialogOpen(true)}>
						<PlusCircle className="mr-2 h-4 w-4" /> Create Team
					</Button>
				</CardTitle>
			</CardHeader>

			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Team Name</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>

					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={2}>Loading teams...</TableCell>
							</TableRow>
						) : teams.length === 0 ? (
							<TableRow>
								<TableCell colSpan={2}>No teams found.</TableCell>
							</TableRow>
						) : (
							teams.map((team) => (
								<TableRow key={team.id}>
									<TableCell className="font-medium">{team.name}</TableCell>

									<TableCell className="text-right">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleEdit(team)}
										>
											<Edit className="h-4 w-4" />
										</Button>

										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleDelete(team)}
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

			<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Create New Team</DialogTitle>
					</DialogHeader>

					<div className="py-4">
						<Input
							placeholder="Team name"
							value={newTeamName}
							onChange={(e) => setNewTeamName(e.target.value)}
						/>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
							Cancel
						</Button>

						<Button onClick={handleCreate} disabled={createTeamMutation.isPending}>
							{createTeamMutation.isPending ? 'Creating...' : 'Create'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Edit Team: {editingTeam?.name}</DialogTitle>
					</DialogHeader>

					<div className="py-4">
						<Input
							placeholder="New team name"
							value={newTeamName}
							onChange={(e) => setNewTeamName(e.target.value)}
						/>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
							Cancel
						</Button>

						<Button onClick={handleUpdate} disabled={updateTeamMutation.isPending}>
							{updateTeamMutation.isPending ? 'Updating...' : 'Update'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Are you sure?</DialogTitle>

						<DialogDescription className="py-1 leading-6">
							This will permanently delete the team "{deletingTeam?.name}". This
							action will remove the team from all users and cannot be undone.
						</DialogDescription>
					</DialogHeader>

					<DialogFooter>
						<Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
							Cancel
						</Button>

						<Button
							variant="destructive"
							onClick={confirmDelete}
							disabled={deleteTeamMutation.isPending}
						>
							{deleteTeamMutation.isPending ? 'Deleting...' : 'Delete'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	);
};

export default TeamManagement;
