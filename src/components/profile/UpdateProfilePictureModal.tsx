import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfilePicture } from '@/hooks/api/useProfile';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/utils/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { UploadCloud } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface UpdateProfilePictureModalProps {
	isOpen: boolean;
	onClose: () => void;
}

// --- Zod Schema for Validation ---
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

const profilePictureSchema = z.object({
	profileImage: z
		.instanceof(File, { message: 'Please select an image file.' })
		.refine((file) => file.size <= MAX_FILE_SIZE, `Max image size is 5MB.`)
		.refine(
			(file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
			'Only .jpg, .jpeg, .png, .webp, and .gif formats are supported.',
		),
});
type ProfilePictureFormValues = z.infer<typeof profilePictureSchema>;

const UpdateProfilePictureModal: React.FC<UpdateProfilePictureModalProps> = ({
	isOpen,
	onClose,
}) => {
	const { user } = useAuth();
	const updateProfilePictureMutation = useUpdateProfilePicture();
	const { toast } = useToast();

	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	const form = useForm<ProfilePictureFormValues>({
		resolver: zodResolver(profilePictureSchema),
	});

	const { isSubmitting } = form.formState;

	const selectedFile = form.watch('profileImage');

	// Effect to manage the preview URL and reset state on close/open
	useEffect(() => {
		if (!isOpen) {
			// Clean up preview URL and reset form when modal is closed
			if (previewUrl && previewUrl.startsWith('blob:')) {
				URL.revokeObjectURL(previewUrl);
			}
			setPreviewUrl(null);
			form.reset();
			return;
		}

		// Set initial preview when modal opens
		const initialPreview = typeof user?.profileImage === 'string' ? user.profileImage : null;
		setPreviewUrl(initialPreview);

		// Handle preview changes when a new file is selected
		if (selectedFile) {
			const newPreviewUrl = URL.createObjectURL(selectedFile);
			setPreviewUrl(newPreviewUrl);

			// Cleanup function for when the file selection changes again
			return () => {
				URL.revokeObjectURL(newPreviewUrl);
			};
		}
	}, [isOpen, selectedFile, user, form, previewUrl]);

	const onSubmit = async (values: ProfilePictureFormValues) => {
		const formData = new FormData();
		formData.append('file', values.profileImage);

		try {
			await updateProfilePictureMutation.mutateAsync(formData);
			toast({ title: 'Success', description: 'Your profile picture has been updated.' });
			onClose();
		} catch (err) {
			const errorMessage =
				err instanceof ApiError ? err.message : 'An unexpected error occurred.';
			toast({ title: 'Upload Failed', description: errorMessage, variant: 'destructive' });
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Update Profile Picture</DialogTitle>
					<DialogDescription>
						Choose a new image to use as your avatar. Max file size: 5MB.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-2">
						<FormField
							control={form.control}
							name="profileImage"
							render={({ field: { onChange, value, ...rest } }) => (
								<FormItem>
									<FormControl>
										<div
											className="group relative flex flex-col items-center justify-center gap-2 cursor-pointer"
											onClick={() =>
												document
													.getElementById('profileImage-input')
													?.click()
											}
										>
											<Avatar className="h-32 w-32 border-4 border-transparent group-hover:border-primary transition-all">
												<AvatarImage
													src={previewUrl || undefined}
													alt={user?.username}
												/>
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
											<Input
												id="profileImage-input"
												type="file"
												accept="image/*"
												className="hidden"
												onChange={(e) =>
													onChange(
														e.target.files ? e.target.files[0] : null,
													)
												}
												{...rest}
											/>
										</div>
									</FormControl>
									<FormMessage className="text-center" />
								</FormItem>
							)}
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
								disabled={isSubmitting}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitting || !selectedFile}>
								{isSubmitting ? 'Uploading...' : 'Save'}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
};

export default UpdateProfilePictureModal;
