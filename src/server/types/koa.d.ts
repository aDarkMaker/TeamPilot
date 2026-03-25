import type { Role } from './auth';
import type { MulterFile } from '@koa/multer';

declare module 'koa' {
	interface DefaultState {
		user?: {
			id: string;
			username: string;
			role: Role;
		};
	};
	interface Request {
		file?: MulterFile;
		files?: { [fieldName: string]: MulterFile[] };
	}
}
