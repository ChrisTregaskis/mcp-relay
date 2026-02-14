// Thin fetch wrapper with configurable timeout via AbortController
import { ExternalServiceError } from './errors.js';

import type { ErrorMetadata } from './errors.js';

const DEFAULT_TIMEOUT_MS = 30_000;

/** Strip query string and fragment to avoid leaking tokens in error messages (OWASP). */
function safeUrl(raw: string): string {
  try {
    const parsed = new URL(raw);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return '<malformed-url>';
  }
}

interface HttpRequestOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  metadata: ErrorMetadata;
}

interface HttpResponse {
  status: number;
  body: string;
}

export async function httpRequest(options: HttpRequestOptions): Promise<HttpResponse> {
  const { url, method = 'GET', headers, body, timeoutMs = DEFAULT_TIMEOUT_MS, metadata } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      ...(headers !== undefined ? { headers } : {}),
      ...(body !== undefined ? { body } : {}),
      signal: controller.signal,
    });

    const responseBody = await response.text();

    return {
      status: response.status,
      body: responseBody,
    };
  } catch (error) {
    const safe = safeUrl(url);

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ExternalServiceError(`Request to ${safe} timed out after ${timeoutMs}ms`, metadata);
    }

    const message = error instanceof Error ? error.message : 'Unknown network error';

    throw new ExternalServiceError(`Request to ${safe} failed: ${message}`, metadata);
  } finally {
    clearTimeout(timeoutId);
  }
}
