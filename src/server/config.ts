import type { SignOptions } from 'jsonwebtoken';

export interface AppConfig {
	port: number;
	databasePath: string;
	redisUrl: string;
	home: {
		biliUid: string;
		biliCookie: string;
	};
	jwtSecret: string;
	jwtExpiresIn: SignOptions['expiresIn'];
	superAdmin: {
		username: string;
		password: string;
	};
}

function required(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`Missing Env: ${name}`);
	return value;
}

export const config: AppConfig = {
	port: Number(process.env.PORT ?? 3000),
	databasePath: process.env.DATABASE_PATH?.trim() || './data/hxktoolbox.sqlite',
	redisUrl: required('REDIS_URL'),
	home: {
		biliUid: process.env.HOME_BILI_UID?.trim() || '672455305',
		biliCookie: process.env.HOME_BILI_COOKIE?.trim() || '',
	},
	jwtSecret: required('JWT_SECRET'),
	jwtExpiresIn: (process.env.JWT_EXPIRES_IN?.trim() || '2h') as SignOptions['expiresIn'],
	superAdmin: {
		username: required('SUPER_ADMIN_USERNAME'),
		password: required('SUPER_ADMIN_PASSWORD'),
	},
};
