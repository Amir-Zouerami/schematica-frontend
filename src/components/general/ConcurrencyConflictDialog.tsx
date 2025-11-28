import { deepEqual } from '@/shared/lib/general';
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Separator } from '@/shared/ui/separator';
import { Table, TableBody, TableCell, TableRow } from '@/shared/ui/table';
import { RefreshCw, X } from 'lucide-react';
import React from 'react';

interface ConcurrencyConflictDialogProps<T extends Record<string, unknown>> {
	isOpen: boolean;
	onClose: () => void;
	onForceOverwrite: () => void;
	onRefreshAndDiscard: () => void;
	localChanges: T;
	serverChanges: T;
	resourceName?: string;
}

const renderValue = (value: unknown): React.ReactNode => {
	if (value === null || value === undefined) {
		return <i className="text-muted-foreground">Not set</i>;
	}

	if (typeof value === 'boolean') {
		return value ? 'Yes' : 'No';
	}

	if (Array.isArray(value)) {
		if (value.length === 0) return <i className="text-muted-foreground">Empty list</i>;

		return (
			<ul className="list-disc pl-4">
				{value.map((item, index) => (
					<li key={index}>{renderValue(item)}</li>
				))}
			</ul>
		);
	}

	if (typeof value === 'object') {
		return <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>;
	}

	return String(value);
};

export const ConcurrencyConflictDialog = <T extends Record<string, unknown>>({
	isOpen,
	onClose,
	onForceOverwrite,
	onRefreshAndDiscard,
	localChanges,
	serverChanges,
	resourceName = 'resource',
}: ConcurrencyConflictDialogProps<T>) => {
	const allKeys = Array.from(
		new Set([...Object.keys(localChanges), ...Object.keys(serverChanges)]),
	);

	const differingKeys = allKeys.filter(
		(key) => !deepEqual(localChanges[key], serverChanges[key]),
	);

	return (
		<AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<AlertDialogContent className="max-w-4xl w-full">
				<AlertDialogHeader>
					<AlertDialogTitle>Concurrency Conflict Detected</AlertDialogTitle>

					<AlertDialogDescription>
						This {resourceName} was updated by someone else while you were editing.
						Please review the differences and choose an action.
					</AlertDialogDescription>
				</AlertDialogHeader>

				<ScrollArea className="max-h-[50vh] pr-4">
					{differingKeys.length === 0 ? (
						<div className="p-8 text-center text-muted-foreground bg-secondary/10 rounded-md">
							<p>The content seems identical despite the version mismatch.</p>

							<p className="text-xs mt-2">
								This usually means someone else saved the exact same data, or a
								minor format change occurred.
							</p>
						</div>
					) : (
						<Table className="mt-4 border">
							<TableBody>
								{differingKeys.map((key) => (
									<TableRow
										key={key}
										className="bg-red-500/10 hover:bg-red-500/15"
									>
										<TableCell className="font-semibold capitalize w-1/5 border-r align-top pt-4">
											{key.replace(/([A-Z])/g, ' $1')}
										</TableCell>

										<TableCell className="w-2/5 border-r align-top">
											<div className="font-medium mb-2 text-red-400 text-xs uppercase tracking-wider">
												Your Changes
											</div>
											{renderValue(localChanges[key])}
										</TableCell>

										<TableCell className="w-2/5 align-top">
											<div className="font-medium mb-2 text-green-400 text-xs uppercase tracking-wider">
												Server Version
											</div>
											{renderValue(serverChanges[key])}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</ScrollArea>

				<Separator className="my-4" />
				<p className="text-sm text-muted-foreground">
					<strong>Your Changes</strong> will overwrite the server version.{' '}
					<strong>Server Version</strong> will discard your changes and reload the form.
				</p>

				<AlertDialogFooter className="mt-4">
					<Button variant="outline" onClick={onClose} className="cursor-pointer">
						<X className="mr-2 h-4 w-4" />
						Cancel & Review
					</Button>

					<Button
						variant="secondary"
						onClick={onRefreshAndDiscard}
						className="cursor-pointer"
					>
						<RefreshCw className="mr-2 h-4 w-4" />
						Use Server Version (Discard Mine)
					</Button>

					<Button
						variant="destructive"
						onClick={onForceOverwrite}
						className="cursor-pointer"
					>
						Use My Version (Force Overwrite)
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
