import Redis from 'ioredis';


const shouldUseTLS = 
  process.env.REDIS_TLS === 'true' || 
  process.env.REDIS_TLS === 'enabled' ||
  process.env.REDIS_TLS === '1';

const redisConfig: any = {
  host: (process.env.REDIS_HOST || 'localhost').trim(),
  port: parseInt((process.env.REDIS_PORT || '6379').trim()),
  username: 'default', 
  password: (process.env.REDIS_PASSWORD || '').trim(),
  tls: shouldUseTLS ? { 
    servername: (process.env.REDIS_HOST || '').trim(), 
    rejectUnauthorized: true 
  } : undefined,
  connectTimeout: 5000,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  enableReadyCheck: true
};

const redis = new Redis(redisConfig);

redis.on('connect', () => console.log('Redis TCP connection established'));
redis.on('ready', async () => {
  console.log('Redis authenticated and ready');
  try {
    await redis.ping();
    console.log('Redis operational (ping successful)');
  } catch (err) {
    console.error('Redis ping failed:', (err as Error).message);
  }
});
redis.on('error', (err: Error) => 
  console.error('Redis connection error:', err.message)
);
redis.on('reconnecting', () => 
  console.log('Redis reconnecting...')
);

export default redis;