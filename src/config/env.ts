import { z } from 'zod';
import { logger } from '../core/logger/logger';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  API_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
  
  DATABASE_URL: z.string().url(),
  
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('2h'),
  
  PAYSTACK_SECRET_KEY: z.string(),
  PAYSTACK_PUBLIC_KEY: z.string(),
  PAYSTACK_BASE_URL: z.string().url().default('https://api.paystack.co'),
  
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().default('noreply@eventful.com'),
  
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
});



if (process.env.NODE_ENV === 'production') {
  if (!process.env.PAYSTACK_SECRET_KEY?.startsWith('sk_live_')) {
    logger.warn('WARNING: Using test Paystack keys in production environment!');
  }
} else {
  if (!process.env.PAYSTACK_SECRET_KEY?.startsWith('sk_test_')) {
    logger.warn('WARNING: Using live Paystack keys in development environment!');
  }
}


if (!process.env.PAYSTACK_SECRET_KEY || !process.env.PAYSTACK_PUBLIC_KEY) {
  throw new Error(
    'Missing Paystack API keys. Set PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY in environment variables.'
  );
}


export const env = envSchema.parse(process.env);