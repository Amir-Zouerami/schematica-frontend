import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCreateNote, useDeleteNote, useNotes, useUpdateNote } from '@/hooks/api/useNotes';
import { useProject } from '@/hooks/api/useProject';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import type { components } from '@/types/api-types';
import { formatDate } from '@/utils/schemaUtils';
import { Edit, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

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
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/utils/api';

type NoteDto = components['schemas']['NoteDto'];

interface NotesSectionProps {
	projectId: string; // Keep for permissions check
	endpointId: string;
}

const NotesSection: React.FC<NotesSectionProps> = ({ projectId, endpointId }) => {
	const { user, isProjectOwner } = usePermissions();
	const { data: project } = useProject(projectId);
	const { toast } = useToast();

	const { data: notes, isLoading, error } = useNotes(endpointId);

	const [newNoteContent, setNewNoteContent] = useState('');
	const [noteToDelete, setNoteToDelete] = useState<NoteDto | null>(null);
	const [editingNote, setEditingNote] = useState<NoteDto | null>(null);
	const [editingContent, setEditingContent] = useState('');

	const createNoteMutation = useCreateNote();
	const deleteNoteMutation = useDeleteNote();
	const updateNoteMutation = useUpdateNote();

	const handleEditClick = (note: NoteDto) => {
		setEditingNote(note);
		setEditingContent(note.content);
	};

	const handleCancelEdit = () => {
		setEditingNote(null);
		setEditingContent('');
	};

	const handleSaveEdit = async () => {
		if (!editingNote || !editingContent.trim()) return;

		try {
			await updateNoteMutation.mutateAsync({
				noteId: editingNote.id,
				noteData: { content: editingContent.trim() },
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

	const handleAddNote = async () => {
		if (!newNoteContent.trim()) {
			toast({
				title: 'Validation Error',
				description: 'Please enter note content',
				variant: 'destructive',
			});
			return;
		}

		try {
			await createNoteMutation.mutateAsync({
				endpointId,
				noteData: { content: newNoteContent.trim() },
			});

			toast({
				title: 'Note Added',
				description: 'Your note has been added successfully',
			});

			setNewNoteContent('');
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
			await deleteNoteMutation.mutateAsync({
				noteId: noteToDelete.id,
			});

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
							<div key={note.id} className="bg-secondary/20 rounded-lg p-4 border">
								<Textarea
									value={editingContent}
									onChange={(e) => setEditingContent(e.target.value)}
									className="min-h-[100px] mb-2"
								/>
								<div className="flex justify-end gap-2">
									<Button variant="outline" size="sm" onClick={handleCancelEdit}>
										Cancel
									</Button>
									<Button
										size="sm"
										onClick={handleSaveEdit}
										disabled={updateNoteMutation.isPending}
									>
										{updateNoteMutation.isPending ? 'Saving...' : 'Save'}
									</Button>
								</div>
							</div>
						) : (
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

			<div className="border-t pt-4 space-y-3">
				<Textarea
					value={newNoteContent}
					onChange={(e) => setNewNoteContent(e.target.value)}
					placeholder="Add a note about this endpoint... Mention a user with @username"
					className="min-h-[100px]"
				/>

				<Button
					onClick={handleAddNote}
					disabled={createNoteMutation.isPending || !newNoteContent.trim()}
					className="w-full"
				>
					{createNoteMutation.isPending ? 'Adding Note...' : 'Add Note'}
				</Button>
			</div>
		</div>
	);
};

export default NotesSection;
