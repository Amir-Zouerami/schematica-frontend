import React, { useState, useEffect, useRef } from 'react';
import { useUpdateProfilePicture } from '@/hooks/api/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/utils/api';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UploadCloud } from 'lucide-react';

interface UpdateProfilePictureModalProps {
	isOpen: boolean;
	onClose: () => void;
}

const UpdateProfilePictureModal: React.FC<UpdateProfilePictureModalProps> = ({
	isOpen,
	onClose,
}) => {
	const { user } = useAuth();
	const updateProfilePictureMutation = useUpdateProfilePicture();
	const { toast } = useToast();

	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Effect to manage the preview URL and reset state on close
	useEffect(() => {
		// Set initial preview to the user's current avatar when the modal opens
		if (isOpen && user) {
			const initialPreview = typeof user.profileImage === 'string' ? user.profileImage : null;
			setPreviewUrl(initialPreview);
		}

		// Cleanup function to run when the component unmounts or isOpen changes
		return () => {
			// If the preview URL is a temporary blob URL, revoke it to prevent memory leaks
			if (previewUrl && previewUrl.startsWith('blob:')) {
				URL.revokeObjectURL(previewUrl);
			}
			// Reset state when the modal is closed
			if (!isOpen) {
				setSelectedFile(null);
				setPreviewUrl(null);
			}
		};
	}, [isOpen, user]);

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith('image/')) {
			toast({
				title: 'Invalid File Type',
				description: 'Please select a valid image file (e.g., PNG, JPG, GIF).',
				variant: 'destructive',
			});
			return;
		}

		setSelectedFile(file);

		// Create a new preview URL for the selected file
		const newPreviewUrl = URL.createObjectURL(file);
		// Revoke the old URL if it was a blob, then set the new one
		if (previewUrl && previewUrl.startsWith('blob:')) {
			URL.revokeObjectURL(previewUrl);
		}
		setPreviewUrl(newPreviewUrl);
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!selectedFile) {
			toast({
				title: 'No File Selected',
				description: 'Please select an image to upload.',
				variant: 'destructive',
			});
			return;
		}

		const formData = new FormData();
		formData.append('file', selectedFile);

		try {
			await updateProfilePictureMutation.mutateAsync(formData);
			toast({
				title: 'Success',
				description: 'Your profile picture has been updated.',
			});
			onClose();
		} catch (err) {
			const errorMessage =
				err instanceof ApiError ? err.message : 'An unexpected error occurred.';
			toast({
				title: 'Upload Failed',
				description: errorMessage,
				variant: 'destructive',
			});
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Update Profile Picture</DialogTitle>
					<DialogDescription>
						Choose a new image to use as your avatar across the platform.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-6 pt-2">
					<div
						className="group relative flex flex-col items-center justify-center gap-2 cursor-pointer"
						onClick={() => fileInputRef.current?.click()}
					>
						<Avatar className="h-32 w-32 border-4 border-transparent group-hover:border-primary transition-all">
							<AvatarImage src={previewUrl || undefined} alt={user?.username} />
							<AvatarFallback className="text-4xl">
								{user?.username.substring(0, 2).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full text-white">
							<UploadCloud className="h-8 w-8" />
							<span className="text-sm mt-1">
								{selectedFile ? 'Change Image' : 'Choose Image'}
							</span>
						</div>
					</div>

					<Input
						ref={fileInputRef}
						type="file"
						onChange={handleFileChange}
						accept="image/*"
						className="hidden"
					/>

					{selectedFile && (
						<p className="text-center text-sm text-muted-foreground truncate">
							Selected: {selectedFile.name}
						</p>
					)}

					<DialogFooter className="mt-6">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={updateProfilePictureMutation.isPending}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={!selectedFile || updateProfilePictureMutation.isPending}
						>
							{updateProfilePictureMutation.isPending ? 'Uploading...' : 'Save'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};

export default UpdateProfilePictureModal;
