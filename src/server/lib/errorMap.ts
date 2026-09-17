import { AppError } from '../types/api';

export interface ErrorMapEntry {
	status: number;
	code: string;
	message: string;
}

/**
 * The db layer signals business codes via Error.message (e.g. 'SCHEDULE_NOT_FOUND').
 * Translate them into AppError here; anything unmapped is rethrown as-is.
 */
export function rethrowMapped(err: unknown, mapping: Record<string, ErrorMapEntry>): never {
	const message = err instanceof Error ? err.message : '';
	const entry = mapping[message];
	throw entry ? new AppError(entry.status, entry.code, entry.message) : err;
}

/** Throws the AppError registered for a known business code; unknown codes fall back to a 500. */
export function failWith(mapping: Record<string, ErrorMapEntry>, code: string): never {
	const entry = mapping[code] ?? { status: 500, code: 'INTERNAL', message: '出了点岔子' };
	throw new AppError(entry.status, entry.code, entry.message);
}
