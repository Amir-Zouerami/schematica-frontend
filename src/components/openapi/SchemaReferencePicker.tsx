import { useSchemas } from '@/entities/Schema/api/useSchemas';
import { Button } from '@/shared/ui/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/shared/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Box, Plus } from 'lucide-react';
import { useState } from 'react';

interface SchemaReferencePickerProps {
	projectId: string;
	onSelect: (refString: string) => void;
}

export const SchemaReferencePicker = ({ projectId, onSelect }: SchemaReferencePickerProps) => {
	const [open, setOpen] = useState(false);
	const { data: schemas } = useSchemas(projectId);

	const handleSelect = (schemaName: string) => {
		const refString = `{\n  "$ref": "#/components/schemas/${schemaName}"\n}`;
		onSelect(refString);
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline" size="sm" className="h-7 text-xs cursor-pointer">
					<Plus className="h-3 w-3 mr-1" /> Insert Schema Ref
				</Button>
			</PopoverTrigger>

			<PopoverContent className="w-[300px] p-0" align="end">
				<Command>
					<CommandInput placeholder="Search schemas..." />

					<CommandList>
						<CommandEmpty>No schemas found.</CommandEmpty>

						<CommandGroup heading="Components">
							{schemas?.map((schema) => (
								<CommandItem
									key={schema.id}
									value={schema.name}
									onSelect={() => handleSelect(schema.name)}
									className="cursor-pointer"
								>
									<Box className="mr-2 h-4 w-4 text-muted-foreground" />
									<span>{schema.name}</span>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
};
