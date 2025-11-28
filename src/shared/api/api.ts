import { appEventBus, AppEvents } from '@/shared/lib/event-bus';
import type { components } from '@/shared/types/api-types';

const API_BASE_URL = '/api/v2';

type ErrorResponse = components['schemas']['ErrorResponseDto'];
type ErrorPayload = components['schemas']['ErrorPayloadDto'];
type RequestMeta = components['schemas']['RequestMeta'] & { metaCode?: string };
type PaginationMeta = components['schemas']['PaginationMetaDto'];

export interface ApiResponse<T> {
	data: T;
	meta: RequestMeta & Partial<PaginationMeta>;
}

export class ApiError extends Error {
	status: number;
	errorResponse: ErrorPayload | null;
	metaCode?: string;

	constructor(
		message: string,
		status: number,
		errorResponse: ErrorPayload | null,
		metaCode?: string,
	) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.errorResponse = errorResponse;
		this.metaCode = metaCode;
	}
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
	params?: Record<string, string | number | boolean | undefined | null>;
	body?: unknown;
	/**
	 * If true, 401 errors will not trigger the global logout event.
	 */
	skipGlobalErrorHandler?: boolean;
}

interface StructuredErrorMessage {
	message: string | string[];
	error?: string;
	statusCode?: number;
}

function isStructuredError(obj: unknown): obj is StructuredErrorMessage {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'message' in obj &&
		(typeof (obj as StructuredErrorMessage).message === 'string' ||
			Array.isArray((obj as StructuredErrorMessage).message))
	);
}

function extractErrorMessage(errorPayload: ErrorPayload | null, status: number): string {
	if (!errorPayload) {
		return `HTTP Error ${status}`;
	}

	const { message } = errorPayload;

	if (typeof message === 'string') {
		return message;
	}

	if (isStructuredError(message)) {
		const msgContent = message.message;
		if (Array.isArray(msgContent)) {
			return msgContent.join(', ');
		}
		return msgContent;
	}

	return 'An unexpected error occurred.';
}

/**
 * Validates if an object matches the expected API Envelope structure.
 */
function isApiEnvelope(obj: unknown): obj is { data: unknown; meta: unknown } {
	return typeof obj === 'object' && obj !== null && 'data' in obj && 'meta' in obj;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
	const { params, body: requestBody, skipGlobalErrorHandler, ...fetchNativeOptions } = options;
	let url = `${API_BASE_URL}${endpoint}`;

	if (params) {
		const queryParams = new URLSearchParams();
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null && value !== '') {
				queryParams.append(key, String(value));
			}
		});
		if (queryParams.toString()) {
			url += `?${queryParams.toString()}`;
		}
	}

	const token = localStorage.getItem('token');
	const headers = new Headers(fetchNativeOptions.headers || {});

	if (
		!headers.has('Content-Type') &&
		!(requestBody instanceof FormData) &&
		requestBody !== undefined &&
		requestBody !== null
	) {
		headers.append('Content-Type', 'application/json');
	}

	if (token) {
		headers.append('Authorization', `Bearer ${token}`);
	}

	let processedBody: BodyInit | undefined;
	if (requestBody !== undefined && requestBody !== null) {
		if (requestBody instanceof FormData) {
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
		} else {
			processedBody = JSON.stringify(requestBody);
		}
	}

	try {
		const fetchResponse = await fetch(url, {
			...fetchNativeOptions,
			headers,
			body: processedBody,
		});

		const fallbackMeta: RequestMeta = {
			requestId: fetchResponse.headers.get('x-request-id') || 'unknown-no-content',
			apiVersion: '2',
			timestamp: new Date().toISOString(),
		};

		if (fetchResponse.status === 204 || fetchResponse.status === 205) {
			return { data: null as T, meta: fallbackMeta };
		}

		if (fetchResponse.status === 401 && !skipGlobalErrorHandler) {
			appEventBus.dispatch(AppEvents.API_UNAUTHORIZED);
		}

		const responseJson = (await fetchResponse.json()) as unknown;

		if (!fetchResponse.ok) {
			const errorEnvelope = responseJson as ErrorResponse;
			const errorPayload = errorEnvelope.error;
			const errorMessage = extractErrorMessage(errorPayload, fetchResponse.status);
			const metaCode = (errorEnvelope.meta as RequestMeta | undefined)?.metaCode;

			throw new ApiError(errorMessage, fetchResponse.status, errorPayload, metaCode);
		}

		if (isApiEnvelope(responseJson)) {
			return responseJson as ApiResponse<T>;
		}

		return { data: responseJson as T, meta: fallbackMeta };
	} catch (error) {
		if (error instanceof ApiError) {
			throw error;
		}
		throw new ApiError(
			error instanceof Error ? error.message : 'Network error',
			0,
			null,
			'NetworkError',
		);
	}
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
