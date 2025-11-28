import type { operations } from '@/shared/types/api-types';

type AuditAction = operations['AuditController_findAll_v2']['parameters']['query']['action'];

/**
 * A static list of all possible audit actions in the system.
 * This is used to populate dropdowns for filtering the audit trail.
 * It should be kept in sync with the backend API specification.
 */
export const auditActions: AuditAction[] = [
	'PROJECT_CREATED',
	'PROJECT_UPDATED',
	'PROJECT_DELETED',
	'PROJECT_ACCESS_UPDATED',
	'PROJECT_SPEC_IMPORTED',
	'ENDPOINT_STATUS_UPDATED',
	'ENVIRONMENT_CREATED',
	'ENVIRONMENT_UPDATED',
	'ENVIRONMENT_DELETED',
	'SECRET_CREATED',
	'SECRET_UPDATED',
	'SECRET_DELETED',
	'SCHEMA_COMPONENT_CREATED',
	'SCHEMA_COMPONENT_UPDATED',
	'SCHEMA_COMPONENT_DELETED',
	'TEAM_CREATED',
	'TEAM_UPDATED',
	'TEAM_DELETED',
	'USER_CREATED',
	'USER_UPDATED',
	'USER_DELETED',
	'USER_PICTURE_UPDATED',
];
