import type { components } from '@/types/api-types';
import { api } from '@/utils/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type NoteDto = components['schemas']['NoteDto'];
type CreateNoteDto = components['schemas']['CreateNoteDto'];
type UpdateNoteDto = components['schemas']['UpdateNoteDto'];

export const useNotes = (endpointId: string | undefined) => {
	return useQuery({
		queryKey: ['notes', endpointId],
		queryFn: async () => {
			if (!endpointId) return null;
			const response = await api.get<NoteDto[]>(`/endpoints/${endpointId}/notes`);
			return response.data;
		},
		enabled: !!endpointId,
	});
};

export const useCreateNote = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			endpointId,
			noteData,
		}: {
			endpointId: string;
			noteData: CreateNoteDto;
		}) => {
			const response = await api.post<NoteDto>(`/endpoints/${endpointId}/notes`, noteData);
			return response.data;
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['notes', variables.endpointId] });
		},
	});
};

export const useUpdateNote = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ noteId, noteData }: { noteId: number; noteData: UpdateNoteDto }) => {
			const response = await api.put<NoteDto>(`/notes/${noteId}`, noteData);
			return response.data;
		},
		onSuccess: (data, variables) => {
			// Since we don't know the endpointId from the noteId,
			// the safest approach is to invalidate all note queries.
			queryClient.invalidateQueries({ queryKey: ['notes'] });
		},
	});
};

export const useDeleteNote = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ noteId }: { noteId: number }) => {
			await api.delete<null>(`/notes/${noteId}`);
			return noteId;
		},
		onSuccess: () => {
			// Invalidate all note queries to refetch the updated list.
			queryClient.invalidateQueries({ queryKey: ['notes'] });
		},
	});
};
