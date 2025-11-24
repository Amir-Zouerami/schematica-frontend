import { z } from 'zod';

export const projectFormSchema = z.object({
	name: z.string().min(1, { message: 'Project name is required.' }),
	description: z.string().min(1, { message: 'Description should not be empty.' }),
	servers: z
		.array(
			z.object({
				url: z.string().url({ message: 'Must be a valid URL' }),
				description: z.string().optional(),
			}),
		)
		.optional(),
	links: z
		.array(
			z.object({
				name: z.string(),
				url: z.string(),
			}),
		)
		.optional(),
});

export const refinedProjectFormSchema = projectFormSchema
	.refine(
		(data) => {
			if (!data.links) return true;
			return data.links.every((link) => {
				if (link.url.trim() !== '') {
					return link.name.trim() !== '';
				}
				return true;
			});
		},
		{
			message: 'Link name is required if a URL is provided.',
			path: ['links'],
		},
	)
	.refine(
		(data) => {
			if (!data.servers) return true;
			return data.servers.every((s) => s.url.trim() !== '');
		},
		{ message: 'Server URL cannot be empty', path: ['servers'] },
	);

export type ProjectFormValues = z.infer<typeof refinedProjectFormSchema>;
