import { formatDate } from '@/shared/lib/schemaUtils';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Lock } from 'lucide-react';
import React from 'react';

interface LockConflictModalProps {
	isOpen: boolean;
	onClose: () => void;
	lockDetails: {
		username: string;
		expiresAt: string;
	} | null;
}

const LockConflictModal: React.FC<LockConflictModalProps> = ({ isOpen, onClose, lockDetails }) => {
	if (!lockDetails) {
		return null;
	}

	return (
		<AlertDialog open={isOpen} onOpenChange={onClose}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						<Lock className="h-5 w-5" /> Endpoint is Locked
					</AlertDialogTitle>

					<AlertDialogDescription className="pt-4 text-base">
						This endpoint is currently being edited by{' '}
						<strong className="text-foreground">{lockDetails.username}</strong>.
						<br />
						The lock will expire at {formatDate(lockDetails.expiresAt)}. Please try
						again later.
					</AlertDialogDescription>
				</AlertDialogHeader>

				<AlertDialogFooter>
					<AlertDialogAction onClick={onClose}>OK</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};

export default LockConflictModal;
