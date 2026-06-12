import type { Role, UserStatus } from './auth';

export interface User {
	id: string;
	username: string;
	passwordHash: string;
	role: Role;
	status: UserStatus;
	nickname: string | null;
	signature: string | null;
	qq: string | null;
	avatarPath: string | null;
	profileBgPath: string | null;
	createdAt: string;
	updatedAt: string;
	birthdayMonth: number | null;
	birthdayDay: number | null;
}

export interface UserProfilePublic {
	id: string;
	username: string;
	nickname: string | null;
	signature: string | null;
	qq: string | null;
	avatarUrl: string | null;
	profileBackgroundUrl: string | null;
	role: Role;
	createdAt: string;
	updatedAt: string;
	birthdayMonth: number | null;
	birthdayDay: number | null;
}
