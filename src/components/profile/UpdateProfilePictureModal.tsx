import { useMe, useUpdateProfilePicture } from '@/entities/User/api/useMe';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/shared/api/api';
import { cn } from '@/shared/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/shared/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Progress } from '@/shared/ui/progress';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Loader2, UploadCloud, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface UpdateProfilePictureModalProps {
	isOpen: boolean;
	onClose: () => void;
}

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
	const { data: user } = useMe();
	const updateProfilePictureMutation = useUpdateProfilePicture();
	const { toast } = useToast();

	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [isDragging, setIsDragging] = useState(false);

	const [uploadProgress, setUploadProgress] = useState(0);
	const [isUploading, setIsUploading] = useState(false);
	const progressInterval = useRef<NodeJS.Timeout | null>(null);

	const form = useForm<ProfilePictureFormValues>({
		resolver: zodResolver(profilePictureSchema),
	});

	const selectedFile = form.watch('profileImage');

	const clearProgress = () => {
		if (progressInterval.current) {
			clearInterval(progressInterval.current);
			progressInterval.current = null;
		}
	};

	useEffect(() => {
		if (isOpen) {
			const currentImage = typeof user?.profileImage === 'string' ? user.profileImage : null;
			setPreviewUrl(currentImage);
			setUploadProgress(0);
			setIsUploading(false);
		} else {
			// Small delay on reset to allow close animation to finish smoothly
			const timer = setTimeout(() => {
				form.reset();
				setPreviewUrl(null);
				setUploadProgress(0);
				setIsUploading(false);
				clearProgress();
			}, 300);

			return () => clearTimeout(timer);
		}
	}, [isOpen, user, form]);

	useEffect(() => {
		if (!selectedFile) return;
		const objectUrl = URL.createObjectURL(selectedFile);

		setPreviewUrl(objectUrl);
		return () => URL.revokeObjectURL(objectUrl);
	}, [selectedFile]);

	useEffect(() => () => clearProgress(), []);

	const startSimulatedProgress = () => {
		setUploadProgress(0);
		setIsUploading(true);

		progressInterval.current = setInterval(() => {
			setUploadProgress((prev) => {
				// Rapidly go to 30%
				if (prev < 30) return prev + 5;
				// Smoothly go to 85%
				if (prev < 85) return prev + 2;
				// Crawl to 95% and wait there
				if (prev < 95) return prev + 0.5;
				return prev;
			});
		}, 50);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		const file = e.dataTransfer.files?.[0];

		if (file) {
			form.setValue('profileImage', file, { shouldValidate: true });
		}
	};

	const onSubmit = async (values: ProfilePictureFormValues) => {
		const formData = new FormData();
		formData.append('file', values.profileImage);

		startSimulatedProgress();

		try {
			// Ensure the animation runs for at least 800ms so it doesn't feel glitchy
			const minAnimationTime = new Promise((resolve) => setTimeout(resolve, 800));
			const uploadRequest = updateProfilePictureMutation.mutateAsync(formData);

			await Promise.all([uploadRequest, minAnimationTime]);

			clearProgress();
			setUploadProgress(100);

			setTimeout(() => {
				toast({
					title: 'Looks good!',
					description: 'Your profile picture has been updated.',
				});
				onClose();
			}, 600);
		} catch (err) {
			clearProgress();
			setIsUploading(false);
			setUploadProgress(0);

			const error = err as ApiError;
			toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
		}
	};

	const handleRemoveFile = (e: React.MouseEvent) => {
		e.stopPropagation();
		form.resetField('profileImage');

		const currentImage = typeof user?.profileImage === 'string' ? user.profileImage : null;
		setPreviewUrl(currentImage);
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent
				className="sm:max-w-md bg-background/80 backdrop-blur-xl border-white/10 shadow-2xl p-0 overflow-hidden gap-0"
				onOpenAutoFocus={(e) => e.preventDefault()}
			>
				<div className="absolute inset-0 bg-linear-to-b from-primary/5 to-transparent pointer-events-none" />

				<DialogHeader className="p-6 pb-2 relative z-10">
					<DialogTitle className="text-xl font-bold tracking-tight">
						Update Profile Picture
					</DialogTitle>

					<DialogDescription className="text-muted-foreground/80">
						Drag and drop a new image or click to browse.
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<div className="px-6 py-4">
							<FormField
								control={form.control}
								name="profileImage"
								render={({ field: { onChange, value, ...rest } }) => (
									<FormItem>
										<FormControl>
											<div
												className={cn(
													'group relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-muted-foreground/25 bg-muted/5 transition-all duration-300 ease-in-out hover:bg-muted/10 hover:border-primary/50 cursor-pointer min-h-[260px]',
													isDragging &&
														'border-primary bg-primary/5 scale-[0.98]',
													selectedFile &&
														'border-solid border-primary/20 bg-background/50',
												)}
												onDragOver={handleDragOver}
												onDragLeave={handleDragLeave}
												onDrop={handleDrop}
												onClick={() =>
													document
														.getElementById('profileImage-input')
														?.click()
												}
											>
												{/* Background Pulse Effect */}
												<div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

												<div className="relative z-10 flex flex-col items-center">
													<div className="relative">
														<Avatar
															className={cn(
																'h-32 w-32 border-4 border-background shadow-xl transition-transform duration-300 group-hover:scale-105',
																isUploading &&
																	'scale-95 opacity-80',
															)}
														>
															<AvatarImage
																src={previewUrl || undefined}
																alt={user?.username}
																className="object-cover"
															/>

															<AvatarFallback className="text-4xl bg-secondary font-bold text-muted-foreground">
																{user?.username
																	?.substring(0, 2)
																	.toUpperCase()}
															</AvatarFallback>
														</Avatar>

														{/* Success Checkmark Overlay */}
														{uploadProgress === 100 && (
															<div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full backdrop-blur-sm animate-in fade-in zoom-in duration-300">
																<Check className="h-10 w-10 text-green-400" />
															</div>
														)}

														{selectedFile && !isUploading && (
															<Button
																type="button"
																variant="destructive"
																size="icon"
																className="absolute -top-2 -right-2 h-8 w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
																onClick={handleRemoveFile}
															>
																<X className="h-4 w-4" />
															</Button>
														)}
													</div>

													<div className="mt-6 text-center space-y-1">
														{selectedFile ? (
															<>
																<p className="text-sm font-medium text-foreground animate-in fade-in slide-in-from-bottom-2">
																	{selectedFile.name}
																</p>

																<p className="text-xs text-muted-foreground">
																	{(
																		selectedFile.size /
																		1024 /
																		1024
																	).toFixed(2)}{' '}
																	MB
																</p>
															</>
														) : (
															<>
																<div className="flex items-center justify-center gap-2 text-sm font-medium text-foreground group-hover:text-primary transition-colors">
																	<UploadCloud className="h-4 w-4" />
																	<span>Upload Image</span>
																</div>

																<p className="text-xs text-muted-foreground mt-1">
																	Supports JPG, PNG, GIF (Max 5MB)
																</p>
															</>
														)}
													</div>
												</div>

												<Input
													id="profileImage-input"
													type="file"
													accept="image/*"
													className="hidden"
													onChange={(e) =>
														onChange(
															e.target.files
																? e.target.files[0]
																: null,
														)
													}
													{...rest}
												/>
											</div>
										</FormControl>
										<FormMessage className="text-center mt-2" />
									</FormItem>
								)}
							/>

							{/* Animated Progress Bar */}
							<div
								className={cn(
									'mt-4 transition-all duration-500 ease-in-out overflow-hidden',
									isUploading || uploadProgress > 0
										? 'opacity-100 max-h-10'
										: 'opacity-0 max-h-0',
								)}
							>
								<div className="flex justify-between text-xs text-muted-foreground mb-1.5 px-1">
									<span>
										{uploadProgress === 100 ? 'Complete' : 'Uploading...'}
									</span>
									<span>{Math.round(uploadProgress)}%</span>
								</div>

								<Progress
									value={uploadProgress}
									className="h-2 w-full bg-secondary/50"
									style={{ transitionDuration: '100ms' }}
								/>
							</div>
						</div>

						<DialogFooter className="p-6 bg-muted/30 border-t border-white/5 gap-3 sm:gap-3">
							<Button
								type="button"
								variant="ghost"
								onClick={onClose}
								disabled={isUploading}
								className="hover:bg-white/5 cursor-pointer"
							>
								Cancel
							</Button>

							<Button
								type="submit"
								disabled={isUploading || !selectedFile}
								className="min-w-[120px] bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 cursor-pointer transition-all"
							>
								{isUploading ? (
									<span className="flex items-center gap-2">
										<Loader2 className="h-4 w-4 animate-spin" />
										{Math.round(uploadProgress)}%
									</span>
								) : (
									<>Save Changes</>
								)}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
};

export default UpdateProfilePictureModal;
