import Koa from 'koa';
import { config } from './config';
import { createDb, createCache } from './db';
import { bootstrapSuperAdmin } from './auth/bootstrapSuperAdmin';
import { applyGlobalMiddleware } from './middleware/applyGlobalMiddleware';
import { ApplicationService } from './services/application.service';
import { AdminService } from './services/admin.service';
import { ApplicationController } from './controller/application.controller';
import { AdminController } from './controller/admin.controller';
import { composeApiRouter } from './routes';
import { startSQLite, stopSQLite } from './lifecycle/sqlite.lifecycle';
import { startRedis, stopRedis } from './lifecycle/redis.lifecycle';
import { AuthService } from './services/auth.service';
import { AuthController } from './controller/auth.controller';
import { ScheduleService } from './services/schedule.service';
import { ScheduleController } from './controller/schedule.controller';
import serve from 'koa-static';
import mount from 'koa-mount';
import { join } from 'node:path';
import { ProfileService } from './services/profile.service';
import { ProfileController } from './controller/profile.controller';
import type { Socket } from 'node:net';

function isBenignClientError(err: unknown): boolean {
	if (!err || typeof err !== 'object') return false;
	const anyErr = err as any;
	const code = typeof anyErr.code === 'string' ? anyErr.code : '';
	const message = typeof anyErr.message === 'string' ? anyErr.message : '';
	if (code === 'ECONNRESET' || code === 'EPIPE' || code === 'ERR_STREAM_PREMATURE_CLOSE') return true;
	if (message.includes('Premature close')) return true;
	return false;
}

async function main() {
	const sqlite = await startSQLite();
	const redis = await startRedis();

	const db = createDb(sqlite);
	const cache = createCache(redis);

	await bootstrapSuperAdmin(db);

	const applicationService = new ApplicationService(db);
	const adminService = new AdminService(db);

	const profileService = new ProfileService(db);
	const profileController = new ProfileController(profileService);

	const applicationController = new ApplicationController(applicationService);
	const adminController = new AdminController(adminService);
	const authService = new AuthService(db);
	const authController = new AuthController(authService);

	const scheduleService = new ScheduleService(db);
	const scheduleController = new ScheduleController(scheduleService);

	const app = new Koa();
	applyGlobalMiddleware(app);

	const apiRouter = composeApiRouter({ applicationController, adminController, authController, profileController, scheduleController });
	app.use(apiRouter.routes());
	app.use(apiRouter.allowedMethods());

	const uploadRoot = join(process.cwd(), 'data', 'uploads');
	app.use(mount('/uploads', serve(uploadRoot)));

	const server = app.listen(config.port, () => {
		console.log(`Server running at http://localhost:${config.port}`);
	});

	server.on('clientError', (err: Error, socket: Socket) => {
		if (isBenignClientError(err)) {
			// Avoid noisy logs when clients disconnect during reload/restart.
			socket.destroy();
			return;
		}
		console.error('[CLIENT_ERROR]', err);
		socket.destroy();
	});

	const shutdown = async () => {
		console.log('Shutting down...');
		await new Promise<void>((resolve, reject) => {
			server.close((err) => (err ? reject(err) : resolve()));
		});
		await stopSQLite();
		await stopRedis();
		process.exit(0);
	};

	process.once('SIGINT', () => void shutdown());
	process.once('SIGTERM', () => void shutdown());
}

main().catch(async (err) => {
	console.error(err);
	await stopRedis().catch(() => undefined);
	await stopSQLite().catch(() => undefined);
	process.exit(1);
});
