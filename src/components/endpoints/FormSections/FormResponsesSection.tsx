import React from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export interface ManagedResponseUI {
	_id: string;
	statusCode: string;
	description: string;
	content?: {
		'application/json'?: {
			schemaString?: string;
			exampleString?: string;
			exampleName?: string;
		};
	};
}

interface FormResponsesSectionProps {
	managedResponses: ManagedResponseUI[];
	onAddResponseClick: () => void;
	onRemoveManagedResponse: (id: string) => void;
	onUpdateManagedResponseValue: (
		id: string,
		field: 'statusCode' | 'description',
		value: string,
	) => void;
	onUpdateResponseContentString: (
		id: string,
		type: 'schemaString' | 'exampleString',
		value: string,
	) => void;
	isSubmittingForm: boolean;
}

const FormResponsesSection: React.FC<FormResponsesSectionProps> = ({
	managedResponses,
	onAddResponseClick,
	onRemoveManagedResponse,
	onUpdateManagedResponseValue,
	onUpdateResponseContentString,
	isSubmittingForm,
}) => {
	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-md font-medium">Responses</h3>

				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={onAddResponseClick}
					disabled={isSubmittingForm}
				>
					<Plus className="h-4 w-4 mr-1" /> Add
				</Button>
			</div>

			{managedResponses.length > 0 ? (
				<div className="space-y-8">
					{managedResponses.map((managedResp) => (
						<div
							key={managedResp._id}
							className="p-4 border border-border rounded-lg space-y-4"
						>
							<div className="flex justify-between items-center">
								<div className="flex items-center space-x-2">
									<Input
										value={managedResp.statusCode}
										onChange={(e) =>
											onUpdateManagedResponseValue(
												managedResp._id,
												'statusCode',
												e.target.value,
											)
										}
										className="w-24 font-mono"
										disabled={isSubmittingForm}
									/>
									<Input
										value={managedResp.description}
										onChange={(e) =>
											onUpdateManagedResponseValue(
												managedResp._id,
												'description',
												e.target.value,
											)
										}
										className="max-w-md"
										disabled={isSubmittingForm}
									/>
								</div>

								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => onRemoveManagedResponse(managedResp._id)}
									disabled={isSubmittingForm}
								>
									<X className="h-4 w-4" />
								</Button>
							</div>

							<Label>Schema (JSON)</Label>
							<Textarea
								value={
									managedResp.content?.['application/json']?.schemaString || ''
								}
								onChange={(e) =>
									onUpdateResponseContentString(
										managedResp._id,
										'schemaString',
										e.target.value,
									)
								}
								className="font-mono"
								rows={6}
								disabled={isSubmittingForm}
							/>

							<Label>Example (JSON)</Label>
							<Textarea
								value={
									managedResp.content?.['application/json']?.exampleString || ''
								}
								onChange={(e) =>
									onUpdateResponseContentString(
										managedResp._id,
										'exampleString',
										e.target.value,
									)
								}
								className="font-mono"
								rows={6}
								disabled={isSubmittingForm}
							/>
						</div>
					))}
				</div>
			) : (
				<p className="text-center text-muted-foreground py-4">No responses defined.</p>
			)}
		</div>
	);
};

export default FormResponsesSection;
