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

async function main() {
	const sqlite = await startSQLite();
	const redis = await startRedis();

	const db = createDb(sqlite);
	const cache = createCache(redis);

	await bootstrapSuperAdmin(db);

	const applicationService = new ApplicationService(db);
	const adminService = new AdminService(db);

	const applicationController = new ApplicationController(applicationService);
	const adminController = new AdminController(adminService);
	const authService = new AuthService(db);
	const authController = new AuthController(authService);

	const app = new Koa();
	applyGlobalMiddleware(app);

	const apiRouter = composeApiRouter({ applicationController, adminController, authController });
	app.use(apiRouter.routes());
	app.use(apiRouter.allowedMethods());

	const server = app.listen(config.port, () => {
		console.log(`Server running at http://localhost:${config.port}`);
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
