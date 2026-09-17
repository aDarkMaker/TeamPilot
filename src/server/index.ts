import { config } from './config';
import { bootstrapSuperAdmin } from './auth/bootstrapSuperAdmin';
import { bootstrapJoinUsPublicUser } from './auth/bootstrapJoinUsPublicUser';
import { startSQLite, stopSQLite } from './lifecycle/sqlite.lifecycle';
import { startRedis, stopRedis } from './lifecycle/redis.lifecycle';
import { createContainer } from './container';
import { createApp, handleClientError } from './app';

async function main() {
	const sqlite = await startSQLite();
	const redis = await startRedis();

	const container = createContainer(sqlite, redis);
	await bootstrapSuperAdmin(container.db);
	await bootstrapJoinUsPublicUser(container.db);

	const app = createApp(container);

	const server = app.listen(config.port, () => {
		console.log(`Server running at http://localhost:${config.port}`);
	});

	server.on('clientError', handleClientError);

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
