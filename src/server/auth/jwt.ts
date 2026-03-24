import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { Role } from '../types/auth';

export interface JwtPayload {
	sub: string;
	username: string;
	role: Role;
}

export function signAccessToken(payload: JwtPayload): string {
	return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export function verifyAccessToken(token: string): JwtPayload {
	return jwt.verify(token, config.jwtSecret) as JwtPayload;
}
