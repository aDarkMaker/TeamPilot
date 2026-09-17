import type Redis from 'ioredis';

import type { Cache } from './contract';

export function createCache(redis: Redis): Cache {
	return {
		get: (key) => redis.get(key),
		setex: (key, ttl, value) => redis.setex(key, ttl, value),
		del: (key) => redis.del(key),
		incr: (key) => redis.incr(key),
		expire: (key, seconds) => redis.expire(key, seconds),
	};
}
