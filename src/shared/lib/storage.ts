/**
 * Prepends the backend URL to relative paths for static assets.
 * Handles null/undefined values gracefully.
 */
export const getStorageUrl = (path: string | null | undefined): string | undefined => {
	if (!path) return undefined;
	if (path.startsWith('http')) return path;

	const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
	const cleanPath = path.startsWith('/') ? path : `/${path}`;

	return `${baseUrl}${cleanPath}`;
};
