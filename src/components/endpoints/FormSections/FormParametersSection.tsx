import React from 'react';
import { Trash } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ParameterObject } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

export interface ManagedParameterUI extends ParameterObject {
	_id: string;
}

interface FormParametersSectionProps {
	parameters: ManagedParameterUI[];
	onAddParameter: (paramType: 'path' | 'query' | 'header') => void;
	onRemoveParameter: (id: string) => void;
	onUpdateParameter: (
		id: string,
		field: keyof Omit<ManagedParameterUI, '_id'>,
		value: any,
	) => void;
	isSubmittingForm: boolean;
}

const FormParametersSection: React.FC<FormParametersSectionProps> = ({
	parameters,
	onAddParameter,
	onRemoveParameter,
	onUpdateParameter,
	isSubmittingForm,
}) => {
	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-md font-medium">Parameters</h3>

				<div className="space-x-2">
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => onAddParameter('path')}
						disabled={isSubmittingForm}
					>
						Path
					</Button>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => onAddParameter('query')}
						disabled={isSubmittingForm}
					>
						Query
					</Button>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => onAddParameter('header')}
						disabled={isSubmittingForm}
					>
						Header
					</Button>
				</div>
			</div>

			{parameters.length > 0 ? (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>In</TableHead>
							<TableHead>Req.</TableHead>
							<TableHead>Description</TableHead>
							<TableHead className="w-[50px]"></TableHead>
						</TableRow>
					</TableHeader>

					<TableBody>
						{parameters.map((param) => (
							<TableRow key={param._id}>
								<TableCell>
									<Input
										value={param.name}
										onChange={(e) =>
											onUpdateParameter(param._id, 'name', e.target.value)
										}
										disabled={isSubmittingForm}
									/>
								</TableCell>

								<TableCell>
									<Select
										value={param.in}
										onValueChange={(val) =>
											onUpdateParameter(
												param._id,
												'in',
												val as 'path' | 'query' | 'header',
											)
										}
										disabled={isSubmittingForm}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>

										<SelectContent>
											<SelectItem value="path">path</SelectItem>
											<SelectItem value="query">query</SelectItem>
											<SelectItem value="header">header</SelectItem>
										</SelectContent>
									</Select>
								</TableCell>

								<TableCell>
									<Switch
										checked={param.required || false}
										onCheckedChange={(val) =>
											onUpdateParameter(param._id, 'required', val)
										}
										disabled={param.in === 'path' || isSubmittingForm}
									/>
								</TableCell>

								<TableCell>
									<Input
										value={param.description || ''}
										onChange={(e) =>
											onUpdateParameter(
												param._id,
												'description',
												e.target.value,
											)
										}
										disabled={isSubmittingForm}
									/>
								</TableCell>

								<TableCell>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={() => onRemoveParameter(param._id)}
										disabled={isSubmittingForm}
									>
										<Trash className="h-4 w-4" />
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			) : (
				<p className="text-center text-muted-foreground py-4">No parameters defined.</p>
			)}
		</div>
	);
};

export default FormParametersSection;
