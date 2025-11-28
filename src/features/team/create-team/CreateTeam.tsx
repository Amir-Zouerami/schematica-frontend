import { useCreateTeam } from '@/entities/Team/api/useTeams';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/shared/api/api';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const teamFormSchema = z.object({
	name: z.string().min(1, { message: 'Team name cannot be empty.' }),
});
type TeamFormValues = z.infer<typeof teamFormSchema>;

const CreateTeam = () => {
	const [isOpen, setIsOpen] = useState(false);
	const { toast } = useToast();
	const createTeamMutation = useCreateTeam();
	const form = useForm<TeamFormValues>({
		resolver: zodResolver(teamFormSchema),
		defaultValues: { name: '' },
	});
	const { isSubmitting } = form.formState;
	const handleOpenChange = (open: boolean) => {
		if (!open) form.reset();
		setIsOpen(open);
	};

	const onSubmit = async (values: TeamFormValues) => {
		try {
			await createTeamMutation.mutateAsync({ name: values.name });
			toast({ title: 'Success', description: 'Team created successfully.' });
			handleOpenChange(false);
		} catch (err) {
			const error = err as ApiError;
			if (error.status === 409 && error.metaCode === 'TEAM_NAME_ALREADY_EXISTS') {
				form.setError('name', {
					type: 'server',
					message: 'A team with this name already exists.',
				});
			} else {
				toast({ title: 'Error', description: error.message, variant: 'destructive' });
			}
		}
	};

	return (
		<>
			<Button onClick={() => setIsOpen(true)}>
				<PlusCircle className="mr-2 h-4 w-4" /> Create Team
			</Button>

			<Dialog open={isOpen} onOpenChange={handleOpenChange}>
				<DialogContent className="w-[95vw] md:max-w-3xl rounded-lg">
					<DialogHeader>
						<DialogTitle>Create New Team</DialogTitle>
					</DialogHeader>

					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Team Name</FormLabel>
										<FormControl>
											<Input
												placeholder="e.g., Frontend Developers"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => handleOpenChange(false)}
									disabled={isSubmitting}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting ? 'Creating...' : 'Create'}
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		</>
	);
};
export default CreateTeam;
