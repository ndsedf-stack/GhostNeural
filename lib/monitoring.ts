import { PostHog } from 'posthog-node';
import { createClient } from 'redis';

/**
 * Monitoring Agent (PostHog)
 */
const phClient = process.env.POSTHOG_API_KEY 
  ? new PostHog(process.env.POSTHOG_API_KEY, { host: process.env.POSTHOG_HOST || 'https://app.posthog.com' })
  : null;

export const monitoring = {
  captureLeadProcessed(leadId: string, status: string, score: number) {
    if (phClient) {
      phClient.capture({
        distinctId: leadId,
        event: 'lead_processed',
        properties: { status, score }
      });
    }
  },
  captureError(error: string, context: any) {
    if (phClient) {
      phClient.capture({
        distinctId: 'system',
        event: 'system_error',
        properties: { error, ...context }
      });
    }
  }
};

/**
 * Cache Agent (Redis)
 */
const redisClient = process.env.REDIS_URL 
  ? createClient({ url: process.env.REDIS_URL })
  : null;

let isRedisConnected = false;

if (redisClient) {
  redisClient.on('error', (err) => console.warn('Redis Client Error', err));
  redisClient.connect()
    .then(() => { isRedisConnected = true; })
    .catch((err) => {
      console.warn('Redis connection failed (Cache disabled):', err.message);
      isRedisConnected = false;
    });
}

export const cache = {
  async get(key: string): Promise<any | null> {
    if (!redisClient || !isRedisConnected) return null;
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },
  async set(key: string, value: any, ttl = 3600): Promise<void> {
    if (!redisClient || !isRedisConnected) return;
    try {
      await redisClient.set(key, JSON.stringify(value), { EX: ttl });
    } catch (e) {}
  },
  generateKey(prefix: string, params: Record<string, any>): string {
    const query = Object.keys(params).sort().map(k => `${k}:${params[k]}`).join(':');
    return `${prefix}:${query}`;
  }
};
