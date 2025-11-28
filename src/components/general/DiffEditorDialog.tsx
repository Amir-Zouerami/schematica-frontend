import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { DiffEditor } from '@monaco-editor/react';
import { RefreshCw, X } from 'lucide-react';
import React from 'react';

interface DiffEditorDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onForceOverwrite: () => void;
	onRefreshAndDiscard: () => void;
	originalContent: string;
	modifiedContent: string;
	title?: string;
	description?: string;
}

export const DiffEditorDialog: React.FC<DiffEditorDialogProps> = ({
	isOpen,
	onClose,
	onForceOverwrite,
	onRefreshAndDiscard,
	originalContent,
	modifiedContent,
	title = 'Concurrency Conflict',
	description = 'Compare your local changes (Modified) with the server version (Original).',
}) => {
	return (
		<AlertDialog open={isOpen} onOpenChange={onClose}>
			<AlertDialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
				<AlertDialogHeader className="px-6 py-4 border-b shrink-0">
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="flex-1 relative bg-[#1e1e1e] overflow-hidden">
					<DiffEditor
						height="100%"
						language="json"
						original={originalContent}
						modified={modifiedContent}
						theme="vs-dark"
						options={{
							readOnly: true,
							minimap: { enabled: false },
							scrollBeyondLastLine: false,
						}}
					/>
				</div>

				<AlertDialogFooter className="px-6 py-4 border-t shrink-0 bg-muted/20 gap-2">
					<Button variant="outline" onClick={onClose}>
						<X className="mr-2 h-4 w-4" /> Cancel
					</Button>

					<Button variant="secondary" onClick={onRefreshAndDiscard}>
						<RefreshCw className="mr-2 h-4 w-4" /> Discard My Changes & Refresh
					</Button>

					<Button variant="destructive" onClick={onForceOverwrite}>
						Force Overwrite
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
