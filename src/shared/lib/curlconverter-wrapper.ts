import * as curlconverter from 'curlconverter';

export interface ParsedCurlCommand {
	url?: string;
	raw_url?: string;
	method?: string;
	queries?: Record<string, string | string[]>;
	headers?: Record<string, string>;
	data?: unknown;
}

export function toJsonObject(curl: string): ParsedCurlCommand {
	return curlconverter.toJsonObject(curl) as ParsedCurlCommand;
}
