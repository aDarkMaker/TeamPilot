import type { Role } from './auth';

declare module 'koa' {
	interface DefaultState {
		user?: {
			id: string;
			username: string;
			role: Role;
		};
	}
}
