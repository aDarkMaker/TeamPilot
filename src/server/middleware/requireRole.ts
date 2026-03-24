import type { Middleware } from 'koa';
import { AppError } from '../types/api';
import { canAppointAdmin, canReviewApplication } from '../auth/rbac';

export const requireLogin: Middleware = async (ctx, next) => {
	if (!ctx.state.user) throw new AppError(401, 'UNAUTHORIZED', 'LOGIN_REQUIRED');
	await next();
};

export const requireAdminOrAbove: Middleware = async (ctx, next) => {
	if (!ctx.state.user) throw new AppError(401, 'UNAUTHORIZED', 'LOGIN_REQUIRED');
	if (!canReviewApplication(ctx.state.user.role)) {
		throw new AppError(403, 'FORBIDDEN', 'ADMIN_OR_ABOVE_REQUIRED');
	}
	await next();
};

export const requireSuperAdmin: Middleware = async (ctx, next) => {
	if (!ctx.state.user) throw new AppError(401, 'UNAUTHORIZED', 'LOGIN_REQUIRED');
	if (!canAppointAdmin(ctx.state.user.role)) {
		throw new AppError(403, 'FORBIDDEN', 'SUPER_ADMIN_REQUIRED');
	}
	await next();
};
