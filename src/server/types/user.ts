import type { Role, UserStatus } from './auth';

export interface User {
	id: string;
	username: string;
	passwordHash: string;
	role: Role;
	status: UserStatus;
	createdAt: string;
	updatedAt: string;
}
