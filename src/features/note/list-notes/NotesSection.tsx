import {
	useCreateNote,
	useDeleteNote,
	useNotes,
	useUpdateNote,
} from '@/entities/Note/api/useNotes';
import { useProject } from '@/entities/Project/api/useProject';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate } from '@/shared/lib/schemaUtils';
import { getStorageUrl } from '@/shared/lib/storage';
import type { components } from '@/shared/types/api-types';

import MarkdownRenderer from '@/features/endpoint/edit-endpoint/ui/MarkdownRenderer';
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
} from '@/shared/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { Edit, MessageSquareX, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { MentionInput } from './MentionInput';

type NoteDto = components['schemas']['NoteDto'];

interface NotesSectionProps {
	projectId: string;
	endpointId: string;
}

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

	const canWrite = isProjectOwner(project);

	const handleSaveEdit = async (content: string) => {
		if (!editingNote) return;
		try {
			await updateNoteMutation.mutateAsync({
				noteId: editingNote.id,
				noteData: { content },
			});
			toast({ title: 'Note Updated', description: 'Note updated successfully.' });
			setEditingNote(null);
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to update note.',
				variant: 'destructive',
			});
		}
	};

	const handleAddNote = async (content: string) => {
		try {
			await createNoteMutation.mutateAsync({
				endpointId,
				noteData: { content },
			});
			toast({ title: 'Note Added', description: 'Note added successfully.' });
		} catch (error) {
			toast({ title: 'Error', description: 'Failed to add note.', variant: 'destructive' });
		}
	};

	const handleDelete = async () => {
		if (!noteToDelete) return;
		try {
			await deleteNoteMutation.mutateAsync({ noteId: noteToDelete.id });
			toast({ title: 'Note Deleted', description: 'Note deleted successfully.' });
		} catch (err) {
			toast({
				title: 'Error',
				description: 'Failed to delete note.',
				variant: 'destructive',
			});
		} finally {
			setNoteToDelete(null);
		}
	};

	if (isLoading)
		return (
			<div className="space-y-2 max-w-3xl mx-auto">
				<Skeleton className="h-20 w-full" />
				<Skeleton className="h-20 w-full" />
			</div>
		);
	if (error) return <p className="text-destructive text-center">Failed to load notes.</p>;

	if (!notes || notes.length === 0) {
		if (!canWrite) {
			return (
				<div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
					<MessageSquareX className="h-10 w-10 mb-4 opacity-20" />
					<p>No notes yet.</p>
				</div>
			);
		}
	}

	return (
		<div className="flex flex-col items-center space-y-6 pb-8">
			{/* Notes List - Constrained Width */}
			<div className="w-full space-y-4">
				{notes?.map((note) => (
					<div
						key={note.id}
						className="bg-secondary/20 rounded-lg p-4 border border-border/50 group"
					>
						{editingNote?.id === note.id ? (
							<MentionInput
								initialContent={note.content}
								onSubmit={handleSaveEdit}
								onCancel={() => setEditingNote(null)}
								isSubmitting={updateNoteMutation.isPending}
								submitLabel="Save"
							/>
						) : (
							<div className="flex items-start justify-between gap-4">
								<div className="flex-1 min-w-0">
									<div className="text-sm">
										<MarkdownRenderer content={note.content} />
									</div>

									<div className="flex items-center space-x-2 mt-3 text-xs text-muted-foreground">
										<Avatar className="h-5 w-5">
											<AvatarImage
												src={getStorageUrl(note.author.profileImage)}
											/>

											<AvatarFallback>
												{note.author.username.substring(0, 2).toUpperCase()}
											</AvatarFallback>
										</Avatar>

										<span>
											{note.author.username} • {formatDate(note.createdAt)}
										</span>
									</div>
								</div>

								{(canWrite || user?.username === note.author.username) && (
									<div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => setEditingNote(note)}
											className="h-8 w-8 p-0 text-blue-400 hover:bg-blue-500/10"
										>
											<Edit className="h-3.5 w-3.5" />
										</Button>

										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => setNoteToDelete(note)}
													className="h-8 w-8 p-0 text-red-500 hover:bg-red-500/10"
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											</AlertDialogTrigger>

											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>
														Delete Note?
													</AlertDialogTitle>

													<AlertDialogDescription>
														This cannot be undone.
													</AlertDialogDescription>
												</AlertDialogHeader>

												<AlertDialogFooter>
													<AlertDialogCancel
														onClick={() => setNoteToDelete(null)}
													>
														Cancel
													</AlertDialogCancel>

													<AlertDialogAction
														onClick={handleDelete}
														className="bg-destructive"
													>
														Delete
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</div>
								)}
							</div>
						)}
					</div>
				))}
			</div>

			{canWrite && !editingNote && (
				<div className="w-full pt-4">
					<MentionInput
						onSubmit={handleAddNote}
						isSubmitting={createNoteMutation.isPending}
						submitLabel="Add Note"
					/>
				</div>
			)}
		</div>
	);
};

export default NotesSection;
