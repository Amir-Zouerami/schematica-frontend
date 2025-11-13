import type { components } from '@/types/api-types';

const API_BASE_URL = '/api/v2';

type ErrorResponse = components['schemas']['ErrorResponseDto'];
type RequestMeta = components['schemas']['RequestMeta'];
type PaginationMeta = components['schemas']['PaginationMetaDto'];

/**
 * Represents the structure of a successful API response envelope.
 */
export interface ApiResponse<T> {
	data: T;
	meta: RequestMeta & Partial<PaginationMeta>;
}

/**
 * A custom error class for API responses.
 * Contains the HTTP status, a user-friendly message, and the full error payload from the backend.
 */
export class ApiError extends Error {
	status: number;
	errorResponse: ErrorResponse['error'];

	constructor(message: string, status: number, errorResponse: ErrorResponse['error']) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.errorResponse = errorResponse;
	}
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
	params?: Record<string, string | number | boolean>;
	body?: unknown;
}

/**
 * A standardized request function for interacting with the Schematica v2 API.
 * It automatically handles the API response envelope, JWT authentication, and error parsing.
 * On success, it returns the full `{ data, meta }` envelope.
 * On failure, it throws a structured `ApiError`.
 */
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
	const { params, body: requestBody, ...fetchNativeOptions } = options;
	let url = `${API_BASE_URL}${endpoint}`;

	if (params) {
		const queryParams = new URLSearchParams();
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				queryParams.append(key, String(value));
			}
		});
		if (queryParams.toString()) {
			url += `?${queryParams.toString()}`;
		}
	}

	const token = localStorage.getItem('token');
	const headers = new Headers(fetchNativeOptions.headers || {});
	if (token) {
		headers.append('Authorization', `Bearer ${token}`);
	}

	let processedBody: BodyInit | undefined;
	if (requestBody !== undefined && requestBody !== null) {
		if (requestBody instanceof FormData) {
			// let browser set Content-Type for FormData
			processedBody = requestBody;
		} else if (
			typeof requestBody === 'string' ||
			requestBody instanceof Blob ||
			requestBody instanceof ArrayBuffer ||
			requestBody instanceof URLSearchParams ||
			requestBody instanceof ReadableStream ||
			ArrayBuffer.isView(requestBody)
		) {
			processedBody = requestBody as BodyInit;
		} else if (typeof requestBody === 'object') {
			if (!headers.has('Content-Type')) {
				headers.append('Content-Type', 'application/json');
			}

			processedBody = JSON.stringify(requestBody);
		} else {
			processedBody = String(requestBody);
		}
	}

	const fetchResponse = await fetch(url, {
		...fetchNativeOptions,
		headers,
		body: processedBody,
	});

	if (fetchResponse.status === 204 || fetchResponse.status === 205) {
		return { data: null, meta: {} } as ApiResponse<T>;
	}

	const responseEnvelope = await fetchResponse.json();

	if (!fetchResponse.ok || responseEnvelope.error) {
		const errorPayload = responseEnvelope.error || {
			statusCode: fetchResponse.status,
			message: 'An unexpected client-side error occurred.',
			type: 'ClientError',
		};

		const errorMessage =
			typeof errorPayload.message === 'string'
				? errorPayload.message
				: JSON.stringify(errorPayload.message);

		throw new ApiError(errorMessage, fetchResponse.status, errorPayload);
	}

	return responseEnvelope as ApiResponse<T>;
}

export const api = {
	get: <T>(endpoint: string, options?: Omit<RequestOptions, 'body'>) =>
		request<T>(endpoint, { ...options, method: 'GET' }),
	post: <T>(endpoint: string, data?: unknown, options?: Omit<RequestOptions, 'body'>) =>
		request<T>(endpoint, { ...options, method: 'POST', body: data }),
	put: <T>(endpoint: string, data?: unknown, options?: Omit<RequestOptions, 'body'>) =>
		request<T>(endpoint, { ...options, method: 'PUT', body: data }),
	patch: <T>(endpoint: string, data?: unknown, options?: Omit<RequestOptions, 'body'>) =>
		request<T>(endpoint, { ...options, method: 'PATCH', body: data }),
	delete: <T>(endpoint: string, options?: RequestOptions) =>
		request<T>(endpoint, { ...options, method: 'DELETE' }),
};
