import { httpJson, httpJsonVoid } from '@/lib/httpJson';
import type { PendingApplication } from '@/lib/pendingApplicationsStore';
import type { Role } from '@/lib/roles';

export type UserStatus = 'active' | 'disabled';

export type ManagedUser = {
	id: string;
	username: string;
	role: Role;
	status: UserStatus;
	createdAt: string;
	updatedAt: string;
};

export type CurrentUser = { role: Role; id: string; username: string };

/** Falls back to a generic message so callers never surface an empty error */
const FAILED = '请求失败了，稍后再试';

export function fetchCurrentUser(): Promise<CurrentUser> {
	return httpJson<CurrentUser>('/api/users/me', { fallbackMessage: FAILED });
}

export function fetchUsers(): Promise<ManagedUser[]> {
	return httpJson<ManagedUser[]>('/api/users', { fallbackMessage: FAILED });
}

export function fetchPendingApplications(): Promise<PendingApplication[]> {
	return httpJson<PendingApplication[]>('/api/application/pending', { fallbackMessage: FAILED });
}

export function approveApplication(id: string): Promise<void> {
	return httpJsonVoid(`/api/application/${encodeURIComponent(id)}/approve`, { method: 'POST', fallbackMessage: FAILED });
}

export function rejectApplication(id: string): Promise<void> {
	return httpJsonVoid(`/api/application/${encodeURIComponent(id)}/reject`, { method: 'POST', fallbackMessage: FAILED });
}

export function disableUser(id: string): Promise<void> {
	return httpJsonVoid(`/api/users/${encodeURIComponent(id)}/disable`, { method: 'POST', fallbackMessage: FAILED });
}

export function enableUser(id: string): Promise<void> {
	return httpJsonVoid(`/api/users/${encodeURIComponent(id)}/enable`, { method: 'POST', fallbackMessage: FAILED });
}

export function removeUser(id: string): Promise<void> {
	return httpJsonVoid(`/api/users/${encodeURIComponent(id)}`, { method: 'DELETE', fallbackMessage: FAILED });
}

export function appointAdmin(id: string): Promise<void> {
	return httpJsonVoid(`/api/users/${encodeURIComponent(id)}/appoint-admin`, { method: 'POST', fallbackMessage: FAILED });
}

export function revokeAdmin(id: string): Promise<void> {
	return httpJsonVoid(`/api/users/${encodeURIComponent(id)}/revoke-admin`, { method: 'POST', fallbackMessage: FAILED });
}
