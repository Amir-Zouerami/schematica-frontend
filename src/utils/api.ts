import { ApiResponse, FetchBodyType } from '../types/types';

const API_BASE_URL = '/api';

interface RequestOptions extends Omit<RequestInit, 'body'> {
	params?: Record<string, string>;
	body?: FetchBodyType | Record<string, any> | any[] | null;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
	let responseStatus: number | undefined = undefined;

	try {
		const { params, body: requestBody, ...fetchNativeOptions } = options;
		let url = `${API_BASE_URL}${endpoint}`;

		if (params) {
			const queryParams = new URLSearchParams();
			Object.entries(params).forEach(([key, value]) => {
				queryParams.append(key, value);
			});
			url += `?${queryParams.toString()}`;
		}

		const token = localStorage.getItem('token');
		const headers = new Headers(fetchNativeOptions.headers || {});
		if (token) headers.append('Authorization', `Bearer ${token}`);

		let processedBody: FetchBodyType | undefined = undefined;

		if (requestBody !== undefined && requestBody !== null) {
			if (
				requestBody instanceof FormData ||
				typeof requestBody === 'string' ||
				requestBody instanceof Blob ||
				requestBody instanceof ArrayBuffer ||
				ArrayBuffer.isView(requestBody) ||
				requestBody instanceof URLSearchParams ||
				requestBody instanceof ReadableStream
			) {
				processedBody = requestBody as FetchBodyType;
			}
			else if (typeof requestBody === 'object') {
				headers.append('Content-Type', 'application/json');
				processedBody = JSON.stringify(requestBody);
			}
		}

		const fetchResponse = await fetch(url, {
			...fetchNativeOptions,
			headers,
			body: processedBody,
		});

		responseStatus = fetchResponse.status;

		const contentType = fetchResponse.headers.get('content-type');
		let responseDataJson: any;

		if (contentType && contentType.includes('application/json')) {
			responseDataJson = await fetchResponse.json();
		}
		else if (fetchResponse.status === 204 || fetchResponse.status === 205) {
			responseDataJson = null;
		}
		else {
			responseDataJson = await fetchResponse.text();
		}

		if (!fetchResponse.ok) {
			let errorMessage = 'An error occurred';

			if (
				responseDataJson &&
				typeof responseDataJson === 'object' &&
				responseDataJson.message &&
				typeof responseDataJson.message === 'string'
			) {
				errorMessage = responseDataJson.message;
			}
			else if (
				typeof responseDataJson === 'string' &&
				responseDataJson.length > 0 &&
				responseDataJson.length < 200 &&
				!responseDataJson.trim().startsWith('<')
			) {
				errorMessage = responseDataJson;
			}
			else if (fetchResponse.statusText) {
				errorMessage = `${fetchResponse.status}: ${fetchResponse.statusText}`;
			}
			else {
				errorMessage = `HTTP error ${fetchResponse.status}`;
			}

			return {
				error: errorMessage,
				status: responseStatus,
				errorData: responseDataJson,
			};
		}

		return { data: responseDataJson as T, status: responseStatus };
	}
	catch (error) {
		return {
			error: 'Network error or server not responding',
			status: responseStatus,
		};
	}
}

export const api = {
	get: <T>(endpoint: string, options?: Omit<RequestOptions, 'body'>) => request<T>(endpoint, { ...options, method: 'GET' }),
	post: <T>(endpoint: string, data?: any, options?: Omit<RequestOptions, 'body'>) =>
		request<T>(endpoint, { ...options, method: 'POST', body: data }),
	put: <T>(endpoint: string, data?: any, options?: Omit<RequestOptions, 'body'>) =>
		request<T>(endpoint, { ...options, method: 'PUT', body: data }),
	patch: <T>(endpoint: string, data?: any, options?: Omit<RequestOptions, 'body'>) =>
		request<T>(endpoint, { ...options, method: 'PATCH', body: data }),
	delete: <T>(endpoint: string, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'DELETE' }),
};
