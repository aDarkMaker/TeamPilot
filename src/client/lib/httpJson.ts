/** Envelope shared by every /api endpoint */
type ApiEnvelope<T> = { ok: true; data?: T } | { ok: false; code?: string; message?: string };

export class ApiError extends Error {
	readonly code: string = '';

	constructor(message: string, code?: string) {
		super(message);
		if (code) this.code = code;
	}
}

export type HttpJsonOptions = {
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	/** JSON-encoded as the request body */
	body?: unknown;
	query?: Record<string, string | number | boolean | null | undefined>;
	fallbackMessage: string;
};

function buildUrl(url: string, query: HttpJsonOptions['query']): string {
	if (!query) return url;
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (value == null || value === '') continue;
		params.set(key, String(value));
	}
	const qs = params.toString();
	if (!qs) return url;
	return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
}

async function parseEnvelope<T>(res: Response): Promise<ApiEnvelope<T>> {
	return (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
}

async function request<T>(url: string, options: HttpJsonOptions): Promise<ApiEnvelope<T>> {
	const { method = 'GET', body, fallbackMessage } = options;
	const headers: Record<string, string> = {};
	if (body !== undefined) headers['Content-Type'] = 'application/json';

	const res = await fetch(buildUrl(url, options.query), {
		method,
		credentials: 'include',
		headers: body === undefined ? undefined : headers,
		body: body === undefined ? undefined : JSON.stringify(body),
	});

	const envelope = await parseEnvelope<T>(res);
	if (!res.ok || !envelope.ok) {
		if (envelope.ok) throw new ApiError(fallbackMessage);
		throw new ApiError(envelope.message || fallbackMessage, envelope.code);
	}
	return envelope;
}

/** Request expecting a payload; throws ApiError with the server message when the envelope is not ok */
export async function httpJson<T>(url: string, options: HttpJsonOptions): Promise<T> {
	const envelope = (await request<T>(url, options)) as { ok: true; data?: T };
	if (envelope.data === undefined) throw new ApiError(options.fallbackMessage);
	return envelope.data;
}

/** Request without a payload (DELETE / PATCH acknowledgements) */
export async function httpJsonVoid(url: string, options: HttpJsonOptions): Promise<void> {
	await request<unknown>(url, options);
}

/** Multipart request; the browser sets the boundary, so no Content-Type here */
export async function httpMultipart<T>(url: string, form: FormData, fallbackMessage: string): Promise<T> {
	const res = await fetch(url, { method: 'POST', credentials: 'include', body: form });
	const envelope = await parseEnvelope<T>(res);
	if (!res.ok || !envelope.ok) {
		if (envelope.ok) throw new ApiError(fallbackMessage);
		throw new ApiError(envelope.message || fallbackMessage, envelope.code);
	}
	if (envelope.data === undefined) throw new ApiError(fallbackMessage);
	return envelope.data;
}
