import Redis from 'ioredis';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn, type Subprocess } from 'bun';
import { config } from '../config';

let redis: Redis | null = null;
let redisProcess: Subprocess | null = null;
let startedByApp = false;

const REDIS_PORT = Number(new URL(config.redisUrl).port || 6379);
const REDIS_DATA_DIR = process.env.REDIS_DATA_DIR?.trim() || resolve(process.cwd(), 'data');
const REDIS_DBFILENAME = process.env.REDIS_DBFILENAME?.trim() || 'redis.rdb';

function createClient(): Redis {
	const client = new Redis(config.redisUrl, {
		lazyConnect: true,
		maxRetriesPerRequest: 1,
	});
	client.on('error', () => {
		// Avoid noisy unhandled error events during startup retries.
	});
	return client;
}

async function tryConnectOnce(): Promise<Redis | null> {
	const client = createClient();
	try {
		await client.connect();
		await client.ping();
		return client;
	} catch {
		client.disconnect();
		return null;
	}
}

function startRedisServer(): Subprocess {
	mkdirSync(REDIS_DATA_DIR, { recursive: true });
	return spawn({
		cmd: ['redis-server', '--port', String(REDIS_PORT), '--dir', REDIS_DATA_DIR, '--dbfilename', REDIS_DBFILENAME],
		stdout: 'ignore',
		stderr: 'ignore',
	});
}

async function waitForRedis(retries = 30, delayMs = 200): Promise<Redis | null> {
	for (let i = 0; i < retries; i++) {
		const client = await tryConnectOnce();
		if (client) return client;
		await new Promise((resolveDelay) => setTimeout(resolveDelay, delayMs));
	}
	return null;
}

export async function startRedis(): Promise<Redis> {
	if (redis) return redis;

	const existing = await tryConnectOnce();
	if (existing) {
		redis = existing;
		return redis;
	}

	try {
		redisProcess = startRedisServer();
		startedByApp = true;
	} catch (error) {
		throw new Error(`Failed to start redis-server: ${(error as Error).message}`);
	}

	const client = await waitForRedis();
	if (!client) {
		if (redisProcess) redisProcess.kill();
		redisProcess = null;
		startedByApp = false;
		throw new Error('Failed to connect to Redis after starting redis-server');
	}
	redis = client;
	return redis;
}

export async function checkRedisHealth(): Promise<void> {
	if (!redis) throw new Error('REDIS_NOT_STARTED');
	await redis.ping();
}

export async function stopRedis(): Promise<void> {
	if (redis) {
		await redis.quit().catch(() => undefined);
		redis = null;
	}
	if (startedByApp && redisProcess) {
		redisProcess.kill();
		redisProcess = null;
		startedByApp = false;
	}
}
