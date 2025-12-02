import NotesSection from '@/features/note/list-notes/NotesSection';
import { Button } from '@/shared/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/shared/ui/dialog';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { MessageSquareText } from 'lucide-react';
import React from 'react';

interface NotesModalProps {
	isOpen: boolean;
	onClose: () => void;
	projectId: string;
	endpointId: string;
	endpointMethod: string;
	endpointPath: string;
}

export const NotesModal: React.FC<NotesModalProps> = ({
	isOpen,
	onClose,
	projectId,
	endpointId,
	endpointMethod,
	endpointPath,
}) => {
	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="w-screen h-dvh max-w-none rounded-none sm:rounded-lg sm:max-w-4xl sm:h-[85vh] flex flex-col p-0 gap-0">
				<DialogHeader className="px-6 py-4 border-b shrink-0">
					<DialogTitle className="flex items-center gap-2">
						<MessageSquareText className="h-5 w-5 text-primary" />
						Endpoint Notes
					</DialogTitle>
					<DialogDescription className="font-mono text-xs mt-1">
						<span className="uppercase font-bold">{endpointMethod}</span> {endpointPath}
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="flex-1 bg-muted/5">
					<div className="p-6">
						<NotesSection projectId={projectId} endpointId={endpointId} />
					</div>
				</ScrollArea>

				<DialogFooter className="px-6 py-4 border-t shrink-0 bg-background">
					<Button variant="outline" onClick={onClose} className="cursor-pointer">
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
