import { useUpdateTeam } from '@/entities/Team/api/useTeams';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/shared/api/api';
import type { components } from '@/shared/types/api-types';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

type TeamDto = components['schemas']['TeamDto'];
interface EditTeamProps {
	team: TeamDto;
}

const teamFormSchema = z.object({
	name: z.string().min(1, { message: 'Team name cannot be empty.' }),
});

type TeamFormValues = z.infer<typeof teamFormSchema>;

const EditTeam: React.FC<EditTeamProps> = ({ team }) => {
	const [isOpen, setIsOpen] = useState(false);
	const { toast } = useToast();
	const updateTeamMutation = useUpdateTeam();
	const form = useForm<TeamFormValues>({
		resolver: zodResolver(teamFormSchema),
		defaultValues: { name: team.name },
	});

	const { isSubmitting } = form.formState;

	useEffect(() => {
		if (isOpen) form.reset({ name: team.name });
	}, [isOpen, team, form]);

	const onSubmit = async (values: TeamFormValues) => {
		try {
			await updateTeamMutation.mutateAsync({
				teamId: team.id,
				teamData: { name: values.name },
			});

			toast({ title: 'Success', description: 'Team updated successfully.' });
			setIsOpen(false);
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
			<Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
				<Edit className="h-4 w-4" />
			</Button>

			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>{`Edit Team: ${team.name}`}</DialogTitle>
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
									onClick={() => setIsOpen(false)}
									disabled={isSubmitting}
								>
									Cancel
								</Button>

								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting ? 'Updating...' : 'Update'}
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		</>
	);
};
export default EditTeam;
