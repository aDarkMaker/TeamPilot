import type { Middleware } from 'koa';
import { AppError } from '../types/api';
import { canAppointAdmin, canReviewApplication } from '../auth/rbac';

export const requireLogin: Middleware = async (ctx, next) => {
	if (!ctx.state.user) throw new AppError(401, 'UNAUTHORIZED', '先登录好不好～');
	await next();
};

export const requireAdminOrAbove: Middleware = async (ctx, next) => {
	if (!ctx.state.user) throw new AppError(401, 'UNAUTHORIZED', '先登录好不好～');
	if (!canReviewApplication(ctx.state.user.role)) {
		throw new AppError(403, 'FORBIDDEN', '这里没有管理员权限哦');
	}
	await next();
};

export const requireSuperAdmin: Middleware = async (ctx, next) => {
	if (!ctx.state.user) throw new AppError(401, 'UNAUTHORIZED', '先登录好不好～');
	if (!canAppointAdmin(ctx.state.user.role)) {
		throw new AppError(403, 'FORBIDDEN', '得是大老板才行呢');
	}
	await next();
};
