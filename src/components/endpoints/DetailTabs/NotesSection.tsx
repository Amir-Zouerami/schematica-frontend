import { Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { OperationObject } from '@/types/types';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/schemaUtils';
import { Textarea } from '@/components/ui/textarea';
import { useProject } from '@/hooks/api/useProject';
import { usePermissions } from '@/hooks/usePermissions';
import { useCreateNote, useDeleteNote } from '@/hooks/api/useNotes';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import {
	AlertDialog,
	AlertDialogTitle,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogHeader,
	AlertDialogFooter,
	AlertDialogContent,
	AlertDialogTrigger,
	AlertDialogDescription,
} from '@/components/ui/alert-dialog';

interface NotesSectionProps {
	projectId: string;
	path: string;
	method: string;
	operation: OperationObject;
}

const NotesSection: React.FC<NotesSectionProps> = ({ projectId, path, method, operation }) => {
	const { user, isProjectOwner } = usePermissions();
	const { data: project } = useProject(projectId);
	const { toast } = useToast();

	const [newNoteContent, setNewNoteContent] = useState('');
	const [noteToDelete, setNoteToDelete] = useState<number | null>(null);

	const createNoteMutation = useCreateNote();
	const deleteNoteMutation = useDeleteNote();

	const notes = operation['x-app-metadata']?.notes || [];

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
				projectId,
				method,
				path,
				content: newNoteContent.trim(),
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

	const handleDeleteNote = async (noteIndex: number) => {
		try {
			await deleteNoteMutation.mutateAsync({
				projectId,
				method,
				path,
				noteIndex,
			});

			toast({
				title: 'Note Deleted',
				description: 'The note has been deleted successfully',
			});
		} catch (error) {
			toast({
				title: 'Error',
				description: error instanceof Error ? error.message : 'Failed to delete note',
				variant: 'destructive',
			});
		}
	};

	const confirmDeleteNote = async () => {
		if (noteToDelete === null) return;

		try {
			await deleteNoteMutation.mutateAsync({
				projectId,
				method,
				path,
				noteIndex: noteToDelete,
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

	return (
		<div className="space-y-4">
			{notes.length === 0 ? (
				<p className="text-muted-foreground text-center py-8">No notes added yet</p>
			) : (
				<div className="space-y-4">
					{notes.map((note: any, index: number) => (
						<div key={index} className="bg-secondary/20 rounded-lg p-4 border">
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
													note.createdBy
														? `/profile-pictures/${note.createdBy}.png`
														: undefined
												}
												alt={note.createdBy || 'Unknown'}
											/>
											<AvatarFallback>
												{(note.createdBy || 'U')
													.substring(0, 2)
													.toUpperCase()}
											</AvatarFallback>
										</Avatar>

										<span>
											{note.createdBy || 'Unknown'} •{' '}
											{formatDate(note.createdAt) || 'Unknown date'}
										</span>
									</div>
								</div>

								{(isProjectOwner(project) || user?.username === note.createdBy) && (
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => setNoteToDelete(index)}
												disabled={deleteNoteMutation.isPending}
												className="text-red-500 hover:text-red-700 hover:bg-red-50"
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</AlertDialogTrigger>

										<AlertDialogContent className="max-w-3xl">
											<AlertDialogHeader>
												<AlertDialogTitle>Are you sure?</AlertDialogTitle>

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
												>
													Delete
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								)}
							</div>
						</div>
					))}
				</div>
			)}

			<div className="border-t pt-4 space-y-3">
				<Textarea
					value={newNoteContent}
					onChange={(e) => setNewNoteContent(e.target.value)}
					placeholder="Add a note about this endpoint..."
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
