import { AppError } from '../types/api';
import { checkSQLiteHealth } from '../lifecycle/sqlite.lifecycle';
import { checkRedisHealth } from '../lifecycle/redis.lifecycle';

export class HealthService {
	async check(): Promise<void> {
		try {
			await checkSQLiteHealth();
			await checkRedisHealth();
		} catch (err) {
			const reason = err instanceof Error ? err.message : 'unknown';
			throw new AppError(503, 'HEALTH_CHECK_FAILED', `Dependency unavailable: ${reason}`);
		}
	}
}
