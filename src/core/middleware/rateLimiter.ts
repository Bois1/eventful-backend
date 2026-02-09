import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from '../../config/redis';

export const apiLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => (redis as any).call(...args),
  }),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: (req) => {
    if (req.path.startsWith('/auth')) return 5;
    if (req.path.startsWith('/webhooks')) return 100;
    if (req.path.startsWith('/tickets/verify')) return 30;
    return parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
  },
  skip: (req) => process.env.NODE_ENV === 'test' || req.ip === '127.0.0.1',
  handler: (_, res) => {
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
      statusCode: 429
    });
  },
  keyGenerator: (req) => {
    const user = req.user as { id: string } | undefined;
    return (user ? `${user.id}:${req.ip}` : req.ip) || 'anonymous';
  }
});