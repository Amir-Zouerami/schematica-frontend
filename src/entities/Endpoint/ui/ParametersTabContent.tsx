import EmptyEndpointMessage from '@/components/general/EmptyEndpointMessage';
import ParametersTable from '@/entities/Endpoint/ui/ParametersTable';
import { OpenAPISpec, ParameterObject } from '@/shared/types/types';
import React from 'react';

interface ParametersTabContentProps {
	parameters: ParameterObject[];
	openApiSpec: OpenAPISpec;
	paramTypeLabel: string;
}

const ParametersTabContent: React.FC<ParametersTabContentProps> = ({
	parameters,
	openApiSpec,
	paramTypeLabel,
}) => {
	if (!parameters || parameters.length === 0) {
		return <EmptyEndpointMessage type={paramTypeLabel} />;
	}

	return <ParametersTable parameters={parameters} openApiSpec={openApiSpec} />;
};

export default ParametersTabContent;
