import { useCreateNote, useDeleteNote, useNotes, useUpdateNote } from '@/hooks/api/useNotes';
import { useProject } from '@/hooks/api/useProject';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import type { components } from '@/types/api-types';
import { ApiError } from '@/utils/api';
import { formatDate } from '@/utils/schemaUtils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

type NoteDto = components['schemas']['NoteDto'];

interface NotesSectionProps {
	projectId: string;
	endpointId: string;
}

// Zod schemas for validation
const noteSchema = z.object({
	content: z.string().min(1, { message: 'Note content cannot be empty.' }),
});
type NoteFormValues = z.infer<typeof noteSchema>;

const NotesSection: React.FC<NotesSectionProps> = ({ projectId, endpointId }) => {
	const { user, isProjectOwner } = usePermissions();
	const { data: project } = useProject(projectId);
	const { toast } = useToast();

	const { data: notes, isLoading, error } = useNotes(endpointId);

	const [noteToDelete, setNoteToDelete] = useState<NoteDto | null>(null);
	const [editingNote, setEditingNote] = useState<NoteDto | null>(null);

	const createNoteMutation = useCreateNote();
	const deleteNoteMutation = useDeleteNote();
	const updateNoteMutation = useUpdateNote();

	// Form for adding a new note
	const addNoteForm = useForm<NoteFormValues>({
		resolver: zodResolver(noteSchema),
		defaultValues: { content: '' },
	});

	// Form for editing an existing note
	const editNoteForm = useForm<NoteFormValues>({
		resolver: zodResolver(noteSchema),
	});

	// When editingNote changes, reset the edit form with the new content
	useEffect(() => {
		if (editingNote) {
			editNoteForm.reset({ content: editingNote.content });
		}
	}, [editingNote, editNoteForm]);

	const handleEditClick = (note: NoteDto) => {
		setEditingNote(note);
	};

	const handleCancelEdit = () => {
		setEditingNote(null);
	};

	const onSaveEdit = async (values: NoteFormValues) => {
		if (!editingNote) return;

		try {
			await updateNoteMutation.mutateAsync({
				noteId: editingNote.id,
				noteData: { content: values.content.trim() },
			});
			toast({
				title: 'Note Updated',
				description: 'Your note has been successfully updated.',
			});
			handleCancelEdit();
		} catch (error) {
			toast({
				title: 'Error',
				description: error instanceof Error ? error.message : 'Failed to update note',
				variant: 'destructive',
			});
		}
	};

	const onAddNote = async (values: NoteFormValues) => {
		try {
			await createNoteMutation.mutateAsync({
				endpointId,
				noteData: { content: values.content.trim() },
			});
			toast({ title: 'Note Added', description: 'Your note has been added successfully' });
			addNoteForm.reset();
		} catch (error) {
			toast({
				title: 'Error',
				description: error instanceof Error ? error.message : 'Failed to add note',
				variant: 'destructive',
			});
		}
	};

	const confirmDeleteNote = async () => {
		if (!noteToDelete) return;
		try {
			await deleteNoteMutation.mutateAsync({ noteId: noteToDelete.id });
			toast({
				title: 'Note Deleted',
				description: 'The note has been deleted successfully.',
			});
		} catch (error) {
			toast({
				title: 'Error',
				description: error instanceof Error ? error.message : 'Failed to delete note',
				variant: 'destructive',
			});
		} finally {
			setNoteToDelete(null);
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-20 w-full" />
				<Skeleton className="h-20 w-full" />
			</div>
		);
	}

	if (error) {
		return (
			<p className="text-destructive text-center py-8">
				Failed to load notes: {error instanceof ApiError ? error.message : error.message}
			</p>
		);
	}

	return (
		<div className="space-y-4">
			{!notes || notes.length === 0 ? (
				<p className="text-muted-foreground text-center py-8">No notes added yet</p>
			) : (
				<div className="space-y-4">
					{notes.map((note) =>
						editingNote?.id === note.id ? (
							// EDITING VIEW
							<Form {...editNoteForm} key={note.id}>
								<form onSubmit={editNoteForm.handleSubmit(onSaveEdit)}>
									<div className="bg-secondary/20 rounded-lg p-4 border">
										<FormField
											control={editNoteForm.control}
											name="content"
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<Textarea
															className="min-h-[100px] mb-2"
															{...field}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<div className="flex justify-end gap-2 mt-2">
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={handleCancelEdit}
											>
												Cancel
											</Button>
											<Button
												type="submit"
												size="sm"
												disabled={editNoteForm.formState.isSubmitting}
											>
												{editNoteForm.formState.isSubmitting
													? 'Saving...'
													: 'Save'}
											</Button>
										</div>
									</div>
								</form>
							</Form>
						) : (
							// DISPLAY VIEW
							<div key={note.id} className="bg-secondary/20 rounded-lg p-4 border">
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1">
										<p
											className="whitespace-pre-line text-sm"
											style={{ unicodeBidi: 'plaintext' }}
										>
											{note.content}
										</p>
										<div className="flex items-center space-x-2 mt-3 text-xs text-muted-foreground">
											<Avatar className="h-5 w-5">
												<AvatarImage
													src={
														typeof note.author.profileImage === 'string'
															? note.author.profileImage
															: undefined
													}
													alt={note.author.username || 'Unknown'}
												/>
												<AvatarFallback>
													{(note.author.username || 'U')
														.substring(0, 2)
														.toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<span>
												{note.author.username || 'Unknown'} •{' '}
												{formatDate(note.createdAt) || 'Unknown date'}
											</span>
										</div>
									</div>
									{(isProjectOwner(project) ||
										user?.username === note.author.username) && (
										<div className="flex items-center">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleEditClick(note)}
												className="hover:bg-blue-50/10 text-blue-400 hover:text-blue-300"
											>
												<Edit className="h-4 w-4" />
											</Button>
											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => setNoteToDelete(note)}
														disabled={deleteNoteMutation.isPending}
														className="text-red-500 hover:text-red-700 hover:bg-red-50/10"
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent className="max-w-3xl">
													<AlertDialogHeader>
														<AlertDialogTitle>
															Are you sure?
														</AlertDialogTitle>
														<AlertDialogDescription className="py-1 leading-6">
															This action cannot be undone. This will
															permanently delete this note.
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel
															onClick={() => setNoteToDelete(null)}
														>
															Cancel
														</AlertDialogCancel>
														<AlertDialogAction
															onClick={confirmDeleteNote}
															className="bg-destructive hover:bg-destructive/90 text-white"
															disabled={deleteNoteMutation.isPending}
														>
															{deleteNoteMutation.isPending
																? 'Deleting...'
																: 'Delete'}
														</AlertDialogAction>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										</div>
									)}
								</div>
							</div>
						),
					)}
				</div>
			)}

			{/* ADD NOTE FORM */}
			<div className="border-t pt-4 space-y-3">
				<Form {...addNoteForm}>
					<form onSubmit={addNoteForm.handleSubmit(onAddNote)} className="space-y-3">
						<FormField
							control={addNoteForm.control}
							name="content"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<Textarea
											placeholder="Add a note about this endpoint... Mention a user with @username"
											className="min-h-[100px]"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button
							type="submit"
							disabled={addNoteForm.formState.isSubmitting}
							className="w-full"
						>
							{addNoteForm.formState.isSubmitting ? 'Adding Note...' : 'Add Note'}
						</Button>
					</form>
				</Form>
			</div>
		</div>
	);
};

export default NotesSection;
