import { useCreateTeam, useDeleteTeam, useTeams, useUpdateTeam } from '@/hooks/api/useTeams';
import { useToast } from '@/hooks/use-toast';
import type { components } from '@/types/api-types';
import { ApiError } from '@/utils/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit, PlusCircle, Search, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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
import { Skeleton } from '@/components/ui/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';

type TeamDto = components['schemas']['TeamDto'];

const teamFormSchema = z.object({
	name: z.string().min(1, { message: 'Team name cannot be empty.' }),
});
type TeamFormValues = z.infer<typeof teamFormSchema>;

const TeamManagement = () => {
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

	const { data: response, isLoading, error } = useTeams(page, 10, debouncedSearchTerm);
	const teams = response?.data || [];
	const meta = response?.meta;
	const { toast } = useToast();

	const createTeamMutation = useCreateTeam();
	const updateTeamMutation = useUpdateTeam();
	const deleteTeamMutation = useDeleteTeam();

	const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const [editingTeam, setEditingTeam] = useState<TeamDto | null>(null);
	const [deletingTeam, setDeletingTeam] = useState<TeamDto | null>(null);

	const form = useForm<TeamFormValues>({
		resolver: zodResolver(teamFormSchema),
		defaultValues: {
			name: '',
		},
	});

	const { isSubmitting } = form.formState;

	useEffect(() => {
		if (isFormDialogOpen) {
			if (editingTeam) {
				form.reset({ name: editingTeam.name });
			} else {
				form.reset({ name: '' });
			}
		}
	}, [isFormDialogOpen, editingTeam, form]);

	const openCreateDialog = () => {
		setEditingTeam(null);
		setIsFormDialogOpen(true);
	};

	const openEditDialog = (team: TeamDto) => {
		setEditingTeam(team);
		setIsFormDialogOpen(true);
	};

	const onSubmit = async (values: TeamFormValues) => {
		try {
			if (editingTeam) {
				await updateTeamMutation.mutateAsync({
					teamId: editingTeam.id,
					teamData: { name: values.name },
				});
				toast({ title: 'Success', description: 'Team updated successfully.' });
			} else {
				await createTeamMutation.mutateAsync({ name: values.name });
				toast({ title: 'Success', description: 'Team created successfully.' });
			}
			setIsFormDialogOpen(false);
		} catch (err) {
			const apiError = err as ApiError;
			if (apiError.status === 409) {
				let errorMessage = apiError.message;
				try {
					// Attempt to parse the message in case it's a JSON string
					const parsedError = JSON.parse(errorMessage);
					if (parsedError && typeof parsedError.message === 'string') {
						errorMessage = parsedError.message;
					}
				} catch (e) {
					// It wasn't a JSON string, so we use the message as is.
				}
				form.setError('name', { type: 'server', message: errorMessage });
			} else {
				const errorMessage = apiError.message || 'An unexpected error occurred.';
				toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
			}
		}
	};

	const handleDelete = (team: TeamDto) => {
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
		} catch (err) {
			const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete team.';
			toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
		}
	};

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Teams</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-destructive">
						Failed to load teams:{' '}
						{error instanceof ApiError ? error.message : error.message}
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex justify-between items-center">
					Teams
					<Button onClick={openCreateDialog}>
						<PlusCircle className="mr-2 h-4 w-4" /> Create Team
					</Button>
				</CardTitle>
				<div className="relative mt-4">
					<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search by team name..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full rounded-lg bg-background pl-8"
					/>
				</div>
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
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell colSpan={2}>
										<Skeleton className="h-10 w-full" />
									</TableCell>
								</TableRow>
							))
						) : teams.length === 0 ? (
							<TableRow>
								<TableCell colSpan={2} className="h-24 text-center">
									No teams found.
								</TableCell>
							</TableRow>
						) : (
							teams.map((team) => (
								<TableRow key={team.id}>
									<TableCell className="font-medium">{team.name}</TableCell>
									<TableCell className="text-right">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => openEditDialog(team)}
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

			{/* Form Dialog for Create/Edit */}
			<Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>
							{editingTeam ? `Edit Team: ${editingTeam.name}` : 'Create New Team'}
						</DialogTitle>
					</DialogHeader>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Team Name</FormLabel>
										<FormControl>
											<Input
												placeholder="e.g., Frontend Developers"
												{...field}
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
									onClick={() => setIsFormDialogOpen(false)}
									disabled={isSubmitting}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting
										? editingTeam
											? 'Updating...'
											: 'Creating...'
										: editingTeam
											? 'Update'
											: 'Create'}
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Are you sure?</DialogTitle>
						<DialogDescription className="py-1 leading-6">
							This will permanently delete the team "{deletingTeam?.name}". This
							action cannot be undone.
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
