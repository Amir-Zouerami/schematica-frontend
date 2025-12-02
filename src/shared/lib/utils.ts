import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Removes the 'isDeleted' property (and potentially others in the future)
 * from user objects before sending them to the API.
 *
 * This is required because the Backend DTOs for writing (AccessUserValidationDto)
 * are stricter than the Read DTOs (SanitizedUserDto).
 */
export function sanitizeUserForApi<T extends { isDeleted?: boolean }>(
	user: T,
): Omit<T, 'isDeleted'> {
	if (!user) return user;
	const { isDeleted, ...rest } = user;
	return rest;
}
