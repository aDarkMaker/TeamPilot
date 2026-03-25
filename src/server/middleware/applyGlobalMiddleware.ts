import type Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { errorHandler } from './errorHandler';
import { authMiddleware } from './auth';

/**
 * 全局中间件栈：错误处理 → 解析 body → 解析用户（可选 JWT / Cookie）
 * 与具体业务路由解耦，便于测试与调整顺序。
 */
export function applyGlobalMiddleware(app: Koa): void {
	app.use(errorHandler);
	app.use(bodyParser());
	app.use(authMiddleware);
}
