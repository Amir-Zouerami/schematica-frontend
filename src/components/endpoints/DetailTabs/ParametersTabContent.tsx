import React from 'react';
import ParametersTable from '../ParametersTable';
import { OpenAPISpec, ParameterObject } from '@/types/types';
import EmptyEndpointMessage from '@/components/general/EmptyEndpointMessage';

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
