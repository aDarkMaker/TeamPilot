import type { ApplicationStatus } from './auth';

export interface AccountApplication {
	id: string;
	username: string;
	passwordHash: string;
	reason: string;
	status: ApplicationStatus;
	reviewedBy: string | null;
	reviewedAt: string | null;
	createdAt: string;
}
