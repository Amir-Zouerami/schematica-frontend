import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface ManagedRequestBodyUI {
	description: string;
	required: boolean;
	contentType: string;
	schemaString: string;
	exampleString: string;
	exampleName?: string;
}

interface FormRequestBodySectionProps {
	requestBodyState: ManagedRequestBodyUI | undefined;
	onUpdateRequestBodyState: (field: keyof ManagedRequestBodyUI, value: any) => void;
	onEnsureRequestBodyStateExists: () => void;
	isSubmittingForm: boolean;
	formIdPrefix: string;
}

const FormRequestBodySection: React.FC<FormRequestBodySectionProps> = ({
	requestBodyState,
	onUpdateRequestBodyState,
	onEnsureRequestBodyStateExists,
	isSubmittingForm,
	formIdPrefix,
}) => {
	if (requestBodyState === undefined) {
		return (
			<div className="text-center py-4">
				<p className="text-muted-foreground">No request body defined.</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="mt-2"
					onClick={onEnsureRequestBodyStateExists}
					disabled={isSubmittingForm}
				>
					Add Request Body
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div>
				<Label htmlFor={`${formIdPrefix}-reqContentType`}>Content Type</Label>

				<Select
					value={requestBodyState.contentType}
					onValueChange={val => onUpdateRequestBodyState('contentType', val)}
					disabled={isSubmittingForm}
				>
					<SelectTrigger id={`${formIdPrefix}-reqContentType`}>
						<SelectValue />
					</SelectTrigger>

					<SelectContent>
						<SelectItem value="application/json">application/json</SelectItem>
						<SelectItem value="application/xml">application/xml</SelectItem>
						<SelectItem value="text/plain">text/plain</SelectItem>
						<SelectItem value="multipart/form-data">multipart/form-data</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div>
				<Label htmlFor={`${formIdPrefix}-reqDesc`}>Description</Label>
				<Input
					id={`${formIdPrefix}-reqDesc`}
					value={requestBodyState.description}
					onChange={e => onUpdateRequestBodyState('description', e.target.value)}
					disabled={isSubmittingForm}
				/>
			</div>

			<div className="flex items-center space-x-2">
				<Switch
					id={`${formIdPrefix}-reqRequired`}
					checked={requestBodyState.required}
					onCheckedChange={val => onUpdateRequestBodyState('required', val)}
					disabled={isSubmittingForm}
				/>
				<Label htmlFor={`${formIdPrefix}-reqRequired`}>Required</Label>
			</div>

			<div>
				<Label htmlFor={`${formIdPrefix}-reqSchema`}>Schema (JSON)</Label>
				<Textarea
					id={`${formIdPrefix}-reqSchema`}
					value={requestBodyState.schemaString}
					onChange={e => onUpdateRequestBodyState('schemaString', e.target.value)}
					className="font-mono"
					rows={8}
					disabled={isSubmittingForm}
				/>
			</div>

			<div>
				<Label htmlFor={`${formIdPrefix}-reqExample`}>Example (JSON)</Label>
				<Textarea
					id={`${formIdPrefix}-reqExample`}
					value={requestBodyState.exampleString}
					onChange={e => onUpdateRequestBodyState('exampleString', e.target.value)}
					className="font-mono"
					rows={8}
					disabled={isSubmittingForm}
				/>
			</div>
		</div>
	);
};

export default FormRequestBodySection;
